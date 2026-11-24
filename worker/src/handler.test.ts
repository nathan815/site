import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, type Env } from './handler.ts';

const url = (p: string) => `https://api.example.test${p}`;
const env = (extra: Partial<Env> = {}): Env => ({ ALLOWED_ORIGINS: 'https://nathancj.com', ...extra });

function counter(start = 0, fail = false) {
  let n = start;
  const calls: string[] = [];
  return {
    calls,
    ns: {
      idFromName: (name: string) => { calls.push(name); return name; },
      get: () => ({
        increment: async () => { if (fail) throw new Error('boom'); return ++n; },
        hit: async () => { if (fail) throw new Error('boom'); n++; return { total: n, week: 1 }; },
        views: async () => { if (fail) throw new Error('boom'); return { total: n, week: 1 }; },
      }),
    },
  };
}

test('health reports ok without touching the counter', async () => {
  const c = counter();
  const res = await handle(new Request(url('/health')), env({ COUNTER: c.ns }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, region: null });
  assert.equal(c.calls.length, 0);
});

test('status returns version, runtime and an incrementing request count', async () => {
  const c = counter(41);
  const e = env({ COUNTER: c.ns, VERSION: 'abc123' });
  const body = await (await handle(new Request(url('/api/status')), e)).json() as Record<string, unknown>;
  assert.equal(body.status, 'ok');
  assert.equal(body.version, 'abc123');
  assert.equal(body.runtime, 'cloudflare-workers');
  assert.equal(body.requests, 42);
  assert.equal(typeof body.time, 'string');
  assert.equal(((await (await handle(new Request(url('/api/status')), e)).json()) as { requests: number }).requests, 43);
});

test('status still answers when the counter fails or is missing', async () => {
  const failing = await (await handle(new Request(url('/api/status')), env({ COUNTER: counter(0, true).ns }))).json() as { status: string; requests: unknown };
  assert.equal(failing.status, 'ok');
  assert.equal(failing.requests, null);
  const missing = await (await handle(new Request(url('/api/status')), env())).json() as { version: string };
  assert.equal(missing.version, 'dev');
});

test('region comes from the Cloudflare colo when present', async () => {
  const req = Object.assign(new Request(url('/health')), { cf: { colo: 'ORD' } });
  assert.deepEqual(await (await handle(req, env())).json(), { ok: true, region: 'ORD' });
});

test('allowed origin gets CORS headers', async () => {
  const res = await handle(new Request(url('/api/status'), { headers: { Origin: 'https://nathancj.com' } }), env());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://nathancj.com');
  assert.equal(res.headers.get('Vary'), 'Origin');
});

test('disallowed origin is rejected and gets no CORS headers', async () => {
  const res = await handle(new Request(url('/api/status'), { headers: { Origin: 'https://evil.example' } }), env());
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('preflight returns 204', async () => {
  const res = await handle(new Request(url('/api/status'), { method: 'OPTIONS', headers: { Origin: 'https://nathancj.com' } }), env());
  assert.equal(res.status, 204);
});

test('unknown route is 404 and wrong method is 405', async () => {
  assert.equal((await handle(new Request(url('/nope')), env())).status, 404);
  const res = await handle(new Request(url('/api/status'), { method: 'POST' }), env());
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, OPTIONS');
});

test('responses are never cached', async () => {
  const res = await handle(new Request(url('/health')), env());
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('POST /api/views records a view, GET reads without recording', async () => {
  const c = counter(10);
  const e = env({ COUNTER: c.ns });
  const posted = await (await handle(new Request(url('/api/views'), { method: 'POST' }), e)).json();
  assert.deepEqual(posted, { total: 11, week: 1 });
  const got = await (await handle(new Request(url('/api/views')), e)).json();
  assert.deepEqual(got, { total: 11, week: 1 });
});

test('/api/views is 503 when the counter fails or is missing, 405 for other methods', async () => {
  assert.equal((await handle(new Request(url('/api/views')), env())).status, 503);
  assert.equal((await handle(new Request(url('/api/views'), { method: 'POST' }), env({ COUNTER: counter(0, true).ns }))).status, 503);
  assert.equal((await handle(new Request(url('/api/views'), { method: 'DELETE' }), env())).status, 405);
});
