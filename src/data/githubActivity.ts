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

export interface GithubActivity {
  generatedAt: string;
  user: string;
  windowDays: number;
  totals: { repos: number; commits: number | null; prs: number | null };
  repos: RepoActivity[];
}

export const githubActivity = data as GithubActivity;
