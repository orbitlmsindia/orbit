import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, User, GraduationCap, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"role" | "form" | "success">("role");
    const [role, setRole] = useState<"student" | "teacher">("student");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Password visibility toggles (REG-01)
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        department: "",
        aadhar: "",
        mobile: "",
        address: ""
    });

    const handleRoleSelect = (selectedRole: "student" | "teacher") => {
        setRole(selectedRole);
        setStep("form");
    };

    // Password requirement checks (REG-02)
    const hasMinLength = formData.password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    const hasSpecialChar = /[@$!%*?&#^()_\-+={}[\]:;"'<>,.?/\\|]/.test(formData.password);
    const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        // Mobile validation (REG-03)
        const cleanMobile = formData.mobile.replace(/\D/g, '').slice(-10);
        if (cleanMobile.length !== 10) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (role === "student" && (!formData.aadhar || !formData.address)) {
            setError("Please fill in all student details (Aadhar and Address).");
            return;
        }

        if (role === "student" && formData.aadhar.replace(/\D/g, '').length !== 12) {
            setError("Please enter a valid 12-digit Aadhar number.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!isPasswordValid) {
            setError("Password must meet all requirements: at least 8 characters, 1 uppercase letter, 1 number, and 1 special symbol.");
            return;
        }

        if (role === "teacher" && !formData.department) {
            setError("Please select a department.");
            return;
        }

        setLoading(true);

        try {
            const fullName = `${formData.firstName} ${formData.lastName}`;
            const normalizedMobile = `+91 ${cleanMobile}`;

            // Sign up with Supabase
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        department: formData.department,
                        status: role === "student" ? "active" : "pending",
                        aadhar_number: formData.aadhar,
                        mobile_number: normalizedMobile,
                        address: formData.address
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Upsert to public users table
                const { error: insertError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: formData.email,
                    full_name: fullName,
                    role: role,
                    status: role === 'student' ? 'active' : 'pending',
                    department: formData.department || null,
                    mobile_number: normalizedMobile,
                    aadhar_number: formData.aadhar,
                    address: formData.address
                }, { onConflict: 'id' });

                if (insertError) {
                    console.warn("Manual user insert notice:", insertError);
                }

                if (role === "student") {
                    navigate("/student");
                } else {
                    setStep("success");
                }
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "Failed to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={step === "role" ? "Choose your Path" : step === "form" ? "Create Account" : "Registration Complete"}
            subtitle={
                step === "role"
                    ? "Select how you will be joining The Orbit"
                    : step === "form"
                        ? `Registering as a ${role === "student" ? "Student" : "Mentor"}`
                        : "Your account is pending approval"
            }
        >
            {step === "role" && (
                <div className="grid gap-4">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-pointer"
                        onClick={() => handleRoleSelect("student")}
                    >
                        <div className="p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">I am a Student</h3>
                                <p className="text-sm text-muted-foreground">Access courses, assignments, and track your progress.</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-pointer"
                        onClick={() => handleRoleSelect("teacher")}
                    >
                        <div className="p-6 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-center space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                <GraduationCap className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">I am a Mentor / Teacher</h3>
                                <p className="text-sm text-muted-foreground">Manage courses, guide students, and review progress.</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm text-primary hover:underline">
                            Already have an account? Login
                        </Link>
                    </div>
                </div>
            )}

            {step === "form" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@orbitlms.edu"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {role === "student" && (
                        <div className="space-y-2">
                            <Label htmlFor="aadhar">Aadhar Number (12 digits)</Label>
                            <Input
                                id="aadhar"
                                placeholder="12-digit Aadhar Number"
                                value={formData.aadhar}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                                    setFormData({ ...formData, aadhar: digits });
                                }}
                                required
                                maxLength={12}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mobile">10-Digit Mobile Number</Label>
                            <Input
                                id="mobile"
                                placeholder="9876543210"
                                value={formData.mobile}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setFormData({ ...formData, mobile: digits });
                                }}
                                required
                                maxLength={10}
                            />
                            {formData.mobile && formData.mobile.length !== 10 && (
                                <p className="text-[11px] text-amber-500">Must be exactly 10 digits ({formData.mobile.length}/10)</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address / City</Label>
                            <Input
                                id="address"
                                placeholder="City, State"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {role === "teacher" && (
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select
                                value={formData.department}
                                onValueChange={(val) => setFormData({ ...formData, department: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                                    <SelectItem value="Design">Design</SelectItem>
                                    <SelectItem value="Business">Business</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Password field with Eye toggle (REG-01) */}
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Real-time Password Requirements Checklist (REG-02) */}
                        {formData.password && (
                            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1 text-xs">
                                <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider mb-1">
                                    Password Requirements:
                                </p>
                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                        {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-muted-foreground/60" />}
                                        <span>8+ characters</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                        {hasUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-muted-foreground/60" />}
                                        <span>1 uppercase (A-Z)</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                        {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-muted-foreground/60" />}
                                        <span>1 number (0-9)</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                        {hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-muted-foreground/60" />}
                                        <span>1 symbol (@$!%*...)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password field with Eye toggle */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-[11px] text-destructive">Passwords do not match</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                        <Button type="submit" className="w-full" size="lg" disabled={loading || !isPasswordValid}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setStep("role")}>
                            Back
                        </Button>
                    </div>
                </form>
            )}

            {step === "success" && (
                <div className="text-center space-y-6 py-6">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold">Registration Successful!</h3>
                    <p className="text-muted-foreground">
                        Thank you for registering with The Orbit. Your account is currently <strong>pending approval</strong> from the administration.
                    </p>
                    <p className="text-sm text-muted-foreground p-4 bg-secondary/50 rounded-lg">
                        You will be notified once your account is active. Please check back later.
                    </p>

                    <Button className="w-full" onClick={() => navigate("/login")}>
                        Return to Login
                    </Button>
                </div>
            )}
        </AuthLayout>
    );
}
