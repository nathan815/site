import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readViews, recordView, type KV } from './views.ts';

function memory(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async <T>(k: string) => m.get(k) as T | undefined,
    put: async (k, v) => { m.set(k, v); },
    delete: async (keys) => { for (const k of keys) m.delete(k); },
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))),
  };
}
const at = (s: string) => new Date(`${s}T12:00:00Z`);

test('counts total and the last 7 days, dropping older buckets', async () => {
  const kv = memory();
  await recordView(kv, at('2026-11-01'));
  await recordView(kv, at('2026-11-10'));
  await recordView(kv, at('2026-11-16'));
  const v = await recordView(kv, at('2026-11-16'));
  assert.deepEqual(v, { total: 4, week: 3 }); // 11-10 is the oldest day still in window
  assert.deepEqual(await readViews(kv, at('2026-11-17')), { total: 4, week: 2 }); // 11-10 falls out
  assert.equal((await kv.list({ prefix: 'd:' })).has('d:2026-11-01'), false);
});
