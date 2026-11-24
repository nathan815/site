import local from './activity.json';

export interface ActivityWeek { start: string; commits: number; prs: number; aiSessions: number }
export interface Activity {
  generatedAt: string;
  weeks: ActivityWeek[];
  buckets: { label: string; commits: number }[];
}

// The collector lives in a separate repo. If ACTIVITY_DATA_URL is set, fetch its
// published JSON at build time; otherwise (or on any failure) use the bundled file.
export async function loadActivity(): Promise<Activity> {
  const url = import.meta.env.ACTIVITY_DATA_URL;
  if (url) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.weeks)) return data as Activity;
      }
    } catch {
      /* fall through to bundled data */
    }
  }
  return local as Activity;
}
