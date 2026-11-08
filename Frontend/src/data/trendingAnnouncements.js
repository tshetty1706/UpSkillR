/**
 * UpSkillR Platform Announcements & Tech Trends Mock Data
 * 
 * Note: Future Admin Integration Schema
 * This mock data structure directly mirrors the upcoming Admin Module schema:
 * - id: String (Unique UUID / DB ID)
 * - slug: String (URL-friendly identifier)
 * - title: String (Announcement headline)
 * - description: String (Concise summary for cards)
 * - content: Object/String (Comprehensive article content with sections, takeaways, and details)
 * - category: String (One of TRENDING_CATEGORIES)
 * - tags: Array<String> (Technology & topic tags)
 * - publisherId: String (Admin user ID)
 * - publisherName: String ("UpSkillR Admin")
 * - publisherRole: String ("Platform Editorial & Curriculum Team")
 * - targetAudience: 'GLOBAL' | 'INSTRUCTOR_AUDIENCE' | 'COURSE_AUDIENCE'
 * - targetInstructorId: String | null
 * - targetCourseIds: Array<String>
 * - publishDate: String (ISO format)
 * - formattedDate: String (User-friendly date)
 * - expiryDate: String | null
 * - status: 'published' | 'draft' | 'archived'
 * - isPinned: Boolean
 * - badge: 'TRENDING' | 'UPCOMING' | 'NEW' | null
 * - upcomingDate: String | null (e.g. 'Coming Soon', 'Expected Q1 2027')
 * - readTime: String (e.g. '4 min read')
 * - coverImage: String (Header image URL)
 */

export const TRENDING_CATEGORIES = [
  'All Updates',
  'Technology Trends',
  'Upcoming Courses',
  'AI & Machine Learning',
  'Web Development',
  'Cybersecurity',
  'Cloud & DevOps',
  'Career & Industry'
];

export const MOCK_TRENDING_ANNOUNCEMENTS = [
  {
    id: 'ann-ai-agents-2026',
    slug: 'rise-of-ai-agents-in-software-development',
    title: 'The Rise of AI Agents in Software Development',
    category: 'AI & Machine Learning',
    badge: 'TRENDING',
    upcomingDate: null,
    readTime: '5 min read',
    publishDate: '2026-11-06T10:00:00.000Z',
    formattedDate: 'Nov 6, 2026',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    description: 'AI agents are changing how developers build software. Explore autonomous workflows, tool calling, agent orchestration and how AI-powered development is evolving.',
    tags: ['AI Agents', 'LLMs', 'Automation', 'Software Engineering'],
    publisherId: 'admin-editorial-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Platform Editorial Team',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: true,
    content: {
      intro: 'The software development landscape is undergoing a profound paradigm shift. While the first wave of developer AI focused on passive code completion and conversational assistance, modern engineering teams are now adopting autonomous AI agents capable of planning, executing complex multi-step workflows, and verifying their own output.',
      sections: [
        {
          heading: 'From Chatbots to Autonomous Agentic Architectures',
          body: 'Traditional code assistants respond to single prompts with localized snippets. In contrast, an AI agent operates in an iterative loop: it decomposes complex feature requests into discrete engineering tasks, leverages external tools (such as terminal commands, file search, and test harnesses), checks execution logs, and adjusts its approach when runtime exceptions occur.'
        },
        {
          heading: 'Core Pillars of Agentic Software Engineering',
          bullets: [
            'Dynamic Planning & Task Decomposition: Breaking down ambiguous project requirements into actionable subtasks.',
            'Tool Calling & Sandbox Execution: Interacting with file systems, APIs, package managers, and test suites securely.',
            'Context Memory & State Management: Retaining project history, architectural constraints, and previous failure points.',
            'Multi-Agent Collaboration: Specialized agents (researchers, reviewers, coders) working as an autonomous engineering swarm.'
          ]
        },
        {
          heading: 'What Developers Need to Learn Next',
          body: 'As routine boilerplate generation becomes automated, the value of software engineers is shifting towards systems architecture, specification authoring, security evaluation, and orchestration. Developers who understand tool calling interfaces, structured outputs, and evaluation metrics will lead engineering in this new era.'
        }
      ],
      keyTakeaways: [
        'AI agents operate autonomously through iterative plan-act-observe-reflect loops.',
        'Modern engineering relies increasingly on function calling and tool execution beyond raw text completion.',
        'High-leverage engineering skills now include robust system architecture, verification, and agent orchestration.'
      ]
    }
  },
  {
    id: 'ann-dsa-advanced-course',
    slug: 'upcoming-advanced-data-structures-and-algorithms',
    title: 'Upcoming: Advanced Data Structures & Algorithms Course',
    category: 'Upcoming Courses',
    badge: 'UPCOMING',
    upcomingDate: 'Coming Soon',
    readTime: '3 min read',
    publishDate: '2026-11-05T14:30:00.000Z',
    formattedDate: 'Nov 5, 2026',
    coverImage: 'https://images.unsplash.com/photo-1516116211227-bbc006886e85?auto=format&fit=crop&w=1200&q=80',
    description: 'A structured learning experience covering advanced DSA concepts, problem-solving patterns, trees, graphs, dynamic programming and competitive programming.',
    tags: ['DSA', 'Algorithms', 'Problem Solving', 'Competitive Programming'],
    publisherId: 'admin-curriculum-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Curriculum & Course Development',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: true,
    content: {
      intro: 'We are thrilled to announce that our curriculum team, in collaboration with senior industry engineers, is developing a comprehensive Advanced Data Structures & Algorithms course designed specifically for technical interviews and competitive programming.',
      sections: [
        {
          heading: 'Curriculum Sneak Peek',
          body: 'This course bridges the gap between basic algorithmic theory and deep problem-solving mastery. Rather than memorizing isolated LeetCode solutions, learners will master universal algorithmic patterns.'
        },
        {
          heading: 'Key Modules in Development',
          bullets: [
            'Advanced Graph Algorithms: Dijkstra, Bellman-Ford, Floyd-Warshall, Tarjan\'s Strongly Connected Components, and Network Flow.',
            'Tree Mastery & Range Queries: Segment Trees, Binary Indexed Trees (Fenwick Trees), and Lowest Common Ancestor (LCA).',
            'Dynamic Programming Patterns: Multidimensional DP, Bitmask DP, Digit DP, and DP on Trees.',
            'Competitive Coding Strategies: Monotonic Queues, Two Pointers at Scale, and Fast I/O Optimization.'
          ]
        },
        {
          heading: 'Interactive Learning Workspace Integration',
          body: 'Each module will include integrated visual algorithmic trace graphs, timing benchmarks, and automatic test case evaluations directly in the UpSkillR Learning Workspace.'
        }
      ],
      keyTakeaways: [
        'Expected release: Coming soon to all enrolled UpSkillR learners.',
        'Features 100+ curated advanced interview problems categorized by underlying design patterns.',
        'Hands-on interactive coding sandbox with real-time test case verification.'
      ]
    }
  },
  {
    id: 'ann-cybersec-developer-essentials',
    slug: 'cybersecurity-skills-every-developer-should-know',
    title: 'Cybersecurity Skills Every Developer Should Know',
    category: 'Cybersecurity',
    badge: 'NEW',
    upcomingDate: null,
    readTime: '4 min read',
    publishDate: '2026-11-04T08:15:00.000Z',
    formattedDate: 'Nov 4, 2026',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    description: 'Understand modern web security threats, OWASP Top 10, secure authentication, API protection and practical application security.',
    tags: ['Cybersecurity', 'OWASP', 'Web Security', 'AppSec'],
    publisherId: 'admin-sec-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Security Operations & Editorial',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'Modern security vulnerabilities are rarely caused by cryptography failures; they stem from insecure defaults, flawed authentication flows, and lack of input sanitization. Every modern developer must adopt a "shift-left" security mindset.',
      sections: [
        {
          heading: 'The Evolving OWASP Threat Landscape',
          body: 'With APIs driving nearly all modern architectures, Broken Object Level Authorization (BOLA) and Broken Object Property Level Authorization (BOPLA) have become the most common vulnerabilities exploited in production applications.'
        },
        {
          heading: 'Core Developer Security Best Practices',
          bullets: [
            'Strict Parameterized Queries: Eliminate SQL and NoSQL injection vulnerabilities permanently.',
            'Robust Token & Session Lifecycles: Secure HttpOnly, SameSite cookies with short-lived tokens and cryptographically random refresh mechanics.',
            'CORS & Security Headers: Configuring Content Security Policy (CSP), HSTS, and X-Content-Type-Options properly.',
            'Zero Trust API Architecture: Re-evaluating permissions on every incoming request rather than trusting gateway assertions.'
          ]
        },
        {
          heading: 'Automated Security Scanners in CI/CD',
          body: 'Integrating static application security testing (SAST) and software composition analysis (SCA) into your automated build pipelines catches vulnerable open-source dependencies before code reaches staging.'
        }
      ],
      keyTakeaways: [
        'Authorization flaws in APIs remain the #1 threat in modern distributed systems.',
        'Never trust client input—validate, sanitize, and enforce strict type schemas on the backend.',
        'Incorporate automated security scanners into everyday Git commit workflows.'
      ]
    }
  },
  {
    id: 'ann-react-19-evolution',
    slug: 'react-19-and-the-evolution-of-modern-frontend-development',
    title: 'React 19 and the Evolution of Modern Frontend Development',
    category: 'Web Development',
    badge: null,
    upcomingDate: null,
    readTime: '4 min read',
    publishDate: '2026-11-03T11:20:00.000Z',
    formattedDate: 'Nov 3, 2026',
    coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
    description: 'Discover modern React capabilities, Server Components, Actions, improved rendering and evolving frontend architecture.',
    tags: ['React', 'JavaScript', 'Frontend', 'Next.js'],
    publisherId: 'admin-fe-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Frontend Engineering Lead',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'React 19 marks one of the most substantial leaps in frontend architecture, unifying server-side execution with client interactivity and eliminating manual re-render optimizations.',
      sections: [
        {
          heading: 'Server Components and Native Actions',
          body: 'React 19 standardizes asynchronous actions (`useActionState`, `useOptimistic`) and native form handling. Developers can now execute server mutations with progressive enhancement and built-in optimistic state rollbacks without excessive boilerplate.'
        },
        {
          heading: 'The React Compiler: Goodbye useMemo & useCallback',
          body: 'The groundbreaking React Compiler performs automatic memoization at build time. It analyzes JavaScript semantics and memoizes values and component trees automatically, ending years of manual dependency array management.'
        },
        {
          heading: 'Asset Loading and Document Metadata',
          bullets: [
            'Native support for `<title>`, `<meta>`, and `<link>` tags anywhere in component trees.',
            'Resource preloading hooks for stylesheets, fonts, and scripts to improve Core Web Vitals.',
            'Better hydration error reporting with detailed diff views.'
          ]
        }
      ],
      keyTakeaways: [
        'React Actions drastically simplify asynchronous form submission and optimistic updates.',
        'The React Compiler automates memoization, saving developer mental overhead.',
        'Server and client boundaries are now seamless and type-safe.'
      ]
    }
  },
  {
    id: 'ann-cloud-devops-modern-engineers',
    slug: 'cloud-computing-and-devops-skills-for-modern-engineers',
    title: 'Cloud Computing and DevOps: Skills for Modern Engineers',
    category: 'Cloud & DevOps',
    badge: null,
    upcomingDate: null,
    readTime: '4 min read',
    publishDate: '2026-11-02T09:45:00.000Z',
    formattedDate: 'Nov 2, 2026',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    description: 'Explore cloud infrastructure, Docker, CI/CD pipelines, containerization and deployment practices used by modern engineering teams.',
    tags: ['AWS', 'Docker', 'CI/CD', 'DevOps', 'Cloud'],
    publisherId: 'admin-devops-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Cloud Architecture & DevOps',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'The boundary between software engineering and cloud operations has dissolved. Modern product engineers are expected to own their code from local development all the way through automated container deployment and production observability.',
      sections: [
        {
          heading: 'Containerization & Multi-Stage Builds',
          body: 'Docker multi-stage builds ensure that build dependencies (compilers, linters, source files) never bloat the final production image. A lean 80MB runtime container boots in milliseconds and reduces the attack surface dramatically compared to bulky monolithic virtual machines.'
        },
        {
          heading: 'Infrastructure as Code (IaC)',
          body: 'Configuring servers via web consoles is a recipe for configuration drift. Modern teams define VPCs, databases, and container clusters declaratively using tools like Terraform, OpenTofu, and AWS CDK.'
        },
        {
          heading: 'Key DevOps Pillars for Software Engineers',
          bullets: [
            'Continuous Integration: Automated linting, test suites, and Docker image builds on every pull request.',
            'Continuous Delivery: Zero-downtime rolling updates and blue-green deployments.',
            'Telemetry & Observability: Distributed tracing (OpenTelemetry), log aggregation, and Prometheus metrics monitoring.'
          ]
        }
      ],
      keyTakeaways: [
        'Multi-stage Docker builds keep production containers lightweight and secure.',
        'Infrastructure should always be declarative, version-controlled, and reproducible.',
        'Observability must be built into features from day one, not bolted on after an outage.'
      ]
    }
  },
  {
    id: 'ann-system-design-interviews',
    slug: 'the-growing-importance-of-system-design-interviews',
    title: 'The Growing Importance of System Design Interviews',
    category: 'Career & Industry',
    badge: null,
    upcomingDate: null,
    readTime: '5 min read',
    publishDate: '2026-11-01T16:00:00.000Z',
    formattedDate: 'Nov 1, 2026',
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    description: 'Learn why scalable architecture, distributed systems, caching, load balancing and database design are essential skills for software engineers.',
    tags: ['System Design', 'Backend', 'Distributed Systems', 'Architecture'],
    publisherId: 'admin-career-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Career Mentorship & Platform Advisory',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'While coding rounds evaluate algorithmic proficiency, system design interviews determine engineering seniority. Industry teams prioritize engineers who can reason through trade-offs, scalability bottlenecks, and failure modes.',
      sections: [
        {
          heading: 'Beyond Coding: The Senior Engineering Bar',
          body: 'Companies want to understand how you handle ambiguity. System design questions intentionally start with vague scopes (e.g., "Design Twitter" or "Design a Global Rate Limiter") to test your ability to ask clarifying questions, estimate scale, and establish service-level objectives (SLOs).'
        },
        {
          heading: 'The Foundational Building Blocks',
          bullets: [
            'Load Balancing & Reverse Proxies: Layer 4 vs Layer 7 routing, round-robin, and consistent hashing.',
            'Distributed Caching: Cache-aside, write-through, write-back, and eviction policies (LRU/LFU).',
            'Database Scalability: Relational vs Document vs Key-Value, read replicas, partitioning, and sharding keys.',
            'Asynchronous Decoupling: Event-driven queues (Kafka, RabbitMQ) to handle traffic spikes smoothly.'
          ]
        },
        {
          heading: 'Navigating Trade-Offs & Failure Modes',
          body: 'There is no such thing as a "perfect" architecture—only trade-offs. Senior engineers excel at demonstrating why a certain approach was chosen under specific constraints (e.g., prioritizing availability over strict consistency during network partitions).'
        }
      ],
      keyTakeaways: [
        'System design rounds test engineering judgment, communication, and trade-off analysis.',
        'Master core distributed patterns: caching, message queues, load balancers, and database sharding.',
        'Always anchor your design around concrete scale estimates and realistic failure scenarios.'
      ]
    }
  },
  {
    id: 'ann-quantum-trends-2026',
    slug: 'quantum-computing-what-developers-need-to-know',
    title: 'Quantum Computing: What Developers Need to Know in 2026',
    category: 'Technology Trends',
    badge: 'TRENDING',
    upcomingDate: null,
    readTime: '4 min read',
    publishDate: '2026-10-31T12:00:00.000Z',
    formattedDate: 'Oct 31, 2026',
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
    description: 'An accessible guide to quantum algorithms, Qubits, superposition, and how hybrid classical-quantum cloud services are emerging.',
    tags: ['Quantum Computing', 'Tech Trends', 'Emerging Tech', 'Algorithms'],
    publisherId: 'admin-research-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Research & Emerging Tech',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'Quantum computing is rapidly moving from physics laboratories into developer-accessible cloud APIs. Major cloud providers now allow software engineers to simulate and dispatch quantum circuits using familiar languages like Python.',
      sections: [
        {
          heading: 'The Fundamental Leap: Qubits & Superposition',
          body: 'Unlike classical bits that exist in binary states (0 or 1), quantum bits (qubits) exploit quantum superposition and entanglement. This allows quantum algorithms to evaluate exponentially large computational solution spaces simultaneously.'
        },
        {
          heading: 'Real-World Quantum Domains',
          bullets: [
            'Molecular Simulation: Accelerating drug discovery and material science research.',
            'Combinatorial Optimization: Logistics routing, financial portfolio balancing, and supply chain scheduling.',
            'Post-Quantum Cryptography (PQC): Transitioning global cryptographic infrastructure to quantum-resistant lattice algorithms.'
          ]
        }
      ],
      keyTakeaways: [
        'Developers can start experimenting with quantum SDKs (Qiskit, Cirq) today on standard workstations.',
        'Post-quantum cryptography adoption is actively underway across global software architectures.'
      ]
    }
  },
  {
    id: 'ann-kafka-microservices-upcoming',
    slug: 'upcoming-microservices-event-driven-architecture-kafka',
    title: 'Upcoming: Microservices & Event-Driven Architecture with Kafka',
    category: 'Upcoming Courses',
    badge: 'UPCOMING',
    upcomingDate: 'Coming Soon',
    readTime: '3 min read',
    publishDate: '2026-10-30T10:15:00.000Z',
    formattedDate: 'Oct 30, 2026',
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    description: 'Master decoupled architectures, Apache Kafka streaming, event sourcing, CQRS patterns, and resilient distributed messaging.',
    tags: ['Kafka', 'Microservices', 'Event-Driven', 'Backend'],
    publisherId: 'admin-curriculum-01',
    publisherName: 'UpSkillR Admin',
    publisherRole: 'Curriculum & Course Development',
    targetAudience: 'GLOBAL',
    targetInstructorId: null,
    targetCourseIds: [],
    status: 'published',
    isPinned: false,
    content: {
      intro: 'Synchronous REST APIs break down when systems scale into dozens of interdependent services. We are crafting a brand new deep-dive course on event-driven microservices powered by Apache Kafka.',
      sections: [
        {
          heading: 'Why Event-Driven Systems Are Essential',
          body: 'Event streaming enables services to react to real-time events without tight coupling, temporal dependencies, or cascading system outages.'
        },
        {
          heading: 'Syllabus Highlights in Development',
          bullets: [
            'Apache Kafka Fundamentals: Topics, Partitions, Consumer Groups, and Commit Offsets.',
            'Event Sourcing & CQRS: Decoupling command writes from read query projections.',
            'Fault Tolerance & Idempotency: Handling duplicate messages and transactional outbox patterns.',
            'Schema Registry & Evolution: Maintaining backwards-compatible event contracts with Avro/Protobuf.'
          ]
        }
      ],
      keyTakeaways: [
        'Coming soon to the UpSkillR Course Library.',
        'Includes real-world distributed transaction and outbox pattern implementations in Node.js and Java.'
      ]
    }
  }
];

/**
 * Helper to fetch all announcements or filter by category
 */
export function getTrendingAnnouncements(category = 'All Updates') {
  if (!category || category === 'All Updates') {
    return MOCK_TRENDING_ANNOUNCEMENTS;
  }
  return MOCK_TRENDING_ANNOUNCEMENTS.filter((ann) => ann.category === category);
}

/**
 * Helper to find an announcement by its URL slug
 */
export function getAnnouncementBySlug(slug) {
  if (!slug) return null;
  return MOCK_TRENDING_ANNOUNCEMENTS.find((ann) => ann.slug === slug) || null;
}

/**
 * Helper to get count of announcements per category for filter badges
 */
export function getCategoryCounts() {
  const counts = {
    'All Updates': MOCK_TRENDING_ANNOUNCEMENTS.length
  };
  TRENDING_CATEGORIES.forEach((cat) => {
    if (cat !== 'All Updates') {
      counts[cat] = MOCK_TRENDING_ANNOUNCEMENTS.filter((a) => a.category === cat).length;
    }
  });
  return counts;
}
