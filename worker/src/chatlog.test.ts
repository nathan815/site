import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ipHash, logChat, purgeOld, tap, type D1Like } from './chatlog.ts';

function fakeDb(fail = false) {
  const runs: { sql: string; binds: unknown[] }[] = [];
  const db: D1Like = {
    prepare: (sql) => ({ bind: (...binds) => ({ run: async () => { if (fail) throw new Error('d1 down'); runs.push({ sql, binds }); return {}; } }) }),
  };
  return { db, runs };
}
const ctx = () => { const ps: Promise<unknown>[] = []; return { ps, c: { waitUntil: (p: Promise<unknown>) => { ps.push(p); } } }; };
const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);

test('ip hash is stable within a day, changes across days and salts, and never contains the ip', async () => {
  const a = await ipHash('203.0.113.9', 's', NOW);
  assert.equal(a, await ipHash('203.0.113.9', 's', NOW + 3600_000));
  assert.notEqual(a, await ipHash('203.0.113.9', 's', NOW + 86_400_000));
  assert.notEqual(a, await ipHash('203.0.113.9', 'other', NOW));
  assert.notEqual(a, await ipHash('203.0.113.10', 's', NOW));
  assert.ok(!a.includes('203'));
  assert.equal(a.length, 24);
});

test('logChat writes one row with the expected columns and clips huge text', async () => {
  const { db, runs } = fakeDb();
  const { ps, c } = ctx();
  logChat({ DB: db, LOG_SALT: 's' }, c, '1.2.3.4', { outcome: 'ok', question: 'q', answer: 'x'.repeat(9000), tools: ['get_repo_readme'], askNathan: true, turns: 3, latencyMs: 812.6, model: 'm' }, NOW);
  await Promise.all(ps);
  assert.equal(runs.length, 1);
  const b = runs[0].binds;
  assert.equal(b[0], '2026-11-24T12:00:00.000Z');
  assert.equal(b[2], 'ok');
  assert.equal(b[3], 'q');
  assert.match(String(b[4]), /\[clipped\]$/);
  assert.equal(b[5], '["get_repo_readme"]');
  assert.equal(b[6], 1);
  assert.equal(b[7], 3);
  assert.equal(b[8], 813);
  assert.ok(!JSON.stringify(b).includes('1.2.3.4'));
});

test('logging never throws: DB failure, missing DB and missing ctx are all fine', async () => {
  const { ps, c } = ctx();
  logChat({ DB: fakeDb(true).db }, c, 'ip', { outcome: 'ok', question: 'q', turns: 1, latencyMs: 1 });
  await Promise.all(ps); // resolves, does not reject
  logChat({}, c, 'ip', { outcome: 'ok', question: 'q', turns: 1, latencyMs: 1 });
  logChat({ DB: fakeDb().db }, undefined, 'ip', { outcome: 'ok', question: 'q', turns: 1, latencyMs: 1 });
});

test('purgeOld deletes rows older than the retention window', async () => {
  const { db, runs } = fakeDb();
  await purgeOld({ DB: db, LOG_RETENTION_DAYS: '30' }, NOW);
  assert.match(runs[0].sql, /DELETE FROM chat_log/);
  assert.equal(runs[0].binds[0], new Date(NOW - 30 * 86_400_000).toISOString());
  await purgeOld({ DB: db }, NOW);
  assert.equal(runs[1].binds[0], new Date(NOW - 90 * 86_400_000).toISOString());
});

const sse = (...chunks: string[]) => new ReadableStream({ start(c) { const e = new TextEncoder(); chunks.forEach((x) => c.enqueue(e.encode(x))); c.close(); } });

test('tap passes bytes through unchanged and collects text, even split across chunks and numeric tokens', async () => {
  const chunks = ['data: {"response":"In "}\n\ndata: {"resp', 'onse":2020}\n\ndata: {"response":"!"}\n\ndata: {"action":"ask_nathan"}\n\ndata: [DONE]\n\n'];
  let got = ''; let completed: boolean | null = null;
  const out = tap(sse(...chunks), (t, ok) => { got = t; completed = ok; });
  assert.equal(await new Response(out).text(), chunks.join(''));
  assert.equal(got, 'In 2020!');
  assert.equal(completed, true);
});

test('tap reports a partial answer when the client disconnects', async () => {
  let got = ''; let completed: boolean | null = null;
  const out = tap(sse('data: {"response":"par"}\n\n', 'data: {"response":"tial"}\n\n'), (t, ok) => { got = t; completed = ok; });
  const r = out.getReader();
  await r.read();
  await r.cancel();
  assert.equal(completed, false);
  assert.equal(got, 'par');
});
