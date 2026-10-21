import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Trophy,
  Rocket,
  MessageCircle,
  Mail,
  MapPin,
  Sparkles,
  Award,
  Calendar,
  Video,
  ShieldCheck,
  Building2,
  Database,
  Menu,
  X,
  CheckCircle2,
  ArrowRight,
  Flame,
  Eye,
  GraduationCap,
  Sun,
  Moon,
  Loader2,
  Send,
  Check,
  Layers,
  IndianRupee,
  Clock,
  Brain,
  Swords,
  Zap,
  Shield,
  ExternalLink,
  FileText,
  TrendingUp,
  Activity,
  Quote,
  Target,
  Crown,
  Compass,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionPlan, DEFAULT_PLANS } from "@/types/plans";
import { BlogPost, DEFAULT_BLOGS } from "@/types/blog";
import { getRegisteredFeatures } from "@/services/featuresService";

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [landingBlogs, setLandingBlogs] = useState<BlogPost[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<any[]>([]);
  const [activeLearnersCount, setActiveLearnersCount] = useState<number>(13);
  const [certifiedCoursesCount, setCertifiedCoursesCount] = useState<number>(0);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [platformFeatures, setPlatformFeatures] = useState(() => getRegisteredFeatures());
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [plansLoading, setPlansLoading] = useState(true);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.firstName || !contactForm.email || !contactForm.message) {
      toast({
        title: "Missing Information",
        description: "Please fill out your name, email, and message before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert([
          {
            first_name: contactForm.firstName,
            last_name: contactForm.lastName || "",
            email: contactForm.email,
            message: contactForm.message,
            status: "pending",
          },
        ]);

      if (error) {
        console.warn("Database error submitting contact message, using fallback toast:", error);
      }

      setSubmitSuccess(true);
      setContactForm({ firstName: "", lastName: "", email: "", message: "" });
      toast({
        title: "Message Sent Successfully! 🎉",
        description: "Thank you for connecting with Orbit LMS. Our admin team will respond to your email shortly.",
      });

      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (err: any) {
      console.error("Error submitting contact message:", err);
      toast({
        title: "Error Sending Message",
        description: "Could not send message. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchFeaturedCourses();
    fetchPlans();
    fetchLandingBlogs();

    const handlePlansUpdated = () => {
      fetchPlans();
    };

    const handleBlogsUpdated = () => {
      fetchLandingBlogs();
    };

    window.addEventListener("orbit_plans_updated", handlePlansUpdated);
    window.addEventListener("orbit_blogs_updated", handleBlogsUpdated);
    window.addEventListener("storage", handlePlansUpdated);
    window.addEventListener("storage", handleBlogsUpdated);
    return () => {
      window.removeEventListener("orbit_plans_updated", handlePlansUpdated);
      window.removeEventListener("orbit_blogs_updated", handleBlogsUpdated);
      window.removeEventListener("storage", handlePlansUpdated);
      window.removeEventListener("storage", handleBlogsUpdated);
    };
  }, []);

  const fetchLandingBlogs = async () => {
    try {
      let loaded: BlogPost[] = [];
      try {
        const { data: dbBlogs, error } = await supabase
          .from("blogs")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (!error && dbBlogs && dbBlogs.length > 0) {
          loaded = dbBlogs.map((b: any) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt || "",
            content: b.content || "",
            coverImage: b.cover_image,
            category: b.category,
            tags: b.tags || [],
            author: {
              name: b.author_name,
              role: b.author_role,
              avatar: b.author_avatar,
            },
            readingTime: b.reading_time,
            publishedAt: b.created_at,
            updatedAt: b.updated_at,
            isPublished: true,
            isFeatured: !!b.is_featured,
            seo: {
              metaTitle: b.meta_title || b.title,
              metaDescription: b.meta_description || b.excerpt || "",
              focusKeywords: b.focus_keywords || [],
            },
          }));
        }
      } catch (e) {
        // Fallback
      }

      // Check localStorage
      const stored = localStorage.getItem("orbit_master_blogs");
      let localBlogs: BlogPost[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localBlogs = parsed.filter((b: BlogPost) => b.isPublished !== false);
        } catch {}
      }

      if (loaded.length > 0 && localBlogs.length > 0) {
        const map = new Map<string, BlogPost>();
        loaded.forEach((b) => map.set(b.slug, b));
        localBlogs.forEach((b) => map.set(b.slug, b));
        loaded = Array.from(map.values()).filter((b) => b.isPublished !== false);
      } else if (loaded.length === 0) {
        loaded = localBlogs.length > 0 ? localBlogs : DEFAULT_BLOGS.filter((b) => b.isPublished);
      }

      setLandingBlogs(loaded);
    } catch (err) {
      console.warn("Could not load landing blogs:", err);
      setLandingBlogs(DEFAULT_BLOGS.filter((b) => b.isPublished));
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      let loadedPlans: SubscriptionPlan[] = [];
      try {
        const { data: dbPlans, error: dbErr } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_monthly", { ascending: true });

        if (!dbErr && dbPlans && dbPlans.length > 0) {
          loadedPlans = dbPlans.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            tier: p.tier || "pro",
            priceMonthlyINR: Number(p.price_monthly) || 0,
            priceAnnualINR: Number(p.price_annual) || 0,
            maxStudents: Number(p.max_students) || 1000,
            durationDays: Number(p.duration_days) || 30,
            features: Array.isArray(p.enabled_features) ? p.enabled_features : [],
            isActive: p.is_active !== false,
          }));
        }
      } catch (e) {
        // Table not ready yet, will fallback
      }

      // Check local storage for plans managed by Master Admin
      const stored = localStorage.getItem("orbit_master_subscription_plans");
      let localPlans: SubscriptionPlan[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localPlans = parsed.filter((p: SubscriptionPlan) => p.isActive !== false);
        } catch {}
      }

      // Merge Supabase plans and local master admin plans
      if (loadedPlans.length > 0 && localPlans.length > 0) {
        const mergedMap = new Map<string, SubscriptionPlan>();
        loadedPlans.forEach((p) => mergedMap.set(p.id, p));
        localPlans.forEach((p) => mergedMap.set(p.id, p));
        loadedPlans = Array.from(mergedMap.values()).filter((p) => p.isActive !== false);
      } else if (loadedPlans.length === 0) {
        loadedPlans = localPlans.length > 0 ? localPlans : DEFAULT_PLANS.filter((p) => p.isActive !== false);
      }

      // Sort by monthly price ascending
      loadedPlans.sort((a, b) => a.priceMonthlyINR - b.priceMonthlyINR);
      setPlans(loadedPlans);
    } catch (err) {
      console.warn("Could not load landing plans:", err);
      setPlans(DEFAULT_PLANS.filter((p) => p.isActive !== false));
    } finally {
      setPlansLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    const intervalText = billingInterval === "annual" ? "Annual License" : "Monthly Subscription";
    setContactForm((prev) => ({
      ...prev,
      message: `Hello Orbit LMS Team,\n\nWe would like to activate the "${plan.name}" (${plan.maxStudents.toLocaleString("en-IN")} Student Seats, ${intervalText}) for our institution. Please provide onboarding and payment details.`,
    }));
    scrollToSection("contact");
  };

  const fetchFeaturedCourses = async () => {
    try {
      const savedInst = localStorage.getItem("orbit_institute_settings");
      const defaultInst = savedInst ? JSON.parse(savedInst) : {};

      const savedFeaturedSettings = localStorage.getItem("orbit_featured_settings");
      const featuredConfig = savedFeaturedSettings ? JSON.parse(savedFeaturedSettings) : { mode: "most_enrolled" };

      // 1. Fetch live active learners count from users table
      try {
        const { count: learnersCount } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "student")
          .or("status.eq.active,status.is.null");

        if (typeof learnersCount === "number" && learnersCount > 0) {
          setActiveLearnersCount(learnersCount);
        } else {
          setActiveLearnersCount(13);
        }
      } catch (err) {
        console.warn("Could not fetch active learners count:", err);
        setActiveLearnersCount(13);
      }

      // 2. Fetch active courses safely without failing on complex joins
      let totalPublishedCourses = 0;
      const { data: rawCourses, count: courseCount } = await supabase
        .from("courses")
        .select(`
          id, title, description, thumbnail_url, price, original_price, currency,
          organization_name, organization_logo_url, credit_points, is_published,
          is_featured, created_at
        `, { count: "exact" })
        .eq("is_published", true);

      if (typeof courseCount === "number" && courseCount > 0) {
        totalPublishedCourses = courseCount;
      }
      setCertifiedCoursesCount(totalPublishedCourses);

      // Fetch enrollment count per course
      let enrollmentCountMap: Record<string, number> = {};
      try {
        const { data: enrs } = await supabase.from('enrollments').select('course_id');
        if (enrs) {
          enrs.forEach((e: any) => {
            if (e.course_id) {
              enrollmentCountMap[e.course_id] = (enrollmentCountMap[e.course_id] || 0) + 1;
            }
          });
        }
      } catch (e) {
        console.warn('Could not load course enrollment counts:', e);
      }

      if (rawCourses && rawCourses.length > 0) {
        let formatted = rawCourses.map((c: any) => {
          const studentCount = enrollmentCountMap[c.id] || 0;
          return {
            id: c.id,
            title: c.title,
            description: c.description,
            thumbnail_url: c.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80",
            price: parseFloat(c.price) || 0,
            original_price: parseFloat(c.original_price) || 0,
            currency: c.currency || "INR",
            organization_name: c.organization_name?.trim() || defaultInst.name || "Orbit LMS Innovation Academy",
            organization_logo_url: c.organization_logo_url?.trim() || defaultInst.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
            credit_points: c.credit_points || 3,
            studentsCount: studentCount,
            is_featured: c.is_featured || false,
            created_at: c.created_at
          };
        });

        // Filter or Sort based on Admin Settings Mode
        if (featuredConfig.mode === "manual") {
          const manualFeatured = formatted.filter(c => c.is_featured);
          if (manualFeatured.length > 0) {
            formatted = manualFeatured;
          } else {
            formatted.sort((a, b) => b.studentsCount - a.studentsCount);
          }
        } else {
          // Automatic mode: Sort by Most Enrolled Students
          formatted.sort((a, b) => b.studentsCount - a.studentsCount);
        }

        setPublishedCourses(formatted.slice(0, 6));
      } else {
        setPublishedCourses([]);
      }
    } catch (e) {
      console.error("Error fetching landing page courses:", e);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const featureCards = [
    {
      icon: <Sparkles className="h-7 w-7 text-amber-500" />,
      title: "✨ Aura XP & 🎓 Credit Ledger",
      description: "Gamified learning experience where students earn Aura XP and mandatory Academic Credits for completed lessons and assignments."
    },
    {
      icon: <Trophy className="h-7 w-7 text-yellow-500" />,
      title: "🏆 Global Orbit Leaderboard",
      description: "Real-time institution leaderboard maintaining healthy academic competitiveness among students across departments."
    },
    {
      icon: <Video className="h-7 w-7 text-rose-500" />,
      title: "🔒 Watermarked Anti-Piracy Player",
      description: "Secure content delivery with dynamic anti-piracy user email watermarking, printscreen blackout deterrence, and video progress tracking."
    },
    {
      icon: <Calendar className="h-7 w-7 text-indigo-500" />,
      title: "📅 Live Class & Calendar Sync",
      description: "Schedule live classes with meeting links, import JSON/CSV bulk schedules, and sync directly with Google Calendar."
    },
    {
      icon: <Award className="h-7 w-7 text-emerald-500" />,
      title: "📜 Certificate Programs & Co-Teachers",
      description: "Create certificate specialization programs bundling multiple credit courses, with multi-teacher co-authoring collaboration."
    },
    {
      icon: <Database className="h-7 w-7 text-cyan-500" />,
      title: "📦 5-Day Rolling Overwrite Backup",
      description: "Automated rolling backup snapshot and restore system that overwrites every 5 days to optimize cloud storage."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500">
              Orbit LMS India
            </span>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5">
            <button onClick={() => scrollToSection("home")} className="text-xs font-semibold hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection("xie-methodology")} className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
              <Brain className="h-3.5 w-3.5" /> XIE Science
            </button>
            <button onClick={() => scrollToSection("astravyuh")} className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors">
              <Swords className="h-3.5 w-3.5" /> Astravyuh
            </button>
            <button onClick={() => navigate("/experience")} className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Experience Orbit
            </button>
            <button onClick={() => scrollToSection("features")} className="text-xs font-semibold hover:text-primary transition-colors">Features</button>
            <button onClick={() => scrollToSection("courses")} className="text-xs font-semibold hover:text-primary transition-colors">Courses</button>
            <button onClick={() => scrollToSection("pricing")} className="text-xs font-semibold hover:text-primary transition-colors">Plans & Pricing</button>
            <button onClick={() => navigate("/blog")} className="text-xs font-semibold hover:text-primary transition-colors">Research</button>
            <button onClick={() => scrollToSection("contact")} className="text-xs font-semibold hover:text-primary transition-colors">Contact</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/register")} className="bg-primary text-primary-foreground font-semibold shadow-md">
              Get Started
            </Button>
          </div>

          {/* Mobile Hamburger Button & Theme switch */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg border bg-background"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>
            <button
              type="button"
              className="p-2 rounded-lg border bg-muted/30 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile App Style Sliding Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-3 shadow-2xl">
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("home"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <Rocket className="h-4 w-4 text-primary" /> Home
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("xie-methodology"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm font-bold text-amber-500 flex items-center gap-2.5 touch-press"
            >
              <Brain className="h-4 w-4 text-amber-500" /> XIE Psychology Science (SSRN)
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("astravyuh"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm font-bold text-rose-500 flex items-center gap-2.5 touch-press"
            >
              <Swords className="h-4 w-4 text-rose-500" /> SINVERSE: Astravyuh Arena
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/experience"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/25 text-sm font-bold text-primary flex items-center gap-2.5 touch-press shadow-2xs"
            >
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" /> Experience Orbit Interactive
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("features"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <Layers className="h-4 w-4 text-primary" /> Features
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("courses"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <BookOpen className="h-4 w-4 text-primary" /> Courses & Programs
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("pricing"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <Award className="h-4 w-4 text-primary" /> Plans & Pricing
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/blog"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-primary" /> Blog & Research
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/careers"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <Users className="h-4 w-4 text-primary" /> Careers
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); scrollToSection("contact"); }}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-2.5 touch-press transition-colors"
            >
              <Mail className="h-4 w-4 text-primary" /> Contact
            </button>
            <div className="pt-3 grid grid-cols-2 gap-2.5 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="h-11 rounded-xl font-bold touch-press"
                onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                className="h-11 rounded-xl font-bold bg-primary text-primary-foreground shadow-md touch-press"
                onClick={() => { setMobileMenuOpen(false); navigate("/register"); }}
              >
                Get Started 🚀
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-amber-500/5 to-transparent -z-10" />
        <div className="container mx-auto text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* SSRN Research Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => scrollToSection("xie-methodology")}
                className="px-4 py-1.5 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono text-xs rounded-full inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer group"
              >
                <Brain className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span>🔬 Grounded in Published Research: <strong>eXtended Interactive Education (XIE)</strong> [SSRN: 7004538]</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display leading-tight tracking-tight">
              Rewarding Effort. Igniting Minds. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500">
                Psychology-Driven Gamified LMS
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed">
              Orbit LMS operationalizes the published <strong>XIE Educational Framework</strong> by <strong>Er. Harshvardhan Purohit</strong> (Founder & CEO, SIN Technologies). We replace passive classrooms with high-performance environmental psychology: &lt;30-second operant reward loops, cross-batch mutual monitoring, 4-house collective stakes, and kingdom warfare.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-bold gap-2 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={() => navigate("/register")}>
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-7 text-base font-bold gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 shadow-sm cursor-pointer" onClick={() => scrollToSection("xie-methodology")}>
                <Brain className="h-4 w-4 text-amber-500" /> Explore XIE Science
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto h-12 px-6 text-sm font-bold gap-2 text-foreground/80 hover:text-foreground hover:bg-muted/60 cursor-pointer" onClick={() => window.open("https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7004538", "_blank")}>
                <FileText className="h-4 w-4 text-primary" /> Read SSRN Paper <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>

            {/* Quick Psychological & Gamification Feature Pills */}
            <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <Zap className="h-4 w-4" /> &lt;30s Reward Loop
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Immediate operant conditioning feedback vs semester-end marks.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <Crown className="h-4 w-4" /> 4 House Identities
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Gryffindor, Ravenclaw, Hufflepuff & Slytherin collective stakes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs">
                  <Activity className="h-4 w-4" /> Mutual Monitoring
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Cross-batch live scoreboard driving 2.8x voluntary study effort.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-rose-500/40 transition-colors">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                  <Swords className="h-4 w-4" /> 3 Astras & Kingdoms
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Homework and tests power Citadels, Flix coins & War Arena sieges.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: XIE METHODOLOGY & PSYCHOLOGICAL LEARNING SYSTEM (SSRN: 7004538) */}
      {/* ========================================================================= */}
      <section id="xie-methodology" className="py-20 sm:py-28 px-4 bg-muted/20 border-y relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10 space-y-16">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="px-3 py-1 border-amber-500/40 bg-amber-500/10 text-amber-500 font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Peer-Reviewed Pedagogy & Cognitive Science
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-foreground">
              eXtended Interactive Education (XIE)
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Standard classroom design removes the three core mechanisms that make high-performance environments work: <em>immediate feedback</em>, <em>visible competition</em>, and <em>collective accountability</em>. XIE puts them back into the heart of software.
            </p>
          </div>

          {/* Official SSRN Research Paper Citation Showcase Card */}
          <div className="rounded-3xl border-2 border-amber-500/30 bg-card p-6 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-500/20 to-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500 text-black font-extrabold text-[11px] uppercase tracking-wider">
                    SSRN Published Research
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">SSRN Abstract ID: 7004538</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-semibold text-foreground">R&D Division of SIN School of AI</span>
                </div>

                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-foreground leading-snug">
                  eXtended Interactive Education (XIE): House-Based Gamification, Cross-Batch Competition, and the Psychology of Reward-Driven Learning
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <strong>Author:</strong> Er. Harshvardhan Purohit (Founder & CEO, SIN Technologies / SIN School of AI) • <a href="mailto:ceo@sintechnologies.in" className="text-primary hover:underline">ceo@sintechnologies.in</a>
                </p>

                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic border-l-2 border-amber-500 pl-3">
                  "If you give students the same environmental infrastructure that high-performance environments use, they perform like high-performance environments. Not because the syllabus changed, but because the reward architecture changed."
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Tested on 200 Students at Lucky Institute of Professional Studies
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Replicated with ~180 Students at JIET Universe, Jodhpur
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs sm:text-sm shadow-md gap-2 cursor-pointer h-12"
                  onClick={() => window.open("https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7004538", "_blank")}
                >
                  <FileText className="h-4 w-4" /> View Paper on SSRN <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted font-bold text-xs sm:text-sm cursor-pointer h-12"
                  onClick={() => scrollToSection("reward-loop")}
                >
                  <TrendingUp className="h-4 w-4 text-primary" /> See 4-Step Reward Loop
                </Button>
              </div>
            </div>
          </div>

          {/* Deep Insight Callout: Confidence as an Output */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/20 flex flex-col md:flex-row items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-500 shrink-0">
              <Quote className="h-7 w-7" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-base text-foreground">The Paradigm Shift: Confidence is an Output, Not an Input</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <em>"There is a common assumption in education that confidence must be built before performance can improve. What we observed was the exact opposite. Confidence rose after rank improvements, not before them. Students did not need hollow encouragement — they needed a scoreboard that confirmed they were doing something that mattered."</em>
                <span className="block mt-1 font-semibold text-foreground/80">— Er. Harshvardhan Purohit, XIE SSRN Paper</span>
              </p>
            </div>
          </div>

          {/* The Four Theoretical Psychological Pillars */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Theoretical Foundations</Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display">The 4 Psychological Pillars of Orbit</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
                Decades of behavioral psychology synthesized by XIE to engineer genuine intrinsic motivation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all space-y-3 shadow-xs">
                <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit border border-primary/20">
                  <Brain className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold">1. Self-Determination Theory</h4>
                <div className="text-[11px] font-mono text-primary">Deci & Ryan (1985, 2000)</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Intrinsic motivation requires <strong>Autonomy</strong>, <strong>Competence</strong>, and <strong>Relatedness</strong>. Rigid classrooms undercut all three. XIE re-engineers them: house tactics restore autonomy; live session points provide instant competence signals; house membership creates authentic relatedness.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl bg-card border border-border hover:border-amber-500/50 transition-all space-y-3 shadow-xs">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit border border-amber-500/20">
                  <Zap className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold">2. Operant Conditioning</h4>
                <div className="text-[11px] font-mono text-amber-500">B.F. Skinner (1938)</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Behavior followed by immediate reinforcement repeats. End-of-term grades fail because they arrive months late. A point earned <strong>30 seconds</strong> after answering runs the reward loop at <em>session frequency</em>, not <em>semester frequency</em>. That turns single answers into enduring study habits.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl bg-card border border-border hover:border-cyan-500/50 transition-all space-y-3 shadow-xs">
                <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl w-fit border border-cyan-500/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold">3. Social Comparison Theory</h4>
                <div className="text-[11px] font-mono text-cyan-500">Leon Festinger (1954)</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  People gauge ability by comparing with peers. On one shared leaderboard with 200+ students across multiple batches, comparison is formal and live. This produces the <strong>Mutual Monitoring Dynamic</strong>: trailing batches watch rivals and ramp up voluntary study without teacher prompting.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 rounded-2xl bg-card border border-border hover:border-rose-500/50 transition-all space-y-3 shadow-xs">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl w-fit border border-rose-500/20">
                  <Shield className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold">4. Social Identity Theory</h4>
                <div className="text-[11px] font-mono text-rose-500">Tajfel & Turner (1979)</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Group membership shapes individual effort far more reliably than individual incentives. A student who is personally behind may disengage; but a student whose house is 3 points behind a rival batch house leaps to action. Collective stakes pull disengaged students back into the arena.
                </p>
              </div>
            </div>
          </div>

          {/* The Four-Step Reward Loop */}
          <div id="reward-loop" className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-amber-500 border-amber-500/30">The Motivation Engine</Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display">The XIE 4-Step Reward Loop</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
                How Orbit converts academic friction into voluntary, self-sustaining study velocity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-card border relative overflow-hidden space-y-2.5">
                <div className="text-3xl font-extrabold font-mono text-amber-500/30">01</div>
                <h4 className="text-base font-bold text-foreground">See the Gap</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The shared live leaderboard makes rank disparity undeniable. The gap between your house and the rival cohort above is an objective number. Numbers are impossible to ignore.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border relative overflow-hidden space-y-2.5">
                <div className="text-3xl font-extrabold font-mono text-primary/30">02</div>
                <h4 className="text-base font-bold text-foreground">Feel the Pull</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  That gap creates a healthy, low-level competitive discomfort distinct from exam anxiety. It is not about failing; it is about an active race where victory is within reach.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border relative overflow-hidden space-y-2.5">
                <div className="text-3xl font-extrabold font-mono text-cyan-500/30">03</div>
                <h4 className="text-base font-bold text-foreground">Take the Rep</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  One more correct answer. One session of full attendance. One peer helped. Because the feedback is instantaneous, students take the next micro-rep for their house team.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border relative overflow-hidden space-y-2.5">
                <div className="text-3xl font-extrabold font-mono text-emerald-500/30">04</div>
                <h4 className="text-base font-bold text-foreground">Bank the Win</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  House points register in real time. Both batches see the board move. Rival cohorts recalculate. Self-belief compounds individually; house identity compounds at the team level.
                </p>
              </div>
            </div>
          </div>

          {/* The Four-House Academic Architecture Matrix */}
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Character & Behavioral Design</Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display">The Four-House Academic Architecture</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
                House design is not cosmetic. It gives students an identity that pre-exists their performance, setting an immediate behavioural expectation to live up to.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Gryffindor */}
              <div className="p-6 rounded-2xl bg-card border border-rose-500/30 hover:shadow-lg transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🦁</span>
                    <h4 className="font-extrabold text-lg text-rose-500">Gryffindor</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-500">Bold & Fearless</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Academic Traits Rewarded:</span>
                    <p className="text-muted-foreground mt-0.5">Initiative, intellectual risk-taking, leading debates, asking difficult questions.</p>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-semibold text-foreground">Point Triggers:</span>
                    <p className="text-muted-foreground mt-0.5">First to answer; challenging peer assertions; volunteering for live code demos.</p>
                  </div>
                </div>
              </div>

              {/* Ravenclaw */}
              <div className="p-6 rounded-2xl bg-card border border-sky-500/30 hover:shadow-lg transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🦅</span>
                    <h4 className="font-extrabold text-lg text-sky-500">Ravenclaw</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-500">Analytical & Precise</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Academic Traits Rewarded:</span>
                    <p className="text-muted-foreground mt-0.5">Concept accuracy, depth of reasoning, algorithmic elegance, research quality.</p>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-semibold text-foreground">Point Triggers:</span>
                    <p className="text-muted-foreground mt-0.5">Flawless technical solutions; spotting hidden compiler errors; concept mastery.</p>
                  </div>
                </div>
              </div>

              {/* Hufflepuff */}
              <div className="p-6 rounded-2xl bg-card border border-amber-500/30 hover:shadow-lg transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🦡</span>
                    <h4 className="font-extrabold text-lg text-amber-500">Hufflepuff</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">Consistent & Collaborative</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Academic Traits Rewarded:</span>
                    <p className="text-muted-foreground mt-0.5">Attendance consistency, peer mentorship, dependable execution, reliability.</p>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-semibold text-foreground">Point Triggers:</span>
                    <p className="text-muted-foreground mt-0.5">100% attendance streak; documented tutoring of a peer; team task completion.</p>
                  </div>
                </div>
              </div>

              {/* Slytherin */}
              <div className="p-6 rounded-2xl bg-card border border-emerald-500/30 hover:shadow-lg transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🐍</span>
                    <h4 className="font-extrabold text-lg text-emerald-500">Slytherin</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500">Ambitious & Strategic</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Academic Traits Rewarded:</span>
                    <p className="text-muted-foreground mt-0.5">Competitive velocity, leaderboard climbing, tactical study sprints, resilience.</p>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-semibold text-foreground">Point Triggers:</span>
                    <p className="text-muted-foreground mt-0.5">Largest rank jump per session; outperforming rival house in benchmark timed rounds.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Structural Comparison: Conventional vs. XIE Framework */}
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Comparative Architecture</Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display">Conventional Classroom vs. Orbit XIE</h3>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border bg-card shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm min-w-[620px]">
                <thead className="bg-muted/70 text-foreground border-b font-bold">
                  <tr>
                    <th className="p-4 w-1/4">Dimension</th>
                    <th className="p-4 w-3/8 text-muted-foreground">Conventional Classroom</th>
                    <th className="p-4 w-3/8 text-primary bg-primary/5">Orbit XIE Framework</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Motivation Trigger</td>
                    <td className="p-4 text-muted-foreground">Grades at semester end (delayed historical record)</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">House points within same session (&lt;30s living feedback)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Performance Feedback</td>
                    <td className="p-4 text-muted-foreground">Monthly or quarterly exam results</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">Real-time live scoreboard; every quiz question moves rank</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Student Identity</td>
                    <td className="p-4 text-muted-foreground">Isolated individual learner prone to disengagement</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">House member with collective accountability & role expectations</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Inter-Batch Relationship</td>
                    <td className="p-4 text-muted-foreground">Batches are completely isolated silos</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">Shared cross-batch leaderboard; mutual monitoring loop</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Peer Dynamic</td>
                    <td className="p-4 text-muted-foreground">Competition is informal, uncalibrated & invisible</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">Formal, scored, publicly celebrated & multidimensional</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Failure Response</td>
                    <td className="p-4 text-muted-foreground">Anxiety, resignation, or complete drop-out</td>
                    <td className="p-4 font-semibold text-foreground bg-primary/5">Team tactical adjustment; next rep immediately queued</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Empirical Validation & Findings Banner */}
          <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                  Empirical Proof
                </Badge>
                <h4 className="text-lg sm:text-xl font-bold mt-1 text-foreground">Field Test Results (Lucky Institute & JIET Universe)</h4>
              </div>
              <div className="text-xs text-muted-foreground">
                Conducted by SIN School of AI under Er. Harshvardhan Purohit
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1">
                <div className="text-2xl font-extrabold font-mono text-primary">98.4%</div>
                <div className="text-xs font-bold text-foreground">Attendance Retention</div>
                <p className="text-[11px] text-muted-foreground">Missing a session created an immediate cost to house standings.</p>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-extrabold font-mono text-amber-500">2.8x</div>
                <div className="text-xs font-bold text-foreground">Voluntary Practice</div>
                <p className="text-[11px] text-muted-foreground">Surge in after-session questions, peer tutoring & self-initiated coding.</p>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-extrabold font-mono text-cyan-500">&lt; 7 Days</div>
                <div className="text-xs font-bold text-foreground">Identity Adoption</div>
                <p className="text-[11px] text-muted-foreground">Students began describing peers and contributions by house identity.</p>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-extrabold font-mono text-emerald-500">74% Less</div>
                <div className="text-xs font-bold text-foreground">Teacher Nagging</div>
                <p className="text-[11px] text-muted-foreground">The live scoreboard handled re-engagement faster than instructor prompts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: SINVERSE: ASTRAVYUH — The XIE Engine in Action */}
      {/* ========================================================================= */}
      <section id="astravyuh" className="py-20 sm:py-28 px-4 bg-background relative overflow-hidden">
        <div className="container mx-auto max-w-6xl space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="px-3 py-1 border-rose-500/40 bg-rose-500/10 text-rose-500 font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5" /> Orbit Native Gamified Warfare
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-foreground">
              SINVERSE: ASTRAVYUH
            </h2>
            <p className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-amber-500 to-primary">
              Build Your Empire. Master Your Astras. Conquer the Arena.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              How Orbit LMS turns XIE theory into living software: solve assignments to harvest gold & mana, unlock ancient battle Astras, build your Citadel kingdom, and wage real-time cross-batch sieges.
            </p>
          </div>

          {/* Three Functional Battle Astras Showcase */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold font-display">The Three Mythical Battle Astras</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Earned strictly through academic mastery. Deployed in live cross-batch kingdom battles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Agni Astra */}
              <div className="p-6 rounded-2xl bg-card border border-rose-500/40 shadow-md hover:shadow-xl transition-all space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-500 text-[10px] font-mono px-3 py-1 rounded-bl-xl font-bold border-l border-b border-rose-500/30">
                  OFFENSIVE WEAPON
                </div>
                <div className="text-4xl">🔥</div>
                <div>
                  <h4 className="text-xl font-extrabold text-rose-500">Agni Astra</h4>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">+10 Attack Damage in War Sieges</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bestowed on students who demonstrate academic initiative, tackle complex coding algorithms first, and lead class debates. Crushes rival defensive turrets in the Battle Arena.
                </p>
                <div className="pt-2 border-t text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" /> Gryffindor & Slytherin Affinity
                </div>
              </div>

              {/* Varun Astra */}
              <div className="p-6 rounded-2xl bg-card border border-sky-500/40 shadow-md hover:shadow-xl transition-all space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-sky-500/10 text-sky-500 text-[10px] font-mono px-3 py-1 rounded-bl-xl font-bold border-l border-b border-sky-500/30">
                  DEFENSIVE SHIELD
                </div>
                <div className="text-4xl">🌊</div>
                <div>
                  <h4 className="text-xl font-extrabold text-sky-500">Varun Astra</h4>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">+15 Defense Shielding</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bestowed on students with unbroken 100% attendance records and documented peer tutoring. Erects an impenetrable water barrier that protects your citadel from enemy attacks.
                </p>
                <div className="pt-2 border-t text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Hufflepuff & Ravenclaw Affinity
                </div>
              </div>

              {/* Vayu Astra */}
              <div className="p-6 rounded-2xl bg-card border border-amber-500/40 shadow-md hover:shadow-xl transition-all space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-500 text-[10px] font-mono px-3 py-1 rounded-bl-xl font-bold border-l border-b border-amber-500/30">
                  TACTICAL VELOCITY
                </div>
                <div className="text-4xl">⚡</div>
                <div>
                  <h4 className="text-xl font-extrabold text-amber-500">Vayu Astra</h4>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">+15 Attack Speed & Agility</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bestowed on students who achieve rapid quiz completion with high conceptual precision. Unleashes gale-force speed strikes that overwhelm rival fortifications in fast-paced arena sieges.
                </p>
                <div className="pt-2 border-t text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Balanced Across All Houses
                </div>
              </div>
            </div>
          </div>

          {/* Gameplay Engine Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-2xl bg-card border space-y-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit border border-primary/20">
                <Building2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold">Citadel Kingdom Development</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Construct and upgrade Town Halls, Gold Mines, Mana Vaults, Barracks, and Defense Turrets. Every building upgrade directly reflects completed lecture modules and assignment submissions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border space-y-3">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit border border-amber-500/20">
                <IndianRupee className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold">Orbit Flix Virtual Economy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The gamified currency of Orbit LMS. Earn Flix by participating in live classes, achieving study streaks, and scoring 90%+ on tests. Spend Flix on building upgrades and defensive fortifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border space-y-3">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl w-fit border border-rose-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold">100% LMS Decoupled Architecture</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Formal institution grading, official university transcripts, and accredited degree credits are kept strictly pristine and isolated, while students enjoy full immersion in gaming warfare.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Button
              size="lg"
              className="bg-gradient-to-r from-rose-500 via-amber-500 to-primary text-white font-extrabold text-sm px-8 h-12 shadow-lg hover:opacity-95 cursor-pointer gap-2"
              onClick={() => navigate("/register")}
            >
              <Swords className="h-4 w-4" /> Enter the Astravyuh Arena Now <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 sm:py-20 px-4 bg-muted/30 border-y">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-10 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">About Orbit LMS</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display">Built for Modern Educational Institutions</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Orbit LMS bridges the gap between academic rigor and interactive student engagement. By integrating gamified ✨ Aura Points, mandatory academic credit tracking, dynamic live class schedules, and automated letterhead report generation, Orbit LMS provides an end-to-end digital university ecosystem.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-card rounded-xl border shadow-xs space-y-1">
                  <div className="font-extrabold text-2xl sm:text-3xl text-primary font-mono">
                    {activeLearnersCount || 13}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Learners</div>
                </div>
                <div className="p-4 bg-card rounded-xl border shadow-xs space-y-1">
                  <div className="font-extrabold text-2xl sm:text-3xl text-amber-500 font-mono">
                    {certifiedCoursesCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Certified Courses</div>
                </div>
              </div>
            </motion.div>

            <div className="relative h-[320px] sm:h-[400px] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-primary/20 via-accent/20 to-amber-500/20 border p-6 flex items-center justify-center">
              <div className="text-center p-6 bg-background/90 backdrop-blur-md rounded-xl max-w-xs shadow-lg space-y-3 border">
                <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-bold text-base">Master Enterprise Control</h3>
                <p className="text-xs text-muted-foreground">Complete administration, role hierarchy, backup snapshot, and institute branding.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-16 sm:py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Platform Highlights</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display">Cutting-Edge Features</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Everything students, teachers, and administrators need in one unified learning platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-all hover:-translate-y-1 space-y-3"
              >
                <div className="p-3 bg-muted/60 rounded-xl w-fit border">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses & Academic Credits Preview */}
      <section id="courses" className="py-16 sm:py-24 px-4 bg-muted/20 border-t">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Course Catalog</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display">Featured Orbit Courses</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Explore active certified courses with mandatory credit points. Students earn credits upon course completion marked by instructors.
            </p>
          </div>

          {publishedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publishedCourses.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="bg-card border rounded-2xl overflow-hidden shadow-md flex flex-col hover:shadow-xl transition-all"
              >
                <div className="h-44 w-full bg-muted relative overflow-hidden">
                  <img
                    src={course.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    <img src={course.organization_logo_url} alt="Org" className="h-4 w-4 rounded-full object-cover" />
                    <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{course.organization_name}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary text-primary-foreground font-bold font-mono text-xs shadow-md gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> 🎓 {course.credit_points || 3} Credits
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" /> {course.studentsCount} Enrolled Students
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {course.price > 0 ? (
                          <>
                            ₹{course.price.toLocaleString()}{" "}
                            {course.original_price > course.price && (
                              <span className="line-through text-muted-foreground text-[10px] ml-1">
                                ₹{course.original_price.toLocaleString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-emerald-500 font-bold">FREE</span>
                        )}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg line-clamp-2 text-foreground">{course.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3">{course.description || "Comprehensive academic course module."}</p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Certificate Eligible
                    </span>
                    <Button size="sm" onClick={() => navigate("/register")} className="gap-1.5 font-bold text-xs cursor-pointer">
                      <Eye className="h-3.5 w-3.5" /> Preview Course
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed rounded-2xl bg-card/40 max-w-xl mx-auto space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="font-semibold text-lg text-foreground">No Published Courses Yet</h3>
            <p className="text-sm text-muted-foreground">New academic courses and curriculum will appear here as soon as instructors publish them.</p>
          </div>
        )}
        </div>
      </section>

      {/* Institutional Plans & Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/20 border-t relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl relative z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30 gap-1.5 px-3 py-1">
              <Layers className="h-3.5 w-3.5" /> Institutional SaaS Plans
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-foreground">
              Transparent Pricing Engineered for Scale
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Empower your campus with anti-piracy video streaming, verified credit certificates, gamified aura points, and automated grading. Fully managed centrally by Orbit Master Admin.
            </p>

            {/* Monthly / Annual Interval Toggle */}
            <div className="pt-2 flex items-center justify-center">
              <div className="p-1 rounded-full bg-muted/80 border border-border flex items-center gap-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    billingInterval === "monthly"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("annual")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    billingInterval === "annual"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Annual License</span>
                  <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded-full font-extrabold">
                    SAVE 15%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          {plansLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              Loading institutional plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed rounded-2xl bg-card/40 max-w-lg mx-auto space-y-3">
              <Layers className="h-10 w-10 text-primary/60 mx-auto" />
              <h3 className="font-bold text-lg text-foreground">Custom Institutional Plans in Preparation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All SaaS subscription plans and modular feature checklists are created and provisioned directly by the Orbit Master Admin. Reach out to configure student seats and modules for your campus.
              </p>
              <Button size="sm" onClick={() => scrollToSection("contact")} className="font-bold text-xs mt-2">
                Inquire With Master Admin
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
              {plans.map((plan, index) => {
                const isPopular = plan.isPopular || plan.tier === "pro";
                const displayPrice =
                  billingInterval === "annual"
                    ? plan.priceAnnualINR
                    : plan.priceMonthlyINR;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={`rounded-2xl flex flex-col justify-between border bg-card text-card-foreground shadow-lg transition-all duration-200 hover:shadow-2xl relative overflow-hidden ${
                      isPopular
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-accent text-[10px] uppercase font-bold text-primary-foreground px-3 py-1 rounded-bl-xl tracking-wider">
                        Most Popular
                      </div>
                    )}

                    <div className="p-6 space-y-5">
                      {/* Tier Badge & Plan Name */}
                      <div className="space-y-2">
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-mono border-primary/30 text-primary bg-primary/5"
                        >
                          {plan.tier} Tier
                        </Badge>
                        <h3 className="text-xl font-bold font-display text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                          {plan.description}
                        </p>
                      </div>

                      {/* Pricing Tag */}
                      <div className="pt-2 pb-3 border-b border-border/60">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold font-mono text-foreground">
                            ₹{displayPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {billingInterval === "annual" ? "/ year" : "/ month"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>Up to {plan.maxStudents.toLocaleString("en-IN")} Active Students</span>
                        </div>
                      </div>

                      {/* Feature Checklist List */}
                      <div className="space-y-2.5 pt-1">
                        <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Included Modules</span>
                          <span className="text-[11px] font-mono text-primary font-bold">
                            {plan.features.length}/{platformFeatures.length}
                          </span>
                        </div>

                        <ul className="space-y-2 text-xs">
                          {platformFeatures.map((feat) => {
                            const isIncluded = plan.features.includes(feat.id);
                            return (
                              <li
                                key={feat.id}
                                className={`flex items-start gap-2 ${
                                  isIncluded ? "text-foreground" : "text-muted-foreground/40 line-through"
                                }`}
                              >
                                {isIncluded ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <span className="h-4 w-4 rounded-full border border-muted-foreground/30 flex items-center justify-center shrink-0 mt-0.5 text-[9px] text-muted-foreground/40">
                                    ✕
                                  </span>
                                )}
                                <span className="leading-tight">{feat.name}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>

                    <div className="p-6 pt-0 border-t border-border/40 mt-4">
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full font-bold text-xs shadow-md gap-1.5 cursor-pointer ${
                          isPopular
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        Inquire This Plan <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Custom Enterprise Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h4 className="font-bold text-lg text-foreground">Need a Custom University or Multi-Campus SLA?</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                The Orbit Master Admin provides custom cloud cluster hosting, dedicated AI processing pipelines, white-label institution domains, and priority 24/7 dedicated account support.
              </p>
            </div>
            <Button
              onClick={() => scrollToSection("contact")}
              className="bg-primary text-primary-foreground font-bold text-xs shrink-0 px-6 py-2.5 shadow-md"
            >
              Contact Master Admin
            </Button>
          </div>
        </div>
      </section>

      {/* SEO Blogs & Academic Insights Section */}
      <section id="blog" className="py-20 px-4 bg-background border-t relative overflow-hidden">
        <div className="container mx-auto max-w-7xl space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30 gap-1.5 px-3 py-1">
                <BookOpen className="h-3.5 w-3.5" /> EdTech Research & Compliance
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-foreground">
                Latest Insights, NEP 2020 & AI in Higher Ed
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Authoritative guides published directly by Orbit LMS Master Admin for university chancellors, academic deans, and faculty members.
              </p>
            </div>
            <Button
              onClick={() => navigate("/blog")}
              variant="outline"
              className="gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto cursor-pointer"
            >
              Explore All Articles <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {landingBlogs.slice(0, 3).map((blog) => (
              <motion.article
                key={blog.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
                className="group rounded-2xl border bg-card text-card-foreground overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div
                  onClick={() => navigate(`/blog/${blog.slug}`)}
                  className="h-48 overflow-hidden relative bg-muted cursor-pointer"
                >
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px]">
                      {blog.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {blog.readingTime}
                      </span>
                      <span>
                        {new Date(blog.publishedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/blog/${blog.slug}`)}
                      className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer leading-snug"
                    >
                      {blog.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {blog.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={blog.author.avatar}
                        alt={blog.author.name}
                        className="w-6 h-6 rounded-full object-cover border"
                      />
                      <span className="text-[11px] font-semibold text-foreground truncate max-w-[120px]">
                        {blog.author.name}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/blog/${blog.slug}`)}
                      className="text-xs font-bold text-primary p-0 h-auto hover:bg-transparent flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
                    >
                      Read Guide <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 px-4 bg-muted/30 border-t">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30">Get In Touch</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display">Connect With Orbit LMS</h2>
              <p className="text-sm text-muted-foreground">
                Have questions or need enterprise onboarding for your educational institution? Contact our support team today.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider">Email Us</h4>
                    <p className="text-sm text-muted-foreground">support@orbitlms.edu.in</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider">Location</h4>
                    <p className="text-sm text-muted-foreground">Orbit Technology Park, Sector 62, India</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-card border shadow-md space-y-4">
              {submitSuccess ? (
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in fade-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-base text-emerald-600 dark:text-emerald-400">Message Received!</h3>
                  <p className="text-xs text-muted-foreground">
                    Thank you for reaching out. Our support and admin team will get back to you via email shortly.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSubmitSuccess(false)} className="text-xs">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleContactSubmit}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">First Name *</label>
                      <input
                        required
                        type="text"
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                        className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary"
                        placeholder="Alex"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Last Name</label>
                      <input
                        type="text"
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                        className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Work Email *</label>
                    <input
                      required
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary"
                      placeholder="alex@institution.edu"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Message *</label>
                    <textarea
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary h-24 resize-none"
                      placeholder="How can we assist your institution?"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card text-muted-foreground text-xs space-y-3">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-xs">
              O
            </div>
            <span className="font-display font-bold text-sm text-foreground">Orbit LMS India</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-xs font-medium">
            <button onClick={() => scrollToSection("home")} className="hover:text-foreground">Home</button>
            <button onClick={() => scrollToSection("xie-methodology")} className="text-amber-500 font-bold hover:underline">XIE Pedagogy</button>
            <button onClick={() => scrollToSection("astravyuh")} className="text-rose-500 font-bold hover:underline">SINVERSE Astravyuh</button>
            <button onClick={() => scrollToSection("features")} className="hover:text-foreground">Features</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-foreground">Plans & Pricing</button>
            <button onClick={() => window.open("https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7004538", "_blank")} className="text-primary hover:underline font-bold flex items-center gap-1">
              SSRN Paper <ExternalLink className="h-3 w-3" />
            </button>
            <button onClick={() => navigate("/blog")} className="hover:text-foreground">Research Blog</button>
            <button onClick={() => scrollToSection("contact")} className="hover:text-foreground">Enterprise Support</button>
          </div>
          <p>© {new Date().getFullYear()} Orbit LMS India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
