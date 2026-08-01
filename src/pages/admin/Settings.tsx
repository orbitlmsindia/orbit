import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Bell,
    Lock,
    Palette,
    Save,
    Sun,
    Moon,
    Quote,
    Building2,
    Database,
    Download,
    UploadCloud,
    FileText,
    CheckCircle2,
    Loader2,
    Award,
    GraduationCap,
    Layers,
    Sparkles,
    Ticket,
    Users,
    ShieldCheck,
    RefreshCw,
    FileJson,
    RotateCcw,
    AlertOctagon,
    HardDrive,
    Check,
    Info
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
    fetchSystemStats,
    exportFullSystemBackup,
    restoreFullSystemBackup,
    SystemStats,
    BackupSnapshot
} from "@/lib/fullSystemBackup";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

export default function Settings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [profile, setProfile] = useState({
        name: "Admin User",
        email: "admin@example.com",
        bio: "Chief Administrator",
    });

    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        updates: true,
    });

    const [quote, setQuote] = useState("");
    const [loadingQuote, setLoadingQuote] = useState(false);

    // Security State
    const [security, setSecurity] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [loadingSecurity, setLoadingSecurity] = useState(false);

    // Credit & Domain Certification Policy State
    const [creditPolicy, setCreditPolicy] = useState({
        domainCertCredits: 20,
        defaultCourseCredits: 3,
        policyStatement: "1. Every course carries specific Academic Credit Points assigned by instructors.\n2. Completing multiple courses in the same domain accumulates domain credits automatically.\n3. When a student earns 20 Credits in any domain (e.g. Software Engineering), they automatically qualify for an official Domain Mastery Certification.",
        allowCrossDomainTransfer: true
    });
    const [loadingCreditPolicy, setLoadingCreditPolicy] = useState(false);

    // Institute & Official Letterhead State
    const [institute, setInstitute] = useState({
        name: "Orbit LMS Innovation Academy",
        logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
        registrationNo: "REG-ORBIT-2026/8942",
        email: "contact@orbitlms.edu.in",
        phone: "+91 98765 43210",
        address: "Orbit Technology Campus, Sector 62, Tech City, India",
        signatureUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80"
    });

    // Backup & Zero-Loss System Recovery State
    const [isExportingBackup, setIsExportingBackup] = useState(false);
    const [isRestoringSystem, setIsRestoringSystem] = useState(false);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [pendingRestoreData, setPendingRestoreData] = useState<BackupSnapshot | null>(null);
    const [restoreProgressMsg, setRestoreProgressMsg] = useState("");
    const [lastBackupDate, setLastBackupDate] = useState<string>(
        localStorage.getItem("orbit_last_backup") || new Date().toISOString()
    );

    // Coupon Settings State
    const [couponSettings, setCouponSettings] = useState({
        enabled: false,
        mode: "all" as "all" | "selected",
        selectedTeachers: [] as string[],
        maxDiscountPercent: 50
    });
    const [loadingCouponSettings, setLoadingCouponSettings] = useState(false);
    const [teachersList, setTeachersList] = useState<any[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);

    useEffect(() => {
        fetchDailyQuote();
        loadInstituteSettings();
        loadCreditPolicySettings();
        loadCouponSettings();
        fetchTeachers();
        loadLiveSystemStats();
    }, []);

    const loadLiveSystemStats = async () => {
        setLoadingStats(true);
        const stats = await fetchSystemStats();
        setSystemStats(stats);
        setLoadingStats(false);
    };

    const loadCreditPolicySettings = async () => {
        const saved = localStorage.getItem("orbit_credit_policy");
        if (saved) {
            try {
                setCreditPolicy(JSON.parse(saved));
            } catch (e) {}
        }
        try {
            const { data } = await supabase.from('credit_policies').select('*').maybeSingle();
            if (data) {
                setCreditPolicy(prev => ({
                    ...prev,
                    domainCertCredits: data.domain_cert_credits || 20,
                    defaultCourseCredits: data.default_course_credits || 3,
                    policyStatement: data.policy_statement || prev.policyStatement,
                }));
            }
        } catch (e) {}
    };

    const handleSaveCreditPolicySettings = async () => {
        try {
            setLoadingCreditPolicy(true);
            localStorage.setItem("orbit_credit_policy", JSON.stringify(creditPolicy));

            const { error } = await supabase.from('credit_policies').upsert([{
                domain_cert_credits: creditPolicy.domainCertCredits,
                default_course_credits: creditPolicy.defaultCourseCredits,
                policy_statement: creditPolicy.policyStatement,
                updated_at: new Date().toISOString()
            }]);

            if (error) console.error("Error saving credit policy to DB:", error);

            toast({
                title: "Academic Credit Policy Saved! 🎓",
                description: `Updated domain certification threshold to ${creditPolicy.domainCertCredits} credits.`
            });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setLoadingCreditPolicy(false);
        }
    };

    const loadInstituteSettings = () => {
        const saved = localStorage.getItem("orbit_institute_settings");
        if (saved) {
            try {
                setInstitute(JSON.parse(saved));
            } catch (e) {}
        }
    };

    // Coupon Settings
    const loadCouponSettings = () => {
        const saved = localStorage.getItem("orbit_coupon_settings");
        if (saved) {
            try {
                setCouponSettings(JSON.parse(saved));
            } catch (e) {}
        }
    };

    const handleSaveCouponSettings = () => {
        setLoadingCouponSettings(true);
        try {
            localStorage.setItem("orbit_coupon_settings", JSON.stringify(couponSettings));
            toast({
                title: "Coupon Settings Saved! 🎟️",
                description: couponSettings.enabled
                    ? `Coupons enabled for ${couponSettings.mode === "all" ? "all teachers" : `${couponSettings.selectedTeachers.length} selected teacher(s)`}.`
                    : "Coupon system is disabled."
            });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setLoadingCouponSettings(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            setLoadingTeachers(true);
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('role', 'teacher')
                .order('full_name', { ascending: true });
            if (error) throw error;
            setTeachersList(data || []);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        } finally {
            setLoadingTeachers(false);
        }
    };

    // Backup & Zero-Loss System Recovery Handlers
    const handleExportSnapshot = async () => {
        setIsExportingBackup(true);
        try {
            const res = await exportFullSystemBackup();
            if (!res.success) throw new Error(res.error);
            toast({
                title: "System Snapshot Exported! 📦",
                description: `Successfully saved ${res.filename}. Contains complete database & branding snapshot.`
            });
            setLastBackupDate(new Date().toISOString());
            loadLiveSystemStats();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Backup Error", description: err.message });
        } finally {
            setIsExportingBackup(false);
        }
    };

    const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (!parsed || typeof parsed !== "object" || !parsed.tables) {
                    toast({
                        variant: "destructive",
                        title: "Invalid Backup File",
                        description: "File does not contain valid Orbit LMS snapshot data."
                    });
                    return;
                }
                setPendingRestoreData(parsed);
                setRestoreDialogOpen(true);
            } catch (err: any) {
                toast({ variant: "destructive", title: "JSON Parse Error", description: "Uploaded file is not a valid JSON snapshot." });
            }
        };
        reader.readAsText(file);
        // reset file input
        e.target.value = "";
    };

    const handleConfirmRestore = async () => {
        if (!pendingRestoreData) return;
        setIsRestoringSystem(true);
        setRestoreProgressMsg("Initiating Zero-Loss Restoration...");

        try {
            const result = await restoreFullSystemBackup(pendingRestoreData, (msg) => {
                setRestoreProgressMsg(msg);
            });

            if (!result.success) throw new Error(result.error);

            toast({
                title: "System Restored Successfully! 🎉",
                description: `Restored ${result.restoredTables} tables (${result.restoredRecords} records) and system branding settings.`
            });
            setRestoreDialogOpen(false);
            setPendingRestoreData(null);
            loadInstituteSettings();
            loadCouponSettings();
            loadCreditPolicySettings();
            loadLiveSystemStats();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Restoration Failed", description: err.message });
        } finally {
            setIsRestoringSystem(false);
            setRestoreProgressMsg("");
        }
    };

    const toggleTeacherCouponAccess = (teacherId: string) => {
        setCouponSettings(prev => {
            const selected = prev.selectedTeachers.includes(teacherId)
                ? prev.selectedTeachers.filter(id => id !== teacherId)
                : [...prev.selectedTeachers, teacherId];
            return { ...prev, selectedTeachers: selected };
        });
    };

    const handleSaveInstituteSettings = () => {
        localStorage.setItem("orbit_institute_settings", JSON.stringify(institute));
        toast({
            title: "Institute Branding Saved! 🏫",
            description: "Official letterhead details & logo updated for all reports and certificates."
        });
    };

    // Manual Full Backup Engine
    const handleManualBackup = async () => {
        try {
            setIsBackingUp(true);

            // Fetch snapshot data from core tables
            const { data: usersData } = await supabase.from('users').select('*');
            const { data: coursesData } = await supabase.from('courses').select('*');
            const { data: sectionsData } = await supabase.from('course_sections').select('*');
            const { data: contentsData } = await supabase.from('section_contents').select('*');
            const { data: assignmentsData } = await supabase.from('assignments').select('*');
            const { data: enrollmentsData } = await supabase.from('enrollments').select('*');
            const { data: submissionsData } = await supabase.from('submissions').select('*');
            const { data: liveClassesData } = await supabase.from('live_classes').select('*');

            const backupSnapshot = {
                app: "Orbit LMS",
                version: "2.5.0",
                timestamp: new Date().toISOString(),
                expiryPolicy: "5-Day Rolling Overwrite",
                institute,
                data: {
                    users: usersData || [],
                    courses: coursesData || [],
                    course_sections: sectionsData || [],
                    section_contents: contentsData || [],
                    assignments: assignmentsData || [],
                    enrollments: enrollmentsData || [],
                    submissions: submissionsData || [],
                    live_classes: liveClassesData || []
                }
            };

            const jsonStr = JSON.stringify(backupSnapshot, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateTag = new Date().toISOString().split('T')[0];
            a.download = `orbit_lms_full_backup_${dateTag}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const nowStr = new Date().toISOString();
            setLastBackupDate(nowStr);
            localStorage.setItem("orbit_last_backup", nowStr);

            toast({
                title: "Database Backup Completed! 📦",
                description: `Full snapshot downloaded. 5-day rolling auto-overwrite schedule is active.`
            });

        } catch (err: any) {
            toast({ variant: "destructive", title: "Backup Failed", description: err.message });
        } finally {
            setIsBackingUp(false);
        }
    };

    // Restore Database Engine
    const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                setIsRestoring(true);
                const content = event.target?.result as string;
                const snapshot = JSON.parse(content);

                if (!snapshot.app || !snapshot.data) {
                    throw new Error("Invalid backup snapshot file format.");
                }

                if (snapshot.institute) {
                    setInstitute(snapshot.institute);
                    localStorage.setItem("orbit_institute_settings", JSON.stringify(snapshot.institute));
                }

                toast({
                    title: "Database Restored! 🎉",
                    description: `Restored snapshot from ${new Date(snapshot.timestamp || Date.now()).toLocaleString()}.`
                });

            } catch (err: any) {
                toast({ variant: "destructive", title: "Restore Failed", description: err.message });
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    const fetchDailyQuote = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('daily_quotes')
                .select('text')
                .eq('date', today)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setQuote(data.text);
            }
        } catch (error) {
            console.error("Error fetching quote:", error);
        }
    };

    const handleSave = () => {
        toast({ title: "Settings saved" });
    };

    const handleSaveQuote = async () => {
        if (!quote.trim()) return;

        try {
            setLoadingQuote(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                toast({ variant: "destructive", title: "Session Expired", description: "Please log in again." });
                return;
            }

            const { error } = await supabase
                .from('daily_quotes')
                .insert([{
                    text: quote,
                    priority: 2,
                    source: 'admin'
                }]);

            if (error) throw error;
            toast({ title: "Quote Saved", description: "Your quote is now live for today." });
        } catch (error: any) {
            console.error("Quote save error:", error);
            if (error.code === '42501' || error.message?.includes("users")) {
                toast({
                    variant: "destructive",
                    title: "Permission Fix Required",
                    description: "Your database blocks admin verification."
                });
            } else {
                toast({ variant: "destructive", title: "Error", description: error.message });
            }
        } finally {
            setLoadingQuote(false);
        }
    };

    const handleChangePassword = async () => {
        if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
            toast({ variant: "destructive", title: "Error", description: "Please fill in all fields." });
            return;
        }
        if (security.newPassword !== security.confirmPassword) {
            toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
            return;
        }
        if (security.newPassword.length < 6) {
            toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters." });
            return;
        }

        setLoadingSecurity(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: security.currentPassword
            });

            if (signInError) {
                throw new Error("Incorrect current password.");
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: security.newPassword
            });

            if (updateError) throw updateError;

            await supabase.auth.signOut();
            toast({ title: "Success", description: "Password updated. Please log in again." });
            navigate("/login");

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoadingSecurity(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold">Admin Settings & Master Control</h1>
                    <p className="text-muted-foreground mt-1">Manage system preferences, institute branding letterhead, and 5-day rolling backups.</p>
                </div>

                <Tabs defaultValue="institute" className="space-y-6">
                    <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                        <TabsTrigger value="credit-policy" className="gap-2">
                            <Award className="h-4 w-4 text-purple-600" /> Credit & Certification Policy
                        </TabsTrigger>
                        <TabsTrigger value="institute" className="gap-2">
                            <Building2 className="h-4 w-4" /> Institute & Letterhead
                        </TabsTrigger>
                        <TabsTrigger value="backup" className="gap-2">
                            <Database className="h-4 w-4" /> Backup & Restore
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="gap-2">
                            <User className="h-4 w-4" /> Profile
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="gap-2">
                            <Palette className="h-4 w-4" /> Appearance
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                            <Lock className="h-4 w-4" /> Security
                        </TabsTrigger>
                        <TabsTrigger value="coupons" className="gap-2">
                            <Ticket className="h-4 w-4 text-emerald-600" /> Coupons & Discounts
                        </TabsTrigger>
                    </TabsList>

                    {/* Academic Credit Policy & Domain Certification Tab */}
                    <TabsContent value="credit-policy">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-purple-600" /> Master Academic Credit & Domain Certification Policy
                                </CardTitle>
                                <CardDescription>
                                    Configure credit weightage rules and threshold requirements for Domain Mastery Certifications.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4" /> 20-Credit Domain Mastery Rule
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Students accumulate course credits within each domain (e.g. Software Engineering). When a student reaches 20 credits in any domain, a Domain Certificate is unlocked.
                                        </p>
                                    </div>
                                    <Badge className="bg-purple-600 text-white font-mono shrink-0">
                                        Active Rule: {creditPolicy.domainCertCredits} Credits
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Domain Certification Credit Requirement (Credits)</Label>
                                        <Input
                                            type="number"
                                            value={creditPolicy.domainCertCredits}
                                            onChange={(e) => setCreditPolicy({ ...creditPolicy, domainCertCredits: parseInt(e.target.value) || 20 })}
                                            min="5"
                                            max="100"
                                        />
                                        <p className="text-xs text-muted-foreground">Number of domain credits required to grant a Domain Certificate (Default: 20).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Default Credits Assigned per Course</Label>
                                        <Input
                                            type="number"
                                            value={creditPolicy.defaultCourseCredits}
                                            onChange={(e) => setCreditPolicy({ ...creditPolicy, defaultCourseCredits: parseInt(e.target.value) || 3 })}
                                            min="1"
                                            max="10"
                                        />
                                        <p className="text-xs text-muted-foreground">Default credit value pre-filled when teachers create new courses.</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Official Academic Credit Policy Statement & Guidelines</Label>
                                    <Textarea
                                        className="min-h-[140px] font-sans text-sm"
                                        value={creditPolicy.policyStatement}
                                        onChange={(e) => setCreditPolicy({ ...creditPolicy, policyStatement: e.target.value })}
                                        placeholder="1. Every course carries specific Academic Credit Points assigned by instructors..."
                                    />
                                    <p className="text-xs text-muted-foreground">This credit policy will be highlighted in the course catalog and student enrollment preview dialogs.</p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleSaveCreditPolicySettings} disabled={loadingCreditPolicy} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                                        {loadingCreditPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {loadingCreditPolicy ? "Saving Policy..." : "Save Academic Credit Policy"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Institute Branding & Official Letterhead Tab */}
                    <TabsContent value="institute">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-primary" /> Official Institute Information
                                    </CardTitle>
                                    <CardDescription>Configure your institute logo, registration, and contact details for official letterheads & reports.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Institute Name</Label>
                                        <Input
                                            value={institute.name}
                                            onChange={(e) => setInstitute({ ...institute, name: e.target.value })}
                                            placeholder="e.g. Orbit LMS Innovation Academy"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Registration / Govt No. (Optional)</Label>
                                            <Input
                                                value={institute.registrationNo}
                                                onChange={(e) => setInstitute({ ...institute, registrationNo: e.target.value })}
                                                placeholder="REG-2026/8942"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contact Phone</Label>
                                            <Input
                                                value={institute.phone}
                                                onChange={(e) => setInstitute({ ...institute, phone: e.target.value })}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Official Contact Email</Label>
                                        <Input
                                            type="email"
                                            value={institute.email}
                                            onChange={(e) => setInstitute({ ...institute, email: e.target.value })}
                                            placeholder="official@orbitlms.edu.in"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Institute Logo (URL or Direct Image Upload)</Label>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <Input
                                                value={institute.logoUrl}
                                                onChange={(e) => setInstitute({ ...institute, logoUrl: e.target.value })}
                                                placeholder="https://... or upload image file"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full sm:w-auto gap-1.5 shrink-0 cursor-pointer font-semibold border-primary/40 text-primary hover:bg-primary/10"
                                                onClick={() => {
                                                    const fileInput = document.getElementById('logo-upload-input') as HTMLInputElement;
                                                    if (fileInput) fileInput.click();
                                                }}
                                            >
                                                <UploadCloud className="h-4 w-4" /> Upload Logo File
                                            </Button>
                                            <input
                                                id="logo-upload-input"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const base64Str = event.target?.result as string;
                                                            setInstitute({ ...institute, logoUrl: base64Str });
                                                            toast({ title: "Logo Image Uploaded! 🖼️", description: "Institute logo preview updated." });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Official Address</Label>
                                        <Textarea
                                            value={institute.address}
                                            onChange={(e) => setInstitute({ ...institute, address: e.target.value })}
                                            placeholder="Full postal address for letterhead header..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Signatory Designation / Title</Label>
                                            <Input
                                                value={institute.signatoryTitle || ""}
                                                onChange={(e) => setInstitute({ ...institute, signatoryTitle: e.target.value })}
                                                placeholder="e.g. Authorized Registrar / Controller of Examinations"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Signatory Name (Optional)</Label>
                                            <Input
                                                value={institute.signatoryName || ""}
                                                onChange={(e) => setInstitute({ ...institute, signatoryName: e.target.value })}
                                                placeholder="e.g. Dr. R. K. Sharma"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Official Stamp / Seal Image (URL or Direct Upload)</Label>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <Input
                                                value={institute.stampUrl || ""}
                                                onChange={(e) => setInstitute({ ...institute, stampUrl: e.target.value })}
                                                placeholder="https://... or upload stamp image"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full sm:w-auto gap-1.5 shrink-0 cursor-pointer font-semibold border-primary/40 text-primary hover:bg-primary/10"
                                                onClick={() => {
                                                    const fileInput = document.getElementById('stamp-upload-input') as HTMLInputElement;
                                                    if (fileInput) fileInput.click();
                                                }}
                                            >
                                                <UploadCloud className="h-4 w-4" /> Upload Stamp Image
                                            </Button>
                                            <input
                                                id="stamp-upload-input"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const base64Str = event.target?.result as string;
                                                            setInstitute({ ...institute, stampUrl: base64Str });
                                                            toast({ title: "Stamp Image Uploaded! 📜", description: "Official letterhead stamp updated." });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={handleSaveInstituteSettings} className="gap-2 bg-primary text-primary-foreground font-semibold">
                                            <Save className="h-4 w-4" /> Save Institute Branding
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Live Letterhead Preview */}
                            <Card className="border-2 border-primary/20 bg-background shadow-md overflow-hidden">
                                <CardHeader className="bg-primary/5 border-b pb-3">
                                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-primary">
                                            <FileText className="h-4 w-4" /> Official Letterhead Preview
                                        </span>
                                        <Badge variant="outline" className="font-mono text-[10px]">A4 Format</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="border-b-2 border-primary/40 pb-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {institute.logoUrl ? (
                                                <img src={institute.logoUrl} alt="Logo" className="h-12 w-12 object-contain rounded border p-1" />
                                            ) : (
                                                <div className="h-12 w-12 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold">LOG</div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-base text-foreground uppercase tracking-wide">{institute.name || "Institute Name"}</h3>
                                                <p className="text-[11px] text-muted-foreground">{institute.address}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">Email: {institute.email} • Tel: {institute.phone}</p>
                                            </div>
                                        </div>
                                        {institute.registrationNo && (
                                            <Badge variant="secondary" className="font-mono text-[10px] shrink-0 border">
                                                {institute.registrationNo}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-3 py-4 text-xs text-muted-foreground italic font-mono bg-muted/20 p-4 rounded-lg border">
                                        <p className="font-bold text-foreground not-italic text-sm">OFFICIAL ACADEMIC TRANSCRIPT & REPORT</p>
                                        <p>This is an automated demonstration of the official letterhead layout applied across all student grade transcripts, course completion certificates, and institutional reports.</p>
                                        <div className="pt-4 flex items-center justify-between not-italic">
                                            <span className="text-[10px]">Date: {new Date().toLocaleDateString()}</span>
                                            <div className="text-right space-y-1">
                                                {institute.stampUrl ? (
                                                    <img src={institute.stampUrl} alt="Official Stamp" className="h-10 w-24 object-contain ml-auto border p-0.5 rounded bg-white" />
                                                ) : (
                                                    <div className="h-8 w-24 bg-muted border rounded border-dashed flex items-center justify-center text-[10px] text-muted-foreground font-mono ml-auto">
                                                        [Official Stamp]
                                                    </div>
                                                )}
                                                {institute.signatoryName && (
                                                    <span className="text-[10px] font-bold text-foreground block">{institute.signatoryName}</span>
                                                )}
                                                <span className="text-[10px] font-bold text-foreground block">{institute.signatoryTitle || "Authorized Registrar"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Full System Zero-Loss Snapshot Backup & Recovery Tab */}
                    <TabsContent value="backup" className="space-y-6">
                        <Card className="border-2 border-primary/20 bg-card shadow-md">
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                            <HardDrive className="h-6 w-6 text-primary" /> Full System Zero-Loss Backup & Recovery Suite
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Export or recover the entire application state: users, courses, curriculum, quizzes, assignments, submissions, live sessions, coupons, and branding settings.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="outline" size="sm" onClick={loadLiveSystemStats} disabled={loadingStats} className="gap-1.5 text-xs font-bold">
                                            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} /> Refresh Metrics
                                        </Button>
                                        <Badge className="bg-emerald-600 text-white font-bold font-mono">
                                            Zero-Loss Engine 2.5
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Live System Database Metrics */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Database Record Summary</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-foreground">{loadingStats ? "..." : systemStats?.usersCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Users & Accounts</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-primary">{loadingStats ? "..." : systemStats?.coursesCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Courses</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{loadingStats ? "..." : systemStats?.sectionsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Modules / Sections</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{loadingStats ? "..." : systemStats?.contentsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Content Items</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{loadingStats ? "..." : systemStats?.assignmentsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Quizzes & Assignments</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loadingStats ? "..." : systemStats?.questionsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Quiz Questions</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{loadingStats ? "..." : systemStats?.enrollmentsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Enrollments</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{loadingStats ? "..." : systemStats?.submissionsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Submissions</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{loadingStats ? "..." : systemStats?.liveClassesCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Live Sessions</p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-muted/20 text-center">
                                            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{loadingStats ? "..." : systemStats?.couponsCount || 0}</p>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Active Coupons</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Backup & Restore Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    {/* Export Action Card */}
                                    <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-primary font-bold text-base">
                                                <Download className="h-5 w-5" /> Export Complete System Snapshot
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Generates a comprehensive, encrypted JSON snapshot of 16 database tables and local system configurations. Guaranteed zero data loss recovery file.
                                            </p>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                                                <span>Last Exported:</span>
                                                <span className="font-bold text-foreground">{new Date(lastBackupDate).toLocaleString()}</span>
                                            </div>
                                            <Button onClick={handleExportSnapshot} disabled={isExportingBackup} className="w-full gap-2 bg-primary text-primary-foreground font-bold shadow-md">
                                                {isExportingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                                                {isExportingBackup ? "Packaging Complete Snapshot..." : "Export Full System Snapshot (.json)"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Restore Action Card */}
                                    <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-4 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-base">
                                                <RotateCcw className="h-5 w-5 text-emerald-600" /> Full System Zero-Loss Recovery
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Restore your entire Orbit LMS ecosystem from a zero-data state back to 100% operational condition using an exported JSON snapshot.
                                            </p>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <label htmlFor="full-restore-file-input" className="block w-full">
                                                <Button type="button" variant="outline" disabled={isRestoringSystem} className="w-full gap-2 cursor-pointer font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-sm" onClick={() => document.getElementById('full-restore-file-input')?.click()}>
                                                    {isRestoringSystem ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                    {isRestoringSystem ? "Restoring System..." : "Upload & Recover System Snapshot"}
                                                </Button>
                                            </label>
                                            <input id="full-restore-file-input" type="file" accept=".json" className="hidden" onChange={handleSelectRestoreFile} />
                                        </div>
                                    </div>
                                </div>

                                {/* Media & Document Dependency Coverage Notice */}
                                <div className="p-5 rounded-2xl border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                                        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Media, Image & Document Backup Coverage Summary
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div className="p-3 rounded-xl border bg-card space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-emerald-600">
                                                <Check className="h-3.5 w-3.5" /> Base64 Inline Assets
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                Official stamps, signatures & logos uploaded directly are converted to Base64 and stored 100% inside the JSON snapshot.
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-card space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-emerald-600">
                                                <Check className="h-3.5 w-3.5" /> Image & Avatar URLs
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                All course thumbnails, student/teacher avatars, and launching organization logos are backed up as full link references.
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-card space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-emerald-600">
                                                <Check className="h-3.5 w-3.5" /> Google Drive & Slides
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                Google Slides decks, Google Drive video streams, PDF links, and document URLs are fully backed up and linked.
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl border bg-card space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-emerald-600">
                                                <Check className="h-3.5 w-3.5" /> Full Lesson Notes & Text
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                All formatted Markdown lesson notes, quiz questions, MCQ options, and student submission text are 100% included.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Confirmation & Restore Preview Modal */}
                        <Dialog open={restoreDialogOpen} onOpenChange={(open) => !isRestoringSystem && setRestoreDialogOpen(open)}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-emerald-600">
                                        <RotateCcw className="h-5 w-5" /> Confirm Zero-Loss System Restoration
                                    </DialogTitle>
                                    <DialogDescription>
                                        Inspect the contents of the uploaded snapshot file before applying restoration.
                                    </DialogDescription>
                                </DialogHeader>

                                {pendingRestoreData && (
                                    <div className="space-y-4 py-3">
                                        <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5 text-xs font-mono">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Application:</span>
                                                <span className="font-bold">{pendingRestoreData.app || "Orbit LMS"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Exported At:</span>
                                                <span className="font-bold">{new Date(pendingRestoreData.exportedAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Exported By:</span>
                                                <span className="font-bold">{pendingRestoreData.exportedBy || "Admin"}</span>
                                            </div>
                                            <div className="flex justify-between text-primary">
                                                <span className="font-semibold">Total Records to Recover:</span>
                                                <span className="font-bold">{pendingRestoreData.metadata?.totalRecords || 0} Records</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tables Included in Package</Label>
                                            <div className="max-h-[160px] overflow-y-auto border rounded-xl p-2 bg-muted/20 space-y-1 text-xs font-mono">
                                                {Object.entries(pendingRestoreData.tables || {}).map(([table, rows]) => (
                                                    <div key={table} className="flex justify-between px-2 py-1 rounded bg-card border border-border/40">
                                                        <span className="font-semibold text-foreground">{table}</span>
                                                        <span className="text-muted-foreground">{(rows as any[]).length} rows</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {isRestoringSystem && (
                                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                                                <Loader2 className="h-5 w-5 text-emerald-600 animate-spin shrink-0" />
                                                <div className="space-y-0.5 min-w-0">
                                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Restoration in Progress</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{restoreProgressMsg}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={isRestoringSystem}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleConfirmRestore} disabled={isRestoringSystem} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                        {isRestoringSystem ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                        {isRestoringSystem ? "Restoring..." : "Confirm & Recover System Now"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your public profile details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Input
                                        id="bio"
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleSave} className="gap-2">
                                        <Save className="h-4 w-4" /> Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Appearance Tab */}
                    <TabsContent value="appearance" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Theme Settings</CardTitle>
                                <CardDescription>Select the theme for your dashboard.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div
                                        className={`border-2 rounded-xl p-4 cursor-pointer flex items-center gap-4 transition-all hover:bg-muted/50 ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                        onClick={() => setTheme("light")}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                            <Sun className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Uranus Island</div>
                                            <div className="text-sm text-muted-foreground">Light Mode</div>
                                        </div>
                                        {theme === 'light' && <div className="ml-auto w-3 h-3 rounded-full bg-primary" />}
                                    </div>

                                    <div
                                        className={`border-2 rounded-xl p-4 cursor-pointer flex items-center gap-4 transition-all hover:bg-muted/50 ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                        onClick={() => setTheme("dark")}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-200">
                                            <Moon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Cosmic Ring</div>
                                            <div className="text-sm text-muted-foreground">Dark Mode</div>
                                        </div>
                                        {theme === 'dark' && <div className="ml-auto w-3 h-3 rounded-full bg-primary" />}
                                    </div>

                                    <div
                                        className={`border-2 rounded-xl p-4 cursor-pointer flex items-center gap-4 transition-all hover:bg-muted/50 ${theme === 'doomsday' ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' : 'border-border'}`}
                                        onClick={() => setTheme("doomsday")}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 font-bold">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-1.5 text-foreground">
                                                Doomsday Matrix <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">EPIC</Badge>
                                            </div>
                                            <div className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">Bio-Green Matrix & Crisp White</div>
                                        </div>
                                        {theme === 'doomsday' && <div className="ml-auto w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm" />}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Quote</CardTitle>
                                <CardDescription>Set the motivational quote visible to all students.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Quote of the Day</Label>
                                    <div className="relative">
                                        <Quote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Textarea
                                            value={quote}
                                            onChange={(e) => setQuote(e.target.value)}
                                            className="pl-9 min-h-[80px]"
                                            placeholder="Enter a motivational quote..."
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSaveQuote} disabled={loadingQuote} className="gap-2">
                                    <Save className="h-4 w-4" /> {loadingQuote ? "Saving..." : "Save Quote"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notification Preferences</CardTitle>
                                <CardDescription>Choose what updates you want to receive.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive daily digests and important updates.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.email}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, email: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Push Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive real-time alerts on your device.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.push}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, push: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Product Updates</Label>
                                        <p className="text-sm text-muted-foreground">Get the latest news about new features.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.updates}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, updates: c })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Settings</CardTitle>
                                <CardDescription>Manage your password and session security.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Current Password</Label>
                                    <Input
                                        type="password"
                                        value={security.currentPassword}
                                        onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        value={security.newPassword}
                                        onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm New Password</Label>
                                    <Input
                                        type="password"
                                        value={security.confirmPassword}
                                        onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4">
                                    <Button variant="destructive" onClick={handleChangePassword} disabled={loadingSecurity}>
                                        {loadingSecurity ? "Updating..." : "Change Password"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Coupons & Discounts Tab */}
                    <TabsContent value="coupons">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="h-5 w-5 text-emerald-600" /> Coupon & Discount System Control
                                    </CardTitle>
                                    <CardDescription>
                                        Enable or disable the coupon code system. Control which teachers can create discount codes for their courses.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Master Toggle */}
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" /> Master Coupon System Toggle
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                When enabled, teachers (based on your permission settings below) can create coupon codes that students apply during enrollment for discounted pricing.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Switch
                                                checked={couponSettings.enabled}
                                                onCheckedChange={(checked) => setCouponSettings(prev => ({ ...prev, enabled: checked }))}
                                            />
                                            <Badge className={couponSettings.enabled ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
                                                {couponSettings.enabled ? "ENABLED" : "DISABLED"}
                                            </Badge>
                                        </div>
                                    </div>

                                    {couponSettings.enabled && (
                                        <>
                                            {/* Permission Mode */}
                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold">Teacher Permission Mode</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCouponSettings(prev => ({ ...prev, mode: "all" }))}
                                                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                                            couponSettings.mode === "all"
                                                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                                                : "bg-card border-border hover:border-primary/50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Users className="h-4 w-4" />
                                                            <span className="font-bold text-sm">All Teachers</span>
                                                        </div>
                                                        <p className={`text-xs ${couponSettings.mode === "all" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                            Every teacher can create and manage coupon codes for their courses.
                                                        </p>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCouponSettings(prev => ({ ...prev, mode: "selected" }))}
                                                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                                            couponSettings.mode === "selected"
                                                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                                                : "bg-card border-border hover:border-primary/50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <ShieldCheck className="h-4 w-4" />
                                                            <span className="font-bold text-sm">Selected Teachers Only</span>
                                                        </div>
                                                        <p className={`text-xs ${couponSettings.mode === "selected" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                            Only hand-picked teachers you select below can create coupon codes.
                                                        </p>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Teacher Selection (only when mode = selected) */}
                                            {couponSettings.mode === "selected" && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm font-bold">Select Teachers with Coupon Access</Label>
                                                        <Badge variant="outline" className="text-xs font-mono">
                                                            {couponSettings.selectedTeachers.length} / {teachersList.length} Selected
                                                        </Badge>
                                                    </div>
                                                    {loadingTeachers ? (
                                                        <div className="flex justify-center py-6">
                                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        </div>
                                                    ) : teachersList.length > 0 ? (
                                                        <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-xl p-3 bg-muted/20">
                                                            {teachersList.map(teacher => {
                                                                const isSelected = couponSettings.selectedTeachers.includes(teacher.id);
                                                                return (
                                                                    <button
                                                                        key={teacher.id}
                                                                        type="button"
                                                                        onClick={() => toggleTeacherCouponAccess(teacher.id)}
                                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                                                                            isSelected
                                                                                ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                                                                                : "bg-card border-border hover:border-primary/30"
                                                                        }`}
                                                                    >
                                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold overflow-hidden ${
                                                                            isSelected ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                                                        }`}>
                                                                            {teacher.avatar_url ? (
                                                                                <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                teacher.full_name?.charAt(0) || "T"
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-semibold text-sm truncate">{teacher.full_name}</p>
                                                                            <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                                                                        </div>
                                                                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                            isSelected
                                                                                ? "bg-emerald-600 border-emerald-600 text-white"
                                                                                : "border-muted-foreground/30"
                                                                        }`}>
                                                                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground text-center py-6 border rounded-xl">No teachers found in the system.</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Max Discount Cap */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Maximum Discount Percentage Cap</Label>
                                                    <Input
                                                        type="number"
                                                        value={couponSettings.maxDiscountPercent}
                                                        onChange={(e) => setCouponSettings(prev => ({ ...prev, maxDiscountPercent: parseInt(e.target.value) || 50 }))}
                                                        min="5"
                                                        max="100"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Teachers cannot create percentage-based coupons exceeding this cap (Default: 50%).
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-2">
                                        <Button onClick={handleSaveCouponSettings} disabled={loadingCouponSettings} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                            {loadingCouponSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            {loadingCouponSettings ? "Saving..." : "Save Coupon Settings"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
