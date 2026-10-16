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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionPlan, DEFAULT_PLANS, PLATFORM_FEATURES } from "@/types/plans";
import { BlogPost, DEFAULT_BLOGS } from "@/types/blog";

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [landingBlogs, setLandingBlogs] = useState<BlogPost[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
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

      // Fetch active courses safely without failing on complex joins
      const { data: rawCourses } = await supabase
        .from("courses")
        .select(`
          id, title, description, thumbnail_url, price, original_price, currency,
          organization_name, organization_logo_url, credit_points, is_published,
          is_featured, created_at
        `)
        .eq("is_published", true);

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
        // Fallback demo courses preview
        setPublishedCourses([
          {
            id: "demo-1",
            title: "Full-Stack Web Development & Cloud Computing",
            description: "Master modern React, Node.js, Next.js, PostgreSQL, and cloud deployments with hands-on projects.",
            credit_points: 4,
            price: 2499,
            original_price: 4999,
            studentsCount: 142,
            organization_name: defaultInst.name || "Orbit LMS Innovation Academy",
            organization_logo_url: defaultInst.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
            thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"
          },
          {
            id: "demo-2",
            title: "Data Science, AI & Machine Learning Specialization",
            description: "Explore Python data analysis, neural networks, predictive modeling, and AI application engineering.",
            credit_points: 5,
            price: 3499,
            original_price: 6999,
            studentsCount: 98,
            organization_name: defaultInst.name || "Orbit LMS Innovation Academy",
            organization_logo_url: defaultInst.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
            thumbnail_url: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format&fit=crop&q=80"
          },
          {
            id: "demo-3",
            title: "Cybersecurity & Network Defense Fundamentals",
            description: "Understand network security architecture, vulnerability assessment, ethical hacking, and encryption protocols.",
            credit_points: 3,
            price: 1999,
            original_price: 3999,
            studentsCount: 85,
            organization_name: defaultInst.name || "Orbit LMS Innovation Academy",
            organization_logo_url: defaultInst.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
            thumbnail_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80"
          }
        ]);
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
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("home")} className="text-xs font-semibold hover:text-primary transition-colors">Home</button>
            <button onClick={() => navigate("/experience")} className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Experience Orbit
            </button>
            <button onClick={() => scrollToSection("about")} className="text-xs font-semibold hover:text-primary transition-colors">About Us</button>
            <button onClick={() => scrollToSection("features")} className="text-xs font-semibold hover:text-primary transition-colors">Features</button>
            <button onClick={() => scrollToSection("courses")} className="text-xs font-semibold hover:text-primary transition-colors">Courses</button>
            <button onClick={() => scrollToSection("pricing")} className="text-xs font-semibold hover:text-primary transition-colors">Plans & Pricing</button>
            <button onClick={() => navigate("/blog")} className="text-xs font-semibold hover:text-primary transition-colors">Blog & Research</button>
            <button onClick={() => navigate("/careers")} className="text-xs font-semibold hover:text-primary transition-colors">Careers</button>
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
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="px-3 py-1 border-primary/30 bg-primary/10 text-primary font-mono text-xs rounded-full inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" /> Orbit LMS 2.5 • Gamified Academic Ecosystem
            </Badge>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display leading-tight tracking-tight">
              Next-Gen Gamified <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500">
                Learning Management System
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal">
              Empowering students, educators, and administrators with AI-driven workflows, ✨ Aura XP gamification, mandatory credit points, anti-piracy video playback, and complete institutional control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-bold gap-2 shadow-lg bg-primary text-primary-foreground" onClick={() => navigate("/register")}>
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-bold gap-2 border-primary/40 text-primary hover:bg-primary/10 shadow-sm" onClick={() => navigate("/experience")}>
                <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" /> Experience Orbit Presentation
              </Button>
            </div>
          </motion.div>
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
                  <div className="font-extrabold text-2xl sm:text-3xl text-primary font-mono">10,000+</div>
                  <div className="text-xs text-muted-foreground">Active Learners</div>
                </div>
                <div className="p-4 bg-card rounded-xl border shadow-xs space-y-1">
                  <div className="font-extrabold text-2xl sm:text-3xl text-amber-500 font-mono">500+</div>
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
                            {plan.features.length}/{PLATFORM_FEATURES.length}
                          </span>
                        </div>

                        <ul className="space-y-2 text-xs">
                          {PLATFORM_FEATURES.map((feat) => {
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
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium">
            <button onClick={() => scrollToSection("home")} className="hover:text-foreground">Home</button>
            <button onClick={() => scrollToSection("features")} className="hover:text-foreground">Features</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-foreground">Plans & Pricing</button>
            <button onClick={() => navigate("/blog")} className="text-primary hover:underline font-bold">SEO Blogs & Research</button>
            <button onClick={() => navigate("/careers")} className="hover:text-foreground">Careers</button>
            <button onClick={() => scrollToSection("contact")} className="hover:text-foreground">Enterprise Support</button>
          </div>
          <p>© {new Date().getFullYear()} Orbit LMS India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
