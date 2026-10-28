// All copy lives here. Items marked TODO are placeholders to replace with real info.
export const profile = {
  name: 'Nathaniel Johnson',
  handle: 'nathan815',
  role: 'Senior Software Engineer',
  taglines: ['build things for the web.', 'ship mobile apps.', 'automate the boring stuff.', 'tinker with AI tooling.'],
  summary:
    "I'm a Senior Software Engineer at Microsoft, where I've worked on Azure VMware Solution since 2020. I like building reliable cloud infrastructure and well-crafted software, and I experiment with AI-assisted development on the side.",
  location: 'Michigan, USA', // TODO: confirm
  email: 'hello@nathancj.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/nathan815' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nathanielcjohnson' },
    { label: 'Stack Overflow', href: 'https://stackoverflow.com/users/507629/nathan' },
  ],
};

export const skills: Record<string, string[]> = {
  Languages: ['TypeScript', 'JavaScript', 'C#', 'Go', 'Python', 'PowerShell', 'Java', 'Kotlin', 'SQL'],
  Frontend: ['React', 'Vue', 'React Native', 'Astro', 'Tailwind'],
  Backend: ['Node.js', 'Durable Functions', 'Spring Boot', 'Laravel', 'Redis'],
  Data: ['Spark', 'Scala', 'Hadoop', 'HDFS', 'SQL Server'],
  Tooling: ['Git', 'GitHub Actions', 'Azure', 'Azure DevOps', 'Copilot', 'Claude Code', 'MCP'],
};

interface Title { title: string; period?: string }

export interface MsProject {
  name: string;
  hook: string;
  metric?: string;
  details: string;
  stack: string[];
  image?: string; // screenshot under public/, shown when the box is open
  imageAlt?: string;
}

export interface Job {
  role: string;
  org: string;
  period: string;
  summary: string;
  logo?: string;
  monogram?: string;
  titles?: Title[];
  points?: string[];
  stack?: string[];
  projects?: MsProject[];
}

// Internal Microsoft projects: code stays private; mock-data screenshots live in a separate showcase repo.
// When the repo exists, set `showcaseUrl` and give each project an `image`.
export const showcaseUrl: string | undefined = undefined; // TODO: e.g. 'https://github.com/nathan815/<showcase-repo>'

export const experience: Job[] = [
  {
    role: 'Senior Software Engineer',
    org: 'Microsoft · Azure VMware Solution',
    logo: 'microsoft',
    period: '2020 – Present',
    summary: 'Azure VMware Solution, from the physical network to on-call tooling.',
    titles: [
      { title: 'Senior Software Engineer', period: 'Sep 2026 – Present' },
      { title: 'Software Engineer II', period: 'Sep 2022 – Sep 2026' },
      { title: 'Software Engineer', period: '2020 – Sep 2022' },
    ],
    projects: [
      {
        name: 'Atlas',
        hook: 'New service replacing AWX. I lead a team of four.',
        metric: '30–50% faster jobs',
        details:
          'Atlas replaces AWX. Its more efficient scheduler, written in C#, cut job runtimes by 30 to 50%. It runs on the Durable Functions runtime in a container, backed by Azure Storage. This is my current major project, and I lead a team of four engineers on it.',
        stack: ['C#', 'Durable Functions', 'Azure Storage', 'Containers'],
      },
      {
        name: 'AVS Console',
        hook: 'On-call app that is open in every incident. I still maintain it.',
        metric: '430+ engineers · 20+ min saved per incident',
        details:
          'Internal app for on-call operations of Azure VMware Solution SDDCs. I saw the pain on-call engineers faced during incidents and built the first version in a couple of months, released in Sep 2025. It replaced a slow PowerShell tool and cuts 20+ minutes from each incident. It is open on the shared screen in every incident. I am still its primary maintainer, improving it and adding features since launch.',
        stack: ['On-call tooling', 'Primary maintainer', 'Since Sep 2025'],
      },
      {
        name: 'OneSite',
        hook: 'Hosting platform for the AI era, open to all of Microsoft.',
        metric: '50+ sites · 10 people',
        details:
          'Internal hosting platform for all of Microsoft. Tell your AI agent to deploy a site and it builds and deploys to OneSite, using the built-in SDK and API for the backend: a Firebase-style database, identity, WebSockets and more. 50+ sites from 10 people so far, and growing.',
        stack: ['Hosting platform', 'Database', 'Identity', 'WebSockets'],
      },
      {
        name: 'Public IP down to the NSX Edge',
        hook: 'Internet access straight to the NSX Edge.',
        metric: 'Thousands of IPs, not hundreds',
        details:
          'A generally available AVS feature that lets customers use Azure public IPs directly on the NSX Edge for inbound and outbound internet access. It supports far larger scale than managed SNAT, with thousands of public IPs versus hundreds. I worked on it on the tenant networking and control plane team.',
        stack: ['VMware NSX', 'Azure networking'],
      },
      {
        name: 'Tenant networking and control plane',
        hook: 'The control plane that configures NSX, vCenter and ESXi.',
        details:
          'I moved from the Underlay team to tenant networking and the lower-level control plane. That covers NSX management and the control plane that configures vCenter, NSX, ESXi hosts and more.',
        stack: ['VMware NSX', 'vCenter', 'ESXi'],
      },
      {
        name: 'Pod Underlay Controller (PUC)',
        hook: 'Configures the physical Cisco switches in every AVS pod.',
        details:
          'My first project at Microsoft, on the Underlay Networking team. I built and improved PUC, a Python and Ansible service deployed in every AVS pod that configures its physical Cisco network switches, including ToRs and leafs.',
        stack: ['Python', 'Ansible', 'Cisco networking'],
      },
    ],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Criteo',
    logo: '/logos/criteo.png',
    period: 'Summer 2019 · Fall 2019 – Spring 2020',
    summary: 'Scala and Spark pipeline that processes millions of advertiser products.',
    points: [
      'Summer 2019, Palo Alto: designed and built a Spark application in Scala that consolidates product catalog data and computes statistics, processing millions of products from advertisers.',
      'Split the application into testable components using software design principles, with unit and integration tests.',
      "Reviewed teammates' code and incorporated feedback on my own through Gerrit code review.",
      'Fall 2019 to Spring 2020, Ann Arbor (part-time): kept working with Spark and Hadoop, including fixing Scala and Java dependency issues.',
    ],
    stack: ['Scala', 'Spark', 'Hadoop', 'HDFS', 'MapReduce', 'ScalaTest', 'SQL Server', 'Gradle', 'Jenkins'],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Learning A–Z',
    logo: '/logos/learning-az.png',
    period: 'Summer 2018 – Spring 2019',
    summary: 'Offline book downloading and reading for the Android app.',
    points: ['Summer 2018 internship, then part-time through the 2018–19 school year.'],
    stack: ['Android', 'Java'],
  },
  {
    role: 'B.S. Computer Science',
    org: 'Eastern Michigan University',
    monogram: 'EMU',
    period: 'Graduated 2020',
    summary: 'Hackathons, side projects, and a computerized Christmas light display.',
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
    name: 'Threes Scorekeeper',
    blurb: 'A scorekeeping app for the card game Threes.',
    stack: ['TypeScript'],
    href: 'https://github.com/nathan815/threes-scorekeeper',
  },
  {
    name: 'Lost Cities',
    blurb: 'An online multiplayer version of the Lost Cities card game.',
    stack: ['Java', 'Spring Boot', 'TypeScript', 'Vue'],
    href: 'https://github.com/nathan815/LostCities',
  },
  {
    name: 'Laughable Lyrics',
    blurb: 'An Android app that generates comical translations of song lyrics.',
    stack: ['Kotlin', 'Android'],
    href: 'https://github.com/nathan815/Laughable-Lyrics',
  },
];
