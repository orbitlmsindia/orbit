
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload the file to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update user profile
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update local state
            setProfile({ ...profile, avatar_url: publicUrl });
            toast.success("Profile image updated successfully!");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
        } finally {
            setSaving(false);
        }
    };

    const ProfileContent = () => (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-display font-bold mb-6">My Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Profile Card */}
                <Card className="md:col-span-1">
                    <CardHeader className="text-center">
                        <CardTitle>Profile Details</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                            <Avatar className="h-32 w-32 border-4 border-muted">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                    {fullName ? fullName.split(" ").map((n: string) => n[0]).join("") : "U"}
                                </AvatarFallback>
                            </Avatar>
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                            >
                                <span className="text-sm font-medium">Change</span>
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={saving}
                            />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-bold">{fullName}</h2>
                            <p className="text-sm text-muted-foreground capitalize">{role}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Form Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your personal details here.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUpdateProfile}>
                        <CardContent className="space-y-6">
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
                                            disabled={saving}
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
