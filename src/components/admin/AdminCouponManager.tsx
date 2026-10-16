import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Check,
  RefreshCw,
  Sparkles,
  Search,
} from "lucide-react";

export interface CouponItem {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_purchase: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  course_id: string | null;
  course_title?: string;
  created_by?: string;
  created_at: string;
}

const DEFAULT_COUPONS: CouponItem[] = [
  {
    id: "coupon_welcome100",
    code: "WELCOME100",
    description: "100% Full Scholarship Waiver - Free Student Enrollment",
    discount_type: "percentage",
    discount_value: 100,
    max_uses: 1000,
    used_count: 14,
    min_purchase: 0,
    valid_from: new Date().toISOString(),
    valid_until: null,
    is_active: true,
    course_id: null,
    created_by: "Administrator",
    created_at: new Date().toISOString(),
  },
  {
    id: "coupon_orbit50",
    code: "ORBIT50",
    description: "50% Early Bird Institutional Discount",
    discount_type: "percentage",
    discount_value: 50,
    max_uses: 500,
    used_count: 38,
    min_purchase: 0,
    valid_from: new Date().toISOString(),
    valid_until: null,
    is_active: true,
    course_id: null,
    created_by: "Administrator",
    created_at: new Date().toISOString(),
  },
  {
    id: "coupon_flat500",
    code: "FLAT500",
    description: "Flat ₹500 Discount on Premium Specializations",
    discount_type: "flat",
    discount_value: 500,
    max_uses: 200,
    used_count: 12,
    min_purchase: 999,
    valid_from: new Date().toISOString(),
    valid_until: null,
    is_active: true,
    course_id: null,
    created_by: "Administrator",
    created_at: new Date().toISOString(),
  },
];

interface AdminCouponManagerProps {
  courses: { id: string; title: string }[];
}

export function AdminCouponManager({ courses }: AdminCouponManagerProps) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    const saved = localStorage.getItem("orbit_coupons");
    return saved ? JSON.parse(saved) : DEFAULT_COUPONS;
  });

  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: 100,
    max_uses: "500",
    min_purchase: "0",
    valid_until: "",
    course_id: "all",
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("orbit_coupons", JSON.stringify(coupons));
  }, [coupons]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted: CouponItem[] = data.map((c: any) => {
          const matchedCourse = courses.find((crs) => crs.id === c.course_id);
          return {
            id: c.id,
            code: c.code,
            description: c.description || "",
            discount_type: c.discount_type || "percentage",
            discount_value: Number(c.discount_value) || 0,
            max_uses: c.max_uses,
            used_count: c.used_count || 0,
            min_purchase: Number(c.min_purchase) || 0,
            valid_from: c.valid_from,
            valid_until: c.valid_until,
            is_active: c.is_active !== false,
            course_id: c.course_id,
            course_title: matchedCourse ? matchedCourse.title : undefined,
            created_by: c.teacher_id ? "Faculty" : "Administrator",
            created_at: c.created_at,
          };
        });
        setCoupons(formatted);
      }
    } catch (err) {
      console.warn("Using local coupons storage:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "ORBIT";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewCoupon((prev) => ({ ...prev, code }));
  };

  const handleToggleActive = async (coupon: CouponItem) => {
    const nextStatus = !coupon.is_active;
    const updated = coupons.map((c) => (c.id === coupon.id ? { ...c, is_active: nextStatus } : c));
    setCoupons(updated);

    try {
      await supabase.from("coupons").update({ is_active: nextStatus }).eq("id", coupon.id);
    } catch (e) {
      console.warn("Supabase coupon toggle notice:", e);
    }

    if (nextStatus) {
      toast({
        title: "Coupon Enabled! 🎟️",
        description: `Code "${coupon.code}" is now active and ready for student enrollment.`,
      });
    } else {
      toast({
        title: "Coupon Disabled! ⏸️",
        description: `Code "${coupon.code}" is disabled. Students cannot redeem it until re-enabled.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) return;

    const updated = coupons.filter((c) => c.id !== couponId);
    setCoupons(updated);

    try {
      await supabase.from("coupons").delete().eq("id", couponId);
    } catch (e) {
      console.warn("Supabase coupon delete notice:", e);
    }

    toast({ title: "Coupon Deleted", description: `Removed code "${code}".` });
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      toast({ variant: "destructive", title: "Missing Code", description: "Please enter a coupon code." });
      return;
    }

    setSaving(true);
    const cleanCode = newCoupon.code.toUpperCase().trim();
    const courseId = newCoupon.course_id === "all" ? null : newCoupon.course_id;
    const matchedCourse = courses.find((c) => c.id === courseId);

    const newRecord: CouponItem = {
      id: `coupon_${Date.now()}`,
      code: cleanCode,
      description: newCoupon.description.trim() || `${newCoupon.discount_value}% Discount`,
      discount_type: newCoupon.discount_type,
      discount_value: Number(newCoupon.discount_value) || 10,
      max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
      used_count: 0,
      min_purchase: parseFloat(newCoupon.min_purchase) || 0,
      valid_from: new Date().toISOString(),
      valid_until: newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString() : null,
      is_active: true,
      course_id: courseId,
      course_title: matchedCourse ? matchedCourse.title : undefined,
      created_by: "Administrator",
      created_at: new Date().toISOString(),
    };

    const updatedList = [newRecord, ...coupons];
    setCoupons(updatedList);
    setCreateDialogOpen(false);
    setSaving(false);

    // Save to Supabase
    try {
      await supabase.from("coupons").upsert([
        {
          code: newRecord.code,
          description: newRecord.description,
          discount_type: newRecord.discount_type,
          discount_value: newRecord.discount_value,
          max_uses: newRecord.max_uses,
          min_purchase: newRecord.min_purchase,
          valid_until: newRecord.valid_until,
          is_active: newRecord.is_active,
          course_id: newRecord.course_id,
        },
      ]);
    } catch (err) {
      console.warn("Supabase coupon insert note:", err);
    }

    toast({
      title: "Coupon Created! 🎟️",
      description: `Coupon "${newRecord.code}" created and enabled!`,
    });

    setNewCoupon({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 100,
      max_uses: "500",
      min_purchase: "0",
      valid_until: "",
      course_id: "all",
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Code Copied! 📋", description: `Copied "${code}" to clipboard.` });
  };

  // Filtered coupons
  const filtered = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = coupons.filter((c) => c.is_active).length;
  const disabledCount = coupons.filter((c) => !c.is_active).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.used_count || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Active Coupons</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-display text-emerald-600">{activeCount}</span>
                <span className="text-xs text-muted-foreground">({disabledCount} disabled)</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Redemptions</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-display text-primary">{totalUses}</span>
                <span className="text-xs text-muted-foreground">student enrollments</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">100% Free Waivers</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-display text-purple-600">
                  {coupons.filter((c) => c.discount_type === "percentage" && c.discount_value === 100).length}
                </span>
                <span className="text-xs text-muted-foreground">full scholarship codes</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Percent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Institution Authority</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base font-bold text-foreground">Admin Full Control</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enable/Disable switches live</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Header & Filter */}
      <Card className="border border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coupons by code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCoupons}
              disabled={loading}
              className="text-xs border-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </Button>

            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="bg-primary text-primary-foreground font-semibold text-xs shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Coupon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card className="border border-border overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            Institutional Coupons Ledger & Enable/Disable Switches
          </CardTitle>
          <CardDescription className="text-xs">
            Admin can toggle the switch to activate or deactivate any coupon. Students can apply active coupons at checkout.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs pl-4">Coupon Code & Details</TableHead>
                <TableHead className="font-semibold text-xs text-center">Discount</TableHead>
                <TableHead className="font-semibold text-xs">Applicable Scope</TableHead>
                <TableHead className="font-semibold text-xs text-center">Redemptions</TableHead>
                <TableHead className="font-semibold text-xs text-center">Expiry</TableHead>
                <TableHead className="font-semibold text-xs text-center">Admin Status (Enable/Disable)</TableHead>
                <TableHead className="font-semibold text-xs text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    No coupons found. Click "Create Coupon" to launch your first promotional code.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((coupon) => {
                  const isFree = coupon.discount_type === "percentage" && coupon.discount_value === 100;
                  const expiryStr = coupon.valid_until
                    ? new Date(coupon.valid_until).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Lifetime Active";

                  return (
                    <TableRow key={coupon.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-xs font-mono font-bold tracking-wider">
                            {coupon.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyCode(coupon.code)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Copy Code"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {coupon.description}
                        </p>
                      </TableCell>

                      <TableCell className="text-center py-3">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-bold ${
                            isFree
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% OFF`
                            : `₹ ${coupon.discount_value} FLAT`}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3 text-xs">
                        <span className="font-medium text-foreground">
                          {coupon.course_title ? coupon.course_title : "All Institutional Courses"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          By: {coupon.created_by || "Administrator"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center py-3 font-mono text-xs">
                        <span className="font-semibold text-foreground">{coupon.used_count}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {" "}
                          / {coupon.max_uses ? `${coupon.max_uses}` : "∞"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center py-3 text-xs text-muted-foreground font-mono">
                        {expiryStr}
                      </TableCell>

                      {/* Admin Instant Enable / Disable Switch */}
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={() => handleToggleActive(coupon)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-400"
                          />
                          <Badge
                            variant={coupon.is_active ? "default" : "secondary"}
                            className={`text-[10px] font-bold ${
                              coupon.is_active
                                ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {coupon.is_active ? "ACTIVE" : "DISABLED"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Coupon Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateCoupon}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold font-display flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Create Institutional Coupon Code
              </DialogTitle>
              <DialogDescription className="text-xs">
                Design promotional coupon codes for student enrollments. Set discount to 100% for full scholarship waivers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Coupon Code *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateCode}
                    className="h-5 text-[11px] text-primary"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-Generate
                  </Button>
                </div>
                <Input
                  placeholder="e.g. WELCOME100, DIWALI50"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="font-mono text-sm uppercase tracking-wider font-bold"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs">Promo Description</Label>
                <Input
                  placeholder="e.g. 100% Full Scholarship Waiver for New Batch"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount Type</Label>
                  <Select
                    value={newCoupon.discount_type}
                    onValueChange={(val: any) => setNewCoupon({ ...newCoupon, discount_type: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (% OFF)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹ OFF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {newCoupon.discount_type === "percentage" ? "Discount Percentage (%)" : "Flat Amount (₹)"}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={newCoupon.discount_type === "percentage" ? 100 : 100000}
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                    className="font-mono font-bold"
                    required
                  />
                  {newCoupon.discount_type === "percentage" && newCoupon.discount_value === 100 && (
                    <p className="text-[10px] text-purple-600 font-semibold">
                      🎉 100% Full Waiver — Students enroll completely free without needing transaction ID!
                    </p>
                  )}
                </div>
              </div>

              {/* Applicable Course */}
              <div className="space-y-1.5">
                <Label className="text-xs">Applicable Course Scope</Label>
                <Select
                  value={newCoupon.course_id}
                  onValueChange={(val) => setNewCoupon({ ...newCoupon, course_id: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutional Courses</SelectItem>
                    {courses.map((crs) => (
                      <SelectItem key={crs.id} value={crs.id}>
                        {crs.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Uses & Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Redemptions</Label>
                  <Input
                    type="number"
                    placeholder="Leave blank for unlimited"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valid Until (Expiry)</Label>
                  <Input
                    type="date"
                    value={newCoupon.valid_until}
                    onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-semibold">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Activate Coupon
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
