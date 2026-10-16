export interface PlatformFeature {
  id: string;
  name: string;
  category: "learning" | "engagement" | "operations";
  description: string;
}

export const PLATFORM_FEATURES: PlatformFeature[] = [
  {
    id: "live_classes",
    name: "Live Classes & Video Streams",
    category: "learning",
    description: "Interactive real-time faculty video classes & stream links",
  },
  {
    id: "quizzes",
    name: "Interactive Timed Quizzes",
    category: "learning",
    description: "Automated question banks, auto-evaluation and timers",
  },
  {
    id: "assignments",
    name: "Assignment Submission Portal",
    category: "learning",
    description: "Student assignment file uploads, grading & deadlines",
  },
  {
    id: "ai_json_builder",
    name: "AI & JSON Bulk Course Importer",
    category: "learning",
    description: "Fast course curriculum builder with JSON import/export",
  },
  {
    id: "certificates",
    name: "20-Credit Domain Certificates",
    category: "engagement",
    description: "Automated verified course completion PDF credentials",
  },
  {
    id: "gamification",
    name: "Daily Streaks & Aura XP Points",
    category: "engagement",
    description: "Student daily login streaks and aura leveling engine",
  },
  {
    id: "leaderboard",
    name: "Student & Faculty Leaderboards",
    category: "engagement",
    description: "Campus-wide aura rankings and competitive standings",
  },
  {
    id: "attendance_tracker",
    name: "Live Session Attendance Tracker",
    category: "engagement",
    description: "Automated session check-in logs and percentage reports",
  },
  {
    id: "coupon_engine",
    name: "Coupon Engine & UPI QR Payments",
    category: "operations",
    description: "Discount vouchers and UPI payment verification",
  },
  {
    id: "ticket_raising",
    name: "Help Center Ticket Support Desk",
    category: "operations",
    description: "Student, faculty, and administrative issue resolution",
  },
  {
    id: "advanced_analytics",
    name: "Institutional Analytics & Export",
    category: "operations",
    description: "Detailed retention, completion and academic reports",
  },
  {
    id: "custom_branding",
    name: "Custom White-Label Branding",
    category: "operations",
    description: "Institutional logo, theme colors and custom portal header",
  },
];

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: "starter" | "pro" | "enterprise" | "custom";
  priceMonthlyINR: number;
  priceAnnualINR: number;
  maxStudents: number;
  durationDays: number;
  features: string[]; // List of feature IDs
  isActive: boolean;
  isPopular?: boolean;
  createdAt?: string;
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
      "assignments",
      "quizzes",
      "certificates",
      "attendance_tracker",
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
      "quizzes",
      "assignments",
      "certificates",
      "gamification",
      "leaderboard",
      "ticket_raising",
      "attendance_tracker",
    ],
    isActive: true,
    isPopular: true,
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
      "custom_branding",
    ],
    isActive: true,
  },
  {
    id: "plan-ai-accelerator",
    name: "AI Autonomous Campus Tier",
    description: "Unlimited student capacity with next-generation AI agents and dedicated cloud compute.",
    tier: "custom",
    priceMonthlyINR: 59999,
    priceAnnualINR: 599999,
    maxStudents: 15000,
    durationDays: 365,
    features: [
      "live_classes",
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
      "custom_branding",
    ],
    isActive: true,
  },
];
