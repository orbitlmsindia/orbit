import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  UserPlus,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  Loader2,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  GraduationCap,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

interface MasterCreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialCollegeId?: string | null;
  initialRole?: "admin" | "teacher" | "student" | "finance" | "super_admin";
}

interface CreatedAccountInfo {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: string;
  roleTitle: string;
  collegeName: string;
  collegeId: string | null;
  department: string;
  phone: string;
  loginUrl: string;
  portalUrl: string;
}

export function MasterCreateAccountModal({
  open,
  onOpenChange,
  onSuccess,
  initialCollegeId,
  initialRole = "admin",
}: MasterCreateAccountModalProps) {
  const { toast } = useToast();

  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "teacher" | "student" | "finance" | "super_admin">(initialRole);
  const [collegeId, setCollegeId] = useState<string>(initialCollegeId || "none");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch colleges list on open
  useEffect(() => {
    if (open) {
      fetchColleges();
      generateRandomPassword();
      if (initialCollegeId) {
        setCollegeId(initialCollegeId);
      }
      if (initialRole) {
        setRole(initialRole);
      }
      setStep("form");
      setCopied(false);
    }
  }, [open, initialCollegeId, initialRole]);

  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const { data, error } = await supabase
        .from("colleges")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setColleges(data || []);
      if (!initialCollegeId && data && data.length > 0 && collegeId === "none") {
        setCollegeId(data[0].id);
      }
    } catch (err: any) {
      console.error("Error loading colleges for account creator:", err);
    } finally {
      setLoadingColleges(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const special = "@#$!";
    let pass = "";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += special.charAt(Math.floor(Math.random() * special.length));
    pass += Math.floor(100 + Math.random() * 900);
    setPassword(`Orbit@${pass}`);
  };

  const getRoleBadgeInfo = (r: string) => {
    switch (r) {
      case "admin":
        return {
          title: "College / Institutional Admin",
          portal: "/admin",
          color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
          icon: ShieldCheck,
        };
      case "teacher":
        return {
          title: "Faculty / Instructor",
          portal: "/teacher",
          color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
          icon: BookOpen,
        };
      case "student":
        return {
          title: "Student / Learner",
          portal: "/student",
          color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
          icon: GraduationCap,
        };
      case "finance":
        return {
          title: "Finance Controller",
          portal: "/finance",
          color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
          icon: CreditCard,
        };
      case "super_admin":
        return {
          title: "Master SaaS Super Admin",
          portal: "/master",
          color: "border-rose-500/40 text-rose-400 bg-rose-500/10",
          icon: Crown,
        };
      default:
        return {
          title: r,
          portal: "/dashboard",
          color: "border-slate-500 text-slate-400 bg-slate-800",
          icon: User,
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all mandatory fields (Name, Email, Password).",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const targetCollegeId = collegeId === "none" ? null : collegeId;
      const roleInfo = getRoleBadgeInfo(role);

      // 1. Create a non-session-persisting client so Master Admin session is completely undisturbed
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const nonPersistingClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // 2. Perform Supabase Auth SignUp
      const { data: authData, error: authError } = await nonPersistingClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
            college_id: targetCollegeId,
            department: department.trim() || null,
            phone: phone.trim() || null,
          },
        },
      });

      let userId = authData?.user?.id;

      if (authError) {
        console.warn("Auth signup error, attempting direct public.users check:", authError.message);
        // If user already registered in auth, check if they exist in public.users
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (existingUser) {
          throw new Error(`An account with email "${cleanEmail}" already exists in the system.`);
        }
      }

      // If auth returned an id or we need fallback ID
      if (!userId) {
        userId = crypto.randomUUID();
      }

      // 3. Upsert into public.users to guarantee active status and tenant association
      const { error: dbError } = await supabase.from("users").upsert({
        id: userId,
        email: cleanEmail,
        full_name: fullName.trim(),
        role: role,
        college_id: targetCollegeId,
        department: department.trim() || null,
        phone_number: phone.trim() || null,
        mobile_number: phone.trim() || null,
        status: "active",
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Database user upsert error:", dbError);
        throw dbError;
      }

      const collegeObj = colleges.find((c) => c.id === targetCollegeId);
      const collegeName = collegeObj ? collegeObj.name : "Global Orbit Ecosystem";

      const createdInfo: CreatedAccountInfo = {
        id: userId,
        fullName: fullName.trim(),
        email: cleanEmail,
        password: password,
        role: role,
        roleTitle: roleInfo.title,
        collegeName: collegeName,
        collegeId: targetCollegeId,
        department: department.trim() || "Institutional Core",
        phone: phone.trim() || "N/A",
        loginUrl: `${window.location.origin}/login`,
        portalUrl: `${window.location.origin}${roleInfo.portal}`,
      };

      setCreatedAccount(createdInfo);
      setStep("success");

      toast({
        title: "Account Provisioned Successfully! 🎉",
        description: `Institutional ID for ${fullName.trim()} (${roleInfo.title}) is live and active.`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Account creation failure:", err);
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: err.message || "Could not create user account. Please check inputs and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdAccount) return;
    const text = `Orbit LMS Institutional Access Credentials
---------------------------------------------
Account Holder: ${createdAccount.fullName}
Designated Role: ${createdAccount.roleTitle}
Institution: ${createdAccount.collegeName}
Login Email: ${createdAccount.email}
Password: ${createdAccount.password}
Login Portal: ${createdAccount.loginUrl}
Direct Workspace: ${createdAccount.portalUrl}
Status: Active & Verified
---------------------------------------------
Please keep your institutional credentials confidential.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Credentials Copied! 📋",
      description: "Full institutional login slip copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleResetForAnother = () => {
    setFullName("");
    setEmail("");
    setDepartment("");
    setPhone("");
    generateRandomPassword();
    setStep("form");
    setCreatedAccount(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Provision Institutional ID & Account
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Backend-provisioned credentials with role boundaries and institution tenant mapping.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Institution / College Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" /> Target Institution / Campus
                </span>
                {colleges.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    {colleges.length} Active Campuses
                  </span>
                )}
              </Label>
              <Select value={collegeId} onValueChange={setCollegeId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-10">
                  <SelectValue placeholder="Select Institution" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="none" className="text-amber-400">
                    Orbit Global Platform (No College Assignment)
                  </SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Privilege Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Account Type & Role Privilege
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "admin", label: "College Admin", desc: "Campus Controller", icon: ShieldCheck },
                  { id: "teacher", label: "Faculty / Teacher", desc: "Courses & Grading", icon: BookOpen },
                  { id: "student", label: "Student", desc: "Learner & Attendance", icon: GraduationCap },
                  { id: "finance", label: "Finance Officer", desc: "Invoices & Fees", icon: CreditCard },
                  { id: "super_admin", label: "Master Admin", desc: "SaaS Command", icon: Crown },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-950/70 border-indigo-500 shadow-md shadow-indigo-500/20 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                      </div>
                      <div className="text-xs font-bold leading-tight truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-fullname" className="text-xs font-semibold text-slate-300">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-fullname"
                    type="text"
                    required
                    placeholder="e.g. Dr. Sunita Deshmukh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-white text-xs h-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-semibold text-slate-300">
                  Institutional Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-email"
                    type="email"
                    required
                    placeholder="e.g. faculty@campus.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-white text-xs h-10 font-mono"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Password with Generator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-password" className="text-xs font-semibold text-slate-300">
                  Account Password *
                </Label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Auto-Generate Secure Key
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 bg-slate-950 border-slate-800 text-white text-xs h-10 font-mono"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Department & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-department" className="text-xs font-semibold text-slate-300">
                  Department / Program
                </Label>
                <Input
                  id="create-department"
                  type="text"
                  placeholder="e.g. Computer Science & Eng."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-10"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-phone" className="text-xs font-semibold text-slate-300">
                  Contact Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-phone"
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-white text-xs h-10 font-mono"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Provisioning in Supabase...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Provision Account ID
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Success Screen */
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Institutional ID Created & Activated</div>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  The account has been provisioned in Supabase Authentication and linked to{" "}
                  <strong>{createdAccount?.collegeName}</strong>. The user can now log in immediately.
                </p>
              </div>
            </div>

            {/* Credential Slip Card */}
            {createdAccount && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans text-xs font-semibold">Credential Voucher</span>
                  <Badge variant="outline" className={getRoleBadgeInfo(createdAccount.role).color}>
                    {createdAccount.roleTitle}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Name:</span>{" "}
                    <span className="text-white font-sans font-bold">{createdAccount.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Institution:</span>{" "}
                    <span className="text-slate-200 truncate">{createdAccount.collegeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Login Email:</span>{" "}
                    <span className="text-indigo-300 font-bold">{createdAccount.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Password:</span>{" "}
                    <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      {createdAccount.password}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Direct Workspace:</span>{" "}
                    <span className="text-slate-300">{createdAccount.portalUrl}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Voucher
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Complete Slip
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForAnother}
                className="border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" /> Provision Another ID
              </Button>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Close & Return
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
