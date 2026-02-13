import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    User,
    Bell,
    Lock,
    Palette,
    Save,
    Sun,
    Moon,
    Quote
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
        name: "Teacher User",
        email: "teacher@example.com",
        bio: "Senior Mathematics Instructor",
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

    useEffect(() => {
        fetchDailyQuote();
    }, []);

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
                                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                                        <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Changes"}
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
