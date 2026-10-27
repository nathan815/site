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
  Data: ['Spark', 'Scala', 'Hadoop', 'HDFS', 'SQL Server'],
  Tooling: ['Git', 'GitHub Actions', 'Azure', 'Azure DevOps', 'Copilot', 'Claude Code', 'MCP'],
};

interface Title { title: string; period?: string }

export const experience: {
  role: string; org: string; period: string; titles?: Title[]; points: string[]; stack: string[];
}[] = [
  {
    role: 'Senior Software Engineer',
    org: 'Microsoft · Azure VMware Solution',
    period: '2020 – Present',
    titles: [
      { title: 'Senior Software Engineer', period: 'Sep 2026 – Present' },
      { title: 'Software Engineer II', period: 'Sep 2022 – Sep 2026' },
      { title: 'Software Engineer', period: '2020 – Sep 2022' },
    ],
    points: [
      'Engineer on Azure VMware Solution, the managed VMware private cloud service on Azure.',
      'Since summer 2025, built AVS Console, the on-call operations app used by 430+ engineers. It replaced a slow PowerShell tool and cuts 20+ minutes from each incident.',
      'Built OneSite, an internal site hosting platform with a built-in database, identity and WebSockets.',
    ],
    stack: ['Azure', 'Azure DevOps'],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Criteo',
    period: 'Summer 2019 · Fall 2019 – Spring 2020',
    points: [
      'Summer 2019, Palo Alto: designed and built a Spark application in Scala that consolidates product catalog data and computes statistics, processing millions of products from advertisers.',
      'Split the application into testable components using software design principles, with unit and integration tests.',
      'Reviewed teammates\' code and incorporated feedback on my own through Gerrit code review.',
      'Fall 2019 to Spring 2020, Ann Arbor (part-time): kept working with Spark and Hadoop, including fixing Scala and Java dependency issues.',
    ],
    stack: ['Scala', 'Spark', 'Hadoop', 'HDFS', 'MapReduce', 'ScalaTest', 'SQL Server', 'Gradle', 'Jenkins'],
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
    blurb:
      'Internal app for on-call operations of Azure VMware Solution SDDCs, used by 430+ engineers. Built since summer 2025, it is open on the shared screen in every incident. I built it to replace a slow PowerShell tool, and it cuts 20+ minutes from each incident.',
    stack: ['On-call tooling', '430+ users'],
  },
  {
    name: 'OneSite',
    blurb:
      'Internal site hosting platform. Every site comes with built-in APIs: a Firebase-style database, identity, WebSockets and more.',
    stack: ['Hosting platform', 'Database', 'Identity', 'WebSockets'],
  },
];
