// Fetches recent public GitHub activity for the site's Activity section and writes
// src/data/github-activity.json. Runs before the build (see netlify.toml).
//
// Env: GITHUB_TOKEN (optional; raises rate limits and enables the official GraphQL calendar),
//      GITHUB_USER (default nathan815), ACTIVITY_WINDOW_DAYS (default 90),
//      GITHUB_API_URL (default https://api.github.com), GITHUB_WEB_URL (default https://github.com).
// Each part fails independently. On failure the previous data for that part is kept
// and the build continues. The token is only sent as an Authorization header.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const user = process.env.GITHUB_USER || 'nathan815';
const windowDays = Number(process.env.ACTIVITY_WINDOW_DAYS || 90);
const api = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const web = (process.env.GITHUB_WEB_URL || 'https://github.com').replace(/\/$/, '');
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

async function fetchRepos() {
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
  return rows;
}

// The contribution calendar is only available from the GraphQL API, which needs a token.
// It holds per-day counts only (no repo names), so it is safe to publish.
async function fetchCalendar() {
  const to = new Date();
  const from = new Date(to.getTime() - 364 * 864e5);
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions weeks{firstDay contributionDays{date weekday contributionCount}}}}}}`;
  const res = await fetch(`${api}/graphql`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: user, from: from.toISOString(), to: to.toISOString() } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for graphql`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`graphql: ${body.errors[0].message}`);
  const cal = body.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error('graphql: no contribution calendar in response');
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => {
      const days = Array(7).fill(null); // index = weekday (0 = Sunday); null = outside the range
      for (const d of w.contributionDays) days[d.weekday] = d.contributionCount;
      return { start: w.firstDay, days };
    }),
  };
}

// Tokenless fallback: the public profile serves the same calendar as an HTML fragment.
// This is not an official API, so the parser is strict and any surprise is treated as a failure.
const WEEKDAY_MS = 864e5;
async function fetchCalendarPublic() {
  const res = await fetch(`${web}/users/${user}/contributions`, {
    headers: { 'User-Agent': headers['User-Agent'], Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for the profile calendar`);
  const html = await res.text();

  const counts = new Map(); // YYYY-MM-DD -> count
  for (const cell of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const [, date, id] = cell;
    const tip = html.match(new RegExp(`<tool-tip\\b[^>]*\\bfor="${id}"[^>]*>\\s*([^<]*?)\\s*</tool-tip>`));
    if (!tip) continue;
    const n = /^No contributions/i.test(tip[1]) ? 0 : Number((tip[1].match(/^([\d,]+) contribution/i) ?? [])[1]?.replace(/,/g, ''));
    if (Number.isFinite(n)) counts.set(date, n);
  }
  if (counts.size < 300) throw new Error(`profile calendar parsed only ${counts.size} days; the page layout may have changed`);

  const byWeek = new Map();
  let total = 0;
  for (const [date, n] of [...counts].sort()) {
    const d = new Date(`${date}T00:00:00Z`);
    const weekday = d.getUTCDay();
    const start = new Date(d.getTime() - weekday * WEEKDAY_MS).toISOString().slice(0, 10);
    if (!byWeek.has(start)) byWeek.set(start, Array(7).fill(null));
    byWeek.get(start)[weekday] = n;
    total += n;
  }
  return { total, weeks: [...byWeek].map(([start, days]) => ({ start, days })) };
}

function readExisting() {
  try {
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const prev = readExisting();
  let repos = prev.repos;
  let calendar = prev.calendar ?? null;
  let changed = false;

  try {
    repos = await fetchRepos();
    changed = true;
  } catch (e) {
    console.warn(`github-activity: repos skipped (${e.message}); keeping existing data`);
  }

  let fresh = null;
  if (token) {
    try {
      fresh = await fetchCalendar();
    } catch (e) {
      console.warn(`github-activity: GraphQL calendar failed (${e.message}); trying the public profile`);
    }
  }
  if (!fresh) {
    try {
      fresh = await fetchCalendarPublic();
    } catch (e) {
      console.warn(`github-activity: calendar skipped (${e.message}); keeping existing data`);
    }
  }
  if (fresh) {
    calendar = fresh;
    changed = true;
  }

  if (!changed) return;
  const rows = repos ?? [];
  const data = {
    generatedAt: new Date().toISOString(),
    user,
    windowDays,
    totals: {
      repos: rows.length,
      commits: rows.every((r) => r.commits != null) ? rows.reduce((s, r) => s + r.commits, 0) : null,
      prs: rows.every((r) => r.prs != null) ? rows.reduce((s, r) => s + r.prs, 0) : null,
    },
    repos: rows,
    calendar,
  };
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`github-activity: wrote ${rows.length} repos${calendar ? `, ${calendar.total} contributions in ${calendar.weeks.length} weeks` : ''}`);
}

main().catch((e) => {
  console.warn(`github-activity: skipped (${e.message}); keeping existing data`);
});
