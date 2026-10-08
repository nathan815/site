// All copy lives here. Items marked TODO are placeholders to replace with real info.
export const profile = {
  name: 'Nathaniel Johnson',
  handle: 'nathan815',
  role: 'Software Engineer', // TODO: confirm title
  taglines: ['build things for the web.', 'ship mobile apps.', 'automate the boring stuff.', 'tinker with AI tooling.'],
  summary:
    'TODO: Replace with a 2–3 sentence bio. I am a software engineer who enjoys building fast, well-crafted products across web, mobile and backend, and experimenting with AI-assisted development.',
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
  Tooling: ['Git', 'GitHub Actions', 'Azure DevOps', 'Copilot', 'Claude Code'],
};

export const experience = [
  {
    role: 'TODO: Current Role',
    org: 'TODO: Employer',
    period: '20XX – Present',
    points: ['TODO: Impact-focused bullet about what you built or led.', 'TODO: Another highlight with a measurable result.'],
    stack: ['TypeScript', 'Azure DevOps'],
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
