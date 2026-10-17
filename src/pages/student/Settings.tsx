import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
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
    Sparkles
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { useNavigate } from "react-router-dom";

import { StudentIdCardModal } from "@/components/idcard/StudentIdCardModal";
import { ShieldCheck } from "lucide-react";
import { ThemeSelectorGrid } from "@/components/theme/ThemeSelectorGrid";

export default function StudentSettings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [idCardOpen, setIdCardOpen] = useState(false);
    const [currentUserObj, setCurrentUserObj] = useState<any>(null);
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        bio: "",
    });

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: dbUser } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
                const fullName = dbUser?.full_name || user.user_metadata?.full_name || "";
                const email = user.email || dbUser?.email || "";
                const bio = dbUser?.bio || user.user_metadata?.bio || "";
                setCurrentUserObj({
                    id: user.id,
                    name: fullName,
                    email: email,
                    avatar: user.user_metadata?.avatar_url || ""
                });
                setProfile({
                    name: fullName,
                    email: email,
                    bio: bio
                });
            }
        } catch (e) {
            console.error("Error fetching current user profile:", e);
        }
    };

    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        assignments: true,
        grades: true
    });

    const [loading, setLoading] = useState(false);

    // Security State
    const [security, setSecurity] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [loadingSecurity, setLoadingSecurity] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update({
                    full_name: profile.name,
                    bio: profile.bio
                }).eq('id', user.id);
            }
            toast({ title: "Settings saved", description: "Your profile has been updated." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update profile." });
        } finally {
            setLoading(false);
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
        <StudentLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account, appearance, and preferences.</p>
                </div>

                <Tabs defaultValue="appearance" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="profile" className="gap-2">
                            <User className="h-4 w-4" /> Profile
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
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Profile & Identification Credential</CardTitle>
                                    <CardDescription>Update your public profile and inspect your verified digital student ID card.</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setIdCardOpen(true)}
                                    className="gap-2 bg-primary text-primary-foreground font-bold shrink-0"
                                >
                                    <ShieldCheck className="h-4 w-4" /> View Digital Student ID Card
                                </Button>
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
                                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                                        <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Appearance Tab */}
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-primary" />
                                    Orbit Theme Studio & 10 Visual Themes
                                </CardTitle>
                                <CardDescription>
                                    Select and unlock bespoke themes with ⚡ Orbit Flux. Your selected theme applies instantly across all courses, headers, and dashboards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <ThemeSelectorGrid userRole="student" />
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
                                        <Label className="text-base">Assignment Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when new assignments are posted.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.assignments}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, assignments: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Grade Updates</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when a grade is posted.</p>
                                    </div>
                                    <Switch
                                        checked={notifications.grades}
                                        onCheckedChange={(c) => setNotifications({ ...notifications, grades: c })}
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

                <StudentIdCardModal
                    open={idCardOpen}
                    onOpenChange={setIdCardOpen}
                    student={currentUserObj}
                />
            </div>
        </StudentLayout>
    );
}
