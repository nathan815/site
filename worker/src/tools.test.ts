import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from './tools.ts';

const resp = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

test('list_github_repos drops forks/archived/profile repo and keeps useful fields', async () => {
  const repos = [
    { name: 'a', description: 'A', language: 'Go', topics: ['x'], stargazers_count: 2, pushed_at: 'd', html_url: 'u', fork: false },
    { name: 'forked', fork: true },
    { name: 'old', archived: true },
    { name: 'nathan815', fork: false },
  ];
  const out = JSON.parse(await runTool('list_github_repos', {}, {}, async () => resp(repos), 1));
  assert.deepEqual(out.map((r: { name: string }) => r.name), ['a']);
  assert.equal(out[0].stars, 2);
});

test('readme is truncated, repos are validated, token is sent, errors are returned as text', async () => {
  let auth: string | null = null;
  const long = 'x'.repeat(5000);
  const f = async (_u: string, init: RequestInit) => { auth = new Headers(init.headers).get('Authorization'); return resp(long); };
  const out = await runTool('get_repo_readme', { repo: 'big' }, { GITHUB_TOKEN: 't' }, f, 10_000_000);
  assert.ok(out.length < 3100 && out.endsWith('[truncated]'));
  assert.equal(auth, 'Bearer t');
  assert.match(await runTool('get_repo_readme', { repo: 'a/b' }, {}, f), /^error:/);
  assert.match(await runTool('get_repo_recent_commits', { repo: 'missing' }, {}, async () => resp('no', 404), 20_000_000), /^error: could not fetch/);
  assert.match(await runTool('nope', {}, {}, f), /unknown tool/);
});

test('results are cached for a while', async () => {
  let n = 0;
  const f = async () => { n++; return resp([{ commit: { message: 'm\nbody', author: { date: 'd' } } }]); };
  const a = await runTool('get_repo_recent_commits', { repo: 'cachey' }, {}, f, 100_000_000);
  await runTool('get_repo_recent_commits', { repo: 'cachey' }, {}, f, 100_000_500);
  assert.equal(n, 1);
  assert.deepEqual(JSON.parse(a), [{ date: 'd', message: 'm' }]);
});

test('tree hides build output and lockfiles; file paths are validated and encoded', async () => {
  const tree = { tree: [{ path: 'src/a.ts', type: 'blob' }, { path: 'node_modules/x/y.js', type: 'blob' }, { path: 'package-lock.json', type: 'blob' }, { path: 'src', type: 'tree' }, { path: 'README.md', type: 'blob' }] };
  const out = JSON.parse(await runTool('get_repo_tree', { repo: 'treey' }, {}, async () => resp(tree), 300_000_000));
  assert.deepEqual(out, ['src/a.ts', 'README.md']);

  const seen: string[] = [];
  const f = async (u: string) => { seen.push(u); return resp('hello'); };
  assert.equal(await runTool('get_repo_file', { repo: 'filey', path: 'docs/my file.md' }, {}, f, 400_000_000), 'hello');
  assert.equal(seen[0], 'https://api.github.com/repos/nathan815/filey/contents/docs/my%20file.md');
  for (const path of ['../secret', '/etc/passwd', 'a/../b', '', 5]) {
    assert.match(await runTool('get_repo_file', { repo: 'filey', path }, {}, f, 500_000_000), /^error:/);
  }
  assert.equal(seen.length, 1);
});
