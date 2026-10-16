export type PlatformPermission =
  // Colleges & Tenants
  | "view_colleges"
  | "manage_colleges"
  | "toggle_maintenance"
  // Plans & Features
  | "view_plans"
  | "manage_plans"
  // Accounts & Users
  | "view_accounts"
  | "manage_accounts"
  | "export_accounts"
  // Courses
  | "view_courses"
  | "moderate_courses"
  // Billing & Invoices
  | "view_billing"
  | "generate_invoices"
  | "send_reminders"
  // SEO Blogs
  | "view_blogs"
  | "publish_blogs"
  // Careers & Hiring
  | "view_careers"
  | "manage_jobs"
  | "review_applications"
  // Analytics
  | "view_analytics"
  | "export_analytics"
  // System Monitoring & Latency
  | "system_monitoring"
  // Role & Staff Delegation (Master Admin exclusive)
  | "manage_roles";

export interface PermissionDefinition {
  id: PlatformPermission;
  name: string;
  description: string;
  category: 
    | "Colleges & Tenants"
    | "Plans & Feature Checklist"
    | "User Accounts"
    | "Course Explorer"
    | "Billing & Invoices"
    | "SEO Blogs Engine"
    | "Careers & Hiring"
    | "Platform Analytics"
    | "Infrastructure & Monitoring"
    | "Staff & Access Control";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Colleges & Tenants
  {
    id: "view_colleges",
    name: "View Colleges Directory",
    description: "Browse registered universities, campuses, active status, and key contacts",
    category: "Colleges & Tenants",
  },
  {
    id: "manage_colleges",
    name: "Manage Colleges & Onboarding",
    description: "Create new college accounts, edit domains, assign plans, and impersonate tenant admins",
    category: "Colleges & Tenants",
  },
  {
    id: "toggle_maintenance",
    name: "Tenant Maintenance Kill-Switch",
    description: "Turn college service ON/OFF, lock down portals with maintenance screens",
    category: "Colleges & Tenants",
  },

  // Plans & Feature Checklist
  {
    id: "view_plans",
    name: "View Subscription Plans",
    description: "Inspect SaaS tiers, monthly/annual pricing, and feature checklists",
    category: "Plans & Feature Checklist",
  },
  {
    id: "manage_plans",
    name: "Manage Plans & Pricing",
    description: "Create tiers, edit limits, update landing page pricing, and sync feature checklists",
    category: "Plans & Feature Checklist",
  },

  // User Accounts
  {
    id: "view_accounts",
    name: "View All Accounts",
    description: "Inspect student, teacher, and institutional admin profiles across all colleges",
    category: "User Accounts",
  },
  {
    id: "manage_accounts",
    name: "Manage User Accounts",
    description: "Edit credentials, suspend/reactivate accounts, and unlock users",
    category: "User Accounts",
  },
  {
    id: "export_accounts",
    name: "Export Accounts Data",
    description: "Export cross-tenant student, faculty, and administrator rosters to CSV/JSON",
    category: "User Accounts",
  },

  // Course Explorer
  {
    id: "view_courses",
    name: "Browse Course Catalog",
    description: "Inspect syllabus, modules, quizzes, and multimedia lessons across all institutions",
    category: "Course Explorer",
  },
  {
    id: "moderate_courses",
    name: "Moderate & Audit Courses",
    description: "Approve, flag, or take down academic content violating SaaS policies",
    category: "Course Explorer",
  },

  // Billing & Invoices
  {
    id: "view_billing",
    name: "View Invoices & Financials",
    description: "Track gross SaaS revenue, college invoice statuses, and payment histories",
    category: "Billing & Invoices",
  },
  {
    id: "generate_invoices",
    name: "Create & Issue Invoices",
    description: "Generate student-headcount based invoices, seal digital PDFs, and stamp bills",
    category: "Billing & Invoices",
  },
  {
    id: "send_reminders",
    name: "Dispatch Payment Reminders",
    description: "Send automated WhatsApp, email, and SMS alerts for upcoming or overdue subscription fees",
    category: "Billing & Invoices",
  },

  // SEO Blogs Engine
  {
    id: "view_blogs",
    name: "View Knowledge Hub & Blogs",
    description: "Read draft and published articles, search performance, and social preview assets",
    category: "SEO Blogs Engine",
  },
  {
    id: "publish_blogs",
    name: "Publish & Edit SEO Articles",
    description: "Write long-form blogs, configure Google SERP snippets, and inject JSON-LD schemas",
    category: "SEO Blogs Engine",
  },

  // Careers & Hiring
  {
    id: "view_careers",
    name: "View Job Openings & Pipeline",
    description: "Inspect open headcount, hiring departments, and candidate applications",
    category: "Careers & Hiring",
  },
  {
    id: "manage_jobs",
    name: "Create & Manage Job Postings",
    description: "Publish job vacancies to the public `/careers` portal and set CTC ranges",
    category: "Careers & Hiring",
  },
  {
    id: "review_applications",
    name: "Review & Screen Candidates",
    description: "Download resumes, update hiring stages, and trigger interview invitations via WhatsApp/Email",
    category: "Careers & Hiring",
  },

  // Platform Analytics
  {
    id: "view_analytics",
    name: "View System & Usage Analytics",
    description: "Monitor daily active users, course consumption trends, and college engagement scores",
    category: "Platform Analytics",
  },
  {
    id: "export_analytics",
    name: "Export Platform Analytics",
    description: "Download executive performance reports, revenue cohorts, and churn diagnostics",
    category: "Platform Analytics",
  },

  // System Monitoring
  {
    id: "system_monitoring",
    name: "Infrastructure & Server Monitoring",
    description: "Monitor PostgreSQL query latency, API throughput, Redis cache hits, and server health",
    category: "Infrastructure & Monitoring",
  },

  // Staff & Access Control
  {
    id: "manage_roles",
    name: "Manage Staff Roles & Access Control",
    description: "Define custom staff roles, assign delegates, and configure granular platform permissions",
    category: "Staff & Access Control",
  },
];

export interface MasterRole {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  permissions: PlatformPermission[];
  isSystem: boolean;
  assignedUsersCount?: number;
  created_at: string;
  updated_at: string;
}

export interface MasterStaffMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  roleSlug: string;
  roleName: string;
  status: "active" | "suspended" | "invited";
  avatar?: string;
  passwordHash?: string;
  lastLogin?: string;
  created_at: string;
}

export const DEFAULT_ROLES: MasterRole[] = [
  {
    id: "role_master_admin",
    name: "Master Admin / Super Admin",
    slug: "super_admin",
    description: "Unrestricted root authority across all colleges, databases, billing, and platform settings.",
    color: "from-amber-500 to-red-600",
    permissions: ALL_PERMISSIONS.map((p) => p.id),
    isSystem: true,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "role_tech_architect",
    name: "Technical Architect",
    slug: "tech_architect",
    description: "Handles infrastructure resilience, server monitoring, database latency, course audit, and maintenance modes on behalf of Master Admin.",
    color: "from-blue-600 to-indigo-600",
    permissions: [
      "view_colleges",
      "toggle_maintenance",
      "view_courses",
      "moderate_courses",
      "view_accounts",
      "view_analytics",
      "system_monitoring",
    ],
    isSystem: false,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "role_platform_ops",
    name: "Platform Operations Lead",
    slug: "platform_ops",
    description: "Orchestrates tenant university onboarding, maintenance status, user management, and course audits.",
    color: "from-emerald-600 to-teal-600",
    permissions: [
      "view_colleges",
      "manage_colleges",
      "toggle_maintenance",
      "view_accounts",
      "manage_accounts",
      "view_courses",
      "view_analytics",
    ],
    isSystem: false,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "role_finance_director",
    name: "Finance & Billing Director",
    slug: "finance_director",
    description: "Supervises subscription tiers, college invoice generation, payment reminders, and revenue health.",
    color: "from-purple-600 to-pink-600",
    permissions: [
      "view_colleges",
      "view_plans",
      "manage_plans",
      "view_accounts",
      "export_accounts",
      "view_billing",
      "generate_invoices",
      "send_reminders",
      "view_analytics",
      "export_analytics",
    ],
    isSystem: false,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "role_seo_editor",
    name: "Content & SEO Strategist",
    slug: "seo_editor",
    description: "Authors and publishes SEO-optimized blogs, manages schema markups, and tracks platform readership metrics.",
    color: "from-cyan-600 to-blue-500",
    permissions: [
      "view_blogs",
      "publish_blogs",
      "view_analytics",
    ],
    isSystem: false,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "role_talent_lead",
    name: "Head of Talent & Recruitment",
    slug: "talent_lead",
    description: "Manages Orbit LMS career openings, reviews incoming talent applications, and coordinates interview workflows.",
    color: "from-orange-500 to-amber-600",
    permissions: [
      "view_careers",
      "manage_jobs",
      "review_applications",
    ],
    isSystem: false,
    assignedUsersCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEFAULT_STAFF: MasterStaffMember[] = [
  {
    id: "staff_vikram_architect",
    fullName: "Vikram Sharma",
    email: "vikram.architect@orbitlms.in",
    phone: "+91 98765 43210",
    department: "Cloud Engineering & Architecture",
    roleSlug: "tech_architect",
    roleName: "Technical Architect",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-10-15 18:42",
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "staff_ananya_ops",
    fullName: "Ananya Iyer",
    email: "ananya.ops@orbitlms.in",
    phone: "+91 98765 88990",
    department: "Platform Operations & Quality",
    roleSlug: "platform_ops",
    roleName: "Platform Operations Lead",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-10-15 14:15",
    created_at: "2026-09-05T11:30:00Z",
  },
  {
    id: "staff_rohit_finance",
    fullName: "Rohit Deshmukh",
    email: "rohit.finance@orbitlms.in",
    phone: "+91 98220 11223",
    department: "Corporate Finance & Treasury",
    roleSlug: "finance_director",
    roleName: "Finance & Billing Director",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-10-14 09:20",
    created_at: "2026-09-10T14:00:00Z",
  },
  {
    id: "staff_priya_seo",
    fullName: "Priya Nair",
    email: "priya.seo@orbitlms.in",
    phone: "+91 98111 22334",
    department: "Growth & Digital Marketing",
    roleSlug: "seo_editor",
    roleName: "Content & SEO Strategist",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-10-15 21:05",
    created_at: "2026-09-12T16:20:00Z",
  },
  {
    id: "staff_rahul_talent",
    fullName: "Rahul Verma",
    email: "rahul.talent@orbitlms.in",
    phone: "+91 98450 77889",
    department: "People & Talent Acquisition",
    roleSlug: "talent_lead",
    roleName: "Head of Talent & Recruitment",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-10-13 17:50",
    created_at: "2026-09-15T12:00:00Z",
  },
];
