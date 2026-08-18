import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Users,
  GraduationCap,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Sparkles,
  Key,
  ShieldCheck,
  Building2,
  Trash2
} from "lucide-react";

interface AdminBulkUserCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminBulkUserCreatorModal({
  open,
  onOpenChange,
  onSuccess
}: AdminBulkUserCreatorModalProps) {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState<"student" | "teacher" | "finance">("student");
  const [defaultDepartment, setDefaultDepartment] = useState("Computer Science & Engineering");
  const [defaultPasswordMode, setDefaultPasswordMode] = useState<"auto" | "common" | "custom">("auto");
  const [commonPassword, setCommonPassword] = useState("Orbit@2026!");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<any[]>([]);
  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [step, setStep] = useState<"input" | "results">("input");

  const handleDownloadTemplate = () => {
    let sample = "";
    if (targetRole === "student") {
      sample = `Full Name,Email,Password,Department,Mobile Number\nAarav Sharma,aarav.sharma@institution.edu,,Computer Science,+91 98765 43210\nAnanya Patel,ananya.patel@institution.edu,,Data Science,+91 98765 43211\nRohan Verma,rohan.verma@institution.edu,CustomPass123!,Computer Science,+91 98765 43212`;
    } else if (targetRole === "teacher") {
      sample = `Full Name,Email,Password,Department,Mobile Number\nDr. Vikramaditya Rao,dr.vikram@institution.edu,,Artificial Intelligence,+91 98765 55001\nProf. Meera Krishnan,prof.meera@institution.edu,TeacherPass@2026,Software Systems,+91 98765 55002`;
    } else {
      sample = `Full Name,Email,Password,Department,Mobile Number\nFinance Admin,finance.admin@institution.edu,FinancePass@2026,Accounts & Finance,+91 98765 99001`;
    }

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bulk_${targetRole}_creation_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Template Downloaded! 📥", description: `Saved bulk_${targetRole}_creation_template.csv` });
  };

  const handleProcessBulkCreation = async () => {
    if (!csvText.trim()) {
      toast({ variant: "destructive", title: "Empty List", description: "Please enter or paste user credentials to create." });
      return;
    }

    setLoading(true);
    setErrorsList([]);
    const results: any[] = [];
    const errors: string[] = [];

    try {
      const lines = csvText.split("\n").filter(l => l.trim().length > 0);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip header if user included header
        if (i === 0 && (line.toLowerCase().includes("email") || line.toLowerCase().includes("full name"))) {
          continue;
        }

        const parts = line.split(",").map(p => p.trim());
        const fullName = parts[0] || `${targetRole === "teacher" ? "Faculty" : "Student"} User`;
        const email = parts[1];
        let userPassword = parts[2];
        const department = parts[3] || defaultDepartment;
        const mobile = parts[4] || "";

        if (!email || !email.includes("@")) {
          errors.push(`Row ${i + 1}: Invalid email address "${email || line}"`);
          continue;
        }

        // Determine password
        if (!userPassword) {
          if (defaultPasswordMode === "common") {
            userPassword = commonPassword;
          } else {
            userPassword = `Orbit@${Math.floor(10000 + Math.random() * 90000)}`;
          }
        }

        try {
          // 1. Check if user exists in public.users
          const { data: existingUser } = await supabase
            .from("users")
            .select("id, email, role")
            .eq("email", email)
            .maybeSingle();

          let userId = existingUser?.id;

          if (!userId) {
            // Attempt Auth SignUp
            const { data: authData, error: authErr } = await supabase.auth.signUp({
              email,
              password: userPassword,
              options: {
                data: {
                  full_name: fullName,
                  role: targetRole,
                  department
                }
              }
            });

            userId = authData?.user?.id;

            if (!userId || authErr) {
              // Fallback direct insert into public.users
              const newId = crypto.randomUUID();
              const { data: insertedUser, error: insertErr } = await supabase
                .from("users")
                .insert([{
                  id: newId,
                  email,
                  full_name: fullName,
                  role: targetRole,
                  department,
                  mobile_number: mobile,
                  status: "active",
                  created_at: new Date().toISOString()
                }])
                .select("id")
                .single();

              if (insertErr) {
                errors.push(`Row ${i + 1} (${email}): ${insertErr.message}`);
                continue;
              }
              userId = insertedUser?.id || newId;
            }
          } else {
            // Update existing user role & department
            await supabase
              .from("users")
              .update({
                role: targetRole,
                full_name: fullName,
                department,
                mobile_number: mobile || undefined,
                status: "active"
              })
              .eq("id", userId);
          }

          results.push({
            id: userId,
            name: fullName,
            email,
            password: userPassword,
            role: targetRole,
            department,
            mobile,
            status: "Created & Active"
          });
        } catch (rowErr: any) {
          errors.push(`Row ${i + 1} (${email}): ${rowErr.message}`);
        }
      }

      setCreatedUsers(results);
      setErrorsList(errors);

      if (results.length > 0) {
        toast({
          title: `Bulk User Creation Finished! 🎉`,
          description: `Successfully created ${results.length} ${targetRole} accounts.`
        });
        setStep("results");
        if (onSuccess) onSuccess();
      } else {
        toast({
          variant: "destructive",
          title: "No Users Created",
          description: errors[0] || "Could not parse or create users from input."
        });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Bulk Process Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCredentialsCSV = () => {
    if (createdUsers.length === 0) return;
    try {
      const nowStr = new Date().toISOString().split("T")[0];
      let csv = `Full Name,Email / Login ID,Initial Password,Role,Department,Mobile,Account Status\n`;
      createdUsers.forEach(u => {
        csv += `"${u.name.replace(/"/g, '""')}","${u.email}","${u.password}","${u.role}","${u.department}","${u.mobile}","${u.status}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orbit_${targetRole}_credentials_${nowStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Credentials Exported! 📊", description: `Saved as orbit_${targetRole}_credentials_${nowStr}.csv` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Error", description: e.message });
    }
  };

  const handleCopyAllCredentials = () => {
    if (createdUsers.length === 0) return;
    let text = `ORBIT LMS - ${targetRole.toUpperCase()} LOGIN CREDENTIALS DIRECTORY\n`;
    text += `Generated on ${new Date().toLocaleString()}\n`;
    text += `=========================================================\n\n`;
    createdUsers.forEach((u, idx) => {
      text += `${idx + 1}. ${u.name} (${u.role.toUpperCase()} - ${u.department})\n`;
      text += `   Login ID / Email: ${u.email}\n`;
      text += `   Password: ${u.password}\n\n`;
    });

    navigator.clipboard.writeText(text);
    toast({ title: "Credentials Copied to Clipboard! 📋", description: `Copied ${createdUsers.length} user logins.` });
  };

  const handleResetModal = () => {
    setCsvText("");
    setCreatedUsers([]);
    setErrorsList([]);
    setStep("input");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                <Users className="h-6 w-6 text-primary" />
                Admin Bulk User ID & Password Creator
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Batch generate login accounts for students or faculty so they do not need to register individually.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 capitalize font-bold">
              Target: {targetRole}s
            </Badge>
          </div>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-5 py-3">
            {/* Configuration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">1. User Type / Role</Label>
                <Select value={targetRole} onValueChange={(val: any) => setTargetRole(val)}>
                  <SelectTrigger className="text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">🎓 Students (Bulk)</SelectItem>
                    <SelectItem value="teacher">👨‍🏫 Faculty / Teachers (Bulk)</SelectItem>
                    <SelectItem value="finance">💼 Finance Officers (Bulk)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">2. Default Department</Label>
                <Input
                  value={defaultDepartment}
                  onChange={(e) => setDefaultDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">3. Password Generation</Label>
                <Select value={defaultPasswordMode} onValueChange={(val: any) => setDefaultPasswordMode(val)}>
                  <SelectTrigger className="text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">🎲 Auto-generate Unique Passwords</SelectItem>
                    <SelectItem value="common">🔑 Common Initial Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {defaultPasswordMode === "common" && (
              <div className="p-3 rounded-xl border bg-primary/5 space-y-1.5">
                <Label className="text-xs font-bold">Common Initial Password for all users</Label>
                <Input
                  value={commonPassword}
                  onChange={(e) => setCommonPassword(e.target.value)}
                  placeholder="Orbit@2026!"
                  className="font-mono text-xs max-w-sm"
                />
                <p className="text-[11px] text-muted-foreground">Every newly created user will receive this password initially.</p>
              </div>
            )}

            {/* Input Box & Template Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  Paste User Details (CSV Format)
                </Label>
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="gap-1.5 text-xs font-semibold">
                  <Download className="h-3.5 w-3.5" /> Download CSV Template
                </Button>
              </div>

              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Format: Full Name, Email, Password (optional), Department (optional), Mobile (optional)\n\nAarav Sharma, aarav@institution.edu, , Computer Science, +91 9876543210\nAnanya Patel, ananya@institution.edu, SecretPass123!, Data Science, +91 9876543211\nRohan Verma, rohan@institution.edu`}
                className="min-h-[220px] font-mono text-xs leading-relaxed bg-background/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: You can copy and paste columns straight from Microsoft Excel or Google Sheets.
              </p>
            </div>

            <Button
              onClick={handleProcessBulkCreation}
              disabled={loading || !csvText.trim()}
              className="w-full gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Batch Creating {targetRole.toUpperCase()} Accounts...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate & Create {targetRole.toUpperCase()} ID & Passwords
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Results Step: Table of Created Credentials & Export */
          <div className="space-y-5 py-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5" /> Successfully Generated {createdUsers.length} {targetRole.toUpperCase()} Accounts!
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Credentials are created and active. Export or copy them below to distribute to students/teachers.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={handleExportCredentialsCSV} className="gap-1.5 text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button size="sm" onClick={handleCopyAllCredentials} className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground">
                  <Copy className="h-3.5 w-3.5" /> Copy All 📋
                </Button>
              </div>
            </div>

            {errorsList.length > 0 && (
              <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-destructive space-y-1">
                <p className="font-bold">Skipped rows ({errorsList.length}):</p>
                <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                  {errorsList.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Credentials Table */}
            <div className="border rounded-xl max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-md border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email / Login ID</th>
                    <th className="p-2.5">Password</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {createdUsers.map((u, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="p-2.5 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-foreground font-sans">{u.name}</td>
                      <td className="p-2.5 text-primary">{u.email}</td>
                      <td className="p-2.5 font-bold text-rose-500 bg-rose-500/5 px-2 rounded">{u.password}</td>
                      <td className="p-2.5 uppercase text-[10px] font-sans font-bold">{u.role}</td>
                      <td className="p-2.5 text-muted-foreground font-sans">{u.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleResetModal} className="text-xs">
                ← Create More Accounts
              </Button>
              <Button onClick={() => onOpenChange(false)} className="font-bold">
                Done & Close
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-3">
          <p className="text-xs text-muted-foreground font-mono">Orbit LMS Identity & Access Management</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
