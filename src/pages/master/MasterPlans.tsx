import { useState, useEffect } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Plus,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Copy,
  Building2,
  IndianRupee,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  Search,
  Check,
  Video,
  Award,
  Zap,
  FileQuestion,
  FileCheck,
  Cpu,
  Trophy,
  HelpCircle,
  Tag,
  CheckSquare,
  BarChart3,
  Palette,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  PlatformFeature,
  SubscriptionPlan,
  PLATFORM_FEATURES,
  DEFAULT_PLANS,
} from "@/types/plans";

const PLANS_STORAGE_KEY = "orbit_master_subscription_plans";

export default function MasterPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");

  // Plan Create / Edit Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    tier: "pro" as SubscriptionPlan["tier"],
    priceMonthlyINR: 9999,
    priceAnnualINR: 99999,
    maxStudents: 1000,
    durationDays: 30,
    features: PLATFORM_FEATURES.map((f) => f.id),
    isActive: true,
  });

  // Assign Plan to College Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [planToAssign, setPlanToAssign] = useState<SubscriptionPlan | null>(null);
  const [targetCollegeId, setTargetCollegeId] = useState<string>("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Per-College Customization Modal State
  const [isCollegeCustomModalOpen, setIsCollegeCustomModalOpen] = useState(false);
  const [customizingCollege, setCustomizingCollege] = useState<any>(null);
  const [collegeCustomFeatures, setCollegeCustomFeatures] = useState<string[]>([]);
  const [collegeCustomMaxStudents, setCollegeCustomMaxStudents] = useState<number>(1000);
  const [savingCollegeFeatures, setSavingCollegeFeatures] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Colleges
      const { data: cols } = await supabase
        .from("colleges")
        .select("id, name, email, phone, contact_person, subscription_status, activation_status, subscription_expiry_date, max_students, enabled_features")
        .order("name", { ascending: true });

      if (cols) {
        setColleges(cols);
        if (cols.length > 0 && !targetCollegeId) {
          setTargetCollegeId(cols[0].id);
        }
      }

      // 2. Load Plans (Try Supabase first, fallback to cached / default plans)
      let loadedPlans: SubscriptionPlan[] = [];
      try {
        const { data: dbPlans } = await supabase
          .from("subscription_plans")
          .select("*")
          .order("price_monthly", { ascending: true });

        if (dbPlans && dbPlans.length > 0) {
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
        // Table does not exist yet; will use local storage
      }

      if (loadedPlans.length === 0) {
        const stored = localStorage.getItem(PLANS_STORAGE_KEY);
        if (stored) {
          try {
            loadedPlans = JSON.parse(stored);
          } catch {
            loadedPlans = DEFAULT_PLANS;
          }
        } else {
          loadedPlans = DEFAULT_PLANS;
          localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(DEFAULT_PLANS));
        }
      }

      setPlans(loadedPlans);
    } catch (err: any) {
      console.error("Error loading plans & colleges:", err);
    } finally {
      setLoading(false);
    }
  };

  const persistPlans = async (updatedPlans: SubscriptionPlan[]) => {
    setPlans(updatedPlans);
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));

    // Broadcast for immediate live sync across LandingPage and any open tabs
    try {
      window.dispatchEvent(new CustomEvent("orbit_plans_updated", { detail: updatedPlans }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      // ignore
    }

    // Persist all plans to Supabase subscription_plans table
    try {
      const records = updatedPlans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        tier: p.tier || "pro",
        price_monthly: p.priceMonthlyINR,
        price_annual: p.priceAnnualINR,
        max_students: p.maxStudents,
        duration_days: p.durationDays,
        enabled_features: p.features || [],
        is_active: p.isActive !== false,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("subscription_plans").upsert(records, { onConflict: "id" });
    } catch {
      // Supabase table may not be migrated yet; local storage fallback active
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      description: "",
      tier: "pro",
      priceMonthlyINR: 9999,
      priceAnnualINR: 99999,
      maxStudents: 1000,
      durationDays: 30,
      features: PLATFORM_FEATURES.map((f) => f.id),
      isActive: true,
    });
    setIsPlanModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      tier: plan.tier,
      priceMonthlyINR: plan.priceMonthlyINR,
      priceAnnualINR: plan.priceAnnualINR,
      maxStudents: plan.maxStudents,
      durationDays: plan.durationDays,
      features: plan.features,
      isActive: plan.isActive,
    });
    setIsPlanModalOpen(true);
  };

  // Toggle Feature in Plan Form
  const handleToggleFormFeature = (featureId: string) => {
    setPlanForm((prev) => {
      const exists = prev.features.includes(featureId);
      const updated = exists
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId];
      return { ...prev, features: updated };
    });
  };

  // Select All Features
  const handleSelectAllFeatures = () => {
    setPlanForm((prev) => ({
      ...prev,
      features: PLATFORM_FEATURES.map((f) => f.id),
    }));
  };

  // Deselect All Features
  const handleDeselectAllFeatures = () => {
    setPlanForm((prev) => ({
      ...prev,
      features: [],
    }));
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid plan name.",
        variant: "destructive",
      });
      return;
    }

    setSavingPlan(true);
    try {
      if (editingPlan) {
        // Update existing plan
        const updated = plans.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                name: planForm.name,
                description: planForm.description,
                tier: planForm.tier,
                priceMonthlyINR: Number(planForm.priceMonthlyINR),
                priceAnnualINR: Number(planForm.priceAnnualINR),
                maxStudents: Number(planForm.maxStudents),
                durationDays: Number(planForm.durationDays),
                features: planForm.features,
                isActive: planForm.isActive,
              }
            : p
        );
        await persistPlans(updated);
        toast({
          title: "Plan Updated",
          description: `Subscription plan "${planForm.name}" updated successfully.`,
        });
      } else {
        // Create new plan
        const newPlan: SubscriptionPlan = {
          id: `plan-${Date.now()}`,
          name: planForm.name,
          description: planForm.description,
          tier: planForm.tier,
          priceMonthlyINR: Number(planForm.priceMonthlyINR),
          priceAnnualINR: Number(planForm.priceAnnualINR),
          maxStudents: Number(planForm.maxStudents),
          durationDays: Number(planForm.durationDays),
          features: planForm.features,
          isActive: planForm.isActive,
        };
        const updated = [...plans, newPlan];
        await persistPlans(updated);
        toast({
          title: "Plan Created",
          description: `New subscription plan "${newPlan.name}" added with ${newPlan.features.length} enabled modules.`,
        });
      }
      setIsPlanModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save plan details.",
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Clone Plan
  const handleClonePlan = async (plan: SubscriptionPlan) => {
    const cloned: SubscriptionPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      name: `${plan.name} (Copy)`,
    };
    const updated = [...plans, cloned];
    await persistPlans(updated);
    toast({
      title: "Plan Duplicated",
      description: `Created clone "${cloned.name}".`,
    });
  };

  // Quick Toggle Plan Display on Landing Page
  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    const updated = plans.map((p) =>
      p.id === plan.id ? { ...p, isActive: !p.isActive } : p
    );
    await persistPlans(updated);
    toast({
      title: !plan.isActive ? "Plan Published to Landing Page" : "Plan Hidden from Landing Page",
      description: `Plan "${plan.name}" is ${!plan.isActive ? "now displayed" : "hidden"} on the public landing page.`,
    });
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string, planName: string) => {
    if (confirm(`Are you sure you want to delete the plan "${planName}"?`)) {
      const updated = plans.filter((p) => p.id !== planId);
      await persistPlans(updated);
      try {
        await supabase.from("subscription_plans").delete().eq("id", planId);
      } catch (e) {
        console.warn("Could not delete from Supabase subscription_plans:", e);
      }
      toast({
        title: "Plan Removed",
        description: `Plan "${planName}" has been deleted.`,
      });
    }
  };

  // Open Assign Modal
  const handleOpenAssignModal = (plan: SubscriptionPlan) => {
    setPlanToAssign(plan);
    setIsAssignModalOpen(true);
  };

  // Assign Plan to College
  const handleAssignPlanToCollege = async () => {
    if (!planToAssign || !targetCollegeId) return;

    setAssigningLoading(true);
    try {
      const targetCollege = colleges.find((c) => c.id === targetCollegeId);
      const newExpiry = new Date(
        Date.now() + (planToAssign.durationDays || 30) * 24 * 60 * 60 * 1000
      ).toISOString();

      // 1. Update College in Supabase
      const { error } = await supabase
        .from("colleges")
        .update({
          max_students: planToAssign.maxStudents,
          enabled_features: planToAssign.features,
          subscription_status: "active",
          activation_status: true,
          subscription_expiry_date: newExpiry,
        })
        .eq("id", targetCollegeId);

      if (error) throw error;

      // 2. Generate Invoice record for this subscription plan assignment
      const invNum = `INV-PLAN-${Date.now().toString().slice(-6)}`;
      await supabase.from("invoices").insert([
        {
          college_id: targetCollegeId,
          invoice_number: invNum,
          student_count: planToAssign.maxStudents,
          cost_per_student: Math.round(planToAssign.priceMonthlyINR / planToAssign.maxStudents) || 50,
          total_amount: planToAssign.priceMonthlyINR,
          status: "pending",
        },
      ]);

      // 3. Update local state
      setColleges((prev) =>
        prev.map((c) =>
          c.id === targetCollegeId
            ? {
                ...c,
                max_students: planToAssign.maxStudents,
                enabled_features: planToAssign.features,
                subscription_status: "active",
                activation_status: true,
                subscription_expiry_date: newExpiry,
              }
            : c
        )
      );

      toast({
        title: "Plan Assigned Successfully",
        description: `Plan "${planToAssign.name}" applied to "${targetCollege?.name}". All ${planToAssign.features.length} modules activated.`,
      });
      setIsAssignModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to assign plan to college.",
        variant: "destructive",
      });
    } finally {
      setAssigningLoading(false);
    }
  };

  // Open College Customization Modal
  const handleOpenCollegeCustomModal = (college: any) => {
    setCustomizingCollege(college);
    setCollegeCustomFeatures(
      Array.isArray(college.enabled_features)
        ? college.enabled_features
        : PLATFORM_FEATURES.map((f) => f.id)
    );
    setCollegeCustomMaxStudents(college.max_students || 1000);
    setIsCollegeCustomModalOpen(true);
  };

  // Toggle Feature in College Custom Modal
  const handleToggleCollegeFeature = (featureId: string) => {
    setCollegeCustomFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  };

  // Save College Custom Features directly to Supabase
  const handleSaveCollegeCustomFeatures = async () => {
    if (!customizingCollege) return;
    setSavingCollegeFeatures(true);
    try {
      const { error } = await supabase
        .from("colleges")
        .update({
          enabled_features: collegeCustomFeatures,
          max_students: Number(collegeCustomMaxStudents),
        })
        .eq("id", customizingCollege.id);

      if (error) throw error;

      setColleges((prev) =>
        prev.map((c) =>
          c.id === customizingCollege.id
            ? {
                ...c,
                enabled_features: collegeCustomFeatures,
                max_students: Number(collegeCustomMaxStudents),
              }
            : c
        )
      );

      toast({
        title: "Institutional Features Updated",
        description: `Saved ${collegeCustomFeatures.length} active features for "${customizingCollege.name}".`,
      });
      setIsCollegeCustomModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update college features.",
        variant: "destructive",
      });
    } finally {
      setSavingCollegeFeatures(false);
    }
  };

  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case "live_classes":
        return <Video className="w-4 h-4 text-rose-400" />;
      case "quizzes":
        return <FileQuestion className="w-4 h-4 text-amber-400" />;
      case "assignments":
        return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case "ai_json_builder":
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case "certificates":
        return <Award className="w-4 h-4 text-yellow-400" />;
      case "gamification":
        return <Zap className="w-4 h-4 text-purple-400" />;
      case "leaderboard":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "attendance_tracker":
        return <CheckSquare className="w-4 h-4 text-cyan-400" />;
      case "coupon_engine":
        return <Tag className="w-4 h-4 text-emerald-400" />;
      case "ticket_raising":
        return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case "advanced_analytics":
        return <BarChart3 className="w-4 h-4 text-indigo-400" />;
      case "custom_branding":
        return <Palette className="w-4 h-4 text-fuchsia-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <MasterLayout
      headerTitle="Plans & Feature Checklist Management"
      headerDescription="Define SaaS subscription plans, toggle platform feature modules, and assign customized tiers to partner universities and colleges."
    >
      <div className="space-y-6">
        {/* Top KPI Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Subscription Plans
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{plans.length} Defined</div>
              <p className="text-xs text-slate-400 mt-1">Multi-tier institutional packages</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Core Feature Modules
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {PLATFORM_FEATURES.length} Modules
              </div>
              <p className="text-xs text-slate-400 mt-1">Granular feature checklist toggles</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Partner Institutions
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{colleges.length} Colleges</div>
              <p className="text-xs text-slate-400 mt-1">Receiving live plan enforcement</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Instant Provisioning
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">1-Click Apply</div>
              <p className="text-xs text-slate-400 mt-1">Automatic quota & billing sync</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-slate-900 border border-slate-800 text-slate-400">
              <TabsTrigger
                value="plans"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <Layers className="w-4 h-4 mr-2" /> All Plans ({plans.length})
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <CheckSquare className="w-4 h-4 mr-2" /> Feature Matrix (12)
              </TabsTrigger>
              <TabsTrigger
                value="colleges"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
              >
                <Building2 className="w-4 h-4 mr-2" /> Tenant College Sync ({colleges.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create New Plan
            </Button>
          </div>
        </div>

        {/* TAB 1: ALL SUBSCRIPTION PLANS */}
        {activeTab === "plans" && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const activeFeaturesCount = plan.features.length;
              return (
                <Card
                  key={plan.id}
                  className={`bg-slate-900 border text-slate-100 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-indigo-500/50 hover:shadow-xl ${
                    plan.isPopular ? "border-indigo-500 shadow-indigo-500/10" : "border-slate-800"
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-600 text-[10px] uppercase font-bold text-white px-3 py-1 rounded-bl-lg tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="capitalize font-mono text-[10px] border-indigo-500/40 text-indigo-400 bg-indigo-500/10"
                      >
                        {plan.tier} Tier
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(plan)}
                        title={
                          plan.isActive
                            ? "Active on Landing Page. Click to hide from public."
                            : "Hidden from Landing Page. Click to publish."
                        }
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                          plan.isActive
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 shadow-xs"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {plan.isActive ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>Landing: Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-slate-400" />
                            <span>Landing: Hidden</span>
                          </>
                        )}
                      </button>
                    </div>

                    <CardTitle className="text-lg font-bold text-white leading-tight">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {plan.description}
                    </CardDescription>

                    {/* Pricing */}
                    <div className="pt-3 pb-1 border-b border-slate-800/80">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-white">
                          ₹{plan.priceMonthlyINR.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        ₹{plan.priceAnnualINR.toLocaleString("en-IN")} / year (Billed annually)
                      </div>
                    </div>

                    {/* Quota Specs */}
                    <div className="grid grid-cols-2 gap-2 pt-3 text-xs text-slate-300">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Student Capacity</div>
                          <div className="font-semibold text-white">
                            {plan.maxStudents.toLocaleString("en-IN")} Seats
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Billing Cycle</div>
                          <div className="font-semibold text-white">{plan.durationDays} Days</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-2 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-1">
                      <span>Feature Checklist</span>
                      <span className="text-indigo-400 font-mono">
                        {activeFeaturesCount}/{PLATFORM_FEATURES.length} Enabled
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {PLATFORM_FEATURES.map((feat) => {
                        const isIncluded = plan.features.includes(feat.id);
                        return (
                          <div
                            key={feat.id}
                            className={`flex items-center justify-between text-xs p-1.5 rounded-md transition-colors ${
                              isIncluded
                                ? "bg-slate-950/40 text-slate-200"
                                : "text-slate-500 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {getFeatureIcon(feat.id)}
                              <span className="truncate">{feat.name}</span>
                            </div>
                            {isIncluded ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                    <Button
                      onClick={() => handleOpenAssignModal(plan)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 shadow-md"
                    >
                      <Building2 className="w-3.5 h-3.5 mr-1.5" /> Assign to College
                    </Button>

                    <div className="flex items-center justify-between w-full gap-1 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditModal(plan)}
                        className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 flex-1"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClonePlan(plan)}
                        className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 flex-1"
                        title="Duplicate Plan"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-purple-400" /> Clone
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 px-2"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 2: PLATFORM FEATURE MATRIX */}
        {activeTab === "checklist" && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Platform Feature Checklist Matrix</CardTitle>
              <CardDescription className="text-slate-400">
                Detailed comparison of modular capabilities provided across subscription tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/60">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-300 w-80">Platform Module & Scope</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    {plans.map((p) => (
                      <TableHead key={p.id} className="text-center text-slate-300">
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] font-mono text-indigo-400">
                          ₹{p.priceMonthlyINR.toLocaleString("en-IN")}/mo
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PLATFORM_FEATURES.map((feat) => (
                    <TableRow key={feat.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {getFeatureIcon(feat.id)}
                          <div>
                            <div className="font-medium text-white text-sm">{feat.name}</div>
                            <div className="text-xs text-slate-400">{feat.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] border-slate-700 text-slate-300"
                        >
                          {feat.category}
                        </Badge>
                      </TableCell>
                      {plans.map((p) => {
                        const isIncluded = p.features.includes(feat.id);
                        return (
                          <TableCell key={p.id} className="text-center">
                            {isIncluded ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-500">
                                <XCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: PER-COLLEGE FEATURE SYNC */}
        {activeTab === "colleges" && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Tenant College Plan & Feature Allocations</CardTitle>
              <CardDescription className="text-slate-400">
                Directly customize or toggle specific modular features per educational institution
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/60">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-300">College Name</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Student Capacity</TableHead>
                    <TableHead className="text-slate-300">Subscription Expiry</TableHead>
                    <TableHead className="text-slate-300">Active Feature Count</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colleges.map((c) => {
                    const featureCount = Array.isArray(c.enabled_features)
                      ? c.enabled_features.length
                      : PLATFORM_FEATURES.length;
                    return (
                      <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                        <TableCell>
                          <div className="font-medium text-white">{c.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{c.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              c.activation_status
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }
                          >
                            {c.activation_status ? "Active" : "Suspended"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          {(c.max_students || 1000).toLocaleString("en-IN")} Students
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {c.subscription_expiry_date
                            ? new Date(c.subscription_expiry_date).toLocaleDateString("en-IN")
                            : "Perpetual"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 text-xs"
                          >
                            {featureCount} / {PLATFORM_FEATURES.length} Modules
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCollegeCustomModal(c)}
                            className="border-slate-700 hover:bg-slate-800 text-xs h-8"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Customize Features
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* MODAL 1: CREATE / EDIT SUBSCRIPTION PLAN */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                {editingPlan ? "Edit Subscription Plan" : "Create New SaaS Plan"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Configure plan parameters, student quotas, pricing in ₹ INR, and select enabled platform modules.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePlan} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Plan Name *</Label>
                  <Input
                    placeholder="e.g. AI Academic Accelerator Tier"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Plan Description</Label>
                  <Input
                    placeholder="Brief description of intended institutional scale"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Plan Tier</Label>
                  <Select
                    value={planForm.tier}
                    onValueChange={(val: any) => setPlanForm({ ...planForm, tier: val })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="starter">Starter Academic</SelectItem>
                      <SelectItem value="pro">Pro Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise University</SelectItem>
                      <SelectItem value="custom">Custom AI Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Student Capacity Quota *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1000"
                    value={planForm.maxStudents}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, maxStudents: parseInt(e.target.value) || 1 })
                    }
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Monthly Price (₹ INR) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="14999"
                    value={planForm.priceMonthlyINR}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, priceMonthlyINR: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Annual Price (₹ INR) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="149999"
                    value={planForm.priceAnnualINR}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, priceAnnualINR: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-slate-300">Duration (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="30"
                    value={planForm.durationDays}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, durationDays: parseInt(e.target.value) || 30 })
                    }
                    className="bg-slate-950 border-slate-800 text-white text-sm"
                  />
                </div>

                {/* Landing Page Display Toggle */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="plan-is-active" className="text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Display on Public Landing Page</span>
                    </Label>
                    <p className="text-[11px] text-slate-400">
                      When enabled, this plan will be publicly visible on the Orbit LMS landing page pricing section with full feature checklist.
                    </p>
                  </div>
                  <Checkbox
                    id="plan-is-active"
                    checked={planForm.isActive}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: !!checked })}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Feature Checklist Section */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-white">
                    Platform Feature Checklist ({planForm.features.length}/{PLATFORM_FEATURES.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllFeatures}
                      className="text-xs text-indigo-400 hover:text-indigo-300 h-7 px-2"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllFeatures}
                      className="text-xs text-slate-400 hover:text-white h-7 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  {PLATFORM_FEATURES.map((feat) => {
                    const checked = planForm.features.includes(feat.id);
                    return (
                      <div
                        key={feat.id}
                        onClick={() => handleToggleFormFeature(feat.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                          checked
                            ? "bg-indigo-950/40 border-indigo-500/40 text-slate-100"
                            : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => handleToggleFormFeature(feat.id)}
                          className="mt-0.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium flex items-center gap-1.5 text-white">
                            {getFeatureIcon(feat.id)}
                            <span>{feat.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {feat.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingPlan}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md shadow-indigo-600/20"
                >
                  {savingPlan ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving Plan...
                    </>
                  ) : editingPlan ? (
                    "Update Plan"
                  ) : (
                    "Save New Plan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: ASSIGN PLAN TO COLLEGE */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Assign Plan to Institution
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Applying this plan will immediately update the college's student seat limits, active feature checklist, and issue a subscription invoice.
              </DialogDescription>
            </DialogHeader>

            {planToAssign && (
              <div className="space-y-4 pt-2">
                {/* Plan Highlights */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-sm font-bold text-white">{planToAssign.name}</div>
                  <div className="text-xs text-indigo-400 font-mono">
                    ₹{planToAssign.priceMonthlyINR.toLocaleString("en-IN")} / month •{" "}
                    {planToAssign.maxStudents.toLocaleString("en-IN")} Seats
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Includes {planToAssign.features.length} enabled platform modules.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-300">Select Target College *</Label>
                  <Select value={targetCollegeId} onValueChange={setTargetCollegeId}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-sm">
                      <SelectValue placeholder="Choose an institution..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                      {colleges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignPlanToCollege}
                    disabled={assigningLoading || !targetCollegeId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md shadow-indigo-600/20"
                  >
                    {assigningLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Applying to College...
                      </>
                    ) : (
                      "Confirm & Apply Plan"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL 3: CUSTOMIZE FEATURES PER COLLEGE */}
        <Dialog open={isCollegeCustomModalOpen} onOpenChange={setIsCollegeCustomModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Customize Features for {customizingCollege?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Directly toggle modular permissions for this specific institution. Changes apply live across all student & faculty accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Max Student Seat Quota</Label>
                <Input
                  type="number"
                  min="1"
                  value={collegeCustomMaxStudents}
                  onChange={(e) => setCollegeCustomMaxStudents(parseInt(e.target.value) || 100)}
                  className="bg-slate-950 border-slate-800 text-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-white">
                    Enabled Platform Modules ({collegeCustomFeatures.length}/{PLATFORM_FEATURES.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCollegeCustomFeatures(PLATFORM_FEATURES.map((f) => f.id))}
                      className="text-xs text-indigo-400 hover:text-indigo-300 h-7 px-2"
                    >
                      Enable All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCollegeCustomFeatures([])}
                      className="text-xs text-slate-400 hover:text-white h-7 px-2"
                    >
                      Disable All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  {PLATFORM_FEATURES.map((feat) => {
                    const checked = collegeCustomFeatures.includes(feat.id);
                    return (
                      <div
                        key={feat.id}
                        onClick={() => handleToggleCollegeFeature(feat.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                          checked
                            ? "bg-indigo-950/40 border-indigo-500/40 text-slate-100"
                            : "bg-slate-900/40 border-slate-800/60 text-slate-500 hover:bg-slate-900"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => handleToggleCollegeFeature(feat.id)}
                          className="mt-0.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium flex items-center gap-1.5 text-white">
                            {getFeatureIcon(feat.id)}
                            <span>{feat.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {feat.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollegeCustomModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCollegeCustomFeatures}
                  disabled={savingCollegeFeatures}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md shadow-indigo-600/20"
                >
                  {savingCollegeFeatures ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    "Save Institutional Features"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MasterLayout>
  );
}
