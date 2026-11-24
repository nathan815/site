import { DurableObject } from 'cloudflare:workers';

// Counts calls to /api/status. One global instance is plenty at this site's scale.
export class Counter extends DurableObject {
  async increment(): Promise<number> {
    const next = ((await this.ctx.storage.get<number>('n')) ?? 0) + 1;
    await this.ctx.storage.put('n', next);
    return next;
  }
}
