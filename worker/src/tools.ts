// Tools the chat model may call. Read-only, public GitHub data for ONE fixed account, so a
// visitor cannot steer the worker at arbitrary repos or hosts.

export interface ToolDef {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] };
}
export interface ToolEnv {
  GITHUB_USER?: string;
  GITHUB_TOKEN?: string; // optional secret: raises the 60 req/hour unauthenticated limit
}
type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export const ASK_NATHAN_TOOL = 'ask_nathan';

export const TOOLS: ToolDef[] = [
  {
    name: ASK_NATHAN_TOOL,
    description: "Call this when you cannot answer the visitor's question from what you know about Nathan or from GitHub: personal opinions, availability, salary, plans, or any detail not stated anywhere. It shows the visitor an offer to send their question to Nathan. Do not guess instead.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_github_repos',
    description: "List Nathan's public GitHub repositories (name, description, language, topics, stars, last push). Personal and open-source projects only: his Microsoft work (Atlas, AVS Console, OneSite, AVS) is NOT on GitHub. Use for questions about his side projects, open source work or what he builds outside Microsoft.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_repo_readme',
    description: "Read the README of one of Nathan's public GitHub repositories (first ~3000 characters). Use to explain what one of his personal projects does. Never for his Microsoft work, which is not on GitHub.",
    parameters: { type: 'object', properties: { repo: { type: 'string', description: 'Repository name, e.g. "prscope"' } }, required: ['repo'] },
  },
  {
    name: 'get_repo_recent_commits',
    description: 'List the 10 most recent commits (date and message) of one of Nathan\'s public GitHub repositories. Use for what he has been working on lately.',
    parameters: { type: 'object', properties: { repo: { type: 'string', description: 'Repository name' } }, required: ['repo'] },
  },
  {
    name: 'get_repo_tree',
    description: "List the file paths in one of Nathan's public GitHub repositories (up to 150, build output and lockfiles hidden). Use to see how a project is organised or to find a file to read with get_repo_file.",
    parameters: { type: 'object', properties: { repo: { type: 'string', description: 'Repository name' } }, required: ['repo'] },
  },
  {
    name: 'get_repo_file',
    description: "Read one text file (first ~4000 characters) from one of Nathan's public GitHub repositories, e.g. package.json, a source file or docs. Use after get_repo_tree for questions about the code, architecture or tech stack.",
    parameters: {
      type: 'object',
      properties: { repo: { type: 'string', description: 'Repository name' }, path: { type: 'string', description: 'File path, e.g. "src/index.ts"' } },
      required: ['repo', 'path'],
    },
  },
];

const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: string }>(); // per isolate; best effort
const MAX_README = 3000;
const MAX_FILE = 4000;
const PATH_RE = /^(?!.*\.\.)[A-Za-z0-9._@ \/-]{1,200}$/;
const SKIP_PATH = /(^|\/)(node_modules|dist|build|\.git|\.next|\.astro|coverage|vendor)\/|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/;

async function gh(path: string, env: ToolEnv, fetchFn: FetchFn, accept = 'application/vnd.github+json'): Promise<Response> {
  const res = await fetchFn(`https://api.github.com${path}`, {
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nathancj-site-chat',
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return res;
}

async function cached(key: string, now: number, load: () => Promise<string>): Promise<string> {
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: now, value });
  if (cache.size > 100) cache.delete(cache.keys().next().value as string);
  return value;
}

/** Runs one tool call. Always returns a string; failures come back as an error message the model can relay. */
export async function runTool(
  name: string,
  args: unknown,
  env: ToolEnv,
  fetchFn: FetchFn = fetch as FetchFn,
  now = Date.now(),
): Promise<string> {
  const user = env.GITHUB_USER || 'nathan815';
  const a = (typeof args === 'object' && args !== null ? args : {}) as { repo?: unknown };
  try {
    if (name === 'list_github_repos') {
      return await cached('repos', now, async () => {
        const repos = (await (await gh(`/users/${user}/repos?type=owner&sort=pushed&direction=desc&per_page=40`, env, fetchFn)).json()) as Array<Record<string, unknown>>;
        return JSON.stringify(
          repos
            .filter((r) => !r.fork && !r.archived && r.name !== user)
            .slice(0, 30)
            .map((r) => ({ name: r.name, description: r.description, language: r.language, topics: r.topics, stars: r.stargazers_count, pushed: r.pushed_at, url: r.html_url })),
        );
      });
    }
    if (name === 'get_repo_readme' || name === 'get_repo_recent_commits') {
      if (typeof a.repo !== 'string' || !REPO_RE.test(a.repo)) return 'error: "repo" must be a repository name';
      const repo = a.repo;
      if (name === 'get_repo_readme') {
        return await cached(`readme:${repo}`, now, async () => {
          const text = await (await gh(`/repos/${user}/${repo}/readme`, env, fetchFn, 'application/vnd.github.raw+json')).text();
          return text.length > MAX_README ? `${text.slice(0, MAX_README)}\n[truncated]` : text;
        });
      }
      return await cached(`commits:${repo}`, now, async () => {
        const commits = (await (await gh(`/repos/${user}/${repo}/commits?per_page=10`, env, fetchFn)).json()) as Array<{ commit: { message: string; author: { date: string } } }>;
        return JSON.stringify(commits.map((c) => ({ date: c.commit.author.date, message: c.commit.message.split('\n')[0].slice(0, 120) })));
      });
    }
    if (name === 'get_repo_tree') {
      if (typeof a.repo !== 'string' || !REPO_RE.test(a.repo)) return 'error: "repo" must be a repository name';
      const repo = a.repo;
      return await cached(`tree:${repo}`, now, async () => {
        const t = (await (await gh(`/repos/${user}/${repo}/git/trees/HEAD?recursive=1`, env, fetchFn)).json()) as { tree?: Array<{ path: string; type: string }> };
        const paths = (t.tree ?? []).filter((e) => e.type === 'blob' && !SKIP_PATH.test(e.path)).map((e) => e.path);
        return JSON.stringify(paths.slice(0, 150)) + (paths.length > 150 ? `\n[${paths.length - 150} more files not shown]` : '');
      });
    }
    if (name === 'get_repo_file') {
      const p = (args as { path?: unknown } | null)?.path;
      if (typeof a.repo !== 'string' || !REPO_RE.test(a.repo)) return 'error: "repo" must be a repository name';
      if (typeof p !== 'string' || !PATH_RE.test(p) || p.startsWith('/')) return 'error: "path" must be a relative file path';
      const repo = a.repo;
      const encoded = p.split('/').map(encodeURIComponent).join('/');
      return await cached(`file:${repo}:${p}`, now, async () => {
        const text = await (await gh(`/repos/${user}/${repo}/contents/${encoded}`, env, fetchFn, 'application/vnd.github.raw+json')).text();
        return text.length > MAX_FILE ? `${text.slice(0, MAX_FILE)}\n[truncated]` : text;
      });
    }
    return `error: unknown tool ${name}`;
  } catch (e) {
    return `error: could not fetch from GitHub (${e instanceof Error ? e.message : 'unknown'})`;
  }
}
