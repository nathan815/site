// Fixed-window rate limiting as pure functions, so the Durable Object stays a thin wrapper
// and the logic can be tested under plain Node. Windows are aligned to UTC (the Workers AI
// free quota resets at 00:00 UTC).

export interface Limits {
  perMinute: number; // use Infinity to skip
  perDay: number;
}
export interface State {
  minute: number; // floor(epoch ms / 60_000) of the stored minute window
  minuteCount: number;
  day: number; // floor(epoch ms / 86_400_000) of the stored day window
  dayCount: number;
}
export type Scope = 'minute' | 'day';
export interface Decision {
  allowed: boolean;
  state: State; // state to persist (unchanged when denied, apart from window rollover)
  remainingDay: number; // requests left today after this decision
  scope?: Scope; // set when denied
  retryAfter?: number; // seconds, set when denied
}

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;
export const EMPTY: State = { minute: -1, minuteCount: 0, day: -1, dayCount: 0 };

export function check(prev: State | undefined, now: number, limits: Limits): Decision {
  const minute = Math.floor(now / MINUTE_MS);
  const day = Math.floor(now / DAY_MS);
  const s = prev ?? EMPTY;
  // Roll windows forward before counting.
  const state: State = {
    minute,
    minuteCount: s.minute === minute ? s.minuteCount : 0,
    day,
    dayCount: s.day === day ? s.dayCount : 0,
  };

  // Check every limit before consuming any.
  if (state.dayCount >= limits.perDay) {
    return { allowed: false, state, remainingDay: 0, scope: 'day', retryAfter: Math.max(1, Math.ceil(((day + 1) * DAY_MS - now) / 1000)) };
  }
  if (state.minuteCount >= limits.perMinute) {
    return {
      allowed: false,
      state,
      remainingDay: Math.max(0, limits.perDay - state.dayCount),
      scope: 'minute',
      retryAfter: Math.max(1, Math.ceil(((minute + 1) * MINUTE_MS - now) / 1000)),
    };
  }
  const next: State = { ...state, minuteCount: state.minuteCount + 1, dayCount: state.dayCount + 1 };
  return { allowed: true, state: next, remainingDay: Math.max(0, limits.perDay - next.dayCount) };
}

export function endOfUtcDay(now: number): number {
  return (Math.floor(now / DAY_MS) + 1) * DAY_MS;
}
