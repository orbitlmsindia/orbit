import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Plus,
    Trash2,
    Pencil,
    UploadCloud,
    GraduationCap,
    Building2,
    Calendar,
    Image as ImageIcon,
    Award,
    CheckCircle2,
    X,
    Globe,
    FileText,
    RefreshCw,
    PenTool,
    ShieldCheck,
    Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function TeacherSettings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        bio: "",
        qualifications: "",
        instructor_video_url: "",
        instructor_socials: {
            linkedin: "",
            youtube: "",
            twitter: "",
            instagram: ""
        }
    });

    const [avatarUrl, setAvatarUrl] = useState("");
    const [qualificationsList, setQualificationsList] = useState<any[]>([]);
    const [newQual, setNewQual] = useState({
        title: "",
        institution: "",
        year: "",
        description: "",
        image_url: ""
    });

    const [notifications, setNotifications] = useState({
        email: true,
        submissions: true,
        announcements: false
    });

    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState("");
    const [loadingQuote, setLoadingQuote] = useState(false);

    // Security State
    const [security, setSecurity] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [loadingSecurity, setLoadingSecurity] = useState(false);

    // Letterhead & Signature State
    const [letterheadSettings, setLetterheadSettings] = useState({
        signatoryName: "",
        signatureUrl: "",
        companyName: "",
        companyTagline: "",
        companyLogoUrl: "",
        letterheadHeaderUrl: "",
        registrationNo: "",
        email: "",
        phone: "",
        address: ""
    });
    const [loadingLetterhead, setLoadingLetterhead] = useState(false);

    useEffect(() => {
        fetchDailyQuote();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('full_name, email, bio, qualifications, instructor_video_url, instructor_socials, avatar_url')
                .eq('id', user.id)
                .single();

            if (data) {
                setAvatarUrl(data.avatar_url || "");
                setProfile({
                    name: data.full_name || "",
                    email: data.email || user.email || "",
                    bio: data.bio || "",
                    qualifications: typeof data.qualifications === 'string' ? data.qualifications : JSON.stringify(data.qualifications || []),
                    instructor_video_url: data.instructor_video_url || "",
                    instructor_socials: {
                        linkedin: data.instructor_socials?.linkedin || "",
                        youtube: data.instructor_socials?.youtube || "",
                        twitter: data.instructor_socials?.twitter || "",
                        instagram: data.instructor_socials?.instagram || ""
                    }
                });

                // Parse structured qualifications array if present
                if (Array.isArray(data.qualifications)) {
                    setQualificationsList(data.qualifications);
                } else if (typeof data.qualifications === 'string' && data.qualifications.trim()) {
                    try {
                        const parsed = JSON.parse(data.qualifications);
                        if (Array.isArray(parsed)) {
                            setQualificationsList(parsed);
                        } else {
                            setQualificationsList([{ id: "1", title: data.qualifications, institution: "Academic Credential", year: "Present", description: "", image_url: "" }]);
                        }
                    } catch (e) {
                        setQualificationsList([{ id: "1", title: data.qualifications, institution: "Academic Credential", year: "Present", description: "", image_url: "" }]);
                    }
                }
            }

            // Load admin institute settings for Letterhead defaults
            let adminInst = {
                name: "ORBIT LMS ACADEMIC INNOVATION COUNCIL",
                logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
                tagline: "Official Academic Governing Body & Center for Excellence",
                registrationNo: "REG-ORBIT-2026/OFFICIAL-NOTICE",
                email: "notices@orbitlms.edu.in",
                phone: "+91 98765 43210",
                address: "Orbit Technology Campus, Sector 62, Tech City, India",
                signatureUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80"
            };
            const savedAdmin = localStorage.getItem("orbit_institute_settings");
            if (savedAdmin) {
                try { adminInst = { ...adminInst, ...JSON.parse(savedAdmin) }; } catch (e) {}
            }

            const savedTeacherLH = localStorage.getItem(`orbit_teacher_letterhead_${user.id}`) || localStorage.getItem("orbit_teacher_letterhead");
            let initialLH = {
                signatoryName: data?.full_name || "Academic Instructor",
                signatureUrl: adminInst.signatureUrl || "",
                companyName: adminInst.name,
                companyTagline: adminInst.tagline,
                companyLogoUrl: adminInst.logoUrl,
                letterheadHeaderUrl: "",
                registrationNo: adminInst.registrationNo,
                email: adminInst.email,
                phone: adminInst.phone,
                address: adminInst.address
            };
            if (savedTeacherLH) {
                try {
                    const parsed = JSON.parse(savedTeacherLH);
                    initialLH = { ...initialLH, ...parsed };
                } catch (e) {}
            }
            setLetterheadSettings(initialLH);
        } catch (err) {
            console.error("Error fetching profile:", err);
        }
    };

    const handleSyncAdminProfile = () => {
        let adminInst = {
            name: "ORBIT LMS ACADEMIC INNOVATION COUNCIL",
            logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
            tagline: "Official Academic Governing Body & Center for Excellence",
            registrationNo: "REG-ORBIT-2026/OFFICIAL-NOTICE",
            email: "notices@orbitlms.edu.in",
            phone: "+91 98765 43210",
            address: "Orbit Technology Campus, Sector 62, Tech City, India",
            signatureUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80"
        };
        const savedAdmin = localStorage.getItem("orbit_institute_settings");
        if (savedAdmin) {
            try { adminInst = { ...adminInst, ...JSON.parse(savedAdmin) }; } catch (e) {}
        }

        setLetterheadSettings(prev => ({
            ...prev,
            companyName: adminInst.name,
            companyLogoUrl: adminInst.logoUrl,
            companyTagline: adminInst.tagline || prev.companyTagline,
            registrationNo: adminInst.registrationNo || prev.registrationNo,
            email: adminInst.email || prev.email,
            phone: adminInst.phone || prev.phone,
            address: adminInst.address || prev.address
        }));

        toast({
            title: "Reflected Admin Profile Defaults! 🏫",
            description: "Company logo and institute details set by Admin have been copied."
        });
    };

    const handleSaveLetterhead = async () => {
        try {
            setLoadingLetterhead(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                localStorage.setItem(`orbit_teacher_letterhead_${user.id}`, JSON.stringify(letterheadSettings));
                localStorage.setItem("orbit_teacher_letterhead", JSON.stringify(letterheadSettings));
            }
            toast({
                title: "Letterhead & Signatures Saved! 📜",
                description: "Your custom signature, company logo, and letterhead details are saved."
            });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setLoadingLetterhead(false);
        }
    };

    const handleAddQualification = () => {
        if (!newQual.title.trim()) {
            toast({ variant: "destructive", title: "Missing Title", description: "Please enter a degree or position title." });
            return;
        }
        const updated = [...qualificationsList, { ...newQual, id: Date.now().toString() }];
        setQualificationsList(updated);
        setNewQual({ title: "", institution: "", year: "", description: "", image_url: "" });
        toast({ title: "Qualification Added! 🎓", description: "Click Save Instructor Profile to persist changes." });
    };

    const handleRemoveQualification = (id: string) => {
        setQualificationsList(qualificationsList.filter(q => q.id !== id));
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('users')
                .update({
                    full_name: profile.name,
                    avatar_url: avatarUrl,
                    bio: profile.bio,
                    qualifications: qualificationsList,
                    instructor_video_url: profile.instructor_video_url,
                    instructor_socials: profile.instructor_socials
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({ title: "Instructor Profile Updated! 👤", description: "LinkedIn-style qualifications & details saved." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setLoading(false);
        }
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
                .single();

            if (data) {
                setQuote(data.text);
            }
        } catch (error) {
            console.error("Error fetching quote:", error);
        }
    };

    const handleSaveQuote = async () => {
        if (!quote.trim()) return;

        try {
            setLoadingQuote(true);

            // Use RPC function to bypass table RLS permissions securely
            const { error } = await supabase.rpc('create_quote', {
                p_text: quote,
                p_priority: 1, // Teacher priority
                p_source: 'teacher'
            });

            if (error) throw error;

            toast({ title: "Quote Saved", description: "Your quote is now live for today." });
            setQuote(""); // Clear input on success
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save quote." });
        } finally {
            setLoadingQuote(false);
        }
    };

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            toast({ title: "Settings saved", description: "Your profile has been updated." });
        }, 1000);
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
            // 1. Verify current password
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: security.currentPassword
            });

            if (signInError) {
                throw new Error("Incorrect current password.");
            }

            // 2. Update password
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
        <TeacherLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account, appearance, and preferences.</p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto">
                        <TabsTrigger value="profile" className="gap-2">
                            <User className="h-4 w-4" /> Profile
                        </TabsTrigger>
                        <TabsTrigger value="letterhead" className="gap-2">
                            <FileText className="h-4 w-4" /> Letterhead & Signatures
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="gap-2">
                            <Palette className="h-4 w-4" /> Appearance
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2">
                            <Bell className="h-4 w-4" /> Notifications
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                            <Lock className="h-4 w-4" /> Security
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Instructor Profile & Branding Details</CardTitle>
                                <CardDescription>Update your public profile, qualifications, video intro, and social links for students.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Profile Image / Avatar Uploader */}
                                <div className="p-4 rounded-xl border bg-muted/10 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden shrink-0">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                            profile.name.charAt(0) || "T"
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1 text-center sm:text-left">
                                        <h4 className="font-bold text-sm text-foreground">Instructor Profile Avatar Image</h4>
                                        <p className="text-xs text-muted-foreground">Upload a professional headshot displayed to students in course discovery & video introduction.</p>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                            <Input
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                placeholder="https://... image URL or upload image file"
                                                className="max-w-xs text-xs"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 shrink-0 text-xs"
                                                onClick={() => document.getElementById('avatar-file-input')?.click()}
                                            >
                                                <UploadCloud className="h-3.5 w-3.5" /> Upload Avatar Image
                                            </Button>
                                            <input
                                                id="avatar-file-input"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const base64Str = event.target?.result as string;
                                                            setAvatarUrl(base64Str);
                                                            toast({ title: "Avatar Image Uploaded! 🖼️" });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            placeholder="Your full display name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Registered Email (Read-Only)</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            disabled
                                            value={profile.email}
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">Instructor Introduction Note & Bio</Label>
                                    <Textarea
                                        id="bio"
                                        className="min-h-[90px]"
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                        placeholder="Welcome message to your students, teaching philosophy, and domain expertise..."
                                    />
                                    <p className="text-xs text-muted-foreground">This bio is displayed to students in the course preview modal.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="video_url">Instructor Introduction Video URL <span className="text-muted-foreground text-xs">(YouTube / Google Drive)</span></Label>
                                    <Input
                                        id="video_url"
                                        value={profile.instructor_video_url}
                                        onChange={(e) => setProfile({ ...profile, instructor_video_url: e.target.value })}
                                        placeholder="https://youtube.com/watch?v=... or Google Drive preview link"
                                    />
                                </div>

                                {/* LINKEDIN-STYLE QUALIFICATIONS & EXPERIENCE MANAGER */}
                                <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between border-b pb-3">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 text-primary" /> Qualifications & Academic Experience (LinkedIn Overview)
                                            </h4>
                                            <p className="text-xs text-muted-foreground">Add multiple degrees, certifications, and past experience entries for students to inspect.</p>
                                        </div>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {qualificationsList.length} Entries
                                        </Badge>
                                    </div>

                                    {/* Existing Qualifications Cards */}
                                    {qualificationsList.length > 0 && (
                                        <div className="space-y-3">
                                            {qualificationsList.map((q: any) => (
                                                <div key={q.id} className="p-3.5 rounded-xl border bg-muted/20 flex items-start justify-between gap-3 relative group">
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                                            {q.image_url ? (
                                                                <img src={q.image_url} alt={q.title} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <GraduationCap className="h-5 w-5" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <h5 className="font-bold text-sm text-foreground leading-snug">{q.title}</h5>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                <span>🏛️ {q.institution || "Academic Body"}</span>
                                                                {q.year && <span>• 📅 {q.year}</span>}
                                                            </div>
                                                            {q.description && (
                                                                <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{q.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                                        onClick={() => handleRemoveQualification(q.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Form to Add New Qualification Entry */}
                                    <div className="p-4 rounded-xl border border-dashed bg-muted/10 space-y-3 pt-4">
                                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Plus className="h-3.5 w-3.5 text-primary" /> Add Qualification or Experience Entry
                                        </h5>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Degree / Role Title *</Label>
                                                <Input
                                                    placeholder="e.g. Ph.D. in Computer Science & AI"
                                                    value={newQual.title}
                                                    onChange={(e) => setNewQual({ ...newQual, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">University / Organization</Label>
                                                <Input
                                                    placeholder="e.g. Stanford University / Google"
                                                    value={newQual.institution}
                                                    onChange={(e) => setNewQual({ ...newQual, institution: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Year / Timeline</Label>
                                                <Input
                                                    placeholder="e.g. 2018 - 2022"
                                                    value={newQual.year}
                                                    onChange={(e) => setNewQual({ ...newQual, year: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Description & Research Focus</Label>
                                            <Input
                                                placeholder="Specialized research areas, honors, thesis topic, or role details..."
                                                value={newQual.description}
                                                onChange={(e) => setNewQual({ ...newQual, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Badge / Certificate Image URL"
                                                    value={newQual.image_url}
                                                    onChange={(e) => setNewQual({ ...newQual, image_url: e.target.value })}
                                                    className="text-xs max-w-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 shrink-0 text-xs"
                                                    onClick={() => document.getElementById('qual-file-input')?.click()}
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" /> Upload Certificate/Logo
                                                </Button>
                                                <input
                                                    id="qual-file-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                const base64Str = event.target?.result as string;
                                                                setNewQual({ ...newQual, image_url: base64Str });
                                                                toast({ title: "Certificate Image Loaded! 📜" });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <Button type="button" size="sm" onClick={handleAddQualification} className="gap-1.5 font-bold shrink-0">
                                                <Plus className="h-4 w-4" /> Add Entry
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Social & Professional Links */}
                                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Social & Professional Profile Links</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="space-y-1">
                                            <Label className="text-xs">LinkedIn Profile URL</Label>
                                            <Input
                                                placeholder="https://linkedin.com/in/username"
                                                value={profile.instructor_socials?.linkedin || ""}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    instructor_socials: { ...profile.instructor_socials, linkedin: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">YouTube Channel URL</Label>
                                            <Input
                                                placeholder="https://youtube.com/@channel"
                                                value={profile.instructor_socials?.youtube || ""}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    instructor_socials: { ...profile.instructor_socials, youtube: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">X (Twitter) Profile URL</Label>
                                            <Input
                                                placeholder="https://x.com/username"
                                                value={profile.instructor_socials?.twitter || ""}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    instructor_socials: { ...profile.instructor_socials, twitter: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Instagram Profile URL</Label>
                                            <Input
                                                placeholder="https://instagram.com/username"
                                                value={profile.instructor_socials?.instagram || ""}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    instructor_socials: { ...profile.instructor_socials, instagram: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button onClick={handleSaveProfile} disabled={loading} className="gap-2 bg-primary text-primary-foreground font-semibold">
                                        <Save className="h-4 w-4" /> {loading ? "Saving Profile..." : "Save Instructor Profile"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Letterhead & Signatures Tab */}
                    <TabsContent value="letterhead">
                        <Card>
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" /> Letterhead, Company Logo & Signature Configuration
                                    </CardTitle>
                                    <CardDescription>
                                        Manage your teacher signature, company logo, and official letterhead header. Admin profile defaults are automatically reflected unless customized.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleSyncAdminProfile} className="gap-2 shrink-0 border-primary/30 text-primary font-bold">
                                    <RefreshCw className="h-4 w-4" /> Sync Admin Profile Defaults
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Admin Sync Info Banner */}
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-6 w-6 text-primary shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Reflected Admin Institute Profile</h4>
                                            <p className="text-xs text-muted-foreground">
                                                Company Logo & Name: <span className="font-semibold text-foreground">{letterheadSettings.companyName || "Admin Institution"}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold shrink-0">
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Admin Profile Connected
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Editable Controls */}
                                    <div className="space-y-4">
                                        {/* Teacher Signatory Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="lh_name" className="font-bold text-xs flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-primary" /> Teacher Signatory Name
                                            </Label>
                                            <Input
                                                id="lh_name"
                                                value={letterheadSettings.signatoryName}
                                                onChange={(e) => setLetterheadSettings({ ...letterheadSettings, signatoryName: e.target.value })}
                                                placeholder="e.g. Prof. Alexander Wright, Ph.D."
                                            />
                                        </div>

                                        {/* Digital Signature Image */}
                                        <div className="space-y-2">
                                            <Label htmlFor="lh_sig" className="font-bold text-xs flex items-center gap-1.5">
                                                <PenTool className="h-3.5 w-3.5 text-primary" /> Digital Signature (Image / PNG)
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="lh_sig"
                                                    value={letterheadSettings.signatureUrl}
                                                    onChange={(e) => setLetterheadSettings({ ...letterheadSettings, signatureUrl: e.target.value })}
                                                    placeholder="Signature Image URL or upload PNG"
                                                    className="text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 shrink-0 text-xs"
                                                    onClick={() => document.getElementById('signature-file-input')?.click()}
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" /> Upload Signature
                                                </Button>
                                                <input
                                                    id="signature-file-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const b64 = ev.target?.result as string;
                                                                setLetterheadSettings({ ...letterheadSettings, signatureUrl: b64 });
                                                                toast({ title: "Signature Loaded! ✍️" });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            {letterheadSettings.signatureUrl && (
                                                <div className="p-2 rounded-lg border bg-white max-w-[200px] flex items-center justify-center">
                                                    <img src={letterheadSettings.signatureUrl} alt="Signature Preview" className="h-10 object-contain" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Company / Institution Logo */}
                                        <div className="space-y-2">
                                            <Label htmlFor="lh_logo" className="font-bold text-xs flex items-center gap-1.5">
                                                <ImageIcon className="h-3.5 w-3.5 text-primary" /> Company / Institution Logo
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="lh_logo"
                                                    value={letterheadSettings.companyLogoUrl}
                                                    onChange={(e) => setLetterheadSettings({ ...letterheadSettings, companyLogoUrl: e.target.value })}
                                                    placeholder="Company Logo URL or upload file"
                                                    className="text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 shrink-0 text-xs"
                                                    onClick={() => document.getElementById('logo-file-input')?.click()}
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" /> Upload Logo
                                                </Button>
                                                <input
                                                    id="logo-file-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const b64 = ev.target?.result as string;
                                                                setLetterheadSettings({ ...letterheadSettings, companyLogoUrl: b64 });
                                                                toast({ title: "Company Logo Uploaded! 🏢" });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Company Name & Tagline */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Company / Institute Name</Label>
                                                <Input
                                                    value={letterheadSettings.companyName}
                                                    onChange={(e) => setLetterheadSettings({ ...letterheadSettings, companyName: e.target.value })}
                                                    placeholder="e.g. Orbit LMS Innovation Academy"
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Tagline / Subtitle</Label>
                                                <Input
                                                    value={letterheadSettings.companyTagline}
                                                    onChange={(e) => setLetterheadSettings({ ...letterheadSettings, companyTagline: e.target.value })}
                                                    placeholder="e.g. Center for Academic Excellence"
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Optional Custom Letterhead Graphic Header Banner */}
                                        <div className="space-y-2 pt-2 border-t">
                                            <Label className="font-bold text-xs flex items-center gap-1.5">
                                                <ImageIcon className="h-3.5 w-3.5 text-primary" /> Upload Custom Letterhead Header Banner (Optional)
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={letterheadSettings.letterheadHeaderUrl}
                                                    onChange={(e) => setLetterheadSettings({ ...letterheadSettings, letterheadHeaderUrl: e.target.value })}
                                                    placeholder="Pre-designed Header Banner Image URL"
                                                    className="text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 shrink-0 text-xs"
                                                    onClick={() => document.getElementById('header-banner-file-input')?.click()}
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" /> Upload Header
                                                </Button>
                                                <input
                                                    id="header-banner-file-input"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const b64 = ev.target?.result as string;
                                                                setLetterheadSettings({ ...letterheadSettings, letterheadHeaderUrl: b64 });
                                                                toast({ title: "Custom Header Banner Loaded! 🖼️" });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Live Printable Letterhead Preview */}
                                    <div className="space-y-2">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-primary" /> Live Printable Letterhead Preview
                                        </Label>
                                        <div className="p-6 rounded-2xl bg-white text-slate-900 border-2 border-slate-200 shadow-md space-y-4 font-sans text-xs select-none">
                                            {letterheadSettings.letterheadHeaderUrl ? (
                                                <div className="w-full h-20 rounded-lg overflow-hidden border mb-2">
                                                    <img src={letterheadSettings.letterheadHeaderUrl} alt="Letterhead Header Banner" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                                                            {letterheadSettings.companyLogoUrl ? (
                                                                <img src={letterheadSettings.companyLogoUrl} alt="Logo" className="h-full w-full object-cover rounded-lg" />
                                                            ) : (
                                                                <Building2 className="h-7 w-7 text-amber-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-extrabold text-sm uppercase text-slate-950 leading-tight">
                                                                {letterheadSettings.companyName || "ORBIT ACADEMIC COUNCIL"}
                                                            </h3>
                                                            <p className="text-[11px] font-semibold text-slate-600">
                                                                {letterheadSettings.companyTagline || "Official Academic Governing Body"}
                                                            </p>
                                                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                                                                {letterheadSettings.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 font-mono text-[9px] text-slate-600">
                                                        <p>Reg: {letterheadSettings.registrationNo}</p>
                                                        <p>{letterheadSettings.email}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-3 bg-slate-50 rounded-lg border text-[11px] leading-relaxed text-slate-700 font-serif">
                                                <p className="font-bold uppercase text-slate-900 mb-1 text-xs">OFFICIAL ACADEMIC NOTICE PREVIEW</p>
                                                This letterhead automatically incorporates your company logo, institution branding from Admin settings, and digital signature for all printable gradebooks, certificates, and student circulars.
                                            </div>

                                            {/* Signatory Footer */}
                                            <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                                                <div className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                                                    <ShieldCheck className="h-3 w-3" /> VERIFIED SIGNATURE
                                                </div>
                                                <div className="text-right space-y-0.5">
                                                    {letterheadSettings.signatureUrl ? (
                                                        <img src={letterheadSettings.signatureUrl} alt="Signature" className="h-8 max-w-[130px] object-contain ml-auto border-b border-slate-400 pb-0.5 mb-0.5" />
                                                    ) : (
                                                        <p className="font-serif italic font-bold text-slate-900 border-b border-slate-400 px-3 pb-0.5 text-xs">
                                                            {letterheadSettings.signatoryName || "Authorized Signatory"}
                                                        </p>
                                                    )}
                                                    <p className="font-extrabold text-xs text-slate-950">{letterheadSettings.signatoryName || "Instructor"}</p>
                                                    <p className="text-[9px] font-mono text-slate-500">Course Instructor & Department Head</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button onClick={handleSaveLetterhead} disabled={loadingLetterhead} className="gap-2 bg-primary text-primary-foreground font-semibold">
                                        <Save className="h-4 w-4" /> {loadingLetterhead ? "Saving Letterhead..." : "Save Letterhead & Signatures"}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <CardDescription>Inspire students with a daily quote.</CardDescription>
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
                                        <p className="text-sm text-muted-foreground">Receive daily digests.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.email}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, email: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Submission Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Notify me when a student submits work.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.submissions}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, submissions: c })}
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
                </Tabs>
            </div >
        </TeacherLayout >
    );
}
