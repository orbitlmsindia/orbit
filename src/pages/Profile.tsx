
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Mail, Shield, Save } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [role, setRole] = useState<string>("");

    // Form states
    const [fullName, setFullName] = useState("");

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
                return;
            }

            setUser(user);

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setProfile(data);
            setRole(data.role);
            setFullName(data.full_name || "");
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (error) throw error;

            // Also update auth metadata to keep it in sync
            await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            toast.success("Profile updated successfully!");

            // Refresh local state
            setProfile({ ...profile, full_name: fullName });

        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const ProfileContent = () => (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-display font-bold mb-6">My Profile</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <form onSubmit={handleUpdateProfile}>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                    {fullName.split(" ").map((n: string) => n[0]).join("")}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-lg">{fullName}</p>
                                <p className="text-sm text-muted-foreground capitalize">{role}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        value={profile?.email || user?.email}
                                        disabled
                                        className="pl-10 bg-muted/50"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="role"
                                        value={role}
                                        disabled
                                        className="pl-10 bg-muted/50 capitalize"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-6">
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );

    // Wrap in appropriate layout based on role
    if (role === 'admin' || role === 'super_admin') {
        return <AdminLayout><ProfileContent /></AdminLayout>;
    } else if (role === 'teacher') {
        return <TeacherLayout><ProfileContent /></TeacherLayout>;
    } else if (role === 'student') {
        return <StudentLayout><ProfileContent /></StudentLayout>;
    } else {
        // Fallback or generic layout if role is unknown or 'user'
        // For now, defaulting to StudentLayout or just a container if specific layout logic is complex
        // But the user is likely one of the above.
        return <StudentLayout><ProfileContent /></StudentLayout>;
    }
}
