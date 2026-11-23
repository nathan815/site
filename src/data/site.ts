// All copy lives here. Items marked TODO are placeholders to replace with real info.
export const profile = {
  name: 'Nathan Johnson',
  handle: 'nathan815',
  role: 'Senior Software Engineer',
  taglines: [
    'ship cloud control plane services globally.',
    'run VMware on Azure.',
    'turn on-call pain into tools.',
    'automate the boring stuff.',
    'build with AI every day.',
  ],
  summary:
    "I'm a Senior Software Engineer at Microsoft, where I've worked on Azure VMware Solution since 2020. I like building reliable cloud infrastructure and well-crafted software, and AI-assisted development is now central to my day-to-day work.",
  location: 'Michigan, USA', // TODO: confirm
  email: 'hello@nathancj.com',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nathanielcjohnson' },
    { label: 'GitHub', href: 'https://github.com/nathan815' },
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
  logoOnWhite?: boolean; // transparent marks sit on a white tile with padding
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
        hook: 'Control plane job orchestrator replacing AWX. I lead a team of four.',
        metric: '2,000+ SDDCs · 30–50% faster jobs',
        details:
          'Atlas is a new control plane job orchestrator service that replaces AWX. It is deployed globally on over 2,000 AVS SDDCs. Its more efficient scheduler, written in C#, cut job runtimes by 30 to 50%. It runs on the Durable Functions runtime in a container, backed by Azure Storage. This is my current major project, and I lead a team of four engineers on it.',
        stack: ['C#', 'Durable Functions', 'Azure Storage', 'Containers', 'Job orchestration'],
      },
      {
        name: 'AVS Console',
        hook: 'On-call app that is open in every incident. I envisioned it, built it, and now lead it.',
        metric: '430+ engineers · 20+ min saved per incident',
        details:
          'Internal app for on-call operations of Azure VMware Solution SDDCs. I envisioned it after seeing the pain on-call engineers faced during incidents, then built the first version myself in a couple of months, released in Sep 2025. It replaced a slow PowerShell tool and cuts 20+ minutes from each incident. It is open on the shared screen in every incident. I am now its lead maintainer, still improving it and adding features since launch.',
        stack: ['Creator', 'Lead maintainer', 'Since Sep 2025'],
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
        name: 'AVS Gen 2 (AV64)',
        hook: 'Next-generation AVS on Azure Fleet servers.',
        details:
          'Azure VMware Solution Generation 2 runs on the AV64 SKU, on Azure Fleet servers. I worked on the control plane implementation that helped make it possible, on two fronts: the networking side, and deploying a host agent.',
        stack: ['AV64', 'Control plane', 'Networking', 'Host agent'],
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
    logo: '/logos/emu.png',
    logoOnWhite: true,
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

// Contact cards, in display order. Logos are inline SVG so they follow the theme and need no requests.
export interface ContactCard {
  label: string;
  handle: string;
  href: string;
  external: boolean;
  viewBox: string;
  svg: string;
  color: string;
  stroke?: boolean;
}

export const contacts: ContactCard[] = [
  {
    label: 'LinkedIn',
    handle: 'in/nathanielcjohnson',
    href: 'https://www.linkedin.com/in/nathanielcjohnson',
    external: true,
    viewBox: '0 0 24 24',
    color: '#0a66c2',
    svg: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
  },
  {
    label: 'GitHub',
    handle: 'github.com/nathan815',
    href: 'https://github.com/nathan815',
    external: true,
    viewBox: '0 0 16 16',
    color: 'var(--text)',
    svg: '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>',
  },
  {
    label: 'Stack Overflow',
    handle: 'stackoverflow.com/users/507629',
    href: 'https://stackoverflow.com/users/507629/nathan',
    external: true,
    viewBox: '0 0 24 24',
    color: '#f48024',
    svg: '<path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277L15.725 0zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644-8.225-6.85zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94-9.701-4.517zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092-10.473-2.203zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396H1.89zm4.265 2.133v2.13h10.66v-2.13H6.154Z"/>',
  },
  {
    label: 'Email',
    handle: profile.email,
    href: `mailto:${profile.email}`,
    external: false,
    viewBox: '0 0 24 24',
    color: 'var(--accent)',
    stroke: true,
    svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  },
];
