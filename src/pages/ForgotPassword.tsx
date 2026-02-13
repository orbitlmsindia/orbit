import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ForgotPassword() {
    const [step, setStep] = useState<"request" | "verify" | "reset">("request");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check for session on mount (in case they clicked the Magic Link)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // User is already logged in (likely via Magic Link)
                setEmail(session.user.email || "");
                setStep("reset");
            }
        };
        checkSession();
    }, []);

    // Step 1: Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. Verify User Details against DB
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('email', email)
                .ilike('full_name', name);

            if (userError) throw userError;
            if (!users || users.length === 0) {
                setError("No account found with these details.");
                setLoading(false);
                return;
            }

            // 2. Send OTP (Sign In with OTP)
            // We set redirect URL to this page, so if they click the link, they come back here logged in.
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: window.location.href
                }
            });

            if (otpError) throw otpError;

            setStep("verify");
            // Create a notification for record keeping
            await supabase.from('notifications').insert([{
                title: "OTP Requested",
                message: `Password reset OTP requested for ${email}`,
                user_id: users[0].id,
                type: 'system',
            }]);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email'
            });

            if (verifyError) throw verifyError;
            if (!session) {
                throw new Error("Invalid OTP or session not created.");
            }

            setStep("reset");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // Success! 
            await supabase.auth.signOut();
            window.location.href = '/login?message=Password updated successfully';

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={step === "request" ? "Reset Password" : step === "verify" ? "Enter OTP" : "Set New Password"}
            subtitle={step === "request" ? "Verify your details to receive an OTP" : step === "verify" ? `Sent to ${email}` : "Create a secure password"}
        >
            <div className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {step === "request" && (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                            <Input
                                id="mobile"
                                placeholder="+91 XXXXXXXXXX"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending OTP...
                                </>
                            ) : (
                                "Send OTP"
                            )}
                        </Button>
                    </form>
                )}

                {step === "verify" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">One-Time Password (OTP)</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="Enter OTP code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Allow only numbers
                                required
                                maxLength={8}
                                className="text-center text-lg tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                                Check your email inbox and spam folder.
                            </p>
                            <p className="text-[10px] text-muted-foreground text-center mt-2 px-4 border-t pt-2">
                                <strong>Tip:</strong> If you received a login link instead of a code, use the link to log in, and you will be redirected here to set your password.
                            </p>
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Verify OTP"
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => setStep("request")}
                            disabled={loading}
                        >
                            Back to Details
                        </Button>
                    </form>
                )}

                {step === "reset" && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <Link to="/login" className="text-sm text-primary hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
