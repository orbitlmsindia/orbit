import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Lock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MasterLogin() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Map username to actual email format internally
            const mappedEmail = username === 'orbitadmin' ? 'orbitadmin@orbit.com' : username;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: mappedEmail,
                password,
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                // Verify they are master admin
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("role, status, college_id")
                    .eq("id", data.session.user.id)
                    .single();

                if (userError || !userData) {
                    await supabase.auth.signOut();
                    setError("Account verification failed. Not authorized as Master Admin.");
                    return;
                }

                const { role, college_id } = userData;

                if (role !== 'super_admin') {
                    await supabase.auth.signOut();
                    setError("Access Denied. You are not a registered SaaS Master Admin.");
                    return;
                }

                // Store Role in session storage
                sessionStorage.setItem('userRole', role);
                if (college_id) {
                    sessionStorage.setItem('collegeId', college_id);
                } else {
                    // Master Admin operates cross tenant so remove collegeID
                    sessionStorage.removeItem('collegeId');
                }

                navigate("/master");
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Failed to sign in. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Master Admin Portal"
            subtitle="SaaS Ecosystem Control Login"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Username */}
                <div className="space-y-2">
                    <Label htmlFor="username">SaaS Admin ID</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="username"
                            type="text"
                            placeholder="e.g. orbitadmin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-10"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Security Hash</Label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter admin password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            disabled={loading}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Authenticating System...
                        </>
                    ) : (
                        "Access Command Center"
                    )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                    Restricted access area. Logging strictly monitored by system.
                </p>

            </form>
        </AuthLayout>
    );
}
