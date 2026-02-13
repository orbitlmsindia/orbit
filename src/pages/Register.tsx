import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, User, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"role" | "form" | "success">("role");
    const [role, setRole] = useState<"student" | "teacher">("student");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        department: "", // For mentors/teachers
        aadhar: "",
        mobile: "",
        address: ""
    });

    const handleRoleSelect = (selectedRole: "student" | "teacher") => {
        setRole(selectedRole);
        setStep("form");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (role === "student" && (!formData.aadhar || !formData.mobile || !formData.address)) {
            setError("Please fill in all student details (Aadhar, Mobile, Address).");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (role === "teacher" && !formData.department) {
            setError("Please select a department.");
            return;
        }

        setLoading(true);

        try {
            const fullName = `${formData.firstName} ${formData.lastName}`;

            // Sign up with Supabase
            // We pass the role in metadata. The handle_new_user trigger must handle this.
            // We are banking on an 'status' field being added or handled by admin later.
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        department: formData.department,
                        status: "pending", // Metadata for admin to see
                        aadhar_number: formData.aadhar,
                        mobile_number: formData.mobile,
                        address: formData.address
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // FALLBACK: Manually insert user data if the trigger failed to do so.
                // We attempt an UPSERT to be safe (idempotent).
                // Note: RLS must allow users to insert their own row.
                const { error: insertError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: formData.email,
                    full_name: fullName,
                    role: role,
                    status: 'pending',
                    department: formData.department || null,
                    // Assuming these columns might not exist yet in public table, but we try sending them if they do
                    // or rely on metadata. But usually public 'users' table is for display.
                    // Storing sensitive info like Aadhar in public table requires Row Level Security (RLS) to be very strict.
                }, { onConflict: 'id' }).select();

                if (insertError) {
                    // Try to log it, but don't block success if the trigger actually worked and this failed due to redundancy
                    console.warn("Manual user insert warning (might be handled by trigger):", insertError);
                }

                setStep("success");
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
                            placeholder="john@jiet.edu.in"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {role === "student" && (
                        <div className="space-y-2">
                            <Label htmlFor="aadhar">Aadhar Number</Label>
                            <Input
                                id="aadhar"
                                placeholder="12-digit Aadhar Number"
                                value={formData.aadhar}
                                onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
                                required
                                maxLength={12}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number</Label>
                            <Input
                                id="mobile"
                                placeholder="+91 XXXXXXXXXX"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
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

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
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
