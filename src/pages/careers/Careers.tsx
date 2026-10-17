import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  JobOpening,
  JobApplication,
  JOB_DEPARTMENTS,
  DEFAULT_JOB_OPENINGS,
} from "@/types/career";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Briefcase,
  MapPin,
  Clock,
  IndianRupee,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Laptop,
  HeartHandshake,
  Award,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const JOBS_STORAGE_KEY = "orbit_master_job_openings";
const APPS_STORAGE_KEY = "orbit_master_job_applications";

export default function Careers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Job Detail & Application Modal State
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobOpening | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Application Form Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobOpening | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [applyForm, setApplyForm] = useState({
    candidateName: "",
    email: "",
    phone: "",
    location: "",
    experienceLevel: "1-3 Years",
    linkedinUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    coverLetter: "",
    expectedCtc: "",
    noticePeriod: "Immediate",
  });

  useEffect(() => {
    document.title = "Careers at Orbit LMS | Join the Higher EdTech Revolution";
    loadJobs();

    const handleUpdate = () => loadJobs();
    window.addEventListener("orbit_careers_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("orbit_careers_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let loaded: JobOpening[] = [];
      try {
        const { data: dbJobs, error } = await supabase
          .from("job_openings")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!error && dbJobs && dbJobs.length > 0) {
          loaded = dbJobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            department: j.department,
            location: j.location,
            jobType: j.job_type,
            experienceLevel: j.experience_level,
            salaryRange: j.salary_range || "",
            description: j.description,
            responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities : [],
            requirements: Array.isArray(j.requirements) ? j.requirements : [],
            benefits: Array.isArray(j.benefits) ? j.benefits : [],
            isActive: true,
            createdAt: j.created_at,
          }));
        }
      } catch (e) {
        console.warn("Could not load jobs from Supabase:", e);
      }

      const stored = localStorage.getItem(JOBS_STORAGE_KEY);
      let localJobs: JobOpening[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localJobs = parsed.filter((j: JobOpening) => j.isActive !== false);
        } catch {}
      }

      if (loaded.length > 0 && localJobs.length > 0) {
        const map = new Map<string, JobOpening>();
        loaded.forEach((j) => map.set(j.id, j));
        localJobs.forEach((j) => map.set(j.id, j));
        loaded = Array.from(map.values()).filter((j) => j.isActive !== false);
      } else if (loaded.length === 0) {
        loaded = localJobs.length > 0 ? localJobs : DEFAULT_JOB_OPENINGS.filter((j) => j.isActive);
      }

      setJobs(loaded);
    } catch (err) {
      console.warn("Could not load jobs:", err);
      setJobs(DEFAULT_JOB_OPENINGS.filter((j) => j.isActive));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetailModal = (job: JobOpening) => {
    setSelectedJobForDetail(job);
    setIsDetailModalOpen(true);
  };

  const handleOpenApplyModal = (job: JobOpening) => {
    setSelectedJobForApply(job);
    setIsDetailModalOpen(false);
    setSubmitSuccess(false);
    setIsApplyModalOpen(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.candidateName.trim() || !applyForm.email.trim() || !applyForm.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out your name, email, and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!applyForm.resumeUrl.trim()) {
      toast({
        title: "Resume Required",
        description: "Please provide a Google Drive, Dropbox, or portfolio link to your resume.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const newApp: JobApplication = {
        id: `app-${Date.now()}`,
        jobId: selectedJobForApply?.id || "general-application",
        jobTitle: selectedJobForApply?.title || "General Application",
        candidateName: applyForm.candidateName.trim(),
        email: applyForm.email.trim(),
        phone: applyForm.phone.trim(),
        location: applyForm.location.trim(),
        experienceLevel: applyForm.experienceLevel,
        linkedinUrl: applyForm.linkedinUrl.trim(),
        portfolioUrl: applyForm.portfolioUrl.trim(),
        resumeUrl: applyForm.resumeUrl.trim(),
        coverLetter: applyForm.coverLetter.trim(),
        expectedCtc: applyForm.expectedCtc.trim(),
        noticePeriod: applyForm.noticePeriod,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // 1. Save to Supabase
      try {
        await supabase.from("job_applications").insert([
          {
            id: newApp.id,
            job_id: newApp.jobId,
            job_title: newApp.jobTitle,
            candidate_name: newApp.candidateName,
            email: newApp.email,
            phone: newApp.phone,
            location: newApp.location,
            experience_level: newApp.experienceLevel,
            linkedin_url: newApp.linkedinUrl,
            portfolio_url: newApp.portfolioUrl,
            resume_url: newApp.resumeUrl,
            cover_letter: newApp.coverLetter,
            expected_ctc: newApp.expectedCtc,
            notice_period: newApp.noticePeriod,
            status: "pending",
          },
        ]);
      } catch (e) {
        console.warn("Could not insert to Supabase job_applications:", e);
      }

      // 2. Save to localStorage
      try {
        const stored = localStorage.getItem(APPS_STORAGE_KEY);
        const existing: JobApplication[] = stored ? JSON.parse(stored) : [];
        const updated = [newApp, ...existing];
        localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("orbit_applications_updated", { detail: updated }));
        window.dispatchEvent(new Event("storage"));
      } catch {}

      setSubmitSuccess(true);
      toast({
        title: "Application Submitted! 🎉",
        description: `Thank you, ${newApp.candidateName}. Your application for "${newApp.jobTitle}" has been received.`,
      });
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        !searchQuery ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === "all" || j.department === selectedDept;
      const matchType = selectedType === "all" || j.jobType === selectedType;

      return matchSearch && matchDept && matchType;
    });
  }, [jobs, searchQuery, selectedDept, selectedType]);

  const perks = [
    {
      icon: <IndianRupee className="h-6 w-6 text-emerald-400" />,
      title: "Competitive Compensation & ESOPs",
      desc: "Top 10th percentile Indian SaaS salary packages with generous equity grants for all team members.",
    },
    {
      icon: <Laptop className="h-6 w-6 text-sky-400" />,
      title: "Remote & Hybrid Flexibility",
      desc: "Work from our state-of-the-art tech hubs in Bengaluru and Noida, or 100% remotely from anywhere in India.",
    },
    {
      icon: <HeartHandshake className="h-6 w-6 text-rose-400" />,
      title: "Comprehensive Health Coverage",
      desc: "₹10 Lakh cashless family health insurance coverage including parents, mental wellness, and maternity.",
    },
    {
      icon: <Award className="h-6 w-6 text-amber-400" />,
      title: "Real Higher Ed Impact",
      desc: "Directly shape the academic journeys of over 100,000 university students and college faculty members across India.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/20">
              O
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg leading-tight tracking-tight text-foreground">
                Orbit<span className="text-primary">LMS</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Careers & Culture
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/#pricing" className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-block">
              Plans & Pricing
            </Link>
            <Link to="/blog" className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-block">
              Blog & Research
            </Link>
            <Button size="sm" onClick={() => navigate("/login")} className="font-bold text-xs bg-primary text-primary-foreground">
              Campus Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 bg-muted/20 border-b overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-5xl text-center space-y-4 relative z-10">
          <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary border-primary/30 gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> We're Hiring Across India
          </Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Build the Operating System for Modern Higher Education
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join our mission to empower 500+ Indian universities and colleges with automated NEP 2020 credit banking, autonomous AI curricula, and next-gen campus security.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById("open-positions");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-bold text-xs shadow-md gap-2"
            >
              View {jobs.length} Open Positions <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/blog")}
              className="w-full sm:w-auto text-xs font-bold"
            >
              Read Our EdTech Research
            </Button>
          </div>
        </div>
      </section>

      {/* Life at Orbit LMS / Perks */}
      <section className="py-16 px-4 bg-background border-b">
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30 uppercase tracking-widest">
              Life at Orbit LMS
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground">
              Why Extraordinary Builders Choose Orbit
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p, idx) => (
              <Card key={idx} className="bg-card border shadow-xs hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-3">
                  <div className="p-2.5 rounded-xl bg-muted w-fit border">{p.icon}</div>
                  <h3 className="font-bold text-sm text-foreground">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section id="open-positions" className="py-16 px-4 bg-muted/20 flex-1">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-foreground">
                Current Opportunities ({filteredJobs.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Explore engineering, AI research, campus sales, and design openings at Orbit LMS.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-card text-xs h-9"
                />
              </div>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-full sm:w-[170px] bg-card text-xs h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Departments</SelectItem>
                  {JOB_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jobs Grid */}
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card space-y-3">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-foreground">No matching positions found</h4>
              <p className="text-xs text-muted-foreground">
                Try resetting your filters or check back soon as our hiring team adds new positions.
              </p>
              <Button size="sm" onClick={() => { setSearchQuery(""); setSelectedDept("all"); }}>
                Reset Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border bg-card p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                        {job.department}
                      </Badge>
                      <span className="text-[11px] font-bold text-emerald-500 font-mono">
                        {job.salaryRange}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-foreground leading-snug">
                      {job.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {job.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-cyan-500" /> {job.jobType}
                      </span>
                      <span>•</span>
                      <span>{job.experienceLevel}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetailModal(job)}
                      className="text-xs font-semibold flex-1"
                    >
                      View Role Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenApplyModal(job)}
                      className="bg-primary text-primary-foreground font-bold text-xs flex-1 gap-1 shadow-sm"
                    >
                      Apply Now <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* General Inquiries Banner */}
          <div className="rounded-3xl bg-card border p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-lg font-bold font-display text-foreground">
                Don't See Your Exact Role?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                We are always eager to meet world-class engineers, product thinkers, and educational researchers. Submit a general profile and our Master Admin will review it.
              </p>
            </div>
            <Button
              onClick={() =>
                handleOpenApplyModal({
                  id: "general",
                  title: "General Open Application",
                  department: "All Teams",
                  location: "India",
                  jobType: "Full-time",
                  experienceLevel: "1-3 Years",
                  salaryRange: "Competitive",
                  description: "Open application for exceptional software engineers and EdTech practitioners.",
                  responsibilities: [],
                  requirements: [],
                  benefits: [],
                  isActive: true,
                  createdAt: new Date().toISOString(),
                })
              }
              variant="outline"
              className="text-xs font-bold shrink-0"
            >
              Submit General Profile
            </Button>
          </div>
        </div>
      </section>

      {/* MODAL 1: JOB ROLE DETAILS */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl bg-card border text-card-foreground max-h-[88vh] overflow-y-auto p-4 sm:p-6">
          {selectedJobForDetail && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {selectedJobForDetail.department}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">• {selectedJobForDetail.jobType}</span>
                </div>
                <DialogTitle className="text-xl font-bold font-display text-foreground leading-tight">
                  {selectedJobForDetail.title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {selectedJobForDetail.location}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-500 font-bold font-mono">
                    {selectedJobForDetail.salaryRange}
                  </span>
                  <span>•</span>
                  <span>{selectedJobForDetail.experienceLevel}</span>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-sm text-foreground mb-1">About the Role</h4>
                  <p className="text-muted-foreground">{selectedJobForDetail.description}</p>
                </div>

                {selectedJobForDetail.responsibilities.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1.5">What You'll Do</h4>
                    <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                      {selectedJobForDetail.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJobForDetail.requirements.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1.5">What We're Looking For</h4>
                    <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                      {selectedJobForDetail.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJobForDetail.benefits.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1.5">Perks & Benefits</h4>
                    <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                      {selectedJobForDetail.benefits.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenApplyModal(selectedJobForDetail)}
                  className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-md"
                >
                  Apply for This Position <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: INTERACTIVE JOB APPLICATION FORM */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl bg-card border text-card-foreground max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          {submitSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground">
                Application Successfully Submitted!
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{applyForm.candidateName}</strong>. Your profile for{" "}
                <strong>{selectedJobForApply?.title}</strong> has been transmitted directly to the Orbit LMS Master Admin and recruiting panel. We will reach out to you within 48 business hours.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Button size="sm" onClick={() => setIsApplyModalOpen(false)} className="text-xs font-bold">
                  Browse More Roles
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Job Application
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedJobForApply?.location}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold font-display text-foreground">
                  Apply for: {selectedJobForApply?.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submit your details below. Your resume and application will be reviewed directly by the hiring panel.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitApplication} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      placeholder="e.g. Arjun Mehta"
                      value={applyForm.candidateName}
                      onChange={(e) => setApplyForm({ ...applyForm, candidateName: e.target.value })}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="arjun.mehta@gmail.com"
                      value={applyForm.email}
                      onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone / WhatsApp *</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={applyForm.phone}
                      onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Current City / Location *</Label>
                    <Input
                      placeholder="e.g. Bengaluru, Pune, Delhi NCR"
                      value={applyForm.location}
                      onChange={(e) => setApplyForm({ ...applyForm, location: e.target.value })}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Experience Level *</Label>
                    <Select
                      value={applyForm.experienceLevel}
                      onValueChange={(val) => setApplyForm({ ...applyForm, experienceLevel: val })}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Fresh Graduate">Fresh Graduate</SelectItem>
                        <SelectItem value="1-3 Years">1-3 Years</SelectItem>
                        <SelectItem value="3-5 Years">3-5 Years</SelectItem>
                        <SelectItem value="5+ Years">5+ Years</SelectItem>
                        <SelectItem value="Lead / Principal">Lead / Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Notice Period *</Label>
                    <Select
                      value={applyForm.noticePeriod}
                      onValueChange={(val) => setApplyForm({ ...applyForm, noticePeriod: val })}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Immediate">Immediate</SelectItem>
                        <SelectItem value="15 Days">15 Days</SelectItem>
                        <SelectItem value="30 Days">30 Days</SelectItem>
                        <SelectItem value="60 Days">60 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Resume / CV URL (Google Drive, Dropbox, or Portfolio) *</Label>
                    <Input
                      placeholder="https://drive.google.com/file/d/.../view (Ensure link sharing is set to viewable)"
                      value={applyForm.resumeUrl}
                      onChange={(e) => setApplyForm({ ...applyForm, resumeUrl: e.target.value })}
                      className="text-xs h-9 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">LinkedIn Profile URL</Label>
                    <Input
                      placeholder="https://linkedin.com/in/username"
                      value={applyForm.linkedinUrl}
                      onChange={(e) => setApplyForm({ ...applyForm, linkedinUrl: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">GitHub / Portfolio URL</Label>
                    <Input
                      placeholder="https://github.com/username"
                      value={applyForm.portfolioUrl}
                      onChange={(e) => setApplyForm({ ...applyForm, portfolioUrl: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Expected Annual CTC (₹)</Label>
                    <Input
                      placeholder="e.g. ₹18 LPA"
                      value={applyForm.expectedCtc}
                      onChange={(e) => setApplyForm({ ...applyForm, expectedCtc: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Why Orbit LMS? (Brief Note / Cover Letter)</Label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about a challenge you solved or why you are excited about transforming higher education technology..."
                      value={applyForm.coverLetter}
                      onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                      className="w-full rounded-md border p-2.5 text-xs focus:ring-1 ring-primary outline-none"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Submit Application
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-card py-8 px-4 text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/#pricing" className="hover:text-foreground">SaaS Pricing</Link>
          <Link to="/blog" className="hover:text-foreground">Blog & Research</Link>
          <Link to="/careers" className="hover:text-foreground text-primary">Careers</Link>
          <Link to="/#contact" className="hover:text-foreground">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} Orbit LMS India. All rights reserved.</p>
      </footer>
    </div>
  );
}
