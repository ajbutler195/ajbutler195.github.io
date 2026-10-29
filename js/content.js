// ---------------------------------------------------------------------------
// Everything a visitor reads lives here. Populated from Antonio's resume —
// edit freely; the rest of the site picks these up automatically.
// ---------------------------------------------------------------------------

export const CONTENT = {
  about: {
    eyebrow: 'About',
    title: "I'm Antonio James Butler",
    body: [
      "I'm a software engineer from Connecticut. For three years at QCDx I built the backend and imaging software behind clinical microscopy — storage and retrieval for high-volume datasets, GPU-accelerated processing pipelines, and the desktop tools scientists used day to day.",
      "Most of my work has lived at the seam between research and production: taking what a scientist needs and turning it into software that holds up under real clinical use. I like the debugging end of that especially — the failures that cross from acquisition hardware through the pipeline into the backend, where the answer is never in the layer you started looking.",
      "I studied Computer Science at UConn, graduating cum laude in 2024. This site is a second run at an idea I first tried while leading Husky Developers, where I learned Three.js and Blender to build the club a 3D website.",
    ],
    facts: [
      { label: 'Based in', value: 'Connecticut' },
      { label: 'Focused on', value: 'Backend, imaging pipelines, scientific computing' },
      { label: 'Education', value: 'B.S. Computer Science, UConn — cum laude, 3.83' },
    ],
  },

  projects: {
    eyebrow: 'Projects',
    title: "Things I've built",
    items: [
      {
        name: 'Ollama Issue Bot',
        description:
          'An LLM-based tool built on Ollama that auto-triages GitHub issues, running against a self-hosted model rather than a paid API.',
        tags: ['Python', 'Ollama', 'LLM', 'GitHub API'],
        url: 'https://github.com/ajbutler195',
      },
      {
        name: 'Secure Embedded Architecture',
        description:
          'Senior design project, team lead. Implemented the CRYSTALS-Dilithium post-quantum signature scheme inside the First Stage Boot Loader of a Xilinx ZCU102 FPGA — designing the secure boot authentication protocol and wiring signature verification to hardware-backed key storage.',
        tags: ['C', 'FPGA', 'Post-Quantum Crypto', 'Xilinx ZCU102'],
        url: '#',
      },
      {
        name: 'Husky Developers — 3D Site',
        description:
          'Led development of a 3D website for the UConn club, learning Three.js and Blender from scratch and mentoring other members through it. The reason this portfolio looks the way it does.',
        tags: ['Three.js', 'Blender', 'JavaScript'],
        url: '#',
      },
      {
        name: 'AI Storytelling App — HackUConn',
        description:
          'Second place at HackUConn 2023. An interactive storytelling application combining Dialogflow for conversation, the OpenAI API for narrative, and DALL·E for illustration.',
        tags: ['Dialogflow', 'OpenAI API', 'DALL·E'],
        url: '#',
      },
    ],
  },

  skills: {
    eyebrow: 'Skills',
    title: 'Tools of the trade',
    groups: [
      { label: 'Languages', items: ['Python', 'Java', 'C++', 'C', 'SQL', 'JavaScript'] },
      { label: 'Frameworks & Libraries', items: ['OpenCL', 'NumPy', 'Pandas', 'Swing', 'JavaFX'] },
      { label: 'Domains', items: ['GPU Computing', 'Image Processing', 'Scientific Computing'] },
      { label: 'Tools & Data', items: ['Git', 'Maven', 'Conda', 'SQL Server'] },
    ],
  },

  experience: {
    eyebrow: 'Experience',
    title: "Where I've worked",
    resumeUrl: 'resume.pdf',
    roles: [
      {
        role: 'Software Engineer',
        org: 'QCDx — Farmington, CT',
        period: 'May 2023 — June 2026',
        points: [
          'Designed and maintained backend infrastructure for clinical data and high-volume microscopy datasets, for reliable storage and retrieval at scale.',
          'Engineered GPU-accelerated image processing pipelines in Python with OpenCL, tuning memory use and throughput for large multidimensional datasets.',
          'Built desktop applications and automation tools in Java and Python supporting microscopy acquisition, image management, and laboratory workflows.',
          'Integrated laboratory instrumentation, acquisition software, and backend systems to automate imaging workflows end to end.',
          'Diagnosed and resolved issues spanning acquisition, backend, and processing pipelines — the failures that cross layers.',
        ],
      },
      {
        role: 'Undergraduate Teaching Assistant',
        org: 'UConn School of Engineering — Storrs, CT',
        period: 'Jan 2023 — May 2023',
        points: [
          'Mentored CS undergraduates through lab instruction, debugging sessions, and code review.',
        ],
      },
      {
        role: 'Technology Sales Associate',
        org: 'Barnes & Noble Education — Storrs, CT',
        period: 'Aug 2022 — Dec 2022',
        points: [
          'Technical sales support plus hardware diagnostics and repair for consumer electronics.',
        ],
      },
      {
        role: 'IT Technician',
        org: 'Regional School District No. 6 — Litchfield, CT',
        period: 'Jul 2022 — Aug 2022',
        points: [
          'Streamlined OS and software deployment for student laptops; supported district-wide technology including MacBooks, Smart Boards, and POS systems.',
        ],
      },
    ],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Say hello',
    intro:
      "Email is the surest way to reach me. I'm open to backend, imaging, and scientific computing roles — and always happy to talk about a problem that crosses layers.",
    links: [
      { label: 'Email', value: 'ajbutler195@gmail.com', href: 'mailto:ajbutler195@gmail.com' },
      { label: 'GitHub', value: 'github.com/ajbutler195', href: 'https://github.com/ajbutler195' },
      {
        label: 'LinkedIn',
        value: 'linkedin.com/in/antonio-james-butler',
        href: 'https://linkedin.com/in/antonio-james-butler',
      },
    ],
  },

  secret: {
    eyebrow: 'Secret Clearing',
    title: 'You found the campfire',
    intro: "Off the path, past the fireflies — most people walk straight by. Since you didn't:",
    facts: [
      "I'm an avid comic book reader. DC's Absolute relaunches have been a highlight, and writing my own comic is a personal goal of mine.",
      "I've been playing Dungeons & Dragons for 10 years. My highest character is a level 15 ranger, and I'm currently DMing a Curse of Strahd campaign.",
      "I love listening to and finding new music.",
      "My interest in computers started when I was six, teaching my grandfather how to use his.",
    ],
  },
};