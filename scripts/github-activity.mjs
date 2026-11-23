// Fetches recent public GitHub activity for the site's Activity section and writes
// src/data/github-activity.json. Runs before the build (see netlify.toml).
//
// Env: GITHUB_TOKEN (optional, raises rate limits), GITHUB_USER (default nathan815),
//      ACTIVITY_WINDOW_DAYS (default 90), GITHUB_API_URL (default https://api.github.com).
// On any failure the existing JSON file is left untouched and the build continues.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const user = process.env.GITHUB_USER || 'nathan815';
const windowDays = Number(process.env.ACTIVITY_WINDOW_DAYS || 90);
const api = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const token = process.env.GITHUB_TOKEN;
const maxRepos = 8;
const exclude = new Set([user, 'pr-reviewer']); // profile README repo and repos hidden from the site
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/github-activity.json');

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'nathancj-site-build',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(url) {
  const res = await fetch(url.startsWith('http') ? url : api + url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

// Counts commits by the user since a date, paging up to 5 x 100.
async function countCommits(repo, since) {
  let total = 0;
  for (let page = 1; page <= 5; page++) {
    const res = await gh(`/repos/${user}/${repo}/commits?author=${user}&since=${since}&per_page=100&page=${page}`);
    const items = await res.json();
    total += items.length;
    if (items.length < 100) return total;
  }
  return total;
}

async function countPulls(repo, sinceDate) {
  const q = encodeURIComponent(`repo:${user}/${repo} author:${user} type:pr created:>=${sinceDate}`);
  const res = await gh(`/search/issues?q=${q}&per_page=1`);
  return (await res.json()).total_count;
}

async function main() {
  const since = new Date(Date.now() - windowDays * 864e5);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const repos = await (await gh(`/users/${user}/repos?type=owner&sort=pushed&direction=desc&per_page=50`)).json();
  const recent = repos
    .filter((r) => !r.fork && !r.archived && !r.private && !exclude.has(r.name) && new Date(r.pushed_at) >= since)
    .slice(0, maxRepos);

  const rows = [];
  for (const r of recent) {
    const [commits, prs] = await Promise.all([countCommits(r.name, sinceIso), countPulls(r.name, sinceDate)]);
    rows.push({
      name: r.name,
      description: r.description || '',
      language: r.language || '',
      url: r.html_url,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
      commits,
      prs,
    });
  }
  rows.sort((a, b) => b.commits + b.prs * 3 - (a.commits + a.prs * 3));

  const data = {
    generatedAt: new Date().toISOString(),
    user,
    windowDays,
    totals: {
      repos: rows.length,
      commits: rows.reduce((s, r) => s + r.commits, 0),
      prs: rows.reduce((s, r) => s + r.prs, 0),
    },
    repos: rows,
  };
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`github-activity: wrote ${rows.length} repos, ${data.totals.commits} commits, ${data.totals.prs} PRs`);
}

main().catch((e) => {
  console.warn(`github-activity: skipped (${e.message}); keeping existing data`);
});
