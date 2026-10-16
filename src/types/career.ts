export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  jobType: "Full-time" | "Part-time" | "Remote" | "Hybrid" | "Internship";
  experienceLevel: "Fresh Graduate" | "1-3 Years" | "3-5 Years" | "5+ Years" | "Lead / Principal";
  salaryRange: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  email: string;
  phone: string;
  location: string;
  experienceLevel: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl: string;
  coverLetter?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  status: "pending" | "reviewing" | "shortlisted" | "interview_scheduled" | "rejected" | "hired";
  adminNotes?: string;
  createdAt: string;
}

export const JOB_DEPARTMENTS = [
  "Engineering & Cloud",
  "AI & Autonomous Learning",
  "Product & Design",
  "Sales & University Alliances",
  "Academic Success & NEP Compliance",
  "Operations & Finance",
] as const;

export const DEFAULT_JOB_OPENINGS: JobOpening[] = [
  {
    id: "job-ai-curriculum-architect",
    title: "Senior AI Curriculum & Prompt Architect",
    department: "AI & Autonomous Learning",
    location: "Bengaluru / Hybrid",
    jobType: "Full-time",
    experienceLevel: "3-5 Years",
    salaryRange: "₹18 LPA - ₹28 LPA + ESOPs",
    description: "Design autonomous AI curriculum builders, Bloom's Taxonomy question generators, and adaptive educational pipelines that power Orbit LMS for 100+ universities.",
    responsibilities: [
      "Architect LLM prompt chains and structured JSON schema course generators.",
      "Collaborate with Indian academic deans to map UGC & NEP 2020 syllabus structures.",
      "Optimize inference latency and streaming outputs for high-volume student quizzes.",
      "Build automated verification algorithms that audit course credits and question difficulty.",
    ],
    requirements: [
      "Hands-on experience with TypeScript, Python, OpenAI/Anthropic APIs, and LangChain/LlamaIndex.",
      "Strong understanding of Higher Education syllabus structures or Bloom's Taxonomy.",
      "Experience with Supabase/PostgreSQL vector stores and embeddings.",
      "Excellent communication skills for university partner demos.",
    ],
    benefits: [
      "Competitive Salary + Meaningful ESOP pool.",
      "Comprehensive medical insurance for employee & family.",
      "Flexible hybrid working culture with latest Apple MacBook Pro.",
      "Annual academic research & continuous learning stipend.",
    ],
    isActive: true,
    createdAt: "2026-03-10T10:00:00Z",
  },
  {
    id: "job-fullstack-edtech-engineer",
    title: "Full-Stack EdTech Software Engineer",
    department: "Engineering & Cloud",
    location: "Remote (India)",
    jobType: "Full-time",
    experienceLevel: "1-3 Years",
    salaryRange: "₹12 LPA - ₹20 LPA",
    description: "Build robust multi-tenant LMS features including anti-piracy dynamic DRM video streaming, real-time student leaderboards, and institutional grading portals.",
    responsibilities: [
      "Develop responsive frontend interfaces using React, Tailwind CSS, TypeScript, and Vite.",
      "Design secure Row Level Security (RLS) PostgreSQL database schemas in Supabase.",
      "Implement client-side DRM canvas watermarking and screen recording deterrence hooks.",
      "Optimize real-time WebSockets and gamified Aura XP event delivery for 100k+ concurrent learners.",
    ],
    requirements: [
      "Proven proficiency in React, TypeScript, Node.js, and modern CSS frameworks.",
      "Deep understanding of relational databases (PostgreSQL/Supabase) and strict auth models.",
      "Familiarity with HLS video streaming, Canvas API, or WebRTC is a strong plus.",
      "Strong portfolio or open-source contributions.",
    ],
    benefits: [
      "100% Remote-first working arrangement across India.",
      "Home office setup reimbursement (₹50,000 one-time).",
      "Generous wellness, health insurance, and paid time off.",
      "Mentorship from veteran SaaS and EdTech founders.",
    ],
    isActive: true,
    createdAt: "2026-03-15T11:30:00Z",
  },
  {
    id: "job-university-partnerships-lead",
    title: "Higher Education Enterprise Sales & Campus Alliances Lead",
    department: "Sales & University Alliances",
    location: "Noida / Delhi NCR (On-site & Travel)",
    jobType: "Full-time",
    experienceLevel: "3-5 Years",
    salaryRange: "₹14 LPA - ₹24 LPA + High Performance Incentives",
    description: "Lead institutional SaaS sales and executive partnerships with Indian private universities, autonomous colleges, and state higher education institutions.",
    responsibilities: [
      "Engage Vice-Chancellors, Registrars, and IT Directors to showcase Orbit LMS capabilities.",
      "Present ROI demonstrations on NEP 2020 DigiLocker credit bank automation and anti-piracy lecture streaming.",
      "Manage end-to-end RFP submissions, contract negotiations, and multi-year institutional licenses.",
      "Coordinate with campus onboarding teams to ensure seamless faculty deployment.",
    ],
    requirements: [
      "3+ years of enterprise SaaS or Higher EdTech sales experience in India.",
      "Established network among Indian college principals, university deans, and education groups.",
      "Strong consultative presentation skills and command of NEP 2020 regulations.",
      "Willingness to travel across regional university clusters.",
    ],
    benefits: [
      "Uncapped performance bonuses & quarterly incentives.",
      "Company travel allowances and premium campus hospitality.",
      "Health & life insurance coverage.",
      "Fast-track career trajectory to Regional VP of Institutional Alliances.",
    ],
    isActive: true,
    createdAt: "2026-03-20T14:00:00Z",
  },
  {
    id: "job-uiux-product-designer",
    title: "Senior UI/UX Product Designer (Design Systems)",
    department: "Product & Design",
    location: "Bengaluru / Hybrid",
    jobType: "Full-time",
    experienceLevel: "3-5 Years",
    salaryRange: "₹15 LPA - ₹22 LPA",
    description: "Craft world-class student dashboards, interactive course players, and high-impact administrative analytics interfaces that delight campus users daily.",
    responsibilities: [
      "Design intuitive web and mobile web experiences for faculty, administrators, and students.",
      "Maintain and evolve Orbit's sleek dark/light modern design system and component libraries in Figma.",
      "Conduct user research interviews with university professors and college students.",
      "Partner with frontend engineers to ensure pixel-perfect CSS and smooth micro-animations.",
    ],
    requirements: [
      "Stunning Figma portfolio demonstrating complex SaaS dashboards or learning apps.",
      "Strong mastery of typography, information hierarchy, and responsive design systems.",
      "Deep understanding of accessibility (WCAG), micro-interactions, and usability testing.",
      "Basic understanding of Tailwind CSS or HTML/CSS implementation constraints.",
    ],
    benefits: [
      "Hybrid flexible work week.",
      "Latest M-series MacBook Pro and dual 4K monitor desk setup.",
      "Annual Figma Config / UX conference sponsorship.",
      "Comprehensive family health insurance.",
    ],
    isActive: true,
    createdAt: "2026-03-22T09:00:00Z",
  },
];

export const DEFAULT_JOB_APPLICATIONS: JobApplication[] = [
  {
    id: "app-101",
    jobId: "job-fullstack-edtech-engineer",
    jobTitle: "Full-Stack EdTech Software Engineer",
    candidateName: "Priyanka Nair",
    email: "priyanka.nair98@gmail.com",
    phone: "+91 98765 43210",
    location: "Pune, Maharashtra",
    experienceLevel: "3-5 Years",
    linkedinUrl: "https://linkedin.com/in/priyanka-nair-dev",
    portfolioUrl: "https://github.com/priyankanair",
    resumeUrl: "https://drive.google.com/file/d/priyanka-nair-resume/view",
    coverLetter: "I have 3.5 years of experience building scalable React and Node.js applications with Supabase. I built an online proctoring dashboard for a coding bootcamp and would love to contribute to Orbit LMS's anti-piracy streaming engine.",
    expectedCtc: "₹16 LPA",
    noticePeriod: "15 Days",
    status: "shortlisted",
    adminNotes: "Strong candidate with solid PostgreSQL RLS experience. Recommended for Technical Round 1.",
    createdAt: "2026-04-01T14:20:00Z",
  },
  {
    id: "app-102",
    jobId: "job-ai-curriculum-architect",
    jobTitle: "Senior AI Curriculum & Prompt Architect",
    candidateName: "Dr. Aakash Sengupta",
    email: "aakash.sengupta.ai@outlook.com",
    phone: "+91 91234 56789",
    location: "Bengaluru, Karnataka",
    experienceLevel: "5+ Years",
    linkedinUrl: "https://linkedin.com/in/aakash-sengupta-phd",
    portfolioUrl: "https://scholar.google.com/citations?user=aakash-ai",
    resumeUrl: "https://drive.google.com/file/d/aakash-sengupta-cv/view",
    coverLetter: "Ph.D. in Computer Science with focus on Natural Language Processing for educational assessment. I have authored 4 IEEE papers on Bloom's Taxonomy question generation and built automated curriculum pipelines using Claude 3.5 and GPT-4.",
    expectedCtc: "₹26 LPA",
    noticePeriod: "Immediate",
    status: "interview_scheduled",
    adminNotes: "Outstanding AI background. Interview scheduled with Master Admin for Friday 3 PM.",
    createdAt: "2026-04-03T10:15:00Z",
  },
  {
    id: "app-103",
    jobId: "job-university-partnerships-lead",
    jobTitle: "Higher Education Enterprise Sales & Campus Alliances Lead",
    candidateName: "Rohan Varma",
    email: "rohan.varma.sales@gmail.com",
    phone: "+91 99887 76655",
    location: "Delhi NCR",
    experienceLevel: "3-5 Years",
    linkedinUrl: "https://linkedin.com/in/rohan-varma-edtech",
    resumeUrl: "https://drive.google.com/file/d/rohan-varma-sales-profile/view",
    coverLetter: "Closed over ₹4.5 Crore in annual institutional software contracts with private universities across North India over the past 3 years. Excited by Orbit LMS's NEP 2020 credit engine.",
    expectedCtc: "₹20 LPA + Incentives",
    noticePeriod: "30 Days",
    status: "pending",
    adminNotes: "Impressive enterprise track record. Reviewing university client references.",
    createdAt: "2026-04-06T16:45:00Z",
  },
];
