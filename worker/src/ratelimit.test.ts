import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, type Limits, type State } from './ratelimit.ts';

const L: Limits = { perMinute: 2, perDay: 3 };
const T0 = Date.UTC(2026, 0, 1, 12, 0, 10); // 10s into a minute

test('allows up to the per-minute limit then denies with retryAfter to the minute end', () => {
  let s: State | undefined;
  for (let i = 0; i < 2; i++) { const d = check(s, T0, L); assert.ok(d.allowed); s = d.state; }
  const d = check(s, T0, L);
  assert.equal(d.allowed, false);
  assert.equal(d.scope, 'minute');
  assert.equal(d.retryAfter, 50);
  assert.deepEqual(d.state.minuteCount, 2); // denied hits are not counted
});

test('minute window rolls over', () => {
  let s: State | undefined;
  for (let i = 0; i < 2; i++) s = check(s, T0, L).state;
  const d = check(s, T0 + 60_000, L);
  assert.ok(d.allowed);
  assert.equal(d.state.dayCount, 3);
});

test('day limit denies until UTC midnight and reports remaining', () => {
  let s: State | undefined;
  let t = T0;
  const rems: number[] = [];
  for (let i = 0; i < 3; i++) { const d = check(s, t, L); assert.ok(d.allowed); rems.push(d.remainingDay); s = d.state; t += 60_000; }
  assert.deepEqual(rems, [2, 1, 0]);
  const d = check(s, t, L);
  assert.equal(d.allowed, false);
  assert.equal(d.scope, 'day');
  assert.equal(d.remainingDay, 0);
  assert.equal(d.retryAfter, Math.ceil((Date.UTC(2026, 0, 2) - t) / 1000));
  assert.ok(check(s, Date.UTC(2026, 0, 2), L).allowed);
});

test('a denied request on one limit does not consume the other', () => {
  const s: State = { minute: Math.floor(T0 / 60_000), minuteCount: 2, day: Math.floor(T0 / 86_400_000), dayCount: 1 };
  const d = check(s, T0, L);
  assert.equal(d.allowed, false);
  assert.equal(d.state.dayCount, 1);
});

test('infinite per-minute limit is skipped (global bucket)', () => {
  let s: State | undefined;
  for (let i = 0; i < 100; i++) s = check(s, T0, { perMinute: Infinity, perDay: 100 }).state;
  assert.equal(check(s, T0, { perMinute: Infinity, perDay: 100 }).scope, 'day');
});
