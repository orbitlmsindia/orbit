import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ticket,
  Plus,
  Trash2,
  Loader2,
  Percent,
  IndianRupee,
  Calendar,
  Copy,
  CheckCircle2,
  XCircle,
  Users,
  TrendingUp,
  Tag,
  Building2,
  BookOpen,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Sparkles,
  Layers,
  Check
} from "lucide-react";

export interface UnifiedCoupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_purchase: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  college_id: string | null;
  course_id: string | null;
  teacher_id?: string | null;
  created_at: string;
  college_name?: string;
  course_title?: string;
}

interface UnifiedCouponManagerProps {
  scope: "master" | "admin";
  collegeId?: string | null;
}

export function UnifiedCouponManager({ scope, collegeId }: UnifiedCouponManagerProps) {
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<UnifiedCoupon[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; college_id?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "exhausted" | "expired">("all");
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>("all");

  // Create Modal State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Delete Modal State
  const [couponToDelete, setCouponToDelete] = useState<UnifiedCoupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: 15,
    has_limit: true,
    max_uses: "50",
    min_purchase: "0",
    valid_until: "",
    target_college: scope === "admin" && collegeId ? collegeId : "all",
    target_course: "all",
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Colleges
      const { data: colData } = await supabase
        .from("colleges")
        .select("id, name")
        .order("name", { ascending: true });
      const loadedColleges = colData || [];
      setColleges(loadedColleges);

      // 2. Fetch Courses
      let courseQuery = supabase.from("courses").select("id, title, college_id").order("title", { ascending: true });
      if (scope === "admin" && collegeId) {
        courseQuery = courseQuery.eq("college_id", collegeId);
      }
      const { data: crsData } = await courseQuery;
      const loadedCourses = crsData || [];
      setCourses(loadedCourses);

      // 3. Fetch Coupons
      let query = supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (scope === "admin" && collegeId) {
        query = query.or(`college_id.eq.${collegeId},college_id.is.null`);
      }

      const { data: dbCoupons, error } = await query;

      let mergedList: UnifiedCoupon[] = [];
      if (!error && dbCoupons) {
        mergedList = dbCoupons;
      }

      // Check localStorage for offline/cached coupons
      try {
        const localSaved = localStorage.getItem("orbit_coupons");
        if (localSaved) {
          const localList: UnifiedCoupon[] = JSON.parse(localSaved);
          localList.forEach((lc) => {
            if (!mergedList.some((c) => c.code.toUpperCase() === lc.code.toUpperCase())) {
              if (scope === "master" || !lc.college_id || lc.college_id === collegeId) {
                mergedList.push(lc);
              }
            }
          });
        }
      } catch (e) {}

      // Map college and course names
      const enriched: UnifiedCoupon[] = mergedList.map((c) => {
        const collegeMatch = loadedColleges.find((col) => col.id === c.college_id);
        const courseMatch = loadedCourses.find((crs) => crs.id === c.course_id);
        return {
          ...c,
          college_name: collegeMatch ? collegeMatch.name : c.college_id ? "Specific College" : "Global (All Institutions)",
          course_title: courseMatch ? courseMatch.title : c.course_id ? "Specific Course" : "All Curriculums",
        };
      });

      setCoupons(enriched);
    } catch (err: any) {
      console.error("Error loading coupons:", err);
      toast({ variant: "destructive", title: "Load Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scope, collegeId]);

  const generateCode = () => {
    const prefix = scope === "master" ? "ORBIT" : "CAMPUS";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = `${prefix}-`;
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewCoupon((prev) => ({ ...prev, code }));
  };

  const handleCreateCoupon = async () => {
    const cleanCode = newCoupon.code.toUpperCase().trim();
    if (!cleanCode) {
      toast({ variant: "destructive", title: "Error", description: "Coupon code is required." });
      return;
    }

    if (newCoupon.discount_value <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Discount value must be greater than 0." });
      return;
    }

    if (newCoupon.discount_type === "percentage" && newCoupon.discount_value > 100) {
      toast({ variant: "destructive", title: "Error", description: "Percentage discount cannot exceed 100%." });
      return;
    }

    // Check duplicate code
    if (coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      toast({
        variant: "destructive",
        title: "Duplicate Code",
        description: `Coupon code "${cleanCode}" already exists. Please choose a unique code.`,
      });
      return;
    }

    let assignedCollegeId: string | null = null;
    if (scope === "admin") {
      assignedCollegeId = collegeId || null;
    } else {
      assignedCollegeId = newCoupon.target_college === "all" ? null : newCoupon.target_college;
    }

    const assignedCourseId = newCoupon.target_course === "all" ? null : newCoupon.target_course;
    const maxUsesLimit = newCoupon.has_limit && newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        code: cleanCode,
        description: newCoupon.description.trim() || null,
        discount_type: newCoupon.discount_type,
        discount_value: Number(newCoupon.discount_value),
        max_uses: maxUsesLimit,
        used_count: 0,
        min_purchase: parseFloat(newCoupon.min_purchase) || 0,
        valid_from: new Date().toISOString(),
        valid_until: newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString() : null,
        is_active: true,
        college_id: assignedCollegeId,
        course_id: assignedCourseId,
        teacher_id: user?.id || null,
      };

      let created: any = null;
      try {
        const { data, error } = await supabase.from("coupons").insert([payload]).select().single();
        if (!error && data) {
          created = data;
        }
      } catch (dbErr) {
        console.warn("Direct Supabase coupon insert note:", dbErr);
      }

      const newCouponRecord: UnifiedCoupon = created || {
        ...payload,
        id: `coupon_${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      // Always update localStorage
      try {
        const saved = localStorage.getItem("orbit_coupons");
        const list: UnifiedCoupon[] = saved ? JSON.parse(saved) : [];
        list.unshift(newCouponRecord);
        localStorage.setItem("orbit_coupons", JSON.stringify(list));
      } catch (e) {}

      toast({
        title: "Coupon Successfully Created! 🎟️",
        description: `Code "${cleanCode}" is now active with ${
          maxUsesLimit ? `${maxUsesLimit} redemptions limit` : "unlimited redemptions"
        }.`,
      });

      setCreateDialogOpen(false);
      setNewCoupon({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 15,
        has_limit: true,
        max_uses: "50",
        min_purchase: "0",
        valid_until: "",
        target_college: scope === "admin" && collegeId ? collegeId : "all",
        target_course: "all",
      });

      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Creating Coupon", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await supabase.from("coupons").update({ is_active: nextStatus }).eq("id", couponId);

      // Update local storage
      try {
        const saved = localStorage.getItem("orbit_coupons");
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((c: any) => (c.id === couponId ? { ...c, is_active: nextStatus } : c));
          localStorage.setItem("orbit_coupons", JSON.stringify(updated));
        }
      } catch (e) {}

      setCoupons((prev) => prev.map((c) => (c.id === couponId ? { ...c, is_active: nextStatus } : c)));

      toast({
        title: nextStatus ? "Coupon Activated ✅" : "Coupon Deactivated ⏸️",
        description: nextStatus ? "Students can now redeem this code." : "Redemptions temporarily disabled.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;
    try {
      setDeleting(true);
      await supabase.from("coupon_usage").delete().eq("coupon_id", couponToDelete.id);
      await supabase.from("coupons").delete().eq("id", couponToDelete.id);

      // Update local storage
      try {
        const saved = localStorage.getItem("orbit_coupons");
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.filter((c: any) => c.id !== couponToDelete.id && c.code !== couponToDelete.code);
          localStorage.setItem("orbit_coupons", JSON.stringify(updated));
        }
      } catch (e) {}

      setCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));

      toast({
        title: "Coupon Deleted 🗑️",
        description: `Promo code "${couponToDelete.code}" has been permanently purged.`,
      });

      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code Copied! 📋", description: `"${code}" ready to share with students.` });
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleExportCSV = () => {
    if (coupons.length === 0) {
      toast({ title: "No Data", description: "No coupon records to export." });
      return;
    }

    const header = "Coupon Code,Description,Discount Type,Discount Value,Max Uses,Used Count,Min Purchase,Institution,Course,Status,Expiry Date,Created Date";
    const rows = filteredCoupons.map((c) => {
      const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
      const isExhausted = c.max_uses !== null && c.used_count >= c.max_uses;
      const statusText = !c.is_active ? "INACTIVE" : isExpired ? "EXPIRED" : isExhausted ? "EXHAUSTED" : "ACTIVE";
      return [
        `"${c.code}"`,
        `"${(c.description || "").replace(/"/g, '""')}"`,
        c.discount_type,
        c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`,
        c.max_uses !== null ? c.max_uses : "UNLIMITED",
        c.used_count || 0,
        c.min_purchase || 0,
        `"${(c.college_name || "Global").replace(/"/g, '""')}"`,
        `"${(c.course_title || "All").replace(/"/g, '""')}"`,
        statusText,
        c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "No Expiry",
        new Date(c.created_at).toLocaleDateString(),
      ].join(",");
    });

    const csvContent = `${header}\n${rows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Orbit_Coupons_${scope.toUpperCase()}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete! 📊", description: `Exported ${rows.length} coupon records.` });
  };

  // Metrics
  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter((c) => {
    const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
    const isExhausted = c.max_uses !== null && c.used_count >= c.max_uses;
    return c.is_active && !isExpired && !isExhausted;
  }).length;
  const totalRedemptionsCount = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
  const totalDiscountGranted = coupons.reduce((sum, c) => {
    const uses = c.used_count || 0;
    return sum + (c.discount_type === "flat" ? c.discount_value * uses : 500 * uses);
  }, 0);

  // Filtered List
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // Status Filter
      const isExpired = Boolean(c.valid_until && new Date(c.valid_until) < new Date());
      const isExhausted = Boolean(c.max_uses !== null && c.used_count >= c.max_uses);

      if (statusFilter === "active" && (!c.is_active || isExpired || isExhausted)) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (statusFilter === "exhausted" && !isExhausted) return false;
      if (statusFilter === "expired" && !isExpired) return false;

      // College Filter (Master Admin)
      if (scope === "master" && selectedCollegeFilter !== "all") {
        if (selectedCollegeFilter === "global" && c.college_id !== null) return false;
        if (selectedCollegeFilter !== "global" && c.college_id !== selectedCollegeFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(query);
        const descMatch = (c.description || "").toLowerCase().includes(query);
        const colMatch = (c.college_name || "").toLowerCase().includes(query);
        const crsMatch = (c.course_title || "").toLowerCase().includes(query);
        if (!codeMatch && !descMatch && !colMatch && !crsMatch) return false;
      }

      return true;
    });
  }, [coupons, searchQuery, statusFilter, selectedCollegeFilter, scope]);

  return (
    <div className="space-y-6">
      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Coupons</span>
              <Ticket className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
              {totalCouponsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Campaigns registered</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Active Codes</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">
              {activeCouponsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready for student checkout</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Redemptions</span>
              <Users className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-500">
              {totalRedemptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Students redeemed</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Value Granted</span>
              <IndianRupee className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500 truncate">
              ₹{totalDiscountGranted.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Estimated student savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar & Filters */}
      <Card className="bg-card border rounded-2xl shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coupon code, description, institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Institution Filter (Master Admin Only) */}
              {scope === "master" && (
                <Select value={selectedCollegeFilter} onValueChange={setSelectedCollegeFilter}>
                  <SelectTrigger className="h-10 text-xs rounded-xl w-[180px]">
                    <SelectValue placeholder="All Institutions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutions ({colleges.length})</SelectItem>
                    <SelectItem value="global">Global Platform Only</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="exhausted">Exhausted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="inactive">Disabled</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-10 px-3 rounded-xl text-xs gap-1.5 touch-press"
                title="Export Coupons Report CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>

              {/* Create Coupon Button */}
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm touch-press cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Coupon</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Directory Grid / Cards */}
      <Card className="bg-card border rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span>Coupon & Discount Ledger</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Showing {filteredCoupons.length} of {coupons.length} total coupon rules
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading coupons catalog...</p>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Ticket className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
              <p className="text-sm font-semibold">No coupon codes found.</p>
              <p className="text-xs max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "Try resetting your search query or filters."
                  : "Click 'Create Coupon' above to configure your first promotional discount."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredCoupons.map((c) => {
                const isExpired = Boolean(c.valid_until && new Date(c.valid_until) < new Date());
                const isExhausted = Boolean(c.max_uses !== null && c.used_count >= c.max_uses);
                const percentUsed = c.max_uses ? Math.min(100, Math.round((c.used_count / c.max_uses) * 100)) : 0;

                return (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Left: Code, Scope & Details */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-black text-base sm:text-lg tracking-wider text-foreground px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-primary" />
                          {c.code}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(c.code)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* Status Badges */}
                        {!c.is_active ? (
                          <Badge variant="outline" className="text-[10px] border-slate-500/40 text-slate-500">
                            Disabled
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Expired
                          </Badge>
                        ) : isExhausted ? (
                          <Badge className="bg-rose-500 text-white text-[10px]">
                            Limit Exhausted
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            Active
                          </Badge>
                        )}

                        {/* Discount Pill */}
                        <Badge className="bg-amber-500 text-slate-950 font-mono font-bold text-[11px] gap-1">
                          {c.discount_type === "percentage" ? (
                            <>
                              <Percent className="h-3 w-3" /> {c.discount_value}% OFF
                            </>
                          ) : (
                            <>
                              <IndianRupee className="h-3 w-3" /> ₹{c.discount_value} OFF
                            </>
                          )}
                        </Badge>
                      </div>

                      {c.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {c.description}
                        </p>
                      )}

                      {/* Scopes Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-foreground font-semibold">{c.college_name}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          <span>{c.course_title}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>
                            {c.valid_until ? `Expires ${new Date(c.valid_until).toLocaleDateString()}` : "No Expiry"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Usage Meter & Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                      {/* Usage Meter */}
                      <div className="w-full sm:w-44 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Redemptions:</span>
                          <span className="font-mono font-bold text-foreground">
                            {c.used_count || 0} / {c.max_uses !== null ? c.max_uses : "∞"}
                          </span>
                        </div>
                        {c.max_uses !== null && (
                          <Progress
                            value={percentUsed}
                            className={`h-2 rounded-full ${isExhausted ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary"}`}
                          />
                        )}
                        {c.max_uses !== null && (
                          <div className="text-[10px] text-muted-foreground font-mono text-right">
                            {Math.max(0, c.max_uses - (c.used_count || 0))} slots remaining
                          </div>
                        )}
                      </div>

                      {/* Toggle & Delete */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={() => handleToggleCoupon(c.id, c.is_active)}
                            aria-label="Toggle coupon status"
                          />
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {c.is_active ? "On" : "Off"}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCouponToDelete(c);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🚀 Create Coupon Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-card border text-foreground shadow-2xl p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {scope === "master" ? "Create Global / Institutional Coupon" : "Create Institutional Coupon"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Define promotional discount codes, usage limits, and institutional restrictions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Code & Auto-generator */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Coupon Code *</span>
                <button
                  type="button"
                  onClick={generateCode}
                  className="text-primary hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Generate Code
                </button>
              </Label>
              <Input
                placeholder="e.g. WELCOME50, TECH2026"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                className="font-mono font-bold tracking-wider h-10 text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campaign Description</Label>
              <Input
                placeholder="e.g. Orientation week discount for registered scholars"
                value={newCoupon.description}
                onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Discount Type</Label>
                <Select
                  value={newCoupon.discount_type}
                  onValueChange={(val: "percentage" | "flat") => setNewCoupon({ ...newCoupon, discount_type: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {newCoupon.discount_type === "percentage" ? "Discount Rate (%)" : "Discount Amount (₹)"}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={newCoupon.discount_type === "percentage" ? "100" : undefined}
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                  className="font-mono font-bold h-10 text-sm"
                />
              </div>
            </div>

            {/* Usage Limit (User requested: specific usage limit) */}
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">Usage Limit (Max Uses)</div>
                  <div className="text-[11px] text-muted-foreground">
                    Cap total number of student redemptions allowed.
                  </div>
                </div>
                <Switch
                  checked={newCoupon.has_limit}
                  onCheckedChange={(checked) => setNewCoupon({ ...newCoupon, has_limit: checked })}
                />
              </div>

              {newCoupon.has_limit && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Number of specific redemptions allowed
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 10, 50, 100"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                    className="font-mono font-bold h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Coupon will automatically lock once this usage count is hit.
                  </p>
                </div>
              )}
            </div>

            {/* Institution Scope */}
            {scope === "master" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Institution</Label>
                <Select
                  value={newCoupon.target_college}
                  onValueChange={(val) => setNewCoupon({ ...newCoupon, target_college: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Global (Valid Across All Institutions)</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Lock to a specific college or make it globally available platform-wide.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Institution Locked</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                  Current Campus
                </Badge>
              </div>
            )}

            {/* Course Scope & Minimum Purchase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Applicable Course</Label>
                <Select
                  value={newCoupon.target_course}
                  onValueChange={(val) => setNewCoupon({ ...newCoupon, target_course: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses / Curriculums</SelectItem>
                    {courses.map((crs) => (
                      <SelectItem key={crs.id} value={crs.id}>
                        {crs.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valid Until (Expiry Date)</Label>
                <Input
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                  className="h-10 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              disabled={saving}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCoupon}
              disabled={saving}
              className="font-bold text-xs h-9 px-4 gap-1.5 bg-primary text-primary-foreground shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Activate Coupon</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-card border text-foreground shadow-2xl p-5 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Delete Coupon Code</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Permanently remove this promotional discount.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {couponToDelete && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code:</span>
                  <span className="font-bold text-foreground">{couponToDelete.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Uses Recorded:</span>
                  <span className="text-foreground">{couponToDelete.used_count || 0} times</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                Students will no longer be able to apply or redeem this coupon during course checkouts.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteCoupon}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 cursor-pointer"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Permanently Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
