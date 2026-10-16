import { useState, useEffect, useMemo } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Users,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  Download,
  Share2,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
  Copy,
  Layers,
  Sparkles,
  TrendingUp,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  JobOpening,
  JobApplication,
  JOB_DEPARTMENTS,
  DEFAULT_JOB_OPENINGS,
  DEFAULT_JOB_APPLICATIONS,
} from "@/types/career";

const JOBS_STORAGE_KEY = "orbit_master_job_openings";
const APPS_STORAGE_KEY = "orbit_master_job_applications";

export default function MasterCareers() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("applications");
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Applications
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [appJobFilter, setAppJobFilter] = useState("all");

  // Filters for Jobs
  const [jobSearch, setJobSearch] = useState("");
  const [jobDeptFilter, setJobDeptFilter] = useState("all");

  // Job Opening Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    department: JOB_DEPARTMENTS[0] as string,
    location: "Bengaluru / Hybrid",
    jobType: "Full-time" as JobOpening["jobType"],
    experienceLevel: "1-3 Years" as JobOpening["experienceLevel"],
    salaryRange: "₹12 LPA - ₹20 LPA",
    description: "",
    responsibilitiesText: "Architect scalable backend services\nCollaborate with university leadership\nOptimize performance",
    requirementsText: "2+ years experience in TypeScript/React\nStrong knowledge of PostgreSQL and REST APIs\nGreat communication skills",
    benefitsText: "Competitive compensation & ESOPs\nFull medical insurance\nFlexible remote working culture",
    isActive: true,
  });

  // Candidate Application Deep Dive Modal State
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [appAdminNotes, setAppAdminNotes] = useState("");
  const [appStatus, setAppStatus] = useState<JobApplication["status"]>("pending");
  const [updatingApp, setUpdatingApp] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Job Openings
      let loadedJobs: JobOpening[] = [];
      try {
        const { data: dbJobs, error } = await supabase
          .from("job_openings")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbJobs && dbJobs.length > 0) {
          loadedJobs = dbJobs.map((j: any) => ({
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
            isActive: j.is_active !== false,
            createdAt: j.created_at || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.warn("Supabase job_openings table not ready:", e);
      }

      if (loadedJobs.length === 0) {
        const stored = localStorage.getItem(JOBS_STORAGE_KEY);
        if (stored) {
          try {
            loadedJobs = JSON.parse(stored);
          } catch {
            loadedJobs = DEFAULT_JOB_OPENINGS;
          }
        } else {
          loadedJobs = DEFAULT_JOB_OPENINGS;
          localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(DEFAULT_JOB_OPENINGS));
        }
      }
      setJobs(loadedJobs);

      // 2. Load Applications
      let loadedApps: JobApplication[] = [];
      try {
        const { data: dbApps, error: appErr } = await supabase
          .from("job_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (!appErr && dbApps && dbApps.length > 0) {
          loadedApps = dbApps.map((a: any) => ({
            id: a.id,
            jobId: a.job_id || "",
            jobTitle: a.job_title,
            candidateName: a.candidate_name,
            email: a.email,
            phone: a.phone,
            location: a.location || "",
            experienceLevel: a.experience_level || "",
            linkedinUrl: a.linkedin_url || "",
            portfolioUrl: a.portfolio_url || "",
            resumeUrl: a.resume_url,
            coverLetter: a.cover_letter || "",
            expectedCtc: a.expected_ctc || "",
            noticePeriod: a.notice_period || "",
            status: a.status || "pending",
            adminNotes: a.admin_notes || "",
            createdAt: a.created_at || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.warn("Supabase job_applications table not ready:", e);
      }

      if (loadedApps.length === 0) {
        const stored = localStorage.getItem(APPS_STORAGE_KEY);
        if (stored) {
          try {
            loadedApps = JSON.parse(stored);
          } catch {
            loadedApps = DEFAULT_JOB_APPLICATIONS;
          }
        } else {
          loadedApps = DEFAULT_JOB_APPLICATIONS;
          localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(DEFAULT_JOB_APPLICATIONS));
        }
      }
      setApplications(loadedApps);
    } catch (err) {
      console.error("Error loading careers data:", err);
    } finally {
      setLoading(false);
    }
  };

  const persistJobs = async (updated: JobOpening[]) => {
    setJobs(updated);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updated));

    try {
      window.dispatchEvent(new CustomEvent("orbit_careers_updated", { detail: updated }));
      window.dispatchEvent(new Event("storage"));
    } catch {}

    try {
      const records = updated.map((j) => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        job_type: j.jobType,
        experience_level: j.experienceLevel,
        salary_range: j.salaryRange,
        description: j.description,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        benefits: j.benefits,
        is_active: j.isActive,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("job_openings").upsert(records, { onConflict: "id" });
    } catch (e) {
      console.warn("Could not upsert jobs to Supabase:", e);
    }
  };

  const persistApplications = async (updated: JobApplication[]) => {
    setApplications(updated);
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(updated));

    try {
      window.dispatchEvent(new CustomEvent("orbit_applications_updated", { detail: updated }));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  // Open Create Job Modal
  const handleOpenCreateJob = () => {
    setEditingJob(null);
    setJobForm({
      title: "",
      department: JOB_DEPARTMENTS[0],
      location: "Bengaluru / Hybrid",
      jobType: "Full-time",
      experienceLevel: "1-3 Years",
      salaryRange: "₹12 LPA - ₹20 LPA",
      description: "",
      responsibilitiesText: "Architect scalable backend services\nCollaborate with university leadership\nOptimize performance",
      requirementsText: "2+ years experience in TypeScript/React\nStrong knowledge of PostgreSQL and REST APIs\nGreat communication skills",
      benefitsText: "Competitive compensation & ESOPs\nFull medical insurance\nFlexible remote working culture",
      isActive: true,
    });
    setIsJobModalOpen(true);
  };

  // Open Edit Job Modal
  const handleOpenEditJob = (job: JobOpening) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      department: job.department,
      location: job.location,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      salaryRange: job.salaryRange,
      description: job.description,
      responsibilitiesText: job.responsibilities.join("\n"),
      requirementsText: job.requirements.join("\n"),
      benefitsText: job.benefits.join("\n"),
      isActive: job.isActive,
    });
    setIsJobModalOpen(true);
  };

  // Save Job Opening
  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a job title.",
        variant: "destructive",
      });
      return;
    }

    setSavingJob(true);
    try {
      const resp = jobForm.responsibilitiesText.split("\n").map((r) => r.trim()).filter(Boolean);
      const reqs = jobForm.requirementsText.split("\n").map((r) => r.trim()).filter(Boolean);
      const bens = jobForm.benefitsText.split("\n").map((b) => b.trim()).filter(Boolean);

      if (editingJob) {
        const updated = jobs.map((j) =>
          j.id === editingJob.id
            ? {
                ...j,
                title: jobForm.title,
                department: jobForm.department,
                location: jobForm.location,
                jobType: jobForm.jobType,
                experienceLevel: jobForm.experienceLevel,
                salaryRange: jobForm.salaryRange,
                description: jobForm.description,
                responsibilities: resp,
                requirements: reqs,
                benefits: bens,
                isActive: jobForm.isActive,
                updatedAt: new Date().toISOString(),
              }
            : j
        );
        await persistJobs(updated);
        toast({
          title: "Job Position Updated",
          description: `"${jobForm.title}" has been updated successfully.`,
        });
      } else {
        const newJob: JobOpening = {
          id: `job-${Date.now()}`,
          title: jobForm.title,
          department: jobForm.department,
          location: jobForm.location,
          jobType: jobForm.jobType,
          experienceLevel: jobForm.experienceLevel,
          salaryRange: jobForm.salaryRange,
          description: jobForm.description,
          responsibilities: resp,
          requirements: reqs,
          benefits: bens,
          isActive: jobForm.isActive,
          createdAt: new Date().toISOString(),
        };
        const updated = [newJob, ...jobs];
        await persistJobs(updated);
        toast({
          title: "Job Opening Published",
          description: `"${newJob.title}" is now open for applications on /careers.`,
        });
      }
      setIsJobModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingJob(false);
    }
  };

  // Toggle Job Active / Pause
  const handleToggleJobActive = async (job: JobOpening) => {
    const updated = jobs.map((j) =>
      j.id === job.id ? { ...j, isActive: !j.isActive } : j
    );
    await persistJobs(updated);
    toast({
      title: !job.isActive ? "Position Activated" : "Position Paused",
      description: `"${job.title}" is ${!job.isActive ? "now accepting applications on /careers" : "paused from receiving applications"}.`,
    });
  };

  // Delete Job Opening
  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (confirm(`Are you sure you want to delete the job opening "${jobTitle}"?`)) {
      const updated = jobs.filter((j) => j.id !== jobId);
      await persistJobs(updated);
      try {
        await supabase.from("job_openings").delete().eq("id", jobId);
      } catch (e) {
        console.warn("Could not delete job from Supabase:", e);
      }
      toast({
        title: "Job Opening Removed",
        description: `"${jobTitle}" has been deleted.`,
      });
    }
  };

  // Open Application Deep Dive Review
  const handleReviewApplication = (app: JobApplication) => {
    setSelectedApp(app);
    setAppStatus(app.status);
    setAppAdminNotes(app.adminNotes || "");
    setIsAppModalOpen(true);
  };

  // Save Application Status & Notes
  const handleUpdateApplicationStatus = async () => {
    if (!selectedApp) return;

    setUpdatingApp(true);
    try {
      const updated = applications.map((a) =>
        a.id === selectedApp.id
          ? { ...a, status: appStatus, adminNotes: appAdminNotes }
          : a
      );
      await persistApplications(updated);

      try {
        await supabase
          .from("job_applications")
          .update({
            status: appStatus,
            admin_notes: appAdminNotes,
          })
          .eq("id", selectedApp.id);
      } catch (e) {
        console.warn("Supabase job_applications update warning:", e);
      }

      toast({
        title: "Application Updated",
        description: `Candidate "${selectedApp.candidateName}" marked as ${appStatus.replace("_", " ").toUpperCase()}.`,
      });
      setIsAppModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingApp(false);
    }
  };

  // Delete Application
  const handleDeleteApplication = async (appId: string, candidateName: string) => {
    if (confirm(`Are you sure you want to remove the application for "${candidateName}"?`)) {
      const updated = applications.filter((a) => a.id !== appId);
      await persistApplications(updated);
      try {
        await supabase.from("job_applications").delete().eq("id", appId);
      } catch (e) {
        console.warn("Could not delete from Supabase:", e);
      }
      toast({
        title: "Application Deleted",
        description: `Application for "${candidateName}" removed.`,
      });
    }
  };

  // Export Applications to CSV
  const handleExportCSV = () => {
    if (applications.length === 0) {
      toast({ title: "No Data", description: "No applications to export." });
      return;
    }

    const headers = [
      "ID",
      "Candidate Name",
      "Email",
      "Phone",
      "Job Title",
      "Location",
      "Experience Level",
      "Expected CTC",
      "Notice Period",
      "Status",
      "LinkedIn URL",
      "Resume URL",
      "Admin Notes",
      "Applied Date",
    ];

    const rows = applications.map((a) => [
      a.id,
      `"${a.candidateName.replace(/"/g, '""')}"`,
      `"${a.email}"`,
      `"${a.phone}"`,
      `"${a.jobTitle.replace(/"/g, '""')}"`,
      `"${a.location || ""}"`,
      `"${a.experienceLevel}"`,
      `"${a.expectedCtc || ""}"`,
      `"${a.noticePeriod || ""}"`,
      `"${a.status}"`,
      `"${a.linkedinUrl || ""}"`,
      `"${a.resumeUrl || ""}"`,
      `"${(a.adminNotes || "").replace(/"/g, '""')}"`,
      `"${new Date(a.createdAt).toLocaleDateString("en-IN")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orbit_lms_job_applications_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Applications Exported",
      description: `Downloaded ${applications.length} candidate applications in CSV format.`,
    });
  };

  // Quick WhatsApp message generator
  const handleOpenWhatsApp = (app: JobApplication) => {
    const text = `Hi ${app.candidateName},\n\nThank you for applying for the "${app.jobTitle}" position at Orbit LMS. The hiring committee has reviewed your credentials and we would like to invite you for an initial interview discussion. Please let us know when you would be available this week.\n\nBest regards,\nOrbit LMS Talent Acquisition`;
    const cleanPhone = app.phone.replace(/[^\d]/g, "");
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  };

  // Quick Email generator
  const handleOpenEmail = (app: JobApplication) => {
    const subject = `Orbit LMS Interview Invitation: ${app.jobTitle}`;
    const body = `Hi ${app.candidateName},\n\nThank you for applying for the "${app.jobTitle}" role at Orbit LMS.\n\nWe were impressed by your background and would like to schedule an introductory video call.\n\nPlease share your availability for the coming days.\n\nBest regards,\nMaster Admin & Hiring Team\nOrbit LMS India`;
    window.open(`mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // Status Badge Colors
  const getStatusBadge = (status: JobApplication["status"]) => {
    switch (status) {
      case "shortlisted":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Shortlisted</Badge>;
      case "interview_scheduled":
        return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">Interview Scheduled</Badge>;
      case "reviewing":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Under Review</Badge>;
      case "hired":
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">Hired</Badge>;
      case "rejected":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">Not Selected</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">Pending Review</Badge>;
    }
  };

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return applications.filter((a) => {
      const matchSearch =
        !appSearch ||
        a.candidateName.toLowerCase().includes(appSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(appSearch.toLowerCase()) ||
        a.phone.includes(appSearch) ||
        a.jobTitle.toLowerCase().includes(appSearch.toLowerCase()) ||
        a.location.toLowerCase().includes(appSearch.toLowerCase());

      const matchStatus = appStatusFilter === "all" || a.status === appStatusFilter;
      const matchJob = appJobFilter === "all" || a.jobId === appJobFilter || a.jobTitle === appJobFilter;

      return matchSearch && matchStatus && matchJob;
    });
  }, [applications, appSearch, appStatusFilter, appJobFilter]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        !jobSearch ||
        j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.location.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.description.toLowerCase().includes(jobSearch.toLowerCase());

      const matchDept = jobDeptFilter === "all" || j.department === jobDeptFilter;
      return matchSearch && matchDept;
    });
  }, [jobs, jobSearch, jobDeptFilter]);

  const activeJobsCount = useMemo(() => jobs.filter((j) => j.isActive).length, [jobs]);
  const shortlistedCount = useMemo(() => applications.filter((a) => a.status === "shortlisted" || a.status === "interview_scheduled").length, [applications]);

  return (
    <MasterLayout
      headerTitle="Careers & Job Applications Manager"
      headerDescription="Oversee active job postings, review submitted candidate applications, schedule interviews, and manage talent acquisition for Orbit LMS."
    >
      <div className="space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Positions</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Briefcase className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{jobs.length} Roles</div>
              <p className="text-xs text-slate-400 mt-1">{activeJobsCount} currently open on /careers</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Applicants</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{applications.length} Received</div>
              <p className="text-xs text-slate-400 mt-1">Submitted through the careers form</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Pipeline Active</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{shortlistedCount} Candidates</div>
              <p className="text-xs text-slate-400 mt-1">Shortlisted or interview scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Public Portal</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">Live at /careers</div>
              <p className="text-xs text-slate-400 mt-1">Accepting resumes & portfolios</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Selector & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-slate-900 border border-slate-800 text-slate-400">
              <TabsTrigger
                value="applications"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <Users className="w-4 h-4 mr-2" /> Applications ({applications.length})
              </TabsTrigger>
              <TabsTrigger
                value="openings"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <Briefcase className="w-4 h-4 mr-2" /> Job Postings ({jobs.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/careers", "_blank")}
              className="border-slate-800 hover:bg-slate-800 text-cyan-400 text-xs h-9"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View /careers Portal
            </Button>
            {activeTab === "applications" ? (
              <Button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export Candidates CSV
              </Button>
            ) : (
              <Button
                onClick={handleOpenCreateJob}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Post New Job Opening
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: APPLICATIONS PIPELINE */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search candidate name, email, phone, or location..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-800 text-white text-xs h-9"
                  />
                </div>
                <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                  <SelectTrigger className="w-[150px] bg-slate-900 border-slate-800 text-slate-300 text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Under Review</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Not Selected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={appJobFilter} onValueChange={setAppJobFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-slate-300 text-xs h-9">
                    <SelectValue placeholder="Role Applied" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                    <SelectItem value="all">All Roles</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Applications Table Card */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Candidate Details</TableHead>
                        <TableHead className="text-slate-400 text-xs">Position Applied</TableHead>
                        <TableHead className="text-slate-400 text-xs">Experience & Notice</TableHead>
                        <TableHead className="text-slate-400 text-xs">Expected CTC</TableHead>
                        <TableHead className="text-slate-400 text-xs">Pipeline Status</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                            No candidate applications found matching the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApps.map((app) => (
                          <TableRow key={app.id} className="border-slate-800/60 hover:bg-slate-800/40">
                            <TableCell className="py-3">
                              <div className="space-y-1">
                                <div
                                  onClick={() => handleReviewApplication(app)}
                                  className="font-bold text-white text-xs hover:text-indigo-400 cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{app.candidateName}</span>
                                  {app.linkedinUrl && (
                                    <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                                      in
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                  <span>{app.email}</span>
                                  <span>•</span>
                                  <span>{app.phone}</span>
                                </div>
                                {app.location && (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" /> {app.location}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-slate-200">{app.jobTitle}</div>
                                <div className="text-[10px] text-slate-500">
                                  Applied {new Date(app.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="text-xs text-slate-300">
                                <div>{app.experienceLevel || "Not specified"}</div>
                                <div className="text-[10px] text-slate-500">Notice: {app.noticePeriod || "N/A"}</div>
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              <span className="font-mono text-xs text-emerald-400 font-bold">
                                {app.expectedCtc || "Negotiable"}
                              </span>
                            </TableCell>

                            <TableCell className="py-3">
                              {getStatusBadge(app.status)}
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenWhatsApp(app)}
                                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  title="Connect on WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEmail(app)}
                                  className="h-7 w-7 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                                  title="Send Email Invitation"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReviewApplication(app)}
                                  className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-medium"
                                  title="Review Application & Resume"
                                >
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteApplication(app.id, app.candidateName)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                  title="Remove Application"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: JOB OPENINGS MANAGEMENT */}
        {activeTab === "openings" && (
          <div className="space-y-4">
            {/* Search & Dept Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search job postings by title, location, or keywords..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-800 text-white text-xs h-9"
                  />
                </div>
                <Select value={jobDeptFilter} onValueChange={setJobDeptFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-slate-300 text-xs h-9">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
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

            {/* Jobs Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map((job) => {
                const jobAppCount = applications.filter((a) => a.jobId === job.id || a.jobTitle === job.title).length;
                return (
                  <Card
                    key={job.id}
                    className={`bg-slate-900 border text-slate-100 flex flex-col justify-between transition-all hover:border-indigo-500/50 shadow-md ${
                      job.isActive ? "border-slate-800" : "border-slate-800/50 opacity-70"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-mono text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                          {job.department}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleToggleJobActive(job)}
                          title={job.isActive ? "Position Active on /careers. Click to pause." : "Position Paused. Click to activate."}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                            job.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {job.isActive ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-400" />
                              <span>Active on /careers</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Paused</span>
                            </>
                          )}
                        </button>
                      </div>

                      <CardTitle className="text-base font-bold text-white leading-tight">
                        {job.title}
                      </CardTitle>

                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> {job.jobType}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono font-semibold">
                          {job.salaryRange}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="py-2 space-y-3 text-xs text-slate-300">
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>

                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Applications:
                        </span>
                        <span className="font-bold text-white font-mono">{jobAppCount} Candidates</span>
                      </div>
                    </CardContent>

                    <div className="p-4 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAppJobFilter(job.id);
                          setActiveTab("applications");
                        }}
                        className="text-xs border-slate-800 text-slate-300 hover:bg-slate-800 h-8 flex-1"
                      >
                        View {jobAppCount} Applicants
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditJob(job)}
                        className="text-xs text-indigo-400 hover:bg-indigo-500/10 h-8 px-3"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        className="text-xs text-rose-400 hover:bg-rose-500/10 h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL 1: CANDIDATE APPLICATION REVIEW & RECRUITER NOTES */}
        <Dialog open={isAppModalOpen} onOpenChange={setIsAppModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Candidate Application Review
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Review candidate credentials, portfolio, notice period, and schedule interviews.
              </DialogDescription>
            </DialogHeader>

            {selectedApp && (
              <div className="space-y-4 pt-2">
                {/* Candidate Header */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedApp.candidateName}</h3>
                    <div className="text-xs text-indigo-400 font-semibold">{selectedApp.jobTitle}</div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 mt-1">
                      <span>{selectedApp.email}</span>
                      <span>•</span>
                      <span>{selectedApp.phone}</span>
                      {selectedApp.location && (
                        <>
                          <span>•</span>
                          <span>{selectedApp.location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleOpenWhatsApp(selectedApp)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEmail(selectedApp)}
                      className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Button>
                  </div>
                </div>

                {/* Candidate Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Experience</div>
                    <div className="font-semibold text-white">{selectedApp.experienceLevel || "N/A"}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Expected CTC</div>
                    <div className="font-semibold text-emerald-400">{selectedApp.expectedCtc || "Negotiable"}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Notice Period</div>
                    <div className="font-semibold text-white">{selectedApp.noticePeriod || "Immediate"}</div>
                  </div>
                </div>

                {/* Candidate Links (Resume, Portfolio, LinkedIn) */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <div className="text-xs font-semibold text-slate-300">Credentials & Portfolio:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.resumeUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedApp.resumeUrl, "_blank")}
                        className="text-xs h-7 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
                      >
                        <FileText className="w-3 h-3" /> View Resume / CV
                      </Button>
                    )}
                    {selectedApp.linkedinUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedApp.linkedinUrl, "_blank")}
                        className="text-xs h-7 border-sky-500/40 text-sky-400 hover:bg-sky-500/10 gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" /> LinkedIn Profile
                      </Button>
                    )}
                    {selectedApp.portfolioUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedApp.portfolioUrl, "_blank")}
                        className="text-xs h-7 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" /> GitHub / Portfolio
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cover Letter */}
                {selectedApp.coverLetter && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Candidate Statement / Cover Letter:</Label>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {selectedApp.coverLetter}
                    </div>
                  </div>
                )}

                {/* Recruiter Review Pipeline Controls */}
                <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Recruiter Pipeline Status</Label>
                    <Select value={appStatus} onValueChange={(val: any) => setAppStatus(val)}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="reviewing">Under Review</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                        <SelectItem value="hired">Hired Candidate</SelectItem>
                        <SelectItem value="rejected">Not Selected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Internal Recruiter Notes</Label>
                    <Input
                      placeholder="e.g. Cleared round 1. Technical assessment next."
                      value={appAdminNotes}
                      onChange={(e) => setAppAdminNotes(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAppModalOpen(false)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleUpdateApplicationStatus}
                    disabled={updatingApp}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md"
                  >
                    {updatingApp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Status & Notes"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL 2: CREATE / EDIT JOB OPENING */}
        <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                {editingJob ? "Edit Job Position" : "Create New Job Opening"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Postings created here will immediately be displayed on the public /careers page for candidate applications.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveJob} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Job Title *</Label>
                  <Input
                    placeholder="e.g. Senior AI Curriculum & Prompt Architect"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Department *</Label>
                  <Select
                    value={jobForm.department}
                    onValueChange={(val) => setJobForm({ ...jobForm, department: val })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                      {JOB_DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Location *</Label>
                  <Input
                    placeholder="e.g. Bengaluru / Hybrid or Remote (India)"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Job Type *</Label>
                  <Select
                    value={jobForm.jobType}
                    onValueChange={(val: any) => setJobForm({ ...jobForm, jobType: val })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Experience Level *</Label>
                  <Select
                    value={jobForm.experienceLevel}
                    onValueChange={(val: any) => setJobForm({ ...jobForm, experienceLevel: val })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                      <SelectItem value="Fresh Graduate">Fresh Graduate</SelectItem>
                      <SelectItem value="1-3 Years">1-3 Years</SelectItem>
                      <SelectItem value="3-5 Years">3-5 Years</SelectItem>
                      <SelectItem value="5+ Years">5+ Years</SelectItem>
                      <SelectItem value="Lead / Principal">Lead / Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Compensation / Salary Range *</Label>
                  <Input
                    placeholder="e.g. ₹15 LPA - ₹25 LPA + ESOPs"
                    value={jobForm.salaryRange}
                    onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Role Summary / Description *</Label>
                  <textarea
                    rows={3}
                    placeholder="Summarize the core impact and mission of this role..."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Key Responsibilities (one per line)</Label>
                  <textarea
                    rows={3}
                    placeholder="Architect scalable backend services&#10;Collaborate with university leadership"
                    value={jobForm.responsibilitiesText}
                    onChange={(e) => setJobForm({ ...jobForm, responsibilitiesText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Candidate Requirements (one per line)</Label>
                  <textarea
                    rows={3}
                    placeholder="2+ years experience in React/Node&#10;PostgreSQL RLS mastery"
                    value={jobForm.requirementsText}
                    onChange={(e) => setJobForm({ ...jobForm, requirementsText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="job-active" className="text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Accepting Applications on /careers</span>
                      </Label>
                      <p className="text-[10px] text-slate-400">
                        When enabled, candidates can view and submit applications for this role on the public careers portal.
                      </p>
                    </div>
                    <Checkbox
                      id="job-active"
                      checked={jobForm.isActive}
                      onCheckedChange={(checked) => setJobForm({ ...jobForm, isActive: !!checked })}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsJobModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingJob}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md"
                >
                  {savingJob ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                    </>
                  ) : editingJob ? (
                    "Update Job Posting"
                  ) : (
                    "Publish Job Posting"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MasterLayout>
  );
}
