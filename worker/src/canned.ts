import { CONTACT_REPLY } from './context.generated.ts';

// Preset questions with a fixed answer: no model call, no rate-limit cost.
const norm = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const CANNED = new Map<string, string>([
  ['how can i contact him', CONTACT_REPLY],
  ['how can i contact nathan', CONTACT_REPLY],
]);

/** The fixed reply for a preset question, or null. */
export const cannedReply = (question: string): string | null => CANNED.get(norm(question)) ?? null;
