export type FeatureCategory =
  | "learning"
  | "engagement"
  | "operations"
  | "assessment"
  | "ai_tools"
  | "analytics"
  | "security";

export type FeatureRole = "student" | "teacher" | "admin" | "finance" | "all";

export interface PlatformFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  icon?: string;
  routes?: string[];
  roles?: FeatureRole[];
  isEnabledByDefault?: boolean;
  status?: "active" | "beta" | "deprecated";
  isCustom?: boolean;
  badge?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const PLATFORM_FEATURES: PlatformFeature[] = [
  {
    id: "live_classes",
    name: "Live Classes & Video Streams",
    category: "learning",
    description: "Interactive real-time faculty video classes & stream links",
    icon: "Video",
    routes: ["/teacher/courses", "/student/courses"],
    roles: ["student", "teacher"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "course_management",
    name: "Course Authoring & Curriculum Management",
    category: "learning",
    description: "Comprehensive curriculum builder, lesson uploads, and syllabus tracking",
    icon: "BookOpen",
    routes: ["/admin/courses", "/teacher/courses", "/student/courses"],
    roles: ["admin", "teacher", "student"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "quizzes",
    name: "Interactive Timed Quizzes",
    category: "assessment",
    description: "Automated question banks, auto-evaluation, timers, and scoring engine",
    icon: "FileQuestion",
    routes: ["/teacher/courses", "/student/quiz"],
    roles: ["student", "teacher"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "assignments",
    name: "Assignment Submission Portal",
    category: "assessment",
    description: "Student assignment file uploads, grading criteria, reviews & deadlines",
    icon: "FileCheck",
    routes: ["/teacher/assignments", "/teacher/reviews", "/student/assignments"],
    roles: ["student", "teacher"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "ai_json_builder",
    name: "AI & JSON Bulk Course Importer",
    category: "ai_tools",
    description: "Autonomous curriculum generation with JSON bulk import/export schema",
    icon: "Cpu",
    routes: ["/teacher/courses/json-builder"],
    roles: ["teacher", "admin"],
    isEnabledByDefault: false,
    status: "active",
    badge: "AI Powered",
  },
  {
    id: "certificates",
    name: "20-Credit Domain Certificates",
    category: "engagement",
    description: "Automated verified course completion PDF credentials and grade transcriptions",
    icon: "Award",
    routes: ["/teacher/certificate-programs", "/student/grades"],
    roles: ["student", "teacher"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "gamification",
    name: "Daily Streaks & Aura XP Points",
    category: "engagement",
    description: "Student daily login streaks and aura leveling engine to boost engagement",
    icon: "Zap",
    routes: ["/student"],
    roles: ["student"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "leaderboard",
    name: "Student & Faculty Leaderboards",
    category: "engagement",
    description: "Campus-wide aura rankings and competitive academic standings",
    icon: "Trophy",
    routes: ["/student/leaderboard", "/teacher/leaderboard", "/admin/leaderboard"],
    roles: ["student", "teacher", "admin"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "attendance_tracker",
    name: "Live Session Attendance Tracker",
    category: "operations",
    description: "Automated classroom & session check-in logs and percentage reports",
    icon: "CheckSquare",
    routes: ["/teacher/attendance", "/student/attendance"],
    roles: ["student", "teacher"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "coupon_engine",
    name: "Coupon Engine & UPI QR Payments",
    category: "operations",
    description: "Discount vouchers, fee waivers, and UPI payment verification receipts",
    icon: "Tag",
    routes: ["/admin/billing"],
    roles: ["admin", "finance"],
    isEnabledByDefault: false,
    status: "active",
  },
  {
    id: "ticket_raising",
    name: "Help Center Ticket Support Desk",
    category: "operations",
    description: "Student, faculty, and administrative issue resolution and ticketing system",
    icon: "HelpCircle",
    routes: ["/student/help-center", "/teacher/help-center", "/admin/help-center"],
    roles: ["student", "teacher", "admin"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "advanced_analytics",
    name: "Institutional Analytics & Export",
    category: "analytics",
    description: "Detailed retention, completion rates, academic performance, and monitoring reports",
    icon: "BarChart3",
    routes: ["/admin/monitoring"],
    roles: ["admin"],
    isEnabledByDefault: false,
    status: "active",
  },
  {
    id: "calendar",
    name: "Academic Calendar & Timetable",
    category: "operations",
    description: "Synchronized college-wide calendar schedules, deadlines, and class alerts",
    icon: "Calendar",
    routes: ["/student/calendar", "/teacher/calendar", "/admin/calendar"],
    roles: ["student", "teacher", "admin"],
    isEnabledByDefault: true,
    status: "active",
  },
  {
    id: "inquiries",
    name: "Inquiries & Admission Leads",
    category: "operations",
    description: "Prospective student contact leads and admission workflow tracking",
    icon: "Mail",
    routes: ["/admin/inquiries"],
    roles: ["admin"],
    isEnabledByDefault: false,
    status: "active",
  },
  {
    id: "custom_branding",
    name: "Custom White-Label Branding",
    category: "operations",
    description: "Institutional logo, theme colors, and custom portal domain styling",
    icon: "Palette",
    routes: ["/admin/settings"],
    roles: ["admin"],
    isEnabledByDefault: false,
    status: "active",
  },
  {
    id: "user_management",
    name: "User Directory & Bulk Onboarding",
    category: "security",
    description: "Student and faculty roster management with CSV bulk enrollment",
    icon: "Users",
    routes: ["/admin/users"],
    roles: ["admin"],
    isEnabledByDefault: true,
    status: "active",
  },
];

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: "starter" | "pro" | "enterprise" | "custom";
  priceMonthlyINR: number;
  priceAnnualINR: number;
  isCustomQuote?: boolean;
  maxStudents: number;
  isUnlimitedStudents?: boolean;
  durationDays: number;
  features: string[]; // List of feature IDs
  isActive: boolean;
  isPopular?: boolean;
  customCollegeId?: string | null;
  customCollegeName?: string | null;
  badgeText?: string;
  accentColor?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-starter",
    name: "Starter Academic Tier",
    description: "Essential LMS tools for small colleges and individual academic departments.",
    tier: "starter",
    priceMonthlyINR: 4999,
    priceAnnualINR: 49999,
    maxStudents: 250,
    durationDays: 30,
    features: [
      "course_management",
      "assignments",
      "quizzes",
      "certificates",
      "attendance_tracker",
      "calendar",
      "ticket_raising",
      "user_management",
    ],
    isActive: true,
  },
  {
    id: "plan-pro",
    name: "Pro Growth Institutional Tier",
    description: "Comprehensive LMS suite with interactive live classes, streaks, and student engagement.",
    tier: "pro",
    priceMonthlyINR: 14999,
    priceAnnualINR: 149999,
    maxStudents: 1000,
    durationDays: 30,
    features: [
      "live_classes",
      "course_management",
      "quizzes",
      "assignments",
      "certificates",
      "gamification",
      "leaderboard",
      "attendance_tracker",
      "calendar",
      "ticket_raising",
      "user_management",
    ],
    isActive: true,
    isPopular: true,
    badgeText: "Recommended",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise University Suite",
    description: "Full multi-faculty platform with AI curriculum builder, coupons, and custom branding.",
    tier: "enterprise",
    priceMonthlyINR: 39999,
    priceAnnualINR: 399999,
    maxStudents: 5000,
    durationDays: 365,
    features: [
      "live_classes",
      "course_management",
      "quizzes",
      "assignments",
      "ai_json_builder",
      "certificates",
      "gamification",
      "leaderboard",
      "attendance_tracker",
      "coupon_engine",
      "ticket_raising",
      "advanced_analytics",
      "calendar",
      "inquiries",
      "custom_branding",
      "user_management",
    ],
    isActive: true,
  },
  {
    id: "plan-custom-campus",
    name: "Bespoke Autonomous Campus",
    description: "Tailor-made institutional deployment with custom-selected modules, dedicated SLA, and unlimited capacity.",
    tier: "custom",
    priceMonthlyINR: 59999,
    priceAnnualINR: 599999,
    isCustomQuote: false,
    maxStudents: 15000,
    isUnlimitedStudents: false,
    durationDays: 365,
    features: [
      "live_classes",
      "course_management",
      "quizzes",
      "assignments",
      "ai_json_builder",
      "certificates",
      "gamification",
      "leaderboard",
      "attendance_tracker",
      "coupon_engine",
      "ticket_raising",
      "advanced_analytics",
      "calendar",
      "inquiries",
      "custom_branding",
      "user_management",
    ],
    isActive: true,
    badgeText: "Custom Built",
  },
];
