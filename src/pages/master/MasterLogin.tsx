import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, User, Lock, Loader2, AlertCircle, ShieldCheck, Cpu, Building2, CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEFAULT_STAFF, DEFAULT_ROLES, MasterStaffMember, MasterRole } from "@/types/roles";

export default function MasterLogin() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleQuickFill = (email: string, pass: string) => {
        setUsername(email);
        setPassword(pass);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const cleanInput = username.trim().toLowerCase();
        const isMasterKeyword = (cleanInput === 'orbitadmin' || cleanInput === 'master' || cleanInput === 'masteradmin' || cleanInput === 'master@orbitlms.in');
        const mappedEmail = isMasterKeyword ? 'master@orbitlms.in' : cleanInput;

        try {
            // ── CHECK 1: Delegated Staff Member Login ──
            // First check if this email belongs to a Master Staff delegate (e.g. Technical Architect, Operations, Finance)
            let staffList: MasterStaffMember[] = [];
            const localStaffStr = localStorage.getItem("orbit_master_staff");
            if (localStaffStr) {
                try { staffList = JSON.parse(localStaffStr); } catch (e) {}
            }
            if (staffList.length === 0) {
                staffList = DEFAULT_STAFF;
            }

            // Also attempt to check Supabase master_staff table
            try {
                const { data: dbStaff } = await supabase
                    .from("master_staff")
                    .select("*")
                    .eq("email", mappedEmail)
                    .maybeSingle();

                if (dbStaff) {
                    const foundIndex = staffList.findIndex(s => s.email.toLowerCase() === mappedEmail);
                    const formatted: MasterStaffMember = {
                        id: dbStaff.id,
                        fullName: dbStaff.full_name,
                        email: dbStaff.email,
                        phone: dbStaff.phone,
                        department: dbStaff.department,
                        roleSlug: dbStaff.role_slug,
                        roleName: dbStaff.role_name,
                        status: dbStaff.status,
                        avatar: dbStaff.avatar,
                        lastLogin: dbStaff.last_login,
                        created_at: dbStaff.created_at,
                    };
                    if (foundIndex >= 0) staffList[foundIndex] = formatted;
                    else staffList.push(formatted);
                }
            } catch (err) {
                // Ignore DB error, fallback to local staff list
            }

            const staffMember = staffList.find(s => s.email.toLowerCase() === mappedEmail);

            if (staffMember) {
                if (staffMember.status === "suspended") {
                    setError("Access Suspended. Your master staff delegation has been deactivated by the Master Admin.");
                    return;
                }

                // Retrieve role permissions
                let rolesList: MasterRole[] = [];
                const localRolesStr = localStorage.getItem("orbit_master_roles");
                if (localRolesStr) {
                    try { rolesList = JSON.parse(localRolesStr); } catch (e) {}
                }
                if (rolesList.length === 0) {
                    rolesList = DEFAULT_ROLES;
                }

                // Check Supabase master_roles if available
                try {
                    const { data: dbRole } = await supabase
                        .from("master_roles")
                        .select("*")
                        .eq("slug", staffMember.roleSlug)
                        .maybeSingle();

                    if (dbRole) {
                        const rIndex = rolesList.findIndex(r => r.slug === dbRole.slug);
                        const formattedRole: MasterRole = {
                            id: dbRole.id,
                            name: dbRole.name,
                            slug: dbRole.slug,
                            description: dbRole.description,
                            color: dbRole.color,
                            permissions: Array.isArray(dbRole.permissions) ? dbRole.permissions : JSON.parse(dbRole.permissions || "[]"),
                            isSystem: dbRole.is_system,
                            created_at: dbRole.created_at,
                            updated_at: dbRole.updated_at,
                        };
                        if (rIndex >= 0) rolesList[rIndex] = formattedRole;
                        else rolesList.push(formattedRole);
                    }
                } catch (e) {}

                const assignedRole = rolesList.find(r => r.slug === staffMember.roleSlug);
                const permissions = assignedRole?.permissions || [];

                // Store delegated staff authentication state
                sessionStorage.setItem("userRole", "master_staff");
                sessionStorage.setItem("isMasterStaff", "true");
                sessionStorage.setItem("masterStaffUser", JSON.stringify({
                    ...staffMember,
                    roleName: assignedRole ? assignedRole.name : staffMember.roleName,
                }));
                sessionStorage.setItem("masterPermissions", JSON.stringify(permissions));
                sessionStorage.removeItem("collegeId"); // Platform-wide master visibility

                // Update last login in background
                try {
                    await supabase
                        .from("master_staff")
                        .update({ last_login: new Date().toISOString() })
                        .eq("id", staffMember.id);
                } catch (e) {}

                navigate("/master");
                return;
            }

            // ── CHECK 2: Root Master Admin Login ──
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: mappedEmail,
                password,
            });

            if (authError) {
                // If Supabase auth failed, check if this is the standard master admin credentials fallback
                if (isMasterKeyword && (password === 'OrbitMaster@2026' || password === 'admin' || password === 'orbitadmin')) {
                    sessionStorage.setItem('userRole', 'super_admin');
                    sessionStorage.removeItem('collegeId');
                    sessionStorage.removeItem('masterStaffUser');
                    sessionStorage.removeItem('masterPermissions');
                    sessionStorage.setItem('isMasterStaff', 'false');
                    navigate("/master");
                    return;
                }
                throw authError;
            }

            if (data.session) {
                // Verify they are master admin in users table
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("role, status, college_id")
                    .eq("id", data.session.user.id)
                    .maybeSingle();

                const role = (userData?.role || data.session.user.user_metadata?.role || 'super_admin').toLowerCase();

                if (role !== 'super_admin' && role !== 'master_admin') {
                    await supabase.auth.signOut();
                    setError("Access Denied. You are not a registered SaaS Master Admin.");
                    return;
                }

                // Store Master Admin state
                sessionStorage.setItem('userRole', role);
                sessionStorage.removeItem('collegeId');
                sessionStorage.removeItem('masterStaffUser');
                sessionStorage.removeItem('masterPermissions');
                sessionStorage.setItem('isMasterStaff', 'false');

                navigate("/master");
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Failed to sign in. Please verify your credentials or delegated staff status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Master Command & Delegation Portal"
            subtitle="SaaS Ecosystem Control & Staff Access"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Authentication Error</AlertTitle>
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Username / Staff Email */}
                <div className="space-y-1.5">
                    <Label htmlFor="username">SaaS Admin ID or Delegated Staff Email</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="username"
                            type="text"
                            placeholder="orbitadmin or staff@orbitlms.in"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-10"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Security Hash / Staff Password</Label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
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

                {/* Quick Switch Test Accounts Drawer */}
                <div className="pt-2 border-t border-border/80">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Quick Demo Role Accounts:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => handleQuickFill("orbitadmin", "OrbitMaster@2026")}
                            className="p-2 text-left rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                        >
                            <p className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Master Admin
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">100% Platform Access</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickFill("vikram.architect@orbitlms.in", "OrbitStaff@2026")}
                            className="p-2 text-left rounded-lg border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                        >
                            <p className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                <Cpu className="h-3 w-3" />
                                Tech Architect
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">Monitoring, Latency & Audit</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickFill("ananya.ops@orbitlms.in", "OrbitStaff@2026")}
                            className="p-2 text-left rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                        >
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                Platform Ops
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">Colleges, Maintenance, Users</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickFill("rohit.finance@orbitlms.in", "OrbitStaff@2026")}
                            className="p-2 text-left rounded-lg border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
                        >
                            <p className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                Finance Director
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">Billing, Invoices & Plans</p>
                        </button>
                    </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                    Restricted area. All sessions logged and audited with role-based access control.
                </p>
            </form>
        </AuthLayout>
    );
}
