import data from './github-activity.json';

export interface RepoActivity {
  name: string;
  description: string;
  language: string;
  url: string;
  stars: number;
  pushedAt: string;
  commits: number | null;
  prs: number | null;
}

export interface CalendarWeek {
  start: string; // first day of the week (Sunday), YYYY-MM-DD
  days: (number | null)[]; // index = weekday, null = outside the covered range
}

export interface Calendar {
  total: number;
  weeks: CalendarWeek[];
}

export interface GithubActivity {
  generatedAt: string;
  user: string;
  windowDays: number;
  totals: { repos: number; commits: number | null; prs: number | null };
  repos: RepoActivity[];
  calendar: Calendar | null;
}

export const githubActivity = data as GithubActivity;
