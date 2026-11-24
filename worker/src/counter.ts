import { DurableObject } from 'cloudflare:workers';
import { readViews, recordView, type Views } from './views.ts';

// One global instance is plenty at this site's scale. It counts calls to /api/status
// (`increment`) and site page views (`hit`, `views`).
export class Counter extends DurableObject {
  async increment(): Promise<number> {
    const next = ((await this.ctx.storage.get<number>('n')) ?? 0) + 1;
    await this.ctx.storage.put('n', next);
    return next;
  }
  async hit(): Promise<Views> {
    return recordView(this.ctx.storage, new Date());
  }
  async views(): Promise<Views> {
    return readViews(this.ctx.storage, new Date());
  }
}
