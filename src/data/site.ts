// All copy lives here. Items marked TODO are placeholders to replace with real info.
export const profile = {
  name: 'Nathaniel Johnson',
  handle: 'nathan815',
  role: 'Senior Software Engineer',
  taglines: ['build things for the web.', 'ship mobile apps.', 'automate the boring stuff.', 'tinker with AI tooling.'],
  summary:
    "I'm a Senior Software Engineer at Microsoft, where I've worked on Azure VMware Solution since 2020. I like building reliable cloud infrastructure and well-crafted software, and I experiment with AI-assisted development on the side.",
  location: 'Michigan, USA', // TODO: confirm
  email: 'hello@nathancj.com', // TODO: confirm real address
  links: [
    { label: 'GitHub', href: 'https://github.com/nathan815' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nathanielcjohnson' },
    { label: 'Stack Overflow', href: 'https://stackoverflow.com/users/507629/nathan' },
  ],
};

export const skills: Record<string, string[]> = {
  Languages: ['TypeScript', 'JavaScript', 'Go', 'Python', 'PowerShell', 'Java', 'Kotlin', 'SQL'],
  Frontend: ['React', 'Vue', 'React Native', 'Astro', 'Tailwind'],
  Backend: ['Node.js', 'Spring Boot', 'Laravel', 'Redis'],
  Data: ['Spark', 'Hadoop', 'HDFS'],
  Tooling: ['Git', 'GitHub Actions', 'Azure', 'Azure DevOps', 'Copilot', 'Claude Code', 'MCP'],
};

export const experience = [
  {
    role: 'Senior Software Engineer',
    org: 'Microsoft · Azure VMware Solution',
    period: '2020 – Present',
    points: [
      'Engineer on Azure VMware Solution, the managed VMware private cloud service on Azure.',
      'TODO: Add one or two specific things you built or led, with measurable results.',
    ],
    stack: ['Azure', 'Azure DevOps'],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Criteo',
    period: 'Summer 2019 · Fall 2019 – Spring 2020',
    points: [
      'Palo Alto, CA in summer 2019, then part-time from Ann Arbor, MI through spring 2020.',
      'TODO: Add what you worked on and the impact.',
    ],
    stack: [],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Learning A–Z',
    period: 'Summer 2018 – Spring 2019',
    points: [
      'Summer 2018 internship, then part-time through the 2018–19 school year.',
      'Built offline book downloading and reading for the Android app.',
    ],
    stack: ['Android', 'Java'],
  },
  {
    role: 'B.S. Computer Science',
    org: 'Eastern Michigan University',
    period: 'Graduated 2020',
    points: ['Hackathons, side projects, and a computerized Christmas light display.'],
    stack: [],
  },
];

export const projects = [
  {
    name: 'ADO-Boost',
    blurb: 'Browser extension for Chrome and Edge that adds diff stats and Copilot file groups to Azure DevOps pull requests.',
    stack: ['TypeScript', 'Azure DevOps'],
    href: 'https://github.com/nathan815/ADO-Boost',
  },
  {
    name: 'prscope',
    blurb: 'A pull request dashboard that works across Azure DevOps repos.',
    stack: ['TypeScript', 'Azure DevOps'],
    href: 'https://github.com/nathan815/prscope',
  },
  {
    name: 'pr-reviewer',
    blurb: 'A local AI code review platform for Azure DevOps pull requests.',
    stack: ['JavaScript', 'Azure DevOps', 'AI'],
    href: 'https://github.com/nathan815/pr-reviewer',
  },
  {
    name: 'copilot-proxy',
    blurb: 'A secured proxy for using the GitHub Copilot API with Claude Code and Codex.',
    stack: ['PowerShell', 'GitHub Copilot', 'Claude Code'],
    href: 'https://github.com/nathan815/copilot-proxy',
  },
  {
    name: 'adx-dashboard-mcp',
    blurb: 'An MCP server for agentic dashboard editing in Azure Data Explorer (Kusto).',
    stack: ['JavaScript', 'MCP', 'Kusto'],
    href: 'https://github.com/nathan815/adx-dashboard-mcp',
  },
  {
    name: 'Lost Cities',
    blurb: 'An online multiplayer version of the Lost Cities card game.',
    stack: ['Java', 'Spring Boot', 'TypeScript', 'Vue'],
    href: 'https://github.com/nathan815/LostCities',
  },
  {
    name: 'Threes Scorekeeper',
    blurb: 'A scorekeeping app for the card game Threes.',
    stack: ['TypeScript'],
    href: 'https://github.com/nathan815/threes-scorekeeper',
  },
  {
    name: 'Laughable Lyrics',
    blurb: 'An Android app that generates comical translations of song lyrics.',
    stack: ['Kotlin', 'Android'],
    href: 'https://github.com/nathan815/Laughable-Lyrics',
  },
];

// Internal Microsoft projects. Code stays private; screenshots live in a separate showcase repo.
// When the repo exists, set `showcaseUrl` and give each project an `image` (path under public/).
export const showcaseUrl: string | undefined = undefined; // TODO: e.g. 'https://github.com/nathan815/<showcase-repo>'

export interface WorkProject {
  name: string;
  blurb: string;
  stack: string[];
  image?: string;
  imageAlt?: string;
}

export const workProjects: WorkProject[] = [
  {
    name: 'AVS Console',
    blurb: 'TODO: One or two sentences on what it is, who uses it, and your role. Keep it free of customer data and internal-only details.',
    stack: ['TODO'],
  },
  {
    name: 'OneSite',
    blurb: 'TODO: One or two sentences on what it is, who uses it, and your role. Keep it free of customer data and internal-only details.',
    stack: ['TODO'],
  },
];
