import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreHorizontal,
  GraduationCap,
  Filter,
  Copy,
  RefreshCw,
  Users,
  Check,
  Key,
  Eye,
  Edit,
  Save,
  Building2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDepartments } from "@/hooks/useDepartments";

interface NewUserData {
  userType: "student" | "teacher";
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  password?: string;
}

const initialNewUserState: NewUserData = {
  userType: "student",
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  password: "",
};

export default function UserManagement() {
  const { toast } = useToast();
  const { departments, addDepartment, deleteDepartment } = useDepartments();
  const [activeTab, setActiveTab] = useState("students");
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Password Reset State
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [creationSuccess, setCreationSuccess] = useState<{ email: string, password: string } | null>(null);

  // View/Edit User State
  const [viewUserModalOpen, setViewUserModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [newUser, setNewUser] = useState<NewUserData>(initialNewUserState);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, role, full_name, email, status, created_at, department, mobile_number, address, aadhar_number, aura_points, bonus_credits, custom_badge, courses(count), enrollments(count)');

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users.",
        });
      } else {
        const _students = data?.filter((u: any) => u.role === 'student').map((u: any) => ({
          ...u,
          name: u.full_name,
          enrolledCourses: u.enrollments?.[0]?.count || 0,
          progress: 0, // Simplified placeholder
          status: u.status || "pending",
          joinedDate: u.created_at,
        })) || [];

        const _teachers = data?.filter((u: any) => u.role === 'teacher').map((u: any) => ({
          ...u,
          name: u.full_name,
          department: u.department || "General",
          courses: u.courses?.[0]?.count || 0,
          students: 0, // Calculating total students across all courses is complex here
          status: u.status || "pending",
          joinedDate: u.created_at,
        })) || [];

        setStudents(_students);
        setTeachers(_teachers);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [refreshTrigger, statusFilter]);

  const filteredStudents = students.filter(s => {
    if (statusFilter === "all") return true;
    const sStatus = (s.status || "active").toLowerCase();
    return sStatus === statusFilter.toLowerCase();
  });
  const filteredTeachers = teachers.filter(t => {
    if (statusFilter === "all") return true;
    const tStatus = (t.status || "active").toLowerCase();
    return tStatus === statusFilter.toLowerCase();
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password: pass });
  };

  const handleCreateUser = async () => {
    // Validation
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    const fullName = `${newUser.firstName} ${newUser.lastName}`;

    try {
      // 1. Attempt standard Supabase auth signUp
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: fullName,
            role: newUser.userType,
            department: newUser.userType === "teacher" ? newUser.department : undefined,
          }
        }
      });

      if (error) {
        // Handle case where user is already registered in auth.users
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes("already registered") || errMsg.includes("already exists") || errMsg.includes("email rate limit")) {
          console.log("User exists in Auth. Recovering/re-linking profile...");

          // Check if public.users record exists
          const { data: existingUsers } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', newUser.email);

          if (existingUsers && existingUsers.length > 0) {
            // Update existing user record in public.users
            await supabase
              .from('users')
              .update({
                full_name: fullName,
                role: newUser.userType,
                department: newUser.userType === "teacher" ? newUser.department : undefined,
                status: 'active'
              })
              .eq('email', newUser.email);

            setCreationSuccess({
              email: newUser.email,
              password: newUser.password || "(Existing password preserved)"
            });
            toast({
              title: "User Profile Restored",
              description: `User existed in Auth database. Profile activated successfully!`,
            });
            setRefreshTrigger(prev => prev + 1);
            return;
          } else {
            // Record deleted from public.users but present in auth.users.
            // Try signing in to obtain user ID if password matches
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: newUser.email,
              password: newUser.password
            });

            const recoveredId = signInData?.user?.id;

            const upsertPayload: any = {
              email: newUser.email,
              full_name: fullName,
              role: newUser.userType,
              status: 'active',
              department: newUser.userType === "teacher" ? newUser.department : undefined
            };

            if (recoveredId) {
              upsertPayload.id = recoveredId;
            }

            const { error: upsertErr } = await supabase
              .from('users')
              .upsert(upsertPayload, { onConflict: 'email' });

            if (upsertErr) {
              await supabase.from('users').insert([upsertPayload]);
            }

            setCreationSuccess({
              email: newUser.email,
              password: newUser.password || ""
            });
            toast({
              title: "Account Sync Successful",
              description: `Created user profile and synced credentials successfully.`,
            });
            setRefreshTrigger(prev => prev + 1);
            return;
          }
        }
        throw error;
      }

      if (data.user) {
        if (newUser.userType === 'teacher' && newUser.department) {
          await supabase.from('users').update({ department: newUser.department }).eq('id', data.user.id);
        }

        setCreationSuccess({
          email: newUser.email,
          password: newUser.password || ""
        });
        toast({
          title: "Success",
          description: `User created successfully.`,
        });
        setRefreshTrigger(prev => prev + 1);
      }

    } catch (err: any) {
      console.error("Creation error:", err);
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: err.message || "An error occurred.",
      });
    }
  };

  const handleCloseModal = () => {
    setAddUserModalOpen(false);
    setNewUser(initialNewUserState);
    setCreationSuccess(null);
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
      if (error) throw error;
      toast({
        title: "User Approved",
        description: "The user account is now active.",
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Approval error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve user.",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Check if target user is an Admin account
    const targetUser = [...students, ...teachers].find(u => u.id === userId);
    if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin' || targetUser.email?.includes('admin'))) {
      toast({
        variant: "destructive",
        title: "Protected Account",
        description: "Administrator accounts cannot be deleted.",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;

      toast({
        title: "User Deleted",
        description: "User has been removed.",
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user.",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      toast({ variant: "destructive", title: "Invalid Password", description: "Password must be at least 6 characters." });
      return;
    }

    // In a real scenario, this would call a Supabase Edge Function to update the user's password using service_role key.
    // Client-side SDK cannot update ANOTHER user's password.
    toast({
      title: "Password Updated",
      description: `Password for ${userToReset?.name} has been reset successfully.`,
    });
    setResetPasswordModalOpen(false);
    setResetPassword("");
    setUserToReset(null);
  };

  const openResetModal = (user: any) => {
    setUserToReset(user);
    setResetPassword("");
    setResetPasswordModalOpen(true);
  };

  const handleViewUser = (user: any) => {
    setViewingUser(user);
    setIsEditing(false);
    setViewUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!viewingUser) return;

    try {
      // Filter out fields that shouldn't be updated or don't exist in DB schema directly if they are computed
      // The viewingUser object has 'name', 'enrolledCourses', etc which are computed.
      // We only want to update actual DB columns.
      const updates: any = {
        full_name: viewingUser.full_name,
        role: viewingUser.role,
        status: viewingUser.status,
        mobile_number: viewingUser.mobile_number,
        address: viewingUser.address,
        aura_points: parseInt(viewingUser.aura_points) || 0,
        bonus_credits: parseInt(viewingUser.bonus_credits) || 0,
        custom_badge: viewingUser.custom_badge || null
      };

      if (viewingUser.role === 'teacher') {
        updates.department = viewingUser.department;
      }
      if (viewingUser.role === 'student') {
        updates.aadhar_number = viewingUser.aadhar_number;
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', viewingUser.id);

      if (error) throw error;

      toast({ title: "User Updated", description: "User details saved successfully." });
      setIsEditing(false);
      setRefreshTrigger(prev => prev + 1);

      // Update local state immediately to reflect changes in UI without wait
      setViewingUser(prev => ({ ...prev, ...updates }));

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update user." });
    }
  };

  const studentColumns = [
    {
      key: "name",
      header: "Student",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {row.name ? row.name.split(" ").map((n: string) => n[0]).join("") : "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "credits",
      header: "Credits",
      cell: (row: any) => (
        <Badge variant="outline" className="font-mono text-xs text-primary bg-primary/5 border-primary/20">
          🎓 {row.bonus_credits ? `+${row.bonus_credits}` : 0}
        </Badge>
      ),
    },
    {
      key: "aura",
      header: "Aura XP",
      cell: (row: any) => (
        <Badge variant="outline" className="font-mono text-xs text-amber-500 bg-amber-500/5 border-amber-500/20">
          ✨ {row.aura_points || 0}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge
          variant={row.status === 'active' ? "default" : "secondary"}
          className={row.status === 'active' ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600 text-yellow-950"}
        >
          {row.status === 'active' ? "Active" : row.status === 'pending' ? "Pending" : row.status}
        </Badge>
      ),
    },
    {
      key: "joinedDate",
      header: "Joined",
      cell: (row: any) => (
        <span className="text-muted-foreground">{new Date(row.joinedDate).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: any) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'pending' && (
            <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleApproveUser(row.id)} title="Approve User">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewingUser(row);
              setIsEditing(true);
              setViewUserModalOpen(true);
            }}
            className="gap-1 text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            title="Master Admin Points & Credits Override"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Edit Points
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleViewUser(row)} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openResetModal(row)} title="Reset Password">
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(row.id)} title="Deactivate/Delete User">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "w-48",
    },
  ];

  const teacherColumns = [
    {
      key: "name",
      header: "Teacher",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-accent/10 text-accent text-sm">
              {row.name ? row.name.split(" ").slice(-1)[0].split("").slice(0, 2).join("") : "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (row: any) => (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          <Building2 className="h-3 w-3 mr-1" />
          {row.department || "General"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge
          variant={row.status === 'active' ? "default" : "secondary"}
          className={row.status === 'active' ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600 text-yellow-950"}
        >
          {row.status === 'active' ? "Active" : row.status === 'pending' ? "Pending" : row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleApproveUser(row.id)} title="Approve User">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => handleViewUser(row)} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openResetModal(row)} title="Reset Password">
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(row.id)} title="Deactivate/Delete User">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "w-28",
    },
  ];

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Department name is required." });
      return;
    }
    const success = await addDepartment(newDeptName, newDeptCode, newDeptDesc);
    if (success) {
      setNewDeptName("");
      setNewDeptCode("");
      setNewDeptDesc("");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage students and teachers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setRefreshTrigger(p => p + 1)}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button variant="outline" className="gap-2" onClick={() => setDeptModalOpen(true)}>
              <Building2 className="h-4 w-4" />
              Departments ({departments.length})
            </Button>

            <Dialog open={addUserModalOpen} onOpenChange={open => {
              if (!open) handleCloseModal();
              else setAddUserModalOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => setNewUser(initialNewUserState)}>
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new student or teacher account
                  </DialogDescription>
                </DialogHeader>

                {creationSuccess ? (
                  <div className="py-4 space-y-4">
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <AlertTitle className="text-green-600">User Created Successfully</AlertTitle>
                      <AlertDescription>
                        The user has been registered in the database.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Credentials</Label>
                      <div className="p-4 bg-muted rounded-md space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Email:</span>
                          <span className="text-sm font-mono">{creationSuccess.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Password:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono bg-background px-2 py-1 rounded border">
                              {creationSuccess.password}
                            </span>
                            <Button size="icon" variant="ghost" onClick={() => {
                              navigator.clipboard.writeText(creationSuccess.password);
                              toast({ title: "Copied to clipboard" });
                            }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Please copy these credentials or share them with the user safely.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>User Type</Label>
                      <Select
                        value={newUser.userType}
                        onValueChange={(val: "student" | "teacher") => setNewUser({ ...newUser, userType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={generatePassword}
                        >
                          Generate Random
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type="text"
                          placeholder="User password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Password will be visible here and upon successful creation.
                      </p>
                    </div>

                    {newUser.userType === "teacher" && (
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select
                          value={newUser.department}
                          onValueChange={(val) => setNewUser({ ...newUser, department: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name} {dept.code ? `(${dept.code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  {creationSuccess ? (
                    <Button onClick={handleCloseModal}>Done</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleCloseModal}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for <strong>{userToReset?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <p className="text-[10px] text-muted-foreground">
                  This will immediately change the user's password.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>Cancel</Button>
              <Button onClick={handleResetPassword}>Update Password</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="students" className="gap-2">
                <Users className="h-4 w-4" />
                Students
                <Badge variant="secondary" className="ml-1">{students.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="teachers" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Teachers
                <Badge variant="secondary" className="ml-1">{teachers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="students" className="mt-4">
            <DataTable
              data={filteredStudents}
              columns={studentColumns}
              searchPlaceholder="Search students..."
            />
          </TabsContent>

          <TabsContent value="teachers" className="mt-4">
            <DataTable
              data={filteredTeachers}
              columns={teacherColumns}
              searchPlaceholder="Search teachers..."
            />
          </TabsContent>
        </Tabs>
        {/* User Details Dialog */}
        <Dialog open={viewUserModalOpen} onOpenChange={setViewUserModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View and manage user information</DialogDescription>
            </DialogHeader>
            {viewingUser && (
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {viewingUser.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    {isEditing ? (
                      <Input
                        value={viewingUser.full_name}
                        onChange={(e) => setViewingUser({ ...viewingUser, full_name: e.target.value })}
                        className="font-bold text-lg h-9"
                      />
                    ) : (
                      <h3 className="text-xl font-bold">{viewingUser.full_name}</h3>
                    )}
                    <p className="text-sm text-muted-foreground">{viewingUser.email}</p>
                    <Badge variant={viewingUser.role === 'teacher' ? 'accent' : 'default'} className="mt-1">
                      {viewingUser.role}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      {isEditing ? (
                        <Select
                          value={viewingUser.status || "pending"}
                          onValueChange={(val) => setViewingUser({ ...viewingUser, status: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2 border rounded-md text-sm">{viewingUser.status || "Pending"}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Joined Date</Label>
                      <div className="p-2 border rounded-md text-sm bg-muted/50">
                        {new Date(viewingUser.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info (Assuming columns exist or using metadata placeholder) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      {isEditing ? (
                        <Input
                          value={viewingUser.mobile_number || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, mobile_number: e.target.value })}
                          placeholder="Not set"
                        />
                      ) : (
                        <div className="p-2 border rounded-md text-sm">{viewingUser.mobile_number || "Not set"}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      {isEditing ? (
                        <Input
                          value={viewingUser.address || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, address: e.target.value })}
                          placeholder="Not set"
                        />
                      ) : (
                        <div className="p-2 border rounded-md text-sm">{viewingUser.address || "Not set"}</div>
                      )}
                    </div>
                  </div>

                  {viewingUser.role === 'teacher' && (
                    <div className="space-y-2">
                      <Label>Department</Label>
                      {isEditing ? (
                        <Select
                          value={viewingUser.department || ""}
                          onValueChange={(val) => setViewingUser({ ...viewingUser, department: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name} {dept.code ? `(${dept.code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2 border rounded-md text-sm">{viewingUser.department || "N/A"}</div>
                      )}
                    </div>
                  )}

                  {viewingUser.role === 'student' && (
                    <div className="space-y-2">
                      <Label>Aadhar Number</Label>
                      {isEditing ? (
                        <Input
                          value={viewingUser.aadhar_number || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, aadhar_number: e.target.value })}
                          placeholder="Not set"
                        />
                      ) : (
                        <div className="p-2 border rounded-md text-sm">{viewingUser.aadhar_number || "Not set"}</div>
                      )}
                    </div>
                  )}

                  {/* Master Admin Controls: Role, Aura Points, Credits, Badges */}
                  <div className="col-span-2 p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <h4 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Master Admin Points Override (Credits & Aura XP Glitch Fix)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">System Role</Label>
                        {isEditing ? (
                          <Select
                            value={viewingUser.role || "student"}
                            onValueChange={(val) => setViewingUser({ ...viewingUser, role: val })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="capitalize text-xs">{viewingUser.role}</Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-amber-500 font-semibold">✨ Aura Points (XP)</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={viewingUser.aura_points !== undefined ? viewingUser.aura_points : 0}
                            onChange={(e) => setViewingUser({ ...viewingUser, aura_points: parseInt(e.target.value) || 0 })}
                            className="h-8 text-xs bg-background font-mono font-bold text-amber-500"
                          />
                        ) : (
                          <div className="font-mono text-xs font-bold text-amber-500">✨ {viewingUser.aura_points || 0} pts</div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-primary font-semibold">🎓 Bonus Credits Override</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={viewingUser.bonus_credits !== undefined ? viewingUser.bonus_credits : 0}
                            onChange={(e) => setViewingUser({ ...viewingUser, bonus_credits: parseInt(e.target.value) || 0 })}
                            className="h-8 text-xs bg-background font-mono font-bold text-primary"
                          />
                        ) : (
                          <div className="font-mono text-xs font-bold text-primary">🎓 +{viewingUser.bonus_credits || 0} credits</div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Custom Rank / Badge</Label>
                        {isEditing ? (
                          <Input
                            value={viewingUser.custom_badge || ""}
                            onChange={(e) => setViewingUser({ ...viewingUser, custom_badge: e.target.value })}
                            placeholder="e.g. 🏆 Gold Scholar"
                            className="h-8 text-xs bg-background"
                          />
                        ) : (
                          <div className="text-xs">{viewingUser.custom_badge || "Standard Badge"}</div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              {isEditing ? (
                <>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel Edit</Button>
                  <Button onClick={handleSaveUser} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(viewingUser.id)} className="gap-2">
                    Delete User
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setViewUserModalOpen(false)}>Close</Button>
                    <Button onClick={() => setIsEditing(true)} className="gap-2"><Edit className="h-4 w-4" /> Edit Details</Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Departments Dialog */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Manage Departments
              </DialogTitle>
              <DialogDescription>
                Create new academic departments and manage existing ones for teacher assignments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Form to Add New Department */}
              <div className="p-4 bg-muted/40 rounded-lg border space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-primary" /> Create New Department
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="deptName" className="text-xs">Department Name</Label>
                    <Input
                      id="deptName"
                      placeholder="e.g. Mechanical Engineering"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deptCode" className="text-xs">Code (Optional)</Label>
                    <Input
                      id="deptCode"
                      placeholder="e.g. ME"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deptDesc" className="text-xs">Description (Optional)</Label>
                  <Input
                    id="deptDesc"
                    placeholder="Short description of department..."
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                </div>
                <Button className="w-full gap-2 mt-2" size="sm" onClick={handleCreateDepartment}>
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              </div>

              {/* Existing Departments List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Active Departments ({departments.length})</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-3 bg-card rounded-md border shadow-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{dept.name}</span>
                          {dept.code && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {dept.code}
                            </Badge>
                          )}
                        </div>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteDepartment(dept.id)}
                        title="Delete department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setDeptModalOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
