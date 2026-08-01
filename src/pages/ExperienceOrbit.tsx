import React, { useState, useEffect, useRef } from "react";
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
    Sun,
    Moon,
    Menu,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function ExperienceOrbit() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Scroll state tracking & physics animations
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    // Scroll-driven dynamic transforms
    const ringRotation = useTransform(scrollYProgress, [0, 1], [0, 720]);
    const orbX = useTransform(scrollYProgress, [0, 0.5, 1], [-50, 150, -50]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.92]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);

    // Active stage based on scroll
    const [activeStage, setActiveStage] = useState(0);

    // Interactive Demo States
    const [demoCoupon, setDemoCoupon] = useState("ORBIT50");
    const [demoCouponApplied, setDemoCouponApplied] = useState(false);
    const [demoWatermarkText, setDemoWatermarkText] = useState("student@university.edu");
    const [demoWatermarkActive, setDemoWatermarkActive] = useState(true);
    const [demoPlaybackMode, setDemoPlaybackMode] = useState<"slides" | "doc" | "video">("slides");
    const [demoAuraXP, setDemoAuraXP] = useState(1250);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Update active stage on scroll
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            if (latest < 0.16) setActiveStage(0);
            else if (latest < 0.32) setActiveStage(1);
            else if (latest < 0.48) setActiveStage(2);
            else if (latest < 0.64) setActiveStage(3);
            else if (latest < 0.80) setActiveStage(4);
            else setActiveStage(5);
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    const stages = [
        {
            id: "core",
            title: "01. Orbit Core Engine",
            subtitle: "AI-Powered Learning, Aura XP & Academic Credit System",
            icon: <Sparkles className="h-4 w-4 text-amber-500" />,
            badge: "Gamified Academic Core"
        },
        {
            id: "content",
            title: "02. Content Player & Protection",
            subtitle: "Secure Google Slides, Documents & Watermarked Video",
            icon: <ShieldCheck className="h-4 w-4 text-blue-500" />,
            badge: "Anti-Piracy Security"
        },
        {
            id: "coupons",
            title: "03. Smart Coupons Module",
            subtitle: "Teacher Discount Management & Admin Granular Access",
            icon: <Ticket className="h-4 w-4 text-emerald-500" />,
            badge: "Monetization & Discounts"
        },
        {
            id: "branding",
            title: "04. Institutional Branding",
            subtitle: "Custom Letterheads, Official Stamps & Digital Registrar Seals",
            icon: <Building2 className="h-4 w-4 text-purple-500" />,
            badge: "Academic Transcripts"
        },
        {
            id: "live",
            title: "05. Live Classroom & Calendar",
            subtitle: "Google Meet Integration, JSON Calendar & Notifications",
            icon: <Video className="h-4 w-4 text-rose-500" />,
            badge: "Real-time Collaboration"
        },
        {
            id: "backup",
            title: "06. Zero-Loss System Recovery",
            subtitle: "16-Table Database Snapshot Export & 100% Zero-Data Restore",
            icon: <HardDrive className="h-4 w-4 text-cyan-500" />,
            badge: "Enterprise Storage"
        }
    ];

    const scrollToStage = (index: number) => {
        setActiveStage(index);
        const stageElement = document.getElementById(`stage-${index}`);
        if (stageElement) {
            stageElement.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans overflow-x-hidden relative transition-colors duration-300">
            {/* Top Scroll Progress Spring Bar */}
            <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-amber-400 to-emerald-400 z-[100] origin-left shadow-lg shadow-primary/50" />

            {/* Ambient Animated Nebula Background with Scroll Rotation */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <motion.div style={{ rotate: ringRotation }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[850px] bg-gradient-to-tr from-primary/10 via-purple-600/5 to-amber-500/5 dark:from-primary/25 dark:via-purple-600/15 dark:to-amber-500/15 rounded-full blur-[140px]" />
                <motion.div style={{ x: orbX }} className="absolute bottom-1/3 left-1/4 w-[650px] h-[650px] bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-transparent dark:from-emerald-500/15 dark:via-cyan-500/15 rounded-full blur-[160px]" />
            </div>

            {/* Navigation Bar - Identical Structure to LandingPage */}
            <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 transition-all">
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
                        <button onClick={() => navigate("/")} className="text-xs font-semibold hover:text-primary transition-colors">Home</button>
                        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Experience Orbit
                        </button>
                        <button onClick={() => navigate("/#about")} className="text-xs font-semibold hover:text-primary transition-colors">About Us</button>
                        <button onClick={() => navigate("/#features")} className="text-xs font-semibold hover:text-primary transition-colors">Features</button>
                        <button onClick={() => navigate("/#courses")} className="text-xs font-semibold hover:text-primary transition-colors">Courses</button>
                        <button onClick={() => navigate("/#contact")} className="text-xs font-semibold hover:text-primary transition-colors">Contact</button>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleTheme}
                            className="h-9 w-9 rounded-xl border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
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

                    {/* Mobile Hamburger & Theme Switcher */}
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

                {/* Sub-Header Interactive Stage Indicator Bar */}
                <div className="border-t border-border/40 bg-muted/30 backdrop-blur-md overflow-x-auto scrollbar-none py-2.5 px-4">
                    <div className="container mx-auto flex items-center justify-start md:justify-center gap-2 min-w-max">
                        {stages.map((stage, idx) => (
                            <motion.button
                                key={stage.id}
                                onClick={() => scrollToStage(idx)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeStage === idx
                                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                }`}
                            >
                                {stage.icon}
                                <span>{stage.title}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-b bg-background px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2">
                        <button onClick={() => navigate("/")} className="block w-full text-left py-2 text-sm font-semibold">Home</button>
                        <button onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="block w-full text-left py-2 text-sm font-bold text-primary flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" /> Experience Orbit
                        </button>
                        <button onClick={() => navigate("/#about")} className="block w-full text-left py-2 text-sm font-semibold">About Us</button>
                        <button onClick={() => navigate("/#features")} className="block w-full text-left py-2 text-sm font-semibold">Features</button>
                        <button onClick={() => navigate("/#courses")} className="block w-full text-left py-2 text-sm font-semibold">Courses</button>
                        <button onClick={() => navigate("/#contact")} className="block w-full text-left py-2 text-sm font-semibold">Contact</button>
                        <div className="pt-2 grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
                            <Button size="sm" onClick={() => navigate("/register")}>Get Started</Button>
                        </div>
                    </div>
                )}
            </nav>

            {/* HERO SECTION */}
            <motion.section style={{ scale: heroScale, opacity: heroOpacity }} className="relative pt-20 pb-28 px-4 sm:px-6 z-10 text-center max-w-5xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md"
                >
                    <Sparkles className="h-4 w-4 text-amber-500" /> Orbit Ecosystem Presentation
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display tracking-tight text-foreground leading-tight"
                >
                    Explore the Future of <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-amber-500">
                        Academic Technology
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                >
                    Scroll down to orbit through our interactive platform capabilities. From anti-piracy content protection to smart discount coupons, official letterhead seals, and zero-loss system recovery.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="pt-4 flex flex-wrap justify-center gap-4"
                >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            size="lg"
                            onClick={() => scrollToStage(0)}
                            className="bg-primary text-primary-foreground font-bold text-sm px-8 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2 cursor-pointer"
                        >
                            Start Guided Tour <ChevronRight className="h-4 w-4" />
                        </Button>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* STAGE 1: ORBIT CORE ENGINE */}
            <section id="stage-0" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-muted/20">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[0].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[0].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Orbit LMS introduces a gamified academic architecture. Students earn **Aura XP** for watching lectures, completing quizzes, and participating in live sessions, while accruing **Academic Credit Points** required for university certifications.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                                <Flame className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-foreground">Aura Points & Leaderboard</h4>
                                    <p className="text-xs text-muted-foreground">Earn Aura points for streaks and rank on the institution leaderboard.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                                <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-foreground">Academic Credit Ledger</h4>
                                    <p className="text-xs text-muted-foreground">Track degree credits earned per module with minimum watch limits.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Widget Demo */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="bg-card border-2 border-amber-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                    <span className="font-bold text-foreground text-sm">Interactive Aura & Credit Simulator</span>
                                </div>
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                                    {demoAuraXP} XP Earned
                                </Badge>
                            </div>

                            <div className="space-y-4 text-center py-4">
                                <div className="h-32 w-32 mx-auto rounded-full bg-gradient-to-tr from-amber-500/20 via-primary/20 to-purple-600/20 border-4 border-amber-500/50 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                                    <Flame className="h-8 w-8 text-amber-500 animate-bounce" />
                                    <span className="text-2xl font-bold text-foreground">{demoAuraXP}</span>
                                    <span className="text-[10px] text-amber-500 uppercase font-mono font-bold">Aura XP</span>
                                </div>

                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    Click the button below to simulate completing a lesson and earning Aura XP!
                                </p>

                                <Button
                                    onClick={() => {
                                        setDemoAuraXP(prev => prev + 150);
                                        toast({ title: "+150 Aura XP Earned! ⚡", description: "Lesson completed! Academic credit added to ledger." });
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 rounded-full shadow-lg cursor-pointer"
                                >
                                    <Zap className="h-4 w-4 fill-slate-950" /> Complete Lesson (+150 XP)
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </section>

            {/* STAGE 2: CONTENT PLAYER & PROTECTION */}
            <section id="stage-1" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    {/* Interactive Viewer Demo */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }} className="order-2 lg:order-1">
                        <Card className="bg-card border-2 border-blue-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                                    <span className="font-bold text-foreground text-sm">Anti-Piracy Player Simulator</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant={demoPlaybackMode === "slides" ? "default" : "outline"}
                                        onClick={() => setDemoPlaybackMode("slides")}
                                        className="h-7 text-[11px] px-2"
                                    >
                                        Google Slides
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={demoPlaybackMode === "doc" ? "default" : "outline"}
                                        onClick={() => setDemoPlaybackMode("doc")}
                                        className="h-7 text-[11px] px-2"
                                    >
                                        Google Doc
                                    </Button>
                                </div>
                            </div>

                            {/* Player Frame with Dynamic Watermark */}
                            <div className="relative h-64 bg-slate-950 text-white rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden p-4">
                                {demoWatermarkActive && (
                                    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center opacity-35 select-none rotate-[-15deg]">
                                        <span className="text-base sm:text-xl font-bold font-mono text-white tracking-widest bg-black/50 px-4 py-2 rounded border border-white/20">
                                            PROTECTED • {demoWatermarkText}
                                        </span>
                                    </div>
                                )}

                                {demoPlaybackMode === "slides" ? (
                                    <div className="text-center space-y-2 z-10">
                                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                                            <Play className="h-6 w-6 fill-amber-400" />
                                        </div>
                                        <p className="font-bold text-sm text-white">Google Slides Presentation Stream</p>
                                        <p className="text-xs text-slate-400">Embedded securely without direct download links.</p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2 z-10">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto">
                                            <FileText className="h-6 w-6 text-blue-400" />
                                        </div>
                                        <p className="font-bold text-sm text-white">Protected Document Viewer</p>
                                        <p className="text-xs text-slate-400">Right-click & inspect-element protection enabled.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2">
                                <span className="text-muted-foreground">Watermark Text:</span>
                                <Input
                                    value={demoWatermarkText}
                                    onChange={(e) => setDemoWatermarkText(e.target.value)}
                                    className="h-7 text-xs w-48 bg-muted/40 border-border"
                                />
                            </div>
                        </Card>
                    </motion.div>

                    <div className="order-1 lg:order-2 space-y-6">
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[1].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[1].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Protect your institution's intellectual property. Orbit LMS renders presentations, PDFs, and videos through embedded viewers with dynamic anti-piracy watermarking, blocking right-clicking, printscreen attempts, and raw download link leakage.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                <span>Zero plain text direct file URL exposure in HTML source code</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                <span>Google Slides, Google Docs, Canva, and PowerPoint stream support</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                <span>Dynamic user email watermark overlay against screen recording</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* STAGE 3: SMART COUPONS MODULE */}
            <section id="stage-2" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-muted/20">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[2].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[2].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            A complete discount engine giving administrators full control. When enabled by the admin, teachers can generate custom discount codes (percentage vs flat ₹ rates), set expiration dates, limit usage counts, and target specific courses.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Admin Master Toggle & Selective Teacher Permission Controls</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Percentage (%) or Flat Amount (₹) Discounts with Max Cap</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Real-time fee validation & student redemption tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Coupon Demo */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="bg-card border-2 border-emerald-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Ticket className="h-5 w-5 text-emerald-500" />
                                    <span className="font-bold text-foreground text-sm">Coupon Validation Simulator</span>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                                    Try Code: ORBIT50
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Sample Course Price:</span>
                                        <span className="font-bold text-foreground">₹4,999</span>
                                    </div>
                                    {demoCouponApplied && (
                                        <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                            <span>Discount (50% OFF):</span>
                                            <span>- ₹2,499.50</span>
                                        </div>
                                    )}
                                    <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                                        <span className="text-foreground">Total Payable:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">{demoCouponApplied ? "₹2,499.50" : "₹4,999.00"}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        value={demoCoupon}
                                        onChange={(e) => setDemoCoupon(e.target.value.toUpperCase())}
                                        placeholder="Enter Coupon Code"
                                        className="bg-background border-border uppercase font-mono text-xs"
                                    />
                                    <Button
                                        onClick={() => {
                                            if (demoCoupon === "ORBIT50") {
                                                setDemoCouponApplied(true);
                                                toast({ title: "Coupon Applied! 🎉", description: "50% discount successfully calculated." });
                                            } else {
                                                toast({ variant: "destructive", title: "Invalid Code", description: "Use code ORBIT50 for demonstration." });
                                            }
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                                    >
                                        Apply Code
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </section>

            {/* STAGE 4: INSTITUTIONAL BRANDING */}
            <section id="stage-3" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    {/* Interactive Letterhead Preview */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }} className="order-2 lg:order-1">
                        <Card className="bg-card border-2 border-purple-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-purple-500" />
                                    <span className="font-bold text-foreground text-sm">Official Institutional Letterhead Preview</span>
                                </div>
                                <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-300 font-mono text-[10px]">A4 Format</Badge>
                            </div>

                            <div className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 border shadow-inner">
                                <div className="border-b-2 border-purple-600 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-purple-600 text-white font-bold rounded flex items-center justify-center text-xs">
                                            ORBIT
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Orbit LMS Innovation Academy</h4>
                                            <p className="text-[10px] text-slate-500">Official Institutional Transcript & Certificate</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-purple-700 font-bold border border-purple-300 px-2 py-0.5 rounded">
                                        REG-2026-ACAD
                                    </span>
                                </div>

                                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                    "This official academic transcript certifies that the student has fulfilled all course objectives, credit points, and minimum video watch limit criteria."
                                </p>

                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-[9px] font-mono text-slate-400">Issued: {new Date().toLocaleDateString()}</span>
                                    <div className="text-right">
                                        <div className="h-8 w-20 bg-purple-100 border border-purple-300 rounded flex items-center justify-center text-[9px] font-bold text-purple-800 ml-auto">
                                            [STAMP SEAL]
                                        </div>
                                        <span className="text-[9px] font-bold block text-slate-800 pt-0.5">Authorized Registrar</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <div className="order-1 lg:order-2 space-y-6">
                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[3].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[3].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Maintain institutional prestige across all generated documents. Customize your official institute logo, letterhead headers, registrar signatures, and digital stamp seals applied automatically to student grade transcripts and certificates.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                                <span>Official Letterhead Branding applied across all transcripts</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                                <span>Base64 Digital Stamp & Signatory Seal Embedding</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                                <span>Printable PDF generation with verified QR codes</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* STAGE 5: LIVE CLASSROOM & CALENDAR */}
            <section id="stage-4" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-muted/20">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[4].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[4].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Schedule live interactive lectures with Google Meet or Zoom integration, import full term schedules via JSON/CSV, and broadcast real-time notifications directly to student dashboards.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />
                                <span>Google Meet & Zoom Direct Join Buttons</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />
                                <span>JSON Calendar Schedule Bulk Importer & Google Calendar Sync</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />
                                <span>Real-time WebSocket Push & In-App Notification Bell</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Live Class Card */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="bg-card border-2 border-rose-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Video className="h-5 w-5 text-rose-500" />
                                    <span className="font-bold text-foreground text-sm">Live Classroom Interface</span>
                                </div>
                                <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] animate-pulse">
                                    LIVE NOW
                                </Badge>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                                <h4 className="font-bold text-sm text-foreground">Advanced Cloud & Context Engineering</h4>
                                <p className="text-xs text-muted-foreground">Dr. Ananya Sharma • Department of Computer Science</p>
                                <div className="flex items-center justify-between text-xs pt-2">
                                    <span className="text-muted-foreground">Started 15 mins ago</span>
                                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 rounded-full cursor-pointer">
                                        <Video className="h-3.5 w-3.5" /> Join Meeting Now
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </section>

            {/* STAGE 6: ZERO-LOSS SYSTEM RECOVERY */}
            <section id="stage-5" className="py-20 px-4 sm:px-6 relative z-10 border-t border-border/40 bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                >
                    {/* Interactive Snapshot Preview */}
                    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }} className="order-2 lg:order-1">
                        <Card className="bg-card border-2 border-cyan-500/30 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-cyan-500" />
                                    <span className="font-bold text-foreground text-sm">Zero-Loss Backup Package</span>
                                </div>
                                <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-mono text-[10px]">16 Tables Covered</Badge>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 font-mono text-xs text-foreground">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Package:</span>
                                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">orbit_lms_full_snapshot.json</span>
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
                                    <span className="text-muted-foreground">Restoration Guarantee:</span>
                                    <span className="text-foreground">Zero Data Loss</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    toast({ title: "Demo Snapshot Verified! 📦", description: "Zero-loss backup suite is fully operational in Admin Settings." });
                                }}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-2 rounded-xl cursor-pointer"
                            >
                                <Download className="h-4 w-4" /> Download Demo Snapshot Schema (.json)
                            </Button>
                        </Card>
                    </motion.div>

                    <div className="order-1 lg:order-2 space-y-6">
                        <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30 text-xs px-3 py-1 font-semibold">
                            {stages[5].badge}
                        </Badge>
                        <h2 className="text-3xl sm:text-5xl font-bold font-display text-foreground">
                            {stages[5].title}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Never worry about data loss. Orbit LMS includes a complete 16-table database snapshot engine. Export your entire ecosystem (users, courses, quizzes, submissions, coupons, and letterhead configurations) into a single JSON file and recover 100% of your platform from scratch.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
                                <span>Relational Dependency Upsert Engine (`users` → `courses` → `enrollments`)</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
                                <span>Base64 Stamp & Signature Asset Preservation</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
                                <span>Live Database Record Metrics Dashboard</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* CALL TO ACTION BANNER */}
            <section className="py-24 px-4 sm:px-6 relative z-10 bg-muted/30 text-center border-t border-border/40">
                <div className="max-w-4xl mx-auto space-y-8">
                    <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground font-display">
                        Ready to Orbit Your Institution?
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                        Experience the most powerful academic learning management system built for modern universities, colleges, and academies.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                size="lg"
                                onClick={() => navigate("/register")}
                                className="bg-primary text-primary-foreground font-bold text-sm px-8 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2 cursor-pointer"
                            >
                                Get Started Free <ArrowRight className="h-4 w-4" />
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => navigate("/login")}
                                className="border-border text-foreground font-bold text-sm px-8 rounded-full hover:bg-accent cursor-pointer"
                            >
                                Sign In to Portal
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}
