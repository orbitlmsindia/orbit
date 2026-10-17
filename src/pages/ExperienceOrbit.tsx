import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
    Rocket,
    Sparkles,
    ShieldCheck,
    Ticket,
    Building2,
    Video,
    HardDrive,
    ArrowRight,
    Check,
    Lock,
    Eye,
    Zap,
    Trophy,
    Award,
    FileText,
    Download,
    RotateCcw,
    CheckCircle2,
    Flame,
    Play,
    Star,
    Layers,
    ChevronRight,
    ChevronLeft,
    Sun,
    Moon,
    Menu,
    X,
    Palette,
    Crown,
    Gift,
    Maximize2,
    Minimize2,
    ExternalLink,
    RefreshCw,
    Smartphone,
    BookOpen,
    Users,
    Cpu,
    FileCheck,
    CheckCheck,
    Calendar,
    IndianRupee,
    MonitorPlay,
    QrCode,
    SlidersHorizontal,
    Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { THEMES_CATALOG, ThemeId } from "@/types/theme";
import { getFluxBalance, claimDailyFlux } from "@/services/themeService";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";
import { PublicStudentProfileModal, StudentProfileData } from "@/components/profile/PublicStudentProfileModal";

export default function ExperienceOrbit() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();

    // Mode Toggle: "tour" (Interactive Scroll Showcase) vs "deck" (Executive Pitch Deck Slides)
    const [viewMode, setViewMode] = useState<"tour" | "deck">("tour");
    const [activeSlide, setActiveSlide] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [themeStudioOpen, setThemeStudioOpen] = useState(false);
    const [publicProfileModalOpen, setPublicProfileModalOpen] = useState(false);

    // Live Orbit Flux state
    const [fluxBalance, setFluxBalance] = useState<number>(750);
    const [claimingFlux, setClaimingFlux] = useState(false);

    // Scroll physics for Tour Mode
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const ringRotation = useTransform(scrollYProgress, [0, 1], [0, 720]);
    const orbX = useTransform(scrollYProgress, [0, 0.5, 1], [-40, 120, -40]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.94]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);

    // Active Stage tracking
    const [activeStage, setActiveStage] = useState(0);

    // -------------------------------------------------------------
    // INTERACTIVE SIMULATOR STATES
    // -------------------------------------------------------------
    // Stage 1: Aura XP & Credit simulator
    const [demoAuraXP, setDemoAuraXP] = useState(1450);
    const [demoCredits, setDemoCredits] = useState(12);

    // Stage 2: Anti-Piracy Player
    const [demoPlaybackMode, setDemoPlaybackMode] = useState<"slides" | "doc" | "video">("slides");
    const [demoWatermarkText, setDemoWatermarkText] = useState("student.id@orbitlms.edu");
    const [demoWatermarkActive, setDemoWatermarkActive] = useState(true);

    // Stage 3: Smart Coupons
    const [demoCoupon, setDemoCoupon] = useState("ORBIT50");
    const [demoCouponApplied, setDemoCouponApplied] = useState(false);

    // Stage 4: AI Course Builder
    const [aiPrompt, setAiPrompt] = useState("Full-Stack Cloud Native Systems & Microservices");
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiCourseGenerated, setAiCourseGenerated] = useState(false);

    // Stage 5: Multi-Tenant Feature Gates
    const [featureGates, setFeatureGates] = useState({
        coupon_engine: true,
        ai_json_builder: true,
        leaderboard: true,
        certificates: true,
        ticket_raising: false,
    });

    // Touch gesture tracking for mobile slide deck swipe
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    // Sample Student for Public Profile Simulation
    const DEMO_STUDENT: StudentProfileData = {
        id: "demo-aarav-sharma",
        fullName: "Aarav Sharma",
        email: "aarav.sharma@orbitlms.edu",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        auraPoints: demoAuraXP,
        totalCredits: demoCredits,
        currentStreak: 18,
        highestStreak: 24,
        bio: "Specializing in Distributed Systems, React & Quantum Computing. Orbit Scholar Rank #1.",
        domain: "Computer Science & Engineering",
        role: "student",
        rank: 1,
    };

    // Load Flux on mount
    useEffect(() => {
        setFluxBalance(getFluxBalance());
    }, []);

    // Sync scroll with stages in Tour Mode
    useEffect(() => {
        if (viewMode !== "tour") return;
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            const stageIndex = Math.min(Math.floor(latest * 10), 9);
            setActiveStage(stageIndex);
        });
        return () => unsubscribe();
    }, [scrollYProgress, viewMode]);

    // Handle Keyboard shortcuts for Slide Deck Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== "deck") return;
            if (e.key === "ArrowRight" || e.key === "Space") {
                e.preventDefault();
                nextSlide();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                prevSlide();
            } else if (e.key === "Escape") {
                setViewMode("tour");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewMode, activeSlide]);

    const handleClaimFluxDemo = () => {
        setClaimingFlux(true);
        setTimeout(() => {
            const res = claimDailyFlux(10);
            setFluxBalance(res.newBalance);
            setClaimingFlux(false);
            if (res.success) {
                toast({
                    title: "⚡ +10 Orbit Flux Claimed!",
                    description: `New Wallet Balance: ${res.newBalance.toLocaleString()} Flux. Ready to unlock themes!`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Daily Limit Reached",
                    description: res.message,
                });
            }
        }, 200);
    };

    const toggleThemeQuick = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const handleThemeSelect = (newTheme: ThemeId) => {
        setTheme(newTheme);
        const selected = THEMES_CATALOG.find((t) => t.id === newTheme);
        toast({
            title: `🎨 Switched to ${selected?.name || newTheme}`,
            description: "The complete presentation UI has adopted this theme palette in real-time.",
        });
    };

    // Touch navigation for mobile slide deck
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };
    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    // 10 Comprehensive Feature Stages
    const stages = [
        {
            id: "theme-universe",
            title: "01. 10 Themes & Flux Economy",
            subtitle: "Multi-Theme Universe, ⚡ Orbit Flux Currency & VIP Admin Access",
            icon: <Palette className="h-4 w-4 text-purple-500" />,
            badge: "Theme Engine & New Currency",
            summary: "Orbit LMS offers 10 meticulously crafted visual palettes (Obsidian Dark, Cyberpunk 2077, Sapphire, Doomsday, Emerald, Solar Flare, and more) unlocked with ⚡ Orbit Flux.",
            highlights: [
                "10 bespoke visual aesthetics with distinct HSL CSS tokens",
                "New ⚡ Orbit Flux currency with daily rewards and check-ins",
                "Master Admin and College Admins enjoy 0-cost VIP access to all 10 themes",
                "100% theme consistency across cards, modals, sidebars, and mobile bars"
            ]
        },
        {
            id: "gamification-aura",
            title: "02. Gamified Aura XP & Credits",
            subtitle: "Aura Points, Degree Credits, Streaks & Global College Leaderboard",
            icon: <Sparkles className="h-4 w-4 text-amber-500" />,
            badge: "Gamification & Academic Ledger",
            summary: "Dual-ledger architecture: Students earn ✨ Aura XP for lesson completions and attendance streaks, while accruing mandatory Academic Degree Credits.",
            highlights: [
                "✨ Aura Points rewarding daily learning streaks and assignment mastery",
                "🎓 Academic Credit Ledger tracking degree completion criteria",
                "🏆 Global College Leaderboard with podium rankings and course filtering",
                "Automatic streak multipliers and placement priority recognition"
            ]
        },
        {
            id: "student-profile",
            title: "03. Verified Public Scholar Profile",
            subtitle: "Transparent Social Showcase, Equipped Signature Themes & Purchase Readiness",
            icon: <Users className="h-4 w-4 text-blue-500" />,
            badge: "Social Profile & Theme Portfolio",
            summary: "Students can share their public verified profile card showcasing Aura rank, streaks, degree credits, their equipped signature theme, and themes ready to purchase.",
            highlights: [
                "Public verifiable profile URL (/profile/:id) for recruiters and peers",
                "Equipped signature theme showcase with live color preview canvas",
                "Theme purchase readiness: shows affordable themes vs upcoming milestones",
                "Verified Orbit Scholar badge with domain and credit standing"
            ]
        },
        {
            id: "content-protection",
            title: "04. Anti-Piracy Content Protection",
            subtitle: "Secure Google Slides, Protected Documents & Watermarked Video",
            icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
            badge: "Zero-Leak IP Security",
            summary: "Protects institutional IP: Renders Google Slides, Canva, Google Docs, and MP4 videos in embedded viewers with dynamic anti-piracy watermarking.",
            highlights: [
                "Zero raw download URLs exposed in frontend HTML source code",
                "Dynamic student email and timestamp overlay against screen recording",
                "Blocks right-clicking, inspect element, and unauthorized pop-outs",
                "Minimum watch duration gating required to mark lesson completion"
            ]
        },
        {
            id: "ai-course-builder",
            title: "05. AI Course Builder & JSON Engine",
            subtitle: "Autonomous Curriculum Synthesis, Lesson Outlines & Quiz Generation",
            icon: <Cpu className="h-4 w-4 text-rose-500" />,
            badge: "Generative Academic AI",
            summary: "Accelerate course creation: Educators synthesize accredited multi-module curriculums complete with lectures, quizzes, and slide links via JSON/AI in seconds.",
            highlights: [
                "Generates 4-module syllabi with lesson objectives and duration metrics",
                "Automated multiple-choice quiz and assignment rubrics generation",
                "Bulk JSON curriculum import/export for instant multi-course catalog launch",
                "Seamless embedding of Google Slides and presentation links"
            ]
        },
        {
            id: "smart-coupons",
            title: "06. Smart Coupons & Monetization",
            subtitle: "Teacher Discount Management & Admin Granular Control Engine",
            icon: <Ticket className="h-4 w-4 text-amber-500" />,
            badge: "Monetization & Fee Engine",
            summary: "Granular revenue management: When enabled by the admin, teachers can generate percentage or flat ₹ discounts, set expiry dates, and cap redemption limits.",
            highlights: [
                "Admin Master Toggle with selective teacher coupon permissions",
                "Percentage (%) or Flat Rupee (₹) discount codes with maximum caps",
                "Course-specific targeting or global institute-wide fee deductions",
                "Real-time checkout validation and student redemption history"
            ]
        },
        {
            id: "institutional-branding",
            title: "07. Institutional Branding & Transcripts",
            subtitle: "Custom Letterheads, Official Seals & Verifiable Academic Certificates",
            icon: <Building2 className="h-4 w-4 text-indigo-500" />,
            badge: "Academic Verifiable Transcripts",
            summary: "Maintain university prestige: Embed your college logo, registrar signature, and Base64 digital stamp seal automatically across student transcripts and certificates.",
            highlights: [
                "Official A4 letterhead templates applied to all generated transcripts",
                "Base64 digital registrar stamp and authorized signature embedding",
                "Unique verification registration codes and scan-to-verify QR codes",
                "Print-ready high-resolution PDF download with anti-tamper watermark"
            ]
        },
        {
            id: "live-classroom",
            title: "08. Live Classrooms & Timetable",
            subtitle: "Google Meet & Zoom Integration, Bulk JSON Timetables & Live Push Alerts",
            icon: <Video className="h-4 w-4 text-rose-500" />,
            badge: "Synchronous Learning",
            summary: "Streamline remote lectures: Schedule live classes with Google Meet or Zoom, import term timetables via JSON, and broadcast urgent push alerts to student phones.",
            highlights: [
                "1-Click Google Meet and Zoom direct join buttons with live pulse timer",
                "JSON/CSV term timetable importer with Google Calendar integration",
                "Real-time WebSocket urgent notifications and top banner broadcast popups",
                "Automated live attendance tracking tied directly to student Aura XP"
            ]
        },
        {
            id: "multi-tenant-gates",
            title: "09. Multi-Tenant Architecture & Gates",
            subtitle: "Master Super-Console, College Tiering & Granular Feature Gating",
            icon: <Layers className="h-4 w-4 text-cyan-500" />,
            badge: "Multi-Tenant Enterprise",
            summary: "Single scalable engine powering multiple institutions: Master Admin can selectively gate features (Coupon Engine, AI Builder, Leaderboard) per college subscription tier.",
            highlights: [
                "Multi-Tenant College Architecture with isolated databases & subdomains",
                "Granular Feature Gating (`useCollegeFeatures`) for tier-based access",
                "5 distinct role portals: Master Admin, College Admin, Teacher, Student, Finance",
                "Dedicated Finance Desk with GST invoices and fee transaction tracking"
            ]
        },
        {
            id: "zero-loss-recovery",
            title: "10. Zero-Loss Disaster Recovery",
            subtitle: "16-Table Relational Database Snapshot Export & 100% Zero-Loss Restore",
            icon: <HardDrive className="h-4 w-4 text-teal-500" />,
            badge: "Enterprise Reliability",
            summary: "Enterprise peace of mind: Export your entire ecosystem (16 relational tables with Base64 assets) into an encrypted snapshot JSON file and restore with zero data loss.",
            highlights: [
                "Full 16-table relational database backup in a single portable JSON file",
                "Base64 media, digital seals, and signature assets preserved intact",
                "Relational dependency ordered upsert engine for atomic system restoration",
                "Live database health metrics, telemetry, and edge latency monitoring"
            ]
        }
    ];

    const scrollToStage = (index: number) => {
        setActiveStage(index);
        const stageElement = document.getElementById(`stage-${index}`);
        if (stageElement) {
            stageElement.scrollIntoView({ behavior: "smooth" });
        }
    };

    const nextSlide = () => {
        setActiveSlide((prev) => (prev < stages.length - 1 ? prev + 1 : 0));
    };

    const prevSlide = () => {
        setActiveSlide((prev) => (prev > 0 ? prev - 1 : stages.length - 1));
    };

    const handleGenerateAiCourse = () => {
        setIsGeneratingAi(true);
        setTimeout(() => {
            setIsGeneratingAi(false);
            setAiCourseGenerated(true);
            toast({
                title: "🤖 AI Course Curriculum Synthesized!",
                description: "4 modules, 12 lessons, 4 quizzes, and 2 slide deck references generated.",
            });
        }, 1200);
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans overflow-x-hidden relative transition-colors duration-300"
        >
            {/* Top Scroll Progress Spring Bar (Tour Mode only) */}
            {viewMode === "tour" && (
                <motion.div
                    style={{ scaleX }}
                    className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-amber-400 to-emerald-400 z-[100] origin-left shadow-lg shadow-primary/50"
                />
            )}

            {/* Ambient Animated Nebula Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <motion.div
                    style={{ rotate: ringRotation }}
                    className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[850px] bg-gradient-to-tr from-primary/10 via-purple-600/5 to-amber-500/5 dark:from-primary/20 dark:via-purple-600/10 dark:to-amber-500/10 rounded-full blur-[140px]"
                />
                <motion.div
                    style={{ x: orbX }}
                    className="absolute bottom-1/3 left-1/4 w-[650px] h-[650px] bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-transparent dark:from-emerald-500/15 dark:via-cyan-500/15 rounded-full blur-[160px]"
                />
            </div>

            {/* TOP NAVIGATION BAR */}
            <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 transition-all">
                <div className="container mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
                    {/* Brand */}
                    <div
                        className="flex items-center gap-2 cursor-pointer shrink-0 touch-press"
                        onClick={() => navigate("/")}
                    >
                        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                            <Rocket className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg sm:text-xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500 leading-tight">
                                Orbit LMS India
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                                Enterprise Presentation Deck
                            </span>
                        </div>
                    </div>

                    {/* Mode Selector Pill (Tour vs Pitch Deck) */}
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-full border border-border/60 shadow-2xs">
                        <Button
                            size="sm"
                            variant={viewMode === "tour" ? "default" : "ghost"}
                            onClick={() => setViewMode("tour")}
                            className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "tour" ? "shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            <Compass className="h-3.5 w-3.5 mr-1" />
                            <span>Tour</span>
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === "deck" ? "default" : "ghost"}
                            onClick={() => setViewMode("deck")}
                            className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "deck" ? "shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            <MonitorPlay className="h-3.5 w-3.5 mr-1 text-amber-500" />
                            <span>Pitch Deck</span>
                        </Button>
                    </div>

                    {/* Desktop Theme Swatcher & Action Buttons */}
                    <div className="hidden lg:flex items-center gap-2.5">
                        {/* Theme Studio Trigger */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setThemeStudioOpen(true)}
                            className="h-8 rounded-full border-primary/30 text-xs font-bold gap-1.5 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer touch-press"
                        >
                            <Palette className="h-3.5 w-3.5 text-primary" />
                            <span>10 Themes Store</span>
                        </Button>

                        {/* Quick Theme Toggle (Dark / Light) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleThemeQuick}
                            className="h-8 w-8 rounded-full border border-border bg-background hover:bg-accent cursor-pointer touch-press"
                            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        >
                            {theme === "dark" ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-slate-700" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/login")}
                            className="h-8 text-xs font-bold"
                        >
                            Sign In
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => navigate("/register")}
                            className="h-8 px-3.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm rounded-full"
                        >
                            Get Started
                        </Button>
                    </div>

                    {/* Mobile Hamburger & Theme Trigger */}
                    <div className="flex items-center gap-1.5 lg:hidden">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setThemeStudioOpen(true)}
                            className="h-8 w-8 rounded-lg border text-primary"
                            title="Theme Studio"
                        >
                            <Palette className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleThemeQuick}
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
                            className="p-1.5 rounded-lg border bg-muted/40 text-foreground"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle mobile menu"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Sub-Header: Live 10 Themes Quick-Selector Bar (Mobile & Desktop) */}
                <div className="border-t border-border/40 bg-muted/20 backdrop-blur-md overflow-x-auto scrollbar-none py-2 px-3 sm:px-4">
                    <div className="container mx-auto flex items-center justify-start md:justify-center gap-1.5 min-w-max">
                        <span className="text-[10px] font-bold font-mono text-muted-foreground mr-1 uppercase flex items-center gap-1">
                            <Palette className="h-3 w-3 text-primary" /> Live Themes:
                        </span>
                        {THEMES_CATALOG.map((t) => {
                            const isCurrent = theme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleThemeSelect(t.id)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer touch-press border ${
                                        isCurrent
                                            ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold scale-105"
                                            : "border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span
                                        className="h-2 w-2 rounded-full border border-black/20 shrink-0"
                                        style={{ background: t.palette.primary }}
                                    />
                                    <span>{t.name.split(" ")[0]}</span>
                                    {t.cost > 0 && !isCurrent && (
                                        <span className="text-[9px] font-mono opacity-70">⚡{t.cost}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sub-Header: Stage Indicator Pills (Tour Mode only) */}
                {viewMode === "tour" && (
                    <div className="border-t border-border/40 bg-background/60 backdrop-blur-md overflow-x-auto scrollbar-none py-2 px-3 sm:px-4">
                        <div className="container mx-auto flex items-center justify-start md:justify-center gap-1.5 min-w-max">
                            {stages.map((stage, idx) => (
                                <button
                                    key={stage.id}
                                    onClick={() => scrollToStage(idx)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-press ${
                                        activeStage === idx
                                            ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                    }`}
                                >
                                    {stage.icon}
                                    <span className="truncate max-w-[140px] sm:max-w-none">{stage.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-b bg-background px-4 pt-3 pb-5 space-y-2.5 animate-in slide-in-from-top-2">
                        <button
                            onClick={() => { setMobileMenuOpen(false); navigate("/"); }}
                            className="block w-full text-left py-2 text-sm font-semibold hover:text-primary"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => { setMobileMenuOpen(false); setViewMode(viewMode === "tour" ? "deck" : "tour"); }}
                            className="block w-full text-left py-2 text-sm font-bold text-primary flex items-center gap-2"
                        >
                            <MonitorPlay className="h-4 w-4 text-amber-500" />
                            Switch to {viewMode === "tour" ? "Pitch Deck Mode" : "Interactive Tour Mode"}
                        </button>
                        <button
                            onClick={() => { setMobileMenuOpen(false); setThemeStudioOpen(true); }}
                            className="block w-full text-left py-2 text-sm font-semibold flex items-center gap-2"
                        >
                            <Palette className="h-4 w-4 text-primary" /> Open 10 Themes Studio
                        </button>
                        <button
                            onClick={() => { setMobileMenuOpen(false); setPublicProfileModalOpen(true); }}
                            className="block w-full text-left py-2 text-sm font-semibold flex items-center gap-2"
                        >
                            <Users className="h-4 w-4 text-blue-500" /> View Public Scholar Profile Demo
                        </button>
                        <div className="pt-2 grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
                                Sign In
                            </Button>
                            <Button size="sm" onClick={() => navigate("/register")} className="bg-primary text-primary-foreground font-bold">
                                Get Started
                            </Button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ============================================================== */}
            {/* VIEW MODE A: EXECUTIVE PITCH DECK SLIDES MODE */}
            {/* ============================================================== */}
            {viewMode === "deck" ? (
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="min-h-[calc(100vh-120px)] flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6 max-w-6xl mx-auto space-y-6"
                >
                    {/* Slide Header: Controls & Indicators */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <Badge className="bg-primary text-primary-foreground font-mono text-xs px-2.5 py-1">
                                SLIDE {String(activeSlide + 1).padStart(2, "0")} / {stages.length}
                            </Badge>
                            <span className="text-xs font-semibold text-muted-foreground truncate">
                                {stages[activeSlide].subtitle}
                            </span>
                        </div>

                        {/* Navigation controls */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={prevSlide}
                                className="h-9 px-3 rounded-full text-xs font-bold gap-1 cursor-pointer touch-press"
                            >
                                <ChevronLeft className="h-4 w-4" /> Prev
                            </Button>

                            <div className="flex items-center gap-1 px-2">
                                {stages.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveSlide(i)}
                                        aria-label={`Go to slide ${i + 1}`}
                                        className={`h-2 rounded-full transition-all cursor-pointer ${
                                            activeSlide === i ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/40"
                                        }`}
                                    />
                                ))}
                            </div>

                            <Button
                                size="sm"
                                onClick={nextSlide}
                                className="h-9 px-3 rounded-full text-xs font-bold gap-1 bg-primary text-primary-foreground cursor-pointer touch-press"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Active Slide Body */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSlide}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center flex-1 my-auto"
                        >
                            {/* Slide Left: Editorial Value Proposition */}
                            <div className="lg:col-span-6 space-y-4 sm:space-y-6">
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-semibold">
                                    {stages[activeSlide].badge}
                                </Badge>

                                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display text-foreground tracking-tight leading-tight">
                                    {stages[activeSlide].title}
                                </h2>

                                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                    {stages[activeSlide].summary}
                                </p>

                                <div className="space-y-2.5 pt-2">
                                    {stages[activeSlide].highlights.map((highlight, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{highlight}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 flex flex-wrap items-center gap-3">
                                    {activeSlide === 0 && (
                                        <Button
                                            size="sm"
                                            onClick={() => setThemeStudioOpen(true)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 rounded-full"
                                        >
                                            <Palette className="h-3.5 w-3.5" /> Launch 10 Themes Studio
                                        </Button>
                                    )}
                                    {activeSlide === 2 && (
                                        <Button
                                            size="sm"
                                            onClick={() => setPublicProfileModalOpen(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 rounded-full"
                                        >
                                            <Users className="h-3.5 w-3.5" /> Open Public Profile Card
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewMode("tour")}
                                        className="text-xs font-semibold rounded-full"
                                    >
                                        Inspect Deep-Dive in Tour
                                    </Button>
                                </div>
                            </div>

                            {/* Slide Right: Live Interactive Widget for this Slide */}
                            <div className="lg:col-span-6 w-full">
                                {renderInteractiveWidget(activeSlide)}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Mobile Swipe Hint */}
                    <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2 pt-2 sm:hidden">
                        <span>👈 Swipe left/right on screen to navigate slides 👉</span>
                    </div>
                </div>
            ) : (
                /* ============================================================== */
                /* VIEW MODE B: INTERACTIVE DEEP-DIVE SCROLL TOUR MODE */
                /* ============================================================== */
                <div>
                    {/* HERO SECTION */}
                    <motion.section
                        style={{ scale: heroScale, opacity: heroOpacity }}
                        className="relative pt-16 sm:pt-24 pb-20 sm:pb-28 px-4 sm:px-6 z-10 text-center max-w-5xl mx-auto space-y-6 sm:space-y-8"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md"
                        >
                            <Sparkles className="h-4 w-4 text-amber-500" /> Orbit Ecosystem Interactive Showcase
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-3xl sm:text-6xl md:text-7xl font-extrabold font-display tracking-tight text-foreground leading-tight"
                        >
                            Next-Generation <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500">
                                Academic Technology
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                        >
                            Explore Orbit LMS's complete suite: from our 10-theme universe and ⚡ Orbit Flux economy to anti-piracy content streaming, smart discount coupons, public scholar profiles, and zero-loss disaster recovery.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="pt-2 flex flex-wrap justify-center gap-3 sm:gap-4"
                        >
                            <Button
                                size="lg"
                                onClick={() => scrollToStage(0)}
                                className="bg-primary text-primary-foreground font-bold text-xs sm:text-sm px-6 sm:px-8 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2 cursor-pointer touch-press"
                            >
                                Start Interactive Tour <ChevronRight className="h-4 w-4" />
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => setViewMode("deck")}
                                className="border-border text-foreground font-bold text-xs sm:text-sm px-6 sm:px-8 rounded-full hover:bg-accent cursor-pointer touch-press gap-2"
                            >
                                <MonitorPlay className="h-4 w-4 text-amber-500" /> Executive Pitch Deck
                            </Button>
                        </motion.div>
                    </motion.section>

                    {/* ========================================================== */}
                    {/* 10 INTERACTIVE FEATURE STAGES */}
                    {/* ========================================================== */}
                    {stages.map((stage, idx) => (
                        <section
                            key={stage.id}
                            id={`stage-${idx}`}
                            className={`py-16 sm:py-24 px-4 sm:px-6 relative z-10 border-t border-border/40 ${
                                idx % 2 === 0 ? "bg-muted/15" : "bg-background"
                            }`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 60 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.15 }}
                                transition={{ duration: 0.6 }}
                                className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center"
                            >
                                {/* Stage Editorial Info */}
                                <div className={`space-y-5 lg:col-span-6 ${idx % 2 === 1 ? "lg:order-2" : "lg:order-1"}`}>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-semibold">
                                        {stage.badge}
                                    </Badge>

                                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-display text-foreground leading-tight">
                                        {stage.title}
                                    </h2>

                                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                        {stage.summary}
                                    </p>

                                    <div className="space-y-2.5 pt-2">
                                        {stage.highlights.map((h, i) => (
                                            <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                                                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{h}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Contextual Action Button */}
                                    <div className="pt-2">
                                        {idx === 0 && (
                                            <Button
                                                size="sm"
                                                onClick={() => setThemeStudioOpen(true)}
                                                className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 rounded-full"
                                            >
                                                <Palette className="h-3.5 w-3.5" /> Open 10 Themes Store Modal
                                            </Button>
                                        )}
                                        {idx === 2 && (
                                            <Button
                                                size="sm"
                                                onClick={() => setPublicProfileModalOpen(true)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 rounded-full"
                                            >
                                                <Users className="h-3.5 w-3.5" /> Open Public Profile Card Modal
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Stage Live Interactive Widget */}
                                <div className={`lg:col-span-6 ${idx % 2 === 1 ? "lg:order-1" : "lg:order-2"}`}>
                                    {renderInteractiveWidget(idx)}
                                </div>
                            </motion.div>
                        </section>
                    ))}

                    {/* ========================================================== */}
                    {/* CALL TO ACTION BANNER */}
                    {/* ========================================================== */}
                    <section className="py-20 sm:py-28 px-4 sm:px-6 relative z-10 bg-muted/30 text-center border-t border-border/40">
                        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-semibold uppercase">
                                Ready for Deployment
                            </Badge>

                            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground font-display">
                                Transform Your Academic Institution
                            </h2>

                            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
                                Join leading universities and colleges deploying Orbit LMS for accredited coursework, student gamification, anti-piracy content security, and seamless multi-tenancy.
                            </p>

                            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2">
                                <Button
                                    size="lg"
                                    onClick={() => navigate("/register")}
                                    className="bg-primary text-primary-foreground font-bold text-xs sm:text-sm px-6 sm:px-8 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2 cursor-pointer touch-press"
                                >
                                    Get Started Free <ArrowRight className="h-4 w-4" />
                                </Button>

                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => navigate("/login")}
                                    className="border-border text-foreground font-bold text-xs sm:text-sm px-6 sm:px-8 rounded-full hover:bg-accent cursor-pointer touch-press"
                                >
                                    Sign In to Portal
                                </Button>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODALS TRIGGERABLE FROM DEMOS */}
            {/* ============================================================== */}
            <ThemeStudioModal
                open={themeStudioOpen}
                onOpenChange={setThemeStudioOpen}
                userRole="student"
            />

            <PublicStudentProfileModal
                open={publicProfileModalOpen}
                onOpenChange={setPublicProfileModalOpen}
                student={DEMO_STUDENT}
                currentUserId="demo-viewer-id"
            />
        </div>
    );

    // -----------------------------------------------------------------
    // HELPER: Render Interactive Simulator Widget for each stage
    // -----------------------------------------------------------------
    function renderInteractiveWidget(stageIndex: number) {
        switch (stageIndex) {
            // Stage 0: 10 Themes & Flux Economy
            case 0:
                return (
                    <Card className="bg-card border-2 border-purple-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-purple-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Theme Universe & Flux Wallet
                                </span>
                            </div>
                            <Badge className="bg-amber-500/10 text-amber-500 font-mono text-[10px]">
                                10 Visual Themes
                            </Badge>
                        </div>

                        {/* Flux Balance Card with Daily Claim */}
                        <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                    <Zap className="h-5 w-5 fill-amber-500" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Orbit Flux Balance</span>
                                    <p className="text-lg font-mono font-bold text-foreground">
                                        {fluxBalance.toLocaleString()} <span className="text-xs text-amber-500">FLUX</span>
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleClaimFluxDemo}
                                disabled={claimingFlux}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl gap-1 shadow-md touch-press"
                            >
                                <Gift className="h-3.5 w-3.5" />
                                <span>{claimingFlux ? "..." : "+250 Daily"}</span>
                            </Button>
                        </div>

                        {/* Interactive 10 Theme Swatches Matrix */}
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">Click to preview active theme:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                                {THEMES_CATALOG.map((item) => {
                                    const isEquipped = theme === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleThemeSelect(item.id)}
                                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer touch-press flex flex-col justify-between h-18 ${
                                                isEquipped
                                                    ? "border-primary ring-2 ring-primary/40 bg-primary/10"
                                                    : "border-border hover:border-primary/40 bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className="h-3 w-3 rounded-full border border-black/20"
                                                    style={{ background: item.palette.primary }}
                                                />
                                                {isEquipped && <Check className="h-3 w-3 text-primary" />}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-[10px] font-bold text-foreground truncate">{item.name}</p>
                                                <p className="text-[9px] text-muted-foreground font-mono">
                                                    {item.cost === 0 ? "Free" : `⚡${item.cost}`}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Crown className="h-4 w-4 shrink-0" />
                            <span>Master Admin & College Admins have 0-cost VIP access to all 10 themes.</span>
                        </div>
                    </Card>
                );

            // Stage 1: Aura XP & Credit simulator
            case 1:
                return (
                    <Card className="bg-card border-2 border-amber-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Aura XP & Credit Ledger Simulator
                                </span>
                            </div>
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                                {demoAuraXP} Aura XP
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                                <Flame className="h-6 w-6 text-amber-500 mx-auto animate-bounce" />
                                <div className="text-2xl font-bold font-mono text-foreground">{demoAuraXP}</div>
                                <div className="text-[10px] uppercase font-bold text-amber-500">Aura Points</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-1">
                                <Award className="h-6 w-6 text-primary mx-auto" />
                                <div className="text-2xl font-bold font-mono text-foreground">{demoCredits} / 20</div>
                                <div className="text-[10px] uppercase font-bold text-primary">Academic Credits</div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Simulate completing a video lecture, lab exercise, and quiz to earn gamified XP and academic credits.
                        </p>

                        <Button
                            onClick={() => {
                                setDemoAuraXP((prev) => prev + 150);
                                setDemoCredits((prev) => Math.min(prev + 1, 20));
                                toast({
                                    title: "⚡ +150 Aura XP & +1 Academic Credit!",
                                    description: "Module completed. Global leaderboard ranking updated in real-time.",
                                });
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-2 rounded-xl shadow-lg cursor-pointer touch-press"
                        >
                            <Zap className="h-4 w-4 fill-slate-950" /> Complete Lesson (+150 Aura, +1 Credit)
                        </Button>
                    </Card>
                );

            // Stage 2: Verified Public Student Profile
            case 2:
                return (
                    <Card className="bg-card border-2 border-blue-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Public Scholar Profile Preview
                                </span>
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-500 font-mono text-[10px]">
                                URL: /profile/aarav-sharma
                            </Badge>
                        </div>

                        {/* Scholar Card Mockup */}
                        <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-3">
                            <div className="flex items-center gap-3">
                                <img
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                                    alt="Scholar"
                                    className="h-12 w-12 rounded-full border-2 border-primary object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm text-foreground truncate">Aarav Sharma</h4>
                                        <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">Rank #1</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">aarav.sharma@orbitlms.edu</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                                <div className="p-2 rounded-xl bg-background border">
                                    <span className="text-[10px] text-muted-foreground block">Aura</span>
                                    <span className="font-bold text-amber-500">✨ {demoAuraXP}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-background border">
                                    <span className="text-[10px] text-muted-foreground block">Credits</span>
                                    <span className="font-bold text-primary">🎓 {demoCredits}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-background border">
                                    <span className="text-[10px] text-muted-foreground block">Streak</span>
                                    <span className="font-bold text-orange-500">🔥 18d</span>
                                </div>
                            </div>

                            <div className="p-2 rounded-xl bg-background border flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <Palette className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-muted-foreground">Signature Theme:</span>
                                </div>
                                <span className="font-bold text-foreground">Cyberpunk Neon 2077</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => setPublicProfileModalOpen(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 rounded-xl cursor-pointer touch-press"
                        >
                            <ExternalLink className="h-4 w-4" /> Open Interactive Scholar Modal
                        </Button>
                    </Card>
                );

            // Stage 3: Anti-Piracy Content Protection
            case 3:
                return (
                    <Card className="bg-card border-2 border-emerald-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Anti-Piracy Player Simulator
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant={demoPlaybackMode === "slides" ? "default" : "outline"}
                                    onClick={() => setDemoPlaybackMode("slides")}
                                    className="h-7 text-[11px] px-2"
                                >
                                    Slides
                                </Button>
                                <Button
                                    size="sm"
                                    variant={demoPlaybackMode === "doc" ? "default" : "outline"}
                                    onClick={() => setDemoPlaybackMode("doc")}
                                    className="h-7 text-[11px] px-2"
                                >
                                    Docs
                                </Button>
                                <Button
                                    size="sm"
                                    variant={demoPlaybackMode === "video" ? "default" : "outline"}
                                    onClick={() => setDemoPlaybackMode("video")}
                                    className="h-7 text-[11px] px-2"
                                >
                                    Video
                                </Button>
                            </div>
                        </div>

                        {/* Player Frame with Dynamic Watermark */}
                        <div className="relative h-56 bg-slate-950 text-white rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden p-4">
                            {demoWatermarkActive && (
                                <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center opacity-35 select-none rotate-[-12deg]">
                                    <span className="text-xs sm:text-sm font-bold font-mono text-white tracking-widest bg-black/50 px-3 py-1.5 rounded border border-white/20">
                                        PROTECTED • {demoWatermarkText}
                                    </span>
                                </div>
                            )}

                            {demoPlaybackMode === "slides" ? (
                                <div className="text-center space-y-2 z-10">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                                        <Play className="h-5 w-5 fill-amber-400" />
                                    </div>
                                    <p className="font-bold text-sm text-white">Google Slides Presentation Stream</p>
                                    <p className="text-xs text-slate-400">Embedded securely without direct download links.</p>
                                </div>
                            ) : demoPlaybackMode === "doc" ? (
                                <div className="text-center space-y-2 z-10">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <p className="font-bold text-sm text-white">Protected Document Viewer</p>
                                    <p className="text-xs text-slate-400">Right-click & inspect-element blocked.</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-2 z-10">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mx-auto">
                                        <Play className="h-5 w-5 fill-purple-400" />
                                    </div>
                                    <p className="font-bold text-sm text-white">Watermarked MP4 Video Stream</p>
                                    <p className="text-xs text-slate-400">Signed tokens & playback rate guard.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-muted-foreground">Watermark Email Overlay:</span>
                            <Input
                                value={demoWatermarkText}
                                onChange={(e) => setDemoWatermarkText(e.target.value)}
                                className="h-7 text-xs w-48 bg-muted/40 border-border"
                            />
                        </div>
                    </Card>
                );

            // Stage 4: AI Course Builder
            case 4:
                return (
                    <Card className="bg-card border-2 border-rose-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-rose-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    AI Curriculum Synthesizer
                                </span>
                            </div>
                            <Badge className="bg-rose-500/10 text-rose-500 font-mono text-[10px]">
                                JSON Syllabus
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground font-semibold">Course Title / Topic Prompt:</span>
                            <div className="flex gap-2">
                                <Input
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="text-xs h-9"
                                    placeholder="e.g. Distributed Cloud Native Architecture"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleGenerateAiCourse}
                                    disabled={isGeneratingAi}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 rounded-xl"
                                >
                                    {isGeneratingAi ? "Generating..." : "Generate AI"}
                                </Button>
                            </div>
                        </div>

                        {aiCourseGenerated ? (
                            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs font-mono animate-in fade-in">
                                <div className="flex justify-between text-emerald-500 font-bold">
                                    <span>Status: ✅ Curriculum Synthesized</span>
                                    <span>4 Modules</span>
                                </div>
                                <div className="space-y-1 text-muted-foreground text-[11px]">
                                    <p>• Module 1: Foundations & Architecture Design (3 Lessons, 1 Slide Deck)</p>
                                    <p>• Module 2: High-Performance Containers & Kubernetes (4 Lessons)</p>
                                    <p>• Module 3: Security & Anti-Leak Watermark Protocols (2 Lessons)</p>
                                    <p>• Module 4: Graded Capstone Certification Quiz (15 MCQs)</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground">
                                Click "Generate AI" to synthesize an accredited curriculum with lectures and quizzes.
                            </div>
                        )}
                    </Card>
                );

            // Stage 5: Smart Coupons & Monetization
            case 5:
                return (
                    <Card className="bg-card border-2 border-emerald-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-emerald-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Coupon Validation Simulator
                                </span>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                                Try: ORBIT50
                            </Badge>
                        </div>

                        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Accredited Course Tuition:</span>
                                <span className="font-bold text-foreground">₹4,999</span>
                            </div>
                            {demoCouponApplied && (
                                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                    <span>Discount (50% OFF via ORBIT50):</span>
                                    <span>- ₹2,499.50</span>
                                </div>
                            )}
                            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                                <span className="text-foreground">Total Payable:</span>
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    {demoCouponApplied ? "₹2,499.50" : "₹4,999.00"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={demoCoupon}
                                onChange={(e) => setDemoCoupon(e.target.value.toUpperCase())}
                                placeholder="Enter Code"
                                className="bg-background border-border uppercase font-mono text-xs"
                            />
                            <Button
                                onClick={() => {
                                    if (demoCoupon === "ORBIT50") {
                                        setDemoCouponApplied(true);
                                        toast({ title: "Coupon Applied! 🎉", description: "50% discount successfully deducted." });
                                    } else {
                                        toast({ variant: "destructive", title: "Invalid Code", description: "Use code ORBIT50 for this demo." });
                                    }
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                            >
                                Apply Code
                            </Button>
                        </div>
                    </Card>
                );

            // Stage 6: Institutional Branding & Transcripts
            case 6:
                return (
                    <Card className="bg-card border-2 border-indigo-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Official Institutional Transcript
                                </span>
                            </div>
                            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]">A4 Format</Badge>
                        </div>

                        {/* Letterhead Sample Preview */}
                        <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl space-y-3 border shadow-inner">
                            <div className="border-b-2 border-indigo-600 pb-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 bg-indigo-600 text-white font-bold rounded flex items-center justify-center text-xs">
                                        ORBIT
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 leading-tight">
                                            Orbit Institute of Technology
                                        </h4>
                                        <p className="text-[10px] text-slate-500">Official Degree Transcript & Credentials</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-mono text-indigo-700 font-bold border border-indigo-300 px-1.5 py-0.5 rounded">
                                    REG-2026-VERIFIED
                                </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                "This official academic transcript certifies that Aarav Sharma has fulfilled all degree criteria with 18 Academic Credits and 2,450 ✨ Aura Points."
                            </p>

                            <div className="flex justify-between items-end pt-2">
                                <div className="flex items-center gap-1.5">
                                    <QrCode className="h-8 w-8 text-slate-800" />
                                    <span className="text-[8px] font-mono text-slate-400">Scan to Verify</span>
                                </div>
                                <div className="text-right">
                                    <div className="h-7 w-20 bg-indigo-100 border border-indigo-300 rounded flex items-center justify-center text-[8px] font-bold text-indigo-800 ml-auto">
                                        [OFFICIAL SEAL]
                                    </div>
                                    <span className="text-[8px] font-bold block text-slate-800 pt-0.5">University Registrar</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            // Stage 7: Live Classroom & Timetable
            case 7:
                return (
                    <Card className="bg-card border-2 border-rose-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-rose-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">Live Classroom Interface</span>
                            </div>
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] animate-pulse">
                                LIVE NOW
                            </Badge>
                        </div>

                        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                            <h4 className="font-bold text-sm text-foreground">Advanced Distributed Systems & Microservices</h4>
                            <p className="text-xs text-muted-foreground">Dr. Ananya Sharma • Department of Computer Science</p>
                            <div className="flex items-center justify-between text-xs pt-2">
                                <span className="text-muted-foreground">Started 12 mins ago</span>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        toast({
                                            title: "Joining Google Meet Session... 🎥",
                                            description: "Redirecting to secured room with attendance verification.",
                                        });
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 rounded-full cursor-pointer touch-press"
                                >
                                    <Video className="h-3.5 w-3.5" /> Join Meet
                                </Button>
                            </div>
                        </div>
                    </Card>
                );

            // Stage 8: Multi-Tenant Architecture & Feature Gates
            case 8:
                return (
                    <Card className="bg-card border-2 border-cyan-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-cyan-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Feature Gate Matrix (`useCollegeFeatures`)
                                </span>
                            </div>
                            <Badge className="bg-cyan-500/10 text-cyan-500 font-mono text-[10px]">
                                College: Apex Institute
                            </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Toggle features to see how Master Admin controls module access for each college subscription tier:
                        </p>

                        <div className="space-y-2 pt-1">
                            {Object.entries(featureGates).map(([key, val]) => (
                                <div
                                    key={key}
                                    className="p-2.5 rounded-xl border bg-muted/20 flex items-center justify-between text-xs"
                                >
                                    <span className="font-mono font-medium text-foreground">
                                        {key.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                    <Switch
                                        checked={val}
                                        onCheckedChange={(checked) =>
                                            setFeatureGates((prev) => ({ ...prev, [key]: checked }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>
                );

            // Stage 9: Zero-Loss Disaster Recovery
            case 9:
            default:
                return (
                    <Card className="bg-card border-2 border-teal-500/30 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5 text-teal-500" />
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    Zero-Loss Recovery Suite
                                </span>
                            </div>
                            <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-300 font-mono text-[10px]">
                                16 Tables Covered
                            </Badge>
                        </div>

                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 font-mono text-xs text-foreground">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Snapshot Package:</span>
                                <span className="text-teal-600 dark:text-teal-400 font-bold">orbit_snapshot_full.json</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tables Exported:</span>
                                <span className="text-foreground">16 Core Tables</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Base64 Media & Signatures:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Embedded</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Disaster Restoration:</span>
                                <span className="text-foreground">Zero Data Loss</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                toast({
                                    title: "Demo Snapshot Schema Verified! 📦",
                                    description: "16-table relational JSON structure intact and ready for atomic restore.",
                                });
                            }}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-2 rounded-xl cursor-pointer touch-press"
                        >
                            <Download className="h-4 w-4" /> Download Demo Snapshot Schema (.json)
                        </Button>
                    </Card>
                );
        }
    }
}
