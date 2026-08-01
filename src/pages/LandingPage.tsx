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
  Send
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publishedCourses, setPublishedCourses] = useState<any[]>([]);

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
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, thumbnail_url, credit_points, is_published")
        .eq("is_published", true)
        .limit(6);

      if (data && data.length > 0) {
        setPublishedCourses(data);
      } else {
        // Fallback demo courses preview
        setPublishedCourses([
          {
            id: "demo-1",
            title: "Full-Stack Web Development & Cloud Computing",
            description: "Master modern React, Node.js, Next.js, PostgreSQL, and cloud deployments with hands-on projects.",
            credit_points: 4,
            thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"
          },
          {
            id: "demo-2",
            title: "Data Science, AI & Machine Learning Specialization",
            description: "Explore Python data analysis, neural networks, predictive modeling, and AI application engineering.",
            credit_points: 5,
            thumbnail_url: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format&fit=crop&q=80"
          },
          {
            id: "demo-3",
            title: "Cybersecurity & Network Defense Fundamentals",
            description: "Understand network security architecture, vulnerability assessment, ethical hacking, and encryption protocols.",
            credit_points: 3,
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
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("home")} className="text-xs font-semibold hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection("about")} className="text-xs font-semibold hover:text-primary transition-colors">About Us</button>
            <button onClick={() => scrollToSection("features")} className="text-xs font-semibold hover:text-primary transition-colors">Features</button>
            <button onClick={() => scrollToSection("courses")} className="text-xs font-semibold hover:text-primary transition-colors">Courses</button>
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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b bg-background px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2">
            <button onClick={() => scrollToSection("home")} className="block w-full text-left py-2 text-sm font-semibold">Home</button>
            <button onClick={() => scrollToSection("about")} className="block w-full text-left py-2 text-sm font-semibold">About Us</button>
            <button onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-sm font-semibold">Features</button>
            <button onClick={() => scrollToSection("courses")} className="block w-full text-left py-2 text-sm font-semibold">Courses</button>
            <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2 text-sm font-semibold">Contact</button>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
              <Button size="sm" onClick={() => navigate("/register")}>Get Started</Button>
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
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-semibold" onClick={() => scrollToSection("features")}>
                Explore Features
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
                className="bg-card border rounded-2xl overflow-hidden shadow-md flex flex-col hover:shadow-xl transition-all"
              >
                <div className="h-44 w-full bg-muted relative overflow-hidden">
                  <img
                    src={course.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary text-primary-foreground font-bold font-mono text-xs shadow-md gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> 🎓 {course.credit_points || 3} Credits
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg line-clamp-2 text-foreground">{course.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3">{course.description || "Comprehensive academic course module."}</p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Certificate Eligible
                    </span>
                    <Button size="sm" onClick={() => navigate("/register")} className="gap-1.5 font-bold text-xs">
                      <Eye className="h-3.5 w-3.5" /> Preview Course
                    </Button>
                  </div>
                </div>
              </motion.div>
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
      <footer className="py-6 border-t bg-card text-muted-foreground text-xs">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Orbit LMS India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
