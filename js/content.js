// ---------------------------------------------------------------------------
// This is the file to edit. Everything a visitor reads in a panel lives here.
// Swap the placeholder copy, keep the shape (keys/arrays) the same, and the
// rest of the site picks it up automatically.
// ---------------------------------------------------------------------------

export const CONTENT = {
  about: {
    eyebrow: 'About',
    title: "Hi, I'm [Your Name]",
    body: [
      "I'm a software engineer who likes building things that feel a little alive — interfaces with texture, tools that get out of the way, the occasional unnecessary 3D forest.",
      'A few years into the industry now, mostly working across the front end and the systems that feed it. I care more about whether something is pleasant to use at 2am than whether it looked good in the pitch deck.',
    ],
    facts: [
      { label: 'Based in', value: '[Your City]' },
      { label: 'Focused on', value: 'Front-end engineering & product' },
      { label: 'Currently', value: '[What you\u2019re doing right now]' },
    ],
  },

  projects: {
    eyebrow: 'Projects',
    title: "Things I've built",
    items: [
      {
        name: 'Project One',
        description:
          'A short, concrete sentence on the problem this solved and the part you\u2019re proudest of.',
        tags: ['TypeScript', 'React', 'Node'],
        url: '#',
      },
      {
        name: 'Project Two',
        description:
          'What it does, who it was for, and one interesting technical decision you made along the way.',
        tags: ['Python', 'Postgres'],
        url: '#',
      },
      {
        name: 'Project Three',
        description: 'A side project or open-source contribution worth a second look.',
        tags: ['Three.js', 'WebGL'],
        url: '#',
      },
      {
        name: 'Project Four',
        description: 'Swap this for whatever you\u2019d most want a recruiter to click on first.',
        tags: ['Swift', 'iOS'],
        url: '#',
      },
    ],
  },

  skills: {
    eyebrow: 'Skills',
    title: 'Tools of the trade',
    groups: [
      {
        label: 'Languages',
        items: ['JavaScript / TypeScript', 'Python', 'Go', 'SQL'],
      },
      {
        label: 'Frameworks & Libraries',
        items: ['React', 'Three.js', 'Node.js', 'Tailwind CSS'],
      },
      {
        label: 'Tools & Practices',
        items: ['Git', 'Docker', 'CI/CD', 'Testing & code review'],
      },
    ],
  },

  experience: {
    eyebrow: 'Experience',
    title: "Where I've worked",
    resumeUrl: 'resume.pdf',
    roles: [
      {
        role: '[Job Title]',
        org: '[Company Name]',
        period: '20XX — Present',
        points: [
          'One concrete accomplishment with a number attached, if you have one.',
          'What you owned, and the impact it had on the team or the product.',
        ],
      },
      {
        role: '[Previous Job Title]',
        org: '[Previous Company]',
        period: '20XX — 20XX',
        points: [
          'What you built or improved, stated plainly.',
          'A second point, if it adds something the first one didn\u2019t.',
        ],
      },
      {
        role: '[Earlier Role]',
        org: '[Company / School]',
        period: '20XX — 20XX',
        points: ['Keep it to the highlights — this panel rewards scanning, not reading.'],
      },
    ],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Say hello',
    intro:
      "The best way to reach me is email — I try to reply within a couple of days. Always happy to talk about interesting problems, open roles, or the occasional overengineered portfolio.",
    links: [
      { label: 'Email', value: 'you@example.com', href: 'mailto:you@example.com' },
      { label: 'GitHub', value: 'github.com/yourname', href: 'https://github.com/yourname' },
      { label: 'LinkedIn', value: 'linkedin.com/in/yourname', href: 'https://linkedin.com/in/yourname' },
    ],
  },

  secret: {
    eyebrow: 'Secret Clearing',
    title: 'You found the campfire',
    intro: "Off the path, past the fireflies — most people walk straight by. Since you didn't:",
    facts: [
      'I once debugged a production issue for six hours before realizing I was reading the logs from staging.',
      'My first program was a text adventure game with exactly one room.',
      'I can\u2019t work without a second monitor, but I wrote most of this forest on a laptop on a train.',
      'Ask me about [a weirdly specific hobby or interest] — I will not shut up about it.',
    ],
  },
};
