import React, { useState, useEffect, useMemo } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BookOpen,
  Mail,
  ShieldAlert,
  Sliders,
  Filter,
  Save,
  RotateCcw,
  SlidersHorizontal,
  FolderLock,
  ArrowRight,
  Globe,
  Settings2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  PlatformFeature,
  SubscriptionPlan,
  FeatureCategory,
  FeatureRole,
} from "@/types/plans";
import {
  getRegisteredFeatures,
  savePlatformFeature,
  deletePlatformFeature,
  resetFeaturesToDefaults,
  fetchAllPlans,
  saveSubscriptionPlan,
  deleteSubscriptionPlan,
  duplicatePlanAsCustom,
  assignPlanToCollege,
  updateCollegeCustomFeatures,
  ORBIT_EVENTS,
} from "@/services/featuresService";

export default function MasterPlans() {
  const { toast } = useToast();

  // Core Data State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("plans");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>("all");
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");

  // Plan Create / Edit Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    tier: "custom" as SubscriptionPlan["tier"],
    priceMonthlyINR: 19999,
    priceAnnualINR: 199999,
    isCustomQuote: false,
    maxStudents: 1500,
    isUnlimitedStudents: false,
    durationDays: 30,
    features: [] as string[],
    isActive: true,
    isPopular: false,
    badgeText: "",
    customCollegeId: "" as string,
    notes: "",
  });

  // Feature Create / Edit Modal State (FOR: "each feature should be editable and all")
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlatformFeature | null>(null);
  const [savingFeature, setSavingFeature] = useState(false);
  const [featureForm, setFeatureForm] = useState<{
    id: string;
    name: string;
    category: FeatureCategory;
    description: string;
    routes: string;
    roles: FeatureRole[];
    isEnabledByDefault: boolean;
    status: "active" | "beta" | "deprecated";
    badge: string;
  }>({
    id: "",
    name: "",
    category: "learning",
    description: "",
    routes: "",
    roles: ["student", "teacher", "admin"],
    isEnabledByDefault: true,
    status: "active",
    badge: "",
  });

  // Assign Plan to College Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [planToAssign, setPlanToAssign] = useState<SubscriptionPlan | null>(null);
  const [targetCollegeId, setTargetCollegeId] = useState<string>("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Per-College Granular Customization Modal State
  const [isCollegeCustomModalOpen, setIsCollegeCustomModalOpen] = useState(false);
  const [customizingCollege, setCustomizingCollege] = useState<any>(null);
  const [collegeCustomFeatures, setCollegeCustomFeatures] = useState<string[]>([]);
  const [collegeCustomMaxStudents, setCollegeCustomMaxStudents] = useState<number>(1000);
  const [collegeCustomFilter, setCollegeCustomFilter] = useState<string>("all");
  const [collegeCustomSearch, setCollegeCustomSearch] = useState<string>("");
  const [savingCollegeFeatures, setSavingCollegeFeatures] = useState(false);

  useEffect(() => {
    loadData();

    // Listen to real-time events
    const handleFeaturesUpdate = () => {
      setFeatures(getRegisteredFeatures());
    };
    const handlePlansUpdate = (e: any) => {
      if (Array.isArray(e.detail)) setPlans(e.detail);
    };

    window.addEventListener(ORBIT_EVENTS.FEATURES_UPDATED, handleFeaturesUpdate);
    window.addEventListener(ORBIT_EVENTS.PLANS_UPDATED, handlePlansUpdate);

    return () => {
      window.removeEventListener(ORBIT_EVENTS.FEATURES_UPDATED, handleFeaturesUpdate);
      window.removeEventListener(ORBIT_EVENTS.PLANS_UPDATED, handlePlansUpdate);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Registered Features
      const currentFeatures = getRegisteredFeatures();
      setFeatures(currentFeatures);

      // 2. Load Plans
      const currentPlans = await fetchAllPlans();
      setPlans(currentPlans);

      // 3. Load Colleges from Supabase
      const { data: cols } = await supabase
        .from("colleges")
        .select(
          "id, name, email, phone, contact_person, subscription_status, activation_status, subscription_expiry_date, max_students, enabled_features"
        )
        .order("name", { ascending: true });

      if (cols) {
        setColleges(cols);
        if (cols.length > 0 && !targetCollegeId) {
          setTargetCollegeId(cols[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading master plans data:", err);
      toast({
        title: "Load Error",
        description: err.message || "Failed to load features or subscription plans.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get Icon for Feature
  const getFeatureIcon = (featureId: string, category?: string) => {
    switch (featureId) {
      case "live_classes":
        return <Video className="w-4 h-4 text-rose-400" />;
      case "course_management":
        return <BookOpen className="w-4 h-4 text-blue-400" />;
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
      case "calendar":
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case "inquiries":
        return <Mail className="w-4 h-4 text-violet-400" />;
      case "custom_branding":
        return <Palette className="w-4 h-4 text-fuchsia-400" />;
      case "user_management":
        return <Users className="w-4 h-4 text-teal-400" />;
      default:
        if (category === "ai_tools") return <Sparkles className="w-4 h-4 text-purple-400" />;
        if (category === "assessment") return <CheckSquare className="w-4 h-4 text-emerald-400" />;
        if (category === "analytics") return <BarChart3 className="w-4 h-4 text-indigo-400" />;
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
    }
  };

  // ==========================================================================
  // PLAN MANAGEMENT HANDLERS (STANDARD & CUSTOM PLANS)
  // ==========================================================================

  // Open Create Plan Modal (with Custom Plan defaults)
  const handleOpenCreatePlanModal = (tier: SubscriptionPlan["tier"] = "custom") => {
    setEditingPlan(null);
    setPlanForm({
      name: tier === "custom" ? "Custom University Tier" : "New Subscription Plan",
      description: "Tailor-made institutional plan with customized platform capabilities.",
      tier: tier,
      priceMonthlyINR: tier === "custom" ? 24999 : 14999,
      priceAnnualINR: tier === "custom" ? 249999 : 149999,
      isCustomQuote: false,
      maxStudents: tier === "custom" ? 2500 : 1000,
      isUnlimitedStudents: false,
      durationDays: 30,
      features: features.filter((f) => f.isEnabledByDefault !== false).map((f) => f.id),
      isActive: true,
      isPopular: false,
      badgeText: tier === "custom" ? "Custom Tier" : "",
      customCollegeId: "",
      notes: "",
    });
    setIsPlanModalOpen(true);
  };

  // Open Edit Plan Modal
  const handleOpenEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      tier: plan.tier,
      priceMonthlyINR: plan.priceMonthlyINR,
      priceAnnualINR: plan.priceAnnualINR,
      isCustomQuote: Boolean(plan.isCustomQuote),
      maxStudents: plan.maxStudents,
      isUnlimitedStudents: Boolean(plan.isUnlimitedStudents),
      durationDays: plan.durationDays,
      features: [...plan.features],
      isActive: plan.isActive,
      isPopular: Boolean(plan.isPopular),
      badgeText: plan.badgeText || "",
      customCollegeId: plan.customCollegeId || "",
      notes: plan.notes || "",
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

  // Bulk Feature Presets for Plan Modal
  const handleApplyFeaturePreset = (preset: "all" | "none" | "core" | "ai_analytics" | "operations") => {
    if (preset === "all") {
      setPlanForm((prev) => ({ ...prev, features: features.map((f) => f.id) }));
    } else if (preset === "none") {
      setPlanForm((prev) => ({ ...prev, features: [] }));
    } else if (preset === "core") {
      const coreIds = ["course_management", "quizzes", "assignments", "attendance_tracker", "calendar", "user_management"];
      setPlanForm((prev) => ({ ...prev, features: coreIds }));
    } else if (preset === "ai_analytics") {
      const aiIds = features.filter((f) => f.category === "ai_tools" || f.category === "analytics" || f.id === "ai_json_builder").map((f) => f.id);
      setPlanForm((prev) => ({ ...prev, features: Array.from(new Set([...prev.features, ...aiIds])) }));
    } else if (preset === "operations") {
      const opIds = features.filter((f) => f.category === "operations" || f.category === "security").map((f) => f.id);
      setPlanForm((prev) => ({ ...prev, features: Array.from(new Set([...prev.features, ...opIds])) }));
    }
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify a plan title.",
        variant: "destructive",
      });
      return;
    }

    setSavingPlan(true);
    try {
      const targetCollege = colleges.find((c) => c.id === planForm.customCollegeId);
      const planPayload: SubscriptionPlan = {
        id: editingPlan ? editingPlan.id : `plan-custom-${Date.now()}`,
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        tier: planForm.tier,
        priceMonthlyINR: Number(planForm.priceMonthlyINR) || 0,
        priceAnnualINR: Number(planForm.priceAnnualINR) || 0,
        isCustomQuote: Boolean(planForm.isCustomQuote),
        maxStudents: planForm.isUnlimitedStudents ? 999999 : Number(planForm.maxStudents) || 1000,
        isUnlimitedStudents: Boolean(planForm.isUnlimitedStudents),
        durationDays: Number(planForm.durationDays) || 30,
        features: planForm.features,
        isActive: planForm.isActive,
        isPopular: Boolean(planForm.isPopular),
        badgeText: planForm.badgeText.trim() || undefined,
        customCollegeId: planForm.customCollegeId || null,
        customCollegeName: targetCollege ? targetCollege.name : null,
        notes: planForm.notes.trim() || undefined,
      };

      const updatedPlans = await saveSubscriptionPlan(planPayload);
      setPlans(updatedPlans);

      toast({
        title: editingPlan ? "Plan Updated" : "Custom Plan Created",
        description: `Plan "${planPayload.name}" with ${planPayload.features.length} enabled modules is now ready.`,
      });
      setIsPlanModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save plan.",
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Clone Plan as Custom Plan
  const handleClonePlan = async (plan: SubscriptionPlan) => {
    try {
      const cloned = await duplicatePlanAsCustom(plan, `${plan.name} (Custom Copy)`);
      setPlans((prev) => [...prev, cloned]);
      toast({
        title: "Plan Duplicated as Custom Plan",
        description: `Created custom tier "${cloned.name}". You can now edit its features.`,
      });
    } catch (err: any) {
      toast({
        title: "Duplication Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Toggle Plan Public Visibility
  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    const updated = plans.map((p) =>
      p.id === plan.id ? { ...p, isActive: !p.isActive } : p
    );
    setPlans(updated);
    await saveSubscriptionPlan({ ...plan, isActive: !plan.isActive });
    toast({
      title: !plan.isActive ? "Published to Landing Page" : "Hidden from Landing Page",
      description: `Plan "${plan.name}" is now ${!plan.isActive ? "visible to the public" : "hidden from public view"}.`,
    });
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string, planName: string) => {
    if (confirm(`Are you sure you want to permanently delete plan "${planName}"?`)) {
      const updated = await deleteSubscriptionPlan(planId);
      setPlans(updated);
      toast({
        title: "Plan Deleted",
        description: `Plan "${planName}" has been removed.`,
      });
    }
  };

  // Quick toggle a feature on a plan directly from Matrix table
  const handleMatrixQuickToggle = async (plan: SubscriptionPlan, featureId: string) => {
    const hasFeature = plan.features.includes(featureId);
    const updatedFeatures = hasFeature
      ? plan.features.filter((id) => id !== featureId)
      : [...plan.features, featureId];

    const updatedPlan = { ...plan, features: updatedFeatures };
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? updatedPlan : p)));

    await saveSubscriptionPlan(updatedPlan);
    toast({
      title: hasFeature ? "Module Disabled" : "Module Enabled",
      description: `Feature ${hasFeature ? "removed from" : "added to"} ${plan.name}.`,
    });
  };

  // ==========================================================================
  // FEATURE REGISTRY HANDLERS ("each feature should be editable and all")
  // ==========================================================================

  // Open Create Feature Modal
  const handleOpenCreateFeatureModal = () => {
    setEditingFeature(null);
    setFeatureForm({
      id: `custom_${Date.now().toString().slice(-6)}`,
      name: "",
      category: "learning",
      description: "",
      routes: "/student/custom-module",
      roles: ["student", "teacher", "admin"],
      isEnabledByDefault: true,
      status: "active",
      badge: "Custom Module",
    });
    setIsFeatureModalOpen(true);
  };

  // Open Edit Feature Modal
  const handleOpenEditFeatureModal = (feat: PlatformFeature) => {
    setEditingFeature(feat);
    setFeatureForm({
      id: feat.id,
      name: feat.name,
      category: feat.category,
      description: feat.description || "",
      routes: Array.isArray(feat.routes) ? feat.routes.join(", ") : "",
      roles: Array.isArray(feat.roles) ? feat.roles : ["student", "teacher", "admin"],
      isEnabledByDefault: feat.isEnabledByDefault !== false,
      status: feat.status || "active",
      badge: feat.badge || "",
    });
    setIsFeatureModalOpen(true);
  };

  // Save Feature (Edit existing or Add new custom feature)
  const handleSaveFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureForm.name.trim() || !featureForm.id.trim()) {
      toast({
        title: "Validation Error",
        description: "Feature Name and Key (ID) are required.",
        variant: "destructive",
      });
      return;
    }

    setSavingFeature(true);
    try {
      const sanitizedId = featureForm.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const routeList = featureForm.routes
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const payload: PlatformFeature = {
        id: editingFeature ? editingFeature.id : sanitizedId,
        name: featureForm.name.trim(),
        category: featureForm.category,
        description: featureForm.description.trim(),
        routes: routeList.length > 0 ? routeList : undefined,
        roles: featureForm.roles,
        isEnabledByDefault: featureForm.isEnabledByDefault,
        status: featureForm.status,
        isCustom: editingFeature ? editingFeature.isCustom : true,
        badge: featureForm.badge.trim() || undefined,
      };

      const updated = savePlatformFeature(payload);
      setFeatures(updated);

      toast({
        title: editingFeature ? "Feature Updated" : "Custom Feature Added",
        description: `Feature "${payload.name}" saved. It is now editable and available across all plans.`,
      });
      setIsFeatureModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingFeature(false);
    }
  };

  // Delete Feature
  const handleDeleteFeature = (featureId: string, featureName: string) => {
    if (confirm(`Are you sure you want to delete feature "${featureName}"? This will also remove it from plans.`)) {
      const updated = deletePlatformFeature(featureId);
      setFeatures(updated);
      toast({
        title: "Feature Removed",
        description: `Feature "${featureName}" has been removed from the platform registry.`,
      });
    }
  };

  // Reset Features to Defaults
  const handleResetFeatures = () => {
    if (confirm("Reset all platform features back to system defaults? Any custom added features will be reset.")) {
      const reset = resetFeaturesToDefaults();
      setFeatures(reset);
      toast({
        title: "Features Reset",
        description: "Platform features restored to standard defaults.",
      });
    }
  };

  // ==========================================================================
  // COLLEGE ASSIGNMENT & PER-COLLEGE OVERRIDE HANDLERS
  // ==========================================================================

  // Open Assign Plan Modal
  const handleOpenAssignModal = (plan: SubscriptionPlan) => {
    setPlanToAssign(plan);
    setIsAssignModalOpen(true);
  };

  // Execute Plan Assignment to a College
  const handleExecuteAssignPlan = async () => {
    if (!planToAssign || !targetCollegeId) return;

    setAssigningLoading(true);
    try {
      const targetCollege = colleges.find((c) => c.id === targetCollegeId);
      const res = await assignPlanToCollege(
        planToAssign,
        targetCollegeId,
        targetCollege ? targetCollege.name : "Partner Institution"
      );

      // Update local state
      setColleges((prev) =>
        prev.map((c) =>
          c.id === targetCollegeId
            ? {
                ...c,
                max_students: planToAssign.isUnlimitedStudents ? 999999 : planToAssign.maxStudents,
                enabled_features: planToAssign.features,
                subscription_status: "active",
                activation_status: true,
                subscription_expiry_date: res.newExpiry,
              }
            : c
        )
      );

      toast({
        title: "Plan Deployed to College",
        description: `Assigned "${planToAssign.name}" to "${res.collegeName}". Activated all ${res.featuresCount} selected modules!`,
      });
      setIsAssignModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Assignment Error",
        description: err.message || "Failed to assign plan.",
        variant: "destructive",
      });
    } finally {
      setAssigningLoading(false);
    }
  };

  // Open College Custom Overrides Modal
  const handleOpenCollegeCustomModal = (college: any) => {
    setCustomizingCollege(college);
    const existing = Array.isArray(college.enabled_features)
      ? college.enabled_features
      : features.map((f) => f.id);
    setCollegeCustomFeatures(existing);
    setCollegeCustomMaxStudents(college.max_students || 1000);
    setCollegeCustomFilter("all");
    setCollegeCustomSearch("");
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

  // Bulk actions in College Custom Modal
  const handleBulkCollegeFeatures = (action: "all" | "none") => {
    if (action === "all") {
      setCollegeCustomFeatures(features.map((f) => f.id));
    } else {
      setCollegeCustomFeatures([]);
    }
  };

  // Save Per-College Custom Features directly to Supabase
  const handleSaveCollegeCustomFeatures = async () => {
    if (!customizingCollege) return;
    setSavingCollegeFeatures(true);
    try {
      await updateCollegeCustomFeatures(
        customizingCollege.id,
        collegeCustomFeatures,
        collegeCustomMaxStudents
      );

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
        description: `Saved ${collegeCustomFeatures.length} active features directly for "${customizingCollege.name}".`,
      });
      setIsCollegeCustomModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingCollegeFeatures(false);
    }
  };

  // Save current college custom features as a reusable custom plan
  const handleSaveCollegeAsNewPlan = async (college: any) => {
    const customPlanName = `${college.name} Custom Plan`;
    const collegeFeatures = Array.isArray(college.enabled_features)
      ? college.enabled_features
      : features.map((f) => f.id);

    try {
      const newPlan: SubscriptionPlan = {
        id: `plan-custom-${Date.now()}`,
        name: customPlanName,
        description: `Dedicated custom tier created from ${college.name}'s configuration.`,
        tier: "custom",
        priceMonthlyINR: 19999,
        priceAnnualINR: 199999,
        isCustomQuote: false,
        maxStudents: college.max_students || 1000,
        durationDays: 30,
        features: collegeFeatures,
        isActive: true,
        customCollegeId: college.id,
        customCollegeName: college.name,
        badgeText: "Campus Custom",
      };

      const updated = await saveSubscriptionPlan(newPlan);
      setPlans(updated);
      toast({
        title: "Created Custom Plan",
        description: `Saved "${customPlanName}" with ${collegeFeatures.length} enabled modules.`,
      });
      setActiveTab("plans");
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // ==========================================================================
  // FILTERED DATA
  // ==========================================================================

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.badgeText && p.badgeText.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTier = tierFilter === "all" || p.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [plans, searchQuery, tierFilter]);

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchesCat =
        featureCategoryFilter === "all" || f.category === featureCategoryFilter;
      const matchesSearch =
        f.name.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(featureSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [features, featureCategoryFilter, featureSearchQuery]);

  const customPlansCount = useMemo(() => {
    return plans.filter((p) => p.tier === "custom").length;
  }, [plans]);

  return (
    <MasterLayout
      headerTitle="Plans & Feature Checklist Management"
      headerDescription="Create custom subscription plans, customize every single platform feature, and allocate granular modules to partner universities."
    >
      <div className="space-y-6">
        {/* Top KPI Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Subscription Plans
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                <span>{plans.length}</span>
                <span className="text-xs text-indigo-400 font-medium">
                  ({customPlansCount} Custom)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Multi-tier & bespoke packages</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Editable Features
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {features.length} Modules
              </div>
              <p className="text-xs text-slate-400 mt-1">100% customizable & editable</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Partner Institutions
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">
                {colleges.length} Colleges
              </div>
              <p className="text-xs text-slate-400 mt-1">Active tenant organizations</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Zero-Trust Gate
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">Live Guard</div>
              <p className="text-xs text-slate-400 mt-1">Real-time route & UI enforcement</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Controls & Primary Header Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <div className="w-full overflow-x-auto scrollbar-none pb-1">
              <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 p-1 inline-flex min-w-max">
                <TabsTrigger
                  value="plans"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm font-medium"
                >
                  <Layers className="w-4 h-4 mr-2" /> All Plans ({plans.length})
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm font-medium"
                >
                  <Sliders className="w-4 h-4 mr-2" /> Feature Catalog & Editor ({features.length})
                </TabsTrigger>
                <TabsTrigger
                  value="checklist"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm font-medium"
                >
                  <CheckSquare className="w-4 h-4 mr-2" /> Matrix Comparison
                </TabsTrigger>
                <TabsTrigger
                  value="colleges"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm font-medium"
                >
                  <Building2 className="w-4 h-4 mr-2" /> College Allocations ({colleges.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCreateFeatureModal}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Custom Feature
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenCreatePlanModal("custom")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Create Custom Plan
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: ALL SUBSCRIPTION PLANS & CUSTOM PLANS                      */}
        {/* ================================================================= */}
        {activeTab === "plans" && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search plans by name or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  Filter Tier:
                </span>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-36 bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="all">All Tiers ({plans.length})</SelectItem>
                    <SelectItem value="custom">Custom Tiers ({customPlansCount})</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {filteredPlans.map((plan) => {
                const isCustom = plan.tier === "custom";
                const activeCount = plan.features.length;

                return (
                  <Card
                    key={plan.id}
                    className={`bg-slate-900 border text-slate-100 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-indigo-500/60 hover:shadow-2xl ${
                      isCustom
                        ? "border-purple-500/60 shadow-purple-500/10"
                        : plan.isPopular
                        ? "border-indigo-500 shadow-indigo-500/10"
                        : "border-slate-800"
                    }`}
                  >
                    {/* Badge */}
                    {(plan.badgeText || isCustom || plan.isPopular) && (
                      <div
                        className={`absolute top-0 right-0 text-[10px] uppercase font-bold text-white px-3 py-1 rounded-bl-lg tracking-wider ${
                          isCustom
                            ? "bg-gradient-to-l from-purple-600 to-indigo-600"
                            : plan.isPopular
                            ? "bg-gradient-to-l from-indigo-500 to-blue-600"
                            : "bg-slate-800"
                        }`}
                      >
                        {plan.badgeText || (isCustom ? "Custom Built" : "Popular")}
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className={`capitalize font-mono text-[10px] ${
                            isCustom
                              ? "border-purple-500/40 text-purple-300 bg-purple-500/15"
                              : "border-indigo-500/40 text-indigo-400 bg-indigo-500/10"
                          }`}
                        >
                          {plan.tier} Tier
                        </Badge>

                        {/* Landing Page Public Status */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlanActive(plan)}
                          title={
                            plan.isActive
                              ? "Visible on public landing page. Click to hide."
                              : "Hidden from public landing page. Click to show."
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
                              <span>Public</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </div>

                      <CardTitle className="text-lg font-bold text-white leading-tight">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                        {plan.description || "Customized platform tier configured by master admin."}
                      </CardDescription>

                      {/* Pricing */}
                      <div className="pt-3 pb-1 border-b border-slate-800/80">
                        {plan.isCustomQuote ? (
                          <div className="py-1">
                            <span className="text-xl font-extrabold text-purple-300">
                              Bespoke Contract
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Custom SLA & Institutional Quote
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-extrabold text-white">
                                ₹{plan.priceMonthlyINR.toLocaleString("en-IN")}
                              </span>
                              <span className="text-xs text-slate-400">/ mo</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              ₹{plan.priceAnnualINR.toLocaleString("en-IN")} / yr (Billed annually)
                            </div>
                          </>
                        )}
                      </div>

                      {/* Quota Specs */}
                      <div className="grid grid-cols-2 gap-2 pt-3 text-xs text-slate-300">
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400">Student Capacity</div>
                            <div className="font-semibold text-white">
                              {plan.isUnlimitedStudents || plan.maxStudents >= 999999
                                ? "Unlimited"
                                : `${plan.maxStudents.toLocaleString("en-IN")} Seats`}
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

                    {/* Feature Checklist Preview */}
                    <CardContent className="py-2 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-1 border-b border-slate-800/50">
                        <span>Configured Modules</span>
                        <span className="text-indigo-400 font-mono font-semibold">
                          {activeCount} / {features.length}
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {features.map((feat) => {
                          const isIncluded = plan.features.includes(feat.id);
                          return (
                            <div
                              key={feat.id}
                              className={`flex items-center justify-between text-xs p-1.5 rounded-md transition-colors ${
                                isIncluded
                                  ? "bg-slate-950/50 text-slate-200"
                                  : "text-slate-500 opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {getFeatureIcon(feat.id, feat.category)}
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

                    {/* Card Actions */}
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
                          onClick={() => handleOpenEditPlanModal(plan)}
                          className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 flex-1"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClonePlan(plan)}
                          className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 flex-1"
                          title="Clone as Custom Plan"
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
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: EDITABLE FEATURE CATALOG (EACH FEATURE IS EDITABLE)         */}
        {/* ================================================================= */}
        {activeTab === "features" && (
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <span>Platform Feature Registry & Customizer</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-1">
                    Every feature in Orbit LMS can be edited, re-categorized, or created here. Changes instantly propagate to plans, permissions, and sidebars.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFeatures}
                    className="border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs"
                    title="Restore system defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Defaults
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenCreateFeatureModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New Custom Feature
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search features by name, id, or description..."
                      value={featureSearchQuery}
                      onChange={(e) => setFeatureSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-slate-400 font-medium">Category:</span>
                    <Select
                      value={featureCategoryFilter}
                      onValueChange={setFeatureCategoryFilter}
                    >
                      <SelectTrigger className="w-40 bg-slate-950 border-slate-800 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="all">All Categories ({features.length})</SelectItem>
                        <SelectItem value="learning">Learning & Classroom</SelectItem>
                        <SelectItem value="assessment">Assessment & Exams</SelectItem>
                        <SelectItem value="engagement">Engagement & Streaks</SelectItem>
                        <SelectItem value="ai_tools">AI & Innovation</SelectItem>
                        <SelectItem value="operations">Operations & Billing</SelectItem>
                        <SelectItem value="analytics">Analytics & Reporting</SelectItem>
                        <SelectItem value="security">Security & Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Features Table (Desktop) */}
                <div className="rounded-xl border border-slate-800 overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader className="bg-slate-950/70">
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-300 w-80">Feature Name & Key</TableHead>
                        <TableHead className="text-slate-300">Category</TableHead>
                        <TableHead className="text-slate-300">Target Roles</TableHead>
                        <TableHead className="text-slate-300">Default in Plans</TableHead>
                        <TableHead className="text-slate-300">Plans Using</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeatures.map((feat) => {
                        const usageCount = plans.filter((p) => p.features.includes(feat.id)).length;

                        return (
                          <TableRow key={feat.id} className="border-slate-800 hover:bg-slate-800/40">
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 mt-0.5">
                                  {getFeatureIcon(feat.id, feat.category)}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                                    <span>{feat.name}</span>
                                    {feat.badge && (
                                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                                        {feat.badge}
                                      </Badge>
                                    )}
                                    {feat.isCustom && (
                                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                                        Custom Feature
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-indigo-400 mt-0.5">
                                    ID: {feat.id}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1 max-w-md line-clamp-2">
                                    {feat.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className="capitalize text-[10px] border-slate-700 text-slate-300 bg-slate-950/60"
                              >
                                {feat.category.replace("_", " ")}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(feat.roles || ["student", "teacher", "admin"]).map((r) => (
                                  <span
                                    key={r}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono capitalize"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </TableCell>

                            <TableCell>
                              {feat.isEnabledByDefault !== false ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                  <Check className="w-3.5 h-3.5" /> Enabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                                  <XCircle className="w-3.5 h-3.5" /> Optional
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className="font-mono text-xs text-slate-300 font-medium">
                                {usageCount} / {plans.length} plans
                              </span>
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={
                                  feat.status === "beta"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]"
                                    : feat.status === "deprecated"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]"
                                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]"
                                }
                              >
                                {feat.status || "active"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditFeatureModal(feat)}
                                  className="h-8 px-2.5 text-xs text-cyan-400 hover:text-white hover:bg-slate-800"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit Feature
                                </Button>

                                {feat.isCustom && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteFeature(feat.id, feat.name)}
                                    className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                    title="Delete custom feature"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Features Cards (Mobile) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredFeatures.map((feat) => {
                    const usageCount = plans.filter((p) => p.features.includes(feat.id)).length;
                    return (
                      <div key={feat.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                              {getFeatureIcon(feat.id, feat.category)}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm flex items-center gap-1.5 flex-wrap">
                                <span>{feat.name}</span>
                                {feat.badge && (
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px]">
                                    {feat.badge}
                                  </Badge>
                                )}
                                {feat.isCustom && (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-indigo-400 mt-0.5">ID: {feat.id}</p>
                            </div>
                          </div>
                          <Badge
                            className={
                              feat.status === "beta"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] shrink-0"
                                : feat.status === "deprecated"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] shrink-0"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] shrink-0"
                            }
                          >
                            {feat.status || "active"}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{feat.description}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          <Badge variant="outline" className="capitalize text-[10px] border-slate-700 text-slate-300 bg-slate-900">
                            {feat.category.replace("_", " ")}
                          </Badge>
                          {(feat.roles || ["student", "teacher", "admin"]).map((r) => (
                            <span key={r} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono capitalize">
                              {r}
                            </span>
                          ))}
                          <span className="text-slate-400 font-mono ml-auto">
                            {usageCount}/{plans.length} plans
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditFeatureModal(feat)}
                            className="h-7 px-2.5 text-xs text-cyan-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit Feature
                          </Button>
                          {feat.isCustom && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteFeature(feat.id, feat.name)}
                              className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: MATRIX COMPARISON                                          */}
        {/* ================================================================= */}
        {activeTab === "checklist" && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Interactive Plan Feature Matrix</CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  Click any matrix cell to instantly toggle that feature on or off for that plan. Changes save automatically!
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/70">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-300 w-80">Platform Module & Scope</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    {plans.map((p) => (
                      <TableHead key={p.id} className="text-center text-slate-300 min-w-[140px]">
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] font-mono text-indigo-400">
                          {p.isCustomQuote
                            ? "Custom Quote"
                            : `₹${p.priceMonthlyINR.toLocaleString("en-IN")}/mo`}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feat) => (
                    <TableRow key={feat.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {getFeatureIcon(feat.id, feat.category)}
                          <div>
                            <div className="font-medium text-white text-sm">{feat.name}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {feat.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] border-slate-700 text-slate-300 bg-slate-950/40"
                        >
                          {feat.category.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      {plans.map((p) => {
                        const isIncluded = p.features.includes(feat.id);
                        return (
                          <TableCell key={p.id} className="text-center">
                            <button
                              type="button"
                              onClick={() => handleMatrixQuickToggle(p, feat.id)}
                              title={`Click to ${isIncluded ? "disable" : "enable"} ${feat.name} on ${p.name}`}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer ${
                                isIncluded
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                                  : "bg-slate-950 text-slate-600 border border-slate-800 hover:bg-slate-800 hover:text-slate-400"
                              }`}
                            >
                              {isIncluded ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
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

        {/* ================================================================= */}
        {/* TAB 4: TENANT COLLEGE ALLOCATIONS & GRANULAR OVERRIDES             */}
        {/* ================================================================= */}
        {activeTab === "colleges" && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Tenant College Plan Allocations & Feature Overrides</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Directly customize or toggle specific modular features for each educational partner organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-6">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-slate-950/70">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-300">College Name</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Student Capacity</TableHead>
                      <TableHead className="text-slate-300">Subscription Expiry</TableHead>
                      <TableHead className="text-slate-300">Active Modules</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colleges.map((c) => {
                      const featureCount = Array.isArray(c.enabled_features)
                        ? c.enabled_features.length
                        : features.length;

                      return (
                        <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                          <TableCell>
                            <div className="font-semibold text-white">{c.name}</div>
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
                          <TableCell>
                            <span className="font-semibold text-white text-xs">
                              {c.max_students >= 999999 ? "Unlimited" : `${c.max_students || 1000} Seats`}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">
                            {c.subscription_expiry_date
                              ? new Date(c.subscription_expiry_date).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Ongoing"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {featureCount} / {features.length} Enabled
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCollegeCustomModal(c)}
                                className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/15 text-xs h-8"
                              >
                                <Sliders className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                                Customize Features
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveCollegeAsNewPlan(c)}
                                className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-8"
                                title="Turn this college setup into a reusable Custom Plan"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                Save as Plan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile College Cards View */}
              <div className="grid grid-cols-1 gap-3 md:hidden p-4">
                {colleges.map((c) => {
                  const featureCount = Array.isArray(c.enabled_features)
                    ? c.enabled_features.length
                    : features.length;
                  return (
                    <div key={c.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white text-sm">{c.name}</h4>
                          <p className="text-xs text-slate-400 font-mono">{c.email}</p>
                        </div>
                        <Badge
                          className={
                            c.activation_status
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]"
                          }
                        >
                          {c.activation_status ? "Active" : "Suspended"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Capacity:</span>
                          <span className="font-semibold text-white">
                            {c.max_students >= 999999 ? "Unlimited" : `${c.max_students || 1000} Seats`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Subscription Expiry:</span>
                          <span className="text-slate-300">
                            {c.subscription_expiry_date
                              ? new Date(c.subscription_expiry_date).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Ongoing"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 w-fit">
                          {featureCount} / {features.length} Modules
                        </span>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCollegeCustomModal(c)}
                            className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/15 text-xs h-8"
                          >
                            <Sliders className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                            Customize
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveCollegeAsNewPlan(c)}
                            className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-8"
                            title="Turn this college setup into a reusable Custom Plan"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Save Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: PLAN CREATE / EDIT MODAL (CUSTOM PLANS & FEATURE SELECTION)  */}
      {/* ===================================================================== */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>{editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create New Custom Plan"}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Configure plan pricing, student capacity, duration, and toggle every single platform feature individually.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 pt-2">
            {/* Row 1: Name & Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Plan Name *</Label>
                <Input
                  required
                  placeholder="e.g. AI Autonomous Campus Tier"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Plan Tier Category</Label>
                <Select
                  value={planForm.tier}
                  onValueChange={(val: any) => setPlanForm({ ...planForm, tier: val })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="custom">Custom Tier (Bespoke)</SelectItem>
                    <SelectItem value="starter">Starter Academic</SelectItem>
                    <SelectItem value="pro">Pro Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Description</Label>
              <Input
                placeholder="Brief summary of capabilities included in this tier..."
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            {/* Row 3: Pricing & Bespoke Contract Toggle */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isCustomQuote"
                    checked={planForm.isCustomQuote}
                    onCheckedChange={(checked) =>
                      setPlanForm({ ...planForm, isCustomQuote: Boolean(checked) })
                    }
                  />
                  <Label htmlFor="isCustomQuote" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Bespoke / Custom Contract Quote (No fixed public price)
                  </Label>
                </div>
                {planForm.isCustomQuote && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                    Contract Quote Mode
                  </Badge>
                )}
              </div>

              {!planForm.isCustomQuote && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Monthly Price (INR) *</Label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        required={!planForm.isCustomQuote}
                        value={planForm.priceMonthlyINR}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, priceMonthlyINR: Number(e.target.value) })
                        }
                        className="pl-8 bg-slate-900 border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Annual Price (INR) *</Label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        required={!planForm.isCustomQuote}
                        value={planForm.priceAnnualINR}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, priceAnnualINR: Number(e.target.value) })
                        }
                        className="pl-8 bg-slate-900 border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Student Capacity & Billing Cycle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Student Capacity</Label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <Checkbox
                      checked={planForm.isUnlimitedStudents}
                      onCheckedChange={(c) =>
                        setPlanForm({ ...planForm, isUnlimitedStudents: Boolean(c) })
                      }
                    />
                    <span>Unlimited Seats</span>
                  </label>
                </div>
                {!planForm.isUnlimitedStudents ? (
                  <Input
                    type="number"
                    min={1}
                    value={planForm.maxStudents}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, maxStudents: Number(e.target.value) })
                    }
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                ) : (
                  <div className="h-9 px-3 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center font-semibold">
                    Unlimited Active Learners
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Billing Cycle (Days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={planForm.durationDays}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, durationDays: Number(e.target.value) })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Row 5: Granular Feature Selection Switchboard */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs text-white font-semibold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Modular Feature Checklist</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    Toggle every single platform feature individually for this plan.
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-indigo-400 mr-2">
                    {planForm.features.length}/{features.length} Enabled
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApplyFeaturePreset("all")}
                    className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApplyFeaturePreset("none")}
                    className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApplyFeaturePreset("core")}
                    className="h-7 px-2 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                  >
                    Core Only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApplyFeaturePreset("ai_analytics")}
                    className="h-7 px-2 text-[11px] text-purple-400 hover:text-purple-300 hover:bg-slate-800"
                  >
                    + AI Suite
                  </Button>
                </div>
              </div>

              {/* Feature checkboxes grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                {features.map((feat) => {
                  const isChecked = planForm.features.includes(feat.id);
                  return (
                    <label
                      key={feat.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-slate-900 border-indigo-500/40 text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleFormFeature(feat.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 truncate">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {getFeatureIcon(feat.id, feat.category)}
                          <span className="truncate">{feat.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {feat.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row 6: Badge text & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Custom Ribbon Badge (Optional)</Label>
                <Input
                  placeholder="e.g. AI Autonomous, Recommended, 50% Off"
                  value={planForm.badgeText}
                  onChange={(e) => setPlanForm({ ...planForm, badgeText: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={planForm.isActive}
                    onCheckedChange={(c) => setPlanForm({ ...planForm, isActive: Boolean(c) })}
                  />
                  <span>Show on Public Landing Page</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={planForm.isPopular}
                    onCheckedChange={(c) => setPlanForm({ ...planForm, isPopular: Boolean(c) })}
                  />
                  <span>Mark as Most Popular</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800 gap-2">
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md"
              >
                {savingPlan ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {editingPlan ? "Update Plan" : "Create Custom Plan"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 2: FEATURE CREATE / EDIT MODAL ("each feature should be editable") */}
      {/* ===================================================================== */}
      <Dialog open={isFeatureModalOpen} onOpenChange={setIsFeatureModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>{editingFeature ? `Edit Feature: ${editingFeature.name}` : "Register New Platform Feature"}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Define or customize the feature metadata, URL routes, target user roles, and default inclusion settings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFeature} className="space-y-4 pt-2">
            {/* Feature Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Feature Name *</Label>
                <Input
                  required
                  placeholder="e.g. AI Proctoring Engine"
                  value={featureForm.name}
                  onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Unique Key / ID *</Label>
                <Input
                  required
                  disabled={Boolean(editingFeature && !editingFeature.isCustom)}
                  placeholder="e.g. ai_proctoring"
                  value={featureForm.id}
                  onChange={(e) =>
                    setFeatureForm({
                      ...featureForm,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Feature Category</Label>
                <Select
                  value={featureForm.category}
                  onValueChange={(val: FeatureCategory) =>
                    setFeatureForm({ ...featureForm, category: val })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="learning">Learning & Classroom</SelectItem>
                    <SelectItem value="assessment">Assessment & Examination</SelectItem>
                    <SelectItem value="engagement">Engagement & Streaks</SelectItem>
                    <SelectItem value="ai_tools">AI & Innovation</SelectItem>
                    <SelectItem value="operations">Operations & Financials</SelectItem>
                    <SelectItem value="analytics">Analytics & Reporting</SelectItem>
                    <SelectItem value="security">Security & Administration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Lifecycle Status</Label>
                <Select
                  value={featureForm.status}
                  onValueChange={(val: any) => setFeatureForm({ ...featureForm, status: val })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="active">Active & Stable</SelectItem>
                    <SelectItem value="beta">Beta / Early Access</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Feature Description *</Label>
              <Input
                required
                placeholder="Comprehensive description of what this module provides..."
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            {/* Associated Routes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Associated Routes (Comma separated)</Label>
              <Input
                placeholder="e.g. /student/attendance, /teacher/attendance"
                value={featureForm.routes}
                onChange={(e) => setFeatureForm({ ...featureForm, routes: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">
                These URLs will automatically display the upgrade prompt if this module is disabled.
              </span>
            </div>

            {/* Target Roles */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Target User Roles</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {(["student", "teacher", "admin", "finance"] as FeatureRole[]).map((role) => {
                  const isChecked = featureForm.roles.includes(role);
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(c) => {
                          const updated = c
                            ? [...featureForm.roles, role]
                            : featureForm.roles.filter((r) => r !== role);
                          setFeatureForm({ ...featureForm, roles: updated });
                        }}
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Default enabled & badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Badge Label</Label>
                <Input
                  placeholder="e.g. AI Powered, 20-Credit"
                  value={featureForm.badge}
                  onChange={(e) => setFeatureForm({ ...featureForm, badge: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="pt-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={featureForm.isEnabledByDefault}
                    onCheckedChange={(c) =>
                      setFeatureForm({ ...featureForm, isEnabledByDefault: Boolean(c) })
                    }
                  />
                  <span>Enabled by default in newly created plans</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFeatureModalOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingFeature}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md"
              >
                {savingFeature ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {editingFeature ? "Save Feature Updates" : "Register Feature"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 3: ASSIGN PLAN TO COLLEGE MODAL                                 */}
      {/* ===================================================================== */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>Assign Plan to College</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Instantly provision plan quotas and activate all selected modular features for this partner college.
            </DialogDescription>
          </DialogHeader>

          {planToAssign && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-xs font-medium text-slate-400">Selected Plan:</div>
                <div className="text-base font-bold text-white flex items-center justify-between">
                  <span>{planToAssign.name}</span>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] capitalize">
                    {planToAssign.tier}
                  </Badge>
                </div>
                <div className="text-xs text-slate-300">
                  Capacity:{" "}
                  <strong>
                    {planToAssign.isUnlimitedStudents
                      ? "Unlimited Seats"
                      : `${planToAssign.maxStudents} Students`}
                  </strong>{" "}
                  • Modules: <strong>{planToAssign.features.length} Features</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Select Target College *</Label>
                <Select value={targetCollegeId} onValueChange={setTargetCollegeId}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue placeholder="Choose a college..." />
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

              <DialogFooter className="pt-3 border-t border-slate-800 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteAssignPlan}
                  disabled={assigningLoading || !targetCollegeId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md"
                >
                  {assigningLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Confirm & Apply Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 4: PER-COLLEGE GRANULAR FEATURE OVERRIDES                       */}
      {/* ===================================================================== */}
      <Dialog open={isCollegeCustomModalOpen} onOpenChange={setIsCollegeCustomModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>
                Feature Overrides: {customizingCollege ? customizingCollege.name : "College"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Toggle any platform feature specifically for this college. All changes are saved directly to the database and sync live.
            </DialogDescription>
          </DialogHeader>

          {customizingCollege && (
            <div className="space-y-4 pt-2">
              {/* College Info & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">Institution:</div>
                  <div className="text-sm font-bold text-white">{customizingCollege.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{customizingCollege.email}</div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Custom Max Student Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={collegeCustomMaxStudents}
                    onChange={(e) => setCollegeCustomMaxStudents(Number(e.target.value))}
                    className="bg-slate-900 border-slate-800 text-xs text-white h-8"
                  />
                </div>
              </div>

              {/* Toolbar & Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search features..."
                    value={collegeCustomSearch}
                    onChange={(e) => setCollegeCustomSearch(e.target.value)}
                    className="pl-8 bg-slate-950 border-slate-800 text-xs text-white h-8"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-mono font-bold text-indigo-400 mr-2">
                    {collegeCustomFeatures.length}/{features.length} Enabled
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkCollegeFeatures("all")}
                    className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkCollegeFeatures("none")}
                    className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                {features
                  .filter((f) => {
                    const matchSearch =
                      f.name.toLowerCase().includes(collegeCustomSearch.toLowerCase()) ||
                      f.id.toLowerCase().includes(collegeCustomSearch.toLowerCase());
                    return matchSearch;
                  })
                  .map((feat) => {
                    const isEnabled = collegeCustomFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isEnabled
                            ? "bg-slate-900 border-indigo-500/50 text-white shadow-xs"
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleCollegeFeature(feat.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 truncate">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                              {getFeatureIcon(feat.id, feat.category)}
                              <span className="truncate">{feat.name}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-slate-700 text-slate-400 uppercase font-mono shrink-0"
                            >
                              {feat.category}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {feat.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollegeCustomModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveCollegeCustomFeatures}
                  disabled={savingCollegeFeatures}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md"
                >
                  {savingCollegeFeatures ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Overrides
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
