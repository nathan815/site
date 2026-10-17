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
  Languages: ['TypeScript', 'JavaScript', 'Java', 'Scala', 'SQL', 'PHP'], // TODO: update
  Frontend: ['React', 'Vue', 'React Native', 'Astro', 'Tailwind'],
  Backend: ['Node.js', 'Laravel', 'Redis', 'Socket.io'],
  Data: ['Spark', 'Hadoop', 'HDFS'],
  Tooling: ['Git', 'GitHub Actions', 'Azure', 'Azure DevOps', 'Copilot', 'Claude Code'],
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
    org: 'Learning A–Z',
    period: 'Summer 2018',
    points: ['Built offline book downloading and reading for the Android app.'],
    stack: ['Android', 'Java'],
  },
  {
    role: 'B.S. Computer Science',
    org: 'Eastern Michigan University',
    period: 'TODO: years',
    points: ['Hackathons, side projects, and a computerized Christmas light display.'],
    stack: [],
  },
];

export const projects = [
  {
    name: 'The Swan Station',
    blurb: 'A LOST-themed browser game, in the works since 2014 and rebuilt on a modern stack.',
    stack: ['Vue', 'Laravel', 'Redis', 'Socket.io'],
    href: 'https://github.com/nathan815',
  },
  {
    name: 'Enemy Clouds',
    blurb: 'A React Native game built in a sprint, Dec 2017.',
    stack: ['React Native'],
    href: 'https://github.com/nathan815',
  },
  {
    name: 'FishNet',
    blurb: 'Android app from a 2017 hackathon.',
    stack: ['Android', 'Java'],
    href: 'https://github.com/nathan815',
  },
  {
    name: 'EcoSPAN',
    blurb: 'iOS app from a January 2018 hackathon.',
    stack: ['iOS', 'Swift'],
    href: 'https://github.com/nathan815',
  },
]; // TODO: refresh with current projects and correct repo links
