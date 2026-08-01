import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
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
    Tag
} from "lucide-react";

interface Coupon {
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
    teacher_id: string;
    created_at: string;
}

interface CouponManagerProps {
    teacherId: string;
    courses: { id: string; title: string }[];
}

export default function CouponManager({ teacherId, courses }: CouponManagerProps) {
    const { toast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const [newCoupon, setNewCoupon] = useState({
        code: "",
        description: "",
        discount_type: "percentage" as "percentage" | "flat",
        discount_value: 10,
        max_uses: "",
        min_purchase: "0",
        valid_until: "",
        course_id: "all",
    });

    // Check if admin has enabled coupons for this teacher
    const [couponPermission, setCouponPermission] = useState(false);

    useEffect(() => {
        checkCouponPermission();
        fetchCoupons();
    }, [teacherId]);

    const checkCouponPermission = () => {
        try {
            const saved = localStorage.getItem("orbit_coupon_settings");
            if (saved) {
                const settings = JSON.parse(saved);
                if (!settings.enabled) {
                    setCouponPermission(false);
                    return;
                }
                if (settings.mode === "all") {
                    setCouponPermission(true);
                } else if (settings.mode === "selected") {
                    const allowedTeachers: string[] = settings.selectedTeachers || [];
                    setCouponPermission(allowedTeachers.includes(teacherId));
                } else {
                    setCouponPermission(false);
                }
            } else {
                setCouponPermission(false);
            }
        } catch {
            setCouponPermission(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("coupons")
                .select("*")
                .eq("teacher_id", teacherId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (err: any) {
            console.error("Error fetching coupons:", err);
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

    const handleCreateCoupon = async () => {
        if (!newCoupon.code.trim()) {
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

        // Check admin max discount cap
        try {
            const saved = localStorage.getItem("orbit_coupon_settings");
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.maxDiscountPercent && newCoupon.discount_type === "percentage") {
                    if (newCoupon.discount_value > settings.maxDiscountPercent) {
                        toast({
                            variant: "destructive",
                            title: "Discount Cap Exceeded",
                            description: `Admin has set a maximum discount cap of ${settings.maxDiscountPercent}%. Please reduce your discount value.`,
                        });
                        return;
                    }
                }
            }
        } catch {}

        try {
            setSaving(true);
            const payload: any = {
                code: newCoupon.code.toUpperCase().trim(),
                description: newCoupon.description || null,
                discount_type: newCoupon.discount_type,
                discount_value: newCoupon.discount_value,
                max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
                min_purchase: parseFloat(newCoupon.min_purchase) || 0,
                valid_from: new Date().toISOString(),
                valid_until: newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString() : null,
                is_active: true,
                teacher_id: teacherId,
                course_id: newCoupon.course_id === "all" ? null : newCoupon.course_id,
            };

            const { error } = await supabase.from("coupons").insert([payload]);
            if (error) throw error;

            toast({ title: "Coupon Created! 🎟️", description: `Code "${payload.code}" is now active.` });
            setCreateDialogOpen(false);
            setNewCoupon({
                code: "",
                description: "",
                discount_type: "percentage",
                discount_value: 10,
                max_uses: "",
                min_purchase: "0",
                valid_until: "",
                course_id: "all",
            });
            fetchCoupons();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleCoupon = async (couponId: string, isActive: boolean) => {
        try {
            const { error } = await supabase
                .from("coupons")
                .update({ is_active: !isActive, updated_at: new Date().toISOString() })
                .eq("id", couponId);
            if (error) throw error;
            toast({ title: isActive ? "Coupon Deactivated" : "Coupon Activated" });
            fetchCoupons();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleDeleteCoupon = async (couponId: string, code: string) => {
        if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) return;
        try {
            const { error } = await supabase.from("coupons").delete().eq("id", couponId);
            if (error) throw error;
            toast({ title: "Coupon Deleted", description: `"${code}" has been removed.` });
            fetchCoupons();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast({ title: "Copied!", description: `Coupon code "${code}" copied to clipboard.` });
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (!couponPermission) {
        return (
            <Card className="border-dashed border-2 border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="h-12 w-12 text-amber-500/40 mb-3" />
                    <h3 className="font-bold text-lg text-foreground">Coupons Not Enabled</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        The coupon system has not been enabled for your account by the administrator.
                        Contact your admin to enable coupon management permissions.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const activeCoupons = coupons.filter((c) => c.is_active);
    const totalUses = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border bg-card flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{coupons.length}</p>
                        <p className="text-xs text-muted-foreground">Total Coupons</p>
                    </div>
                </div>
                <div className="p-4 rounded-xl border bg-card flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{activeCoupons.length}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                </div>
                <div className="p-4 rounded-xl border bg-card flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{totalUses}</p>
                        <p className="text-xs text-muted-foreground">Total Uses</p>
                    </div>
                </div>
                <div className="p-4 rounded-xl border bg-card flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{coupons.length - activeCoupons.length}</p>
                        <p className="text-xs text-muted-foreground">Inactive</p>
                    </div>
                </div>
            </div>

            {/* Header + Create Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-display font-bold">Coupon Codes</h2>
                    <p className="text-sm text-muted-foreground">Create and manage discount codes for your courses.</p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Create Coupon
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-primary" /> Create New Coupon
                            </DialogTitle>
                            <DialogDescription>
                                Generate a discount coupon code for your students.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Coupon Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newCoupon.code}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. ORBIT20"
                                        className="font-mono uppercase"
                                    />
                                    <Button type="button" variant="outline" onClick={generateCode} className="shrink-0">
                                        Auto-Generate
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input
                                    value={newCoupon.description}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                                    placeholder="e.g. Early bird discount for Summer 2026"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewCoupon({ ...newCoupon, discount_type: "percentage" })}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                                newCoupon.discount_type === "percentage"
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-card border-border hover:border-primary/50"
                                            }`}
                                        >
                                            <Percent className="h-3.5 w-3.5" /> Percentage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCoupon({ ...newCoupon, discount_type: "flat" })}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                                newCoupon.discount_type === "flat"
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-card border-border hover:border-primary/50"
                                            }`}
                                        >
                                            <IndianRupee className="h-3.5 w-3.5" /> Flat ₹
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Discount Value</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={newCoupon.discount_value}
                                            onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                                            className="pr-8"
                                            min="0"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                                            {newCoupon.discount_type === "percentage" ? "%" : "₹"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Max Uses <span className="text-muted-foreground text-xs">(empty = unlimited)</span></Label>
                                    <Input
                                        type="number"
                                        value={newCoupon.max_uses}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                                        placeholder="Unlimited"
                                        min="1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min Purchase (₹)</Label>
                                    <Input
                                        type="number"
                                        value={newCoupon.min_purchase}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, min_purchase: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input
                                    type="datetime-local"
                                    value={newCoupon.valid_until}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Apply To</Label>
                                <select
                                    value={newCoupon.course_id}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, course_id: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                                >
                                    <option value="all">🎓 All My Courses</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            📘 {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCoupon} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                                {saving ? "Creating..." : "Create Coupon"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Coupons List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : coupons.length > 0 ? (
                <div className="space-y-3">
                    {coupons.map((coupon) => {
                        const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                        const isMaxedOut = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
                        const courseTitle = courses.find((c) => c.id === coupon.course_id)?.title;

                        return (
                            <div
                                key={coupon.id}
                                className={`p-4 rounded-xl border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                                    !coupon.is_active || isExpired || isMaxedOut ? "opacity-60" : ""
                                }`}
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        coupon.discount_type === "percentage"
                                            ? "bg-blue-500/10 text-blue-500"
                                            : "bg-emerald-500/10 text-emerald-500"
                                    }`}>
                                        {coupon.discount_type === "percentage" ? (
                                            <Percent className="h-6 w-6" />
                                        ) : (
                                            <IndianRupee className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => handleCopyCode(coupon.code)}
                                                className="font-mono font-bold text-base text-foreground bg-muted px-2.5 py-0.5 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-1.5"
                                            >
                                                {coupon.code}
                                                {copiedCode === coupon.code ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                                )}
                                            </button>
                                            <Badge className={`text-[10px] font-bold ${
                                                coupon.discount_type === "percentage"
                                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                            }`}>
                                                {coupon.discount_type === "percentage"
                                                    ? `${coupon.discount_value}% OFF`
                                                    : `₹${coupon.discount_value} OFF`}
                                            </Badge>
                                            {!coupon.is_active && (
                                                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                            )}
                                            {isExpired && (
                                                <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">Expired</Badge>
                                            )}
                                            {isMaxedOut && (
                                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Max Used</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                            {coupon.description && <span>{coupon.description}</span>}
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ""} uses
                                            </span>
                                            {coupon.valid_until && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Expires {new Date(coupon.valid_until).toLocaleDateString()}
                                                </span>
                                            )}
                                            {courseTitle && (
                                                <span className="flex items-center gap-1">
                                                    <Tag className="h-3 w-3" />
                                                    {courseTitle}
                                                </span>
                                            )}
                                            {!coupon.course_id && (
                                                <span className="text-primary font-medium">All Courses</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={coupon.is_active}
                                            onCheckedChange={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                                        />
                                        <span className="text-xs text-muted-foreground font-medium w-10">
                                            {coupon.is_active ? "ON" : "OFF"}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-card">
                    <Ticket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="text-lg font-bold">No Coupons Created Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                        Create your first discount coupon to offer special pricing to your students.
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Create Your First Coupon
                    </Button>
                </div>
            )}
        </div>
    );
}
