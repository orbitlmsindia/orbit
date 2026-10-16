import { useState, useEffect } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  UserPlus,
  Plus,
  Users,
  Key,
  Lock,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Copy,
  Search,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Layers,
  Activity,
  AlertCircle,
  FileCheck,
  MoreVertical,
  Check,
  RotateCcw,
  Shield,
  Briefcase,
  Terminal,
  Cpu,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  PlatformPermission,
  MasterRole,
  MasterStaffMember,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_STAFF,
} from "@/types/roles";

const LOCAL_STORAGE_ROLES_KEY = "orbit_master_roles";
const LOCAL_STORAGE_STAFF_KEY = "orbit_master_staff";

export default function MasterRoles() {
  const [roles, setRoles] = useState<MasterRole[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_ROLES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_ROLES;
  });

  const [staff, setStaff] = useState<MasterStaffMember[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_STAFF_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STAFF;
  });

  const [loading, setLoading] = useState(false);
  const [searchStaff, setSearchStaff] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<MasterStaffMember | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for role creation/edit
  const [editingRole, setEditingRole] = useState<MasterRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleColor, setRoleColor] = useState("from-blue-600 to-indigo-600");
  const [selectedPermissions, setSelectedPermissions] = useState<PlatformPermission[]>([]);

  // Form states for staff creation/edit
  const [editingStaff, setEditingStaff] = useState<MasterStaffMember | null>(null);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffDepartment, setStaffDepartment] = useState("");
  const [staffRoleSlug, setStaffRoleSlug] = useState("");
  const [staffInitialPassword, setStaffInitialPassword] = useState("OrbitStaff@2026");

  // Load from Supabase on mount
  useEffect(() => {
    fetchFromSupabase();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ROLES_KEY, JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(staff));
  }, [staff]);

  const fetchFromSupabase = async () => {
    setLoading(true);
    try {
      // 1. Fetch roles
      const { data: dbRoles, error: rolesError } = await supabase
        .from("master_roles")
        .select("*")
        .order("created_at", { ascending: true });

      if (!rolesError && dbRoles && dbRoles.length > 0) {
        const formattedRoles: MasterRole[] = dbRoles.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description || "",
          color: r.color || "from-blue-600 to-indigo-600",
          permissions: Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || "[]"),
          isSystem: Boolean(r.is_system),
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        }));
        setRoles(formattedRoles);
      }

      // 2. Fetch staff
      const { data: dbStaff, error: staffError } = await supabase
        .from("master_staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (!staffError && dbStaff && dbStaff.length > 0) {
        const formattedStaff: MasterStaffMember[] = dbStaff.map((s: any) => ({
          id: s.id,
          fullName: s.full_name,
          email: s.email,
          phone: s.phone || "",
          department: s.department || "Operations",
          roleSlug: s.role_slug,
          roleName: s.role_name || s.role_slug,
          status: s.status || "active",
          avatar: s.avatar || "",
          lastLogin: s.last_login || "Never",
          created_at: s.created_at || new Date().toISOString(),
        }));
        setStaff(formattedStaff);
      }
    } catch (err) {
      console.warn("Could not query master_roles / master_staff from Supabase, using local defaults:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by category
  const permissionCategories = Array.from(
    new Set(ALL_PERMISSIONS.map((p) => p.category))
  );

  // Quick stats
  const totalStaffCount = staff.length;
  const activeStaffCount = staff.filter((s) => s.status === "active").length;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;
  const totalRolesCount = roles.length;

  // Handle Role Creation / Update
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleSlug("");
    setRoleDescription("");
    setRoleColor("from-indigo-600 to-violet-600");
    setSelectedPermissions([
      "view_colleges",
      "view_accounts",
      "view_courses",
      "view_analytics",
    ]);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: MasterRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRoleDescription(role.description);
    setRoleColor(role.color);
    setSelectedPermissions(role.permissions);
    setIsRoleModalOpen(true);
  };

  const handleCloneRole = (role: MasterRole) => {
    setEditingRole(null);
    setRoleName(`${role.name} (Copy)`);
    setRoleSlug(`${role.slug}_copy_${Date.now().toString().slice(-4)}`);
    setRoleDescription(`Custom variation based on ${role.name}.`);
    setRoleColor(role.color);
    setSelectedPermissions([...role.permissions]);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    const slug = roleSlug.trim() || roleName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const newRoleData: MasterRole = {
      id: editingRole ? editingRole.id : `role_${Date.now()}`,
      name: roleName.trim(),
      slug,
      description: roleDescription.trim(),
      color: roleColor,
      permissions: selectedPermissions,
      isSystem: editingRole ? editingRole.isSystem : false,
      created_at: editingRole ? editingRole.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedRoles: MasterRole[];
    if (editingRole) {
      updatedRoles = roles.map((r) => (r.id === editingRole.id ? newRoleData : r));
    } else {
      updatedRoles = [...roles, newRoleData];
    }

    setRoles(updatedRoles);
    setIsRoleModalOpen(false);

    // Try saving to Supabase
    try {
      await supabase.from("master_roles").upsert({
        id: newRoleData.id,
        name: newRoleData.name,
        slug: newRoleData.slug,
        description: newRoleData.description,
        color: newRoleData.color,
        permissions: newRoleData.permissions,
        is_system: newRoleData.isSystem,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Supabase upsert role note:", err);
    }
  };

  const handleDeleteRole = async (roleId: string, roleSlug: string) => {
    if (confirm("Are you sure you want to delete this custom role? Any staff assigned to this role must be reassigned.")) {
      const updatedRoles = roles.filter((r) => r.id !== roleId);
      setRoles(updatedRoles);

      try {
        await supabase.from("master_roles").delete().eq("id", roleId);
      } catch (err) {
        console.warn("Supabase delete role note:", err);
      }
    }
  };

  const togglePermission = (permId: PlatformPermission) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const toggleCategoryPermissions = (category: string) => {
    const categoryPermIds = ALL_PERMISSIONS.filter((p) => p.category === category).map((p) => p.id);
    const allSelected = categoryPermIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((id) => !categoryPermIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedPermissions, ...categoryPermIds]));
      setSelectedPermissions(merged);
    }
  };

  // Staff Modal Management
  const handleOpenInviteStaff = () => {
    setEditingStaff(null);
    setStaffFullName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffDepartment("Operations");
    setStaffRoleSlug(roles[1]?.slug || "tech_architect");
    setStaffInitialPassword("OrbitStaff@2026");
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (member: MasterStaffMember) => {
    setEditingStaff(member);
    setStaffFullName(member.fullName);
    setStaffEmail(member.email);
    setStaffPhone(member.phone || "");
    setStaffDepartment(member.department);
    setStaffRoleSlug(member.roleSlug);
    setStaffInitialPassword("OrbitStaff@2026");
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim() || !staffRoleSlug) return;

    const assignedRole = roles.find((r) => r.slug === staffRoleSlug);
    const roleTitle = assignedRole ? assignedRole.name : staffRoleSlug;

    const newStaffData: MasterStaffMember = {
      id: editingStaff ? editingStaff.id : `staff_${Date.now()}`,
      fullName: staffFullName.trim(),
      email: staffEmail.trim().toLowerCase(),
      phone: staffPhone.trim(),
      department: staffDepartment.trim() || "Operations",
      roleSlug: staffRoleSlug,
      roleName: roleTitle,
      status: editingStaff ? editingStaff.status : "active",
      avatar: editingStaff?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(staffFullName)}`,
      lastLogin: editingStaff ? editingStaff.lastLogin : "Never",
      created_at: editingStaff ? editingStaff.created_at : new Date().toISOString(),
    };

    let updatedStaff: MasterStaffMember[];
    if (editingStaff) {
      updatedStaff = staff.map((s) => (s.id === editingStaff.id ? newStaffData : s));
    } else {
      updatedStaff = [newStaffData, ...staff];
    }

    setStaff(updatedStaff);
    setIsStaffModalOpen(false);

    // Try saving to Supabase
    try {
      await supabase.from("master_staff").upsert({
        id: newStaffData.id,
        full_name: newStaffData.fullName,
        email: newStaffData.email,
        phone: newStaffData.phone,
        department: newStaffData.department,
        role_slug: newStaffData.roleSlug,
        role_name: newStaffData.roleName,
        status: newStaffData.status,
        avatar: newStaffData.avatar,
      });
    } catch (err) {
      console.warn("Supabase upsert staff note:", err);
    }
  };

  const toggleStaffStatus = async (member: MasterStaffMember) => {
    const nextStatus = member.status === "active" ? "suspended" : "active";
    const updated = staff.map((s) => (s.id === member.id ? { ...s, status: nextStatus as any } : s));
    setStaff(updated);

    try {
      await supabase.from("master_staff").update({ status: nextStatus }).eq("id", member.id);
    } catch (err) {
      console.warn("Supabase toggle status note:", err);
    }
  };

  const handleDeleteStaff = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this staff delegate from Master Admin access?")) {
      const updated = staff.filter((s) => s.id !== memberId);
      setStaff(updated);

      try {
        await supabase.from("master_staff").delete().eq("id", memberId);
      } catch (err) {
        console.warn("Supabase delete staff note:", err);
      }
    }
  };

  const handleOpenResetPassword = (member: MasterStaffMember) => {
    setSelectedStaffForPassword(member);
    setTempPassword(`Orbit#${Math.random().toString(36).slice(-6).toUpperCase()}!`);
    setIsResetPasswordModalOpen(true);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered staff list
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.fullName.toLowerCase().includes(searchStaff.toLowerCase()) ||
      member.email.toLowerCase().includes(searchStaff.toLowerCase()) ||
      member.department.toLowerCase().includes(searchStaff.toLowerCase()) ||
      member.roleName.toLowerCase().includes(searchStaff.toLowerCase());

    const matchesRole = roleFilter === "all" || member.roleSlug === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <MasterLayout
      headerTitle="Staff Roles & Delegation"
      headerDescription="Empower Technical Architects, Operations Leads, and specialized executives to act on behalf of the Master Admin with granular permission controls."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFromSupabase}
            disabled={loading}
            className="border-border hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Sync Supabase
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreateRole}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Role
          </Button>

          <Button
            size="sm"
            onClick={handleOpenInviteStaff}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Staff Member
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/80 shadow-sm bg-card hover:border-primary/30 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Staff Delegates
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{totalStaffCount}</span>
                  <span className="text-xs text-emerald-600 font-medium">({activeStaffCount} active)</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-card hover:border-primary/30 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configured Roles
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{totalRolesCount}</span>
                  <span className="text-xs text-blue-600 font-medium">({customRolesCount} custom)</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-card hover:border-primary/30 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Granular Permissions
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{ALL_PERMISSIONS.length}</span>
                  <span className="text-xs text-muted-foreground font-medium">across 10 modules</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Key className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm bg-card hover:border-primary/30 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Root Master Authority
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold font-display text-amber-600">Active</span>
                  <span className="text-xs text-muted-foreground font-medium">master@orbitlms.in</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Shield className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informative Security Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Delegated Security Model
              </Badge>
              <span className="text-xs text-slate-300">RBAC Architecture</span>
            </div>
            <h3 className="text-base font-semibold">
              Delegate Master Capabilities with Full Confidence
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Assigned staff members (e.g., <strong>Technical Architect</strong>, <strong>Finance Director</strong>, or custom roles) can log in via <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">/master/login</code>. The Master Sidebar automatically dynamically adapts to reveal only the modules each staff member is authorized to control.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => {
                const matrixTab = document.getElementById("tab-trigger-matrix");
                matrixTab?.click();
              }}
            >
              <Cpu className="h-4 w-4 mr-1.5" />
              View Matrix
            </Button>
          </div>
        </div>

        {/* Main Tabs Container */}
        <Tabs defaultValue="staff" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl w-full sm:w-auto flex flex-wrap border border-border">
            <TabsTrigger value="staff" className="flex items-center gap-2 px-4 py-2">
              <Users className="h-4 w-4" />
              Staff Directory & Delegates ({staff.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2 px-4 py-2">
              <ShieldCheck className="h-4 w-4" />
              Custom Roles & Permissions ({roles.length})
            </TabsTrigger>
            <TabsTrigger id="tab-trigger-matrix" value="matrix" className="flex items-center gap-2 px-4 py-2">
              <Layers className="h-4 w-4" />
              Full Permissions Matrix
            </TabsTrigger>
          </TabsList>

          {/* ───────────────────────────────────────────────────────────
              TAB 1: STAFF DIRECTORY & DELEGATES
          ─────────────────────────────────────────────────────────── */}
          <TabsContent value="staff" className="space-y-4">
            {/* Filter Bar */}
            <Card className="border border-border">
              <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff by name, email, department, or role..."
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assigned Roles</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchStaff("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Staff Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStaff.map((member) => {
                const assignedRole = roles.find((r) => r.slug === member.roleSlug);
                const rolePermsCount = assignedRole ? assignedRole.permissions.length : 0;

                return (
                  <Card
                    key={member.id}
                    className={`border transition-all duration-200 hover:shadow-md ${
                      member.status === "suspended"
                        ? "opacity-60 bg-muted/30 border-destructive/20"
                        : "border-border/80 bg-card"
                    }`}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.fullName)}`}
                            alt={member.fullName}
                            className="h-12 w-12 rounded-full object-cover border-2 border-primary/20 shadow-sm shrink-0"
                          />
                          <div>
                            <h4 className="font-semibold text-base leading-tight flex items-center gap-1.5">
                              {member.fullName}
                              {member.roleSlug === "super_admin" && (
                                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>
                          </div>
                        </div>

                        <Badge
                          variant={
                            member.status === "active"
                              ? "default"
                              : member.status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {member.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
                          {member.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 pb-4 space-y-3">
                      {/* Assigned Role Pill */}
                      <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${assignedRole?.color || "from-blue-600 to-indigo-600"}`} />
                          <span className="text-xs font-semibold text-foreground">
                            {member.roleName}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {rolePermsCount} perms
                        </span>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] pt-1">
                          <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span>Last login: {member.lastLogin || "Never"}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 border-t border-border/50 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditStaff(member)}
                          className="h-8 px-2 text-xs"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetPassword(member)}
                          className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700"
                        >
                          <Key className="h-3.5 w-3.5 mr-1" />
                          Password
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStaffStatus(member)}
                          className={`h-8 px-2 text-xs ${
                            member.status === "active" ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {member.status === "active" ? "Suspend" : "Activate"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(member.id)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}

              {filteredStaff.length === 0 && (
                <div className="col-span-full py-12 text-center border rounded-xl border-dashed bg-card/50">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <h3 className="font-semibold text-base mb-1">No Staff Members Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                    No delegates matched your active search or filters. Click below to add a new staff member.
                  </p>
                  <Button size="sm" onClick={handleOpenInviteStaff}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Staff Member
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ───────────────────────────────────────────────────────────
              TAB 2: CUSTOM ROLES & PERMISSIONS ENGINE
          ─────────────────────────────────────────────────────────── */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Configured Role Profiles</h3>
                <p className="text-xs text-muted-foreground">
                  Roles dictate precisely which platform modules delegates can read, write, or execute.
                </p>
              </div>
              <Button size="sm" onClick={handleOpenCreateRole} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New Role Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {roles.map((role) => {
                const assignedCount = staff.filter((s) => s.roleSlug === role.slug).length;

                return (
                  <Card
                    key={role.id}
                    className="border border-border/80 bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                              {role.name}
                            </CardTitle>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              slug: {role.slug}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={role.isSystem ? "secondary" : "outline"}
                          className="text-[10px] font-medium uppercase tracking-wider"
                        >
                          {role.isSystem ? "System" : "Custom"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-2 line-clamp-2">
                        {role.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 pb-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>Assigned Staff:</span>
                        <Badge variant="outline" className="font-semibold text-foreground">
                          {assignedCount} {assignedCount === 1 ? "member" : "members"}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">Permissions:</span>
                          <span className="font-bold text-primary">
                            {role.permissions.length} of {ALL_PERMISSIONS.length} enabled
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${role.color}`}
                            style={{
                              width: `${(role.permissions.length / ALL_PERMISSIONS.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Pill tags for key capabilities */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {role.permissions.slice(0, 4).map((pId) => {
                          const pDef = ALL_PERMISSIONS.find((p) => p.id === pId);
                          return (
                            <span
                              key={pId}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground/80 border border-border/40 font-medium truncate max-w-[150px]"
                            >
                              {pDef?.name || pId}
                            </span>
                          );
                        })}
                        {role.permissions.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                            +{role.permissions.length - 4} more
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditRole(role)}
                          className="h-8 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Configure
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloneRole(role)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          title="Clone this role into a new role"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Clone
                        </Button>
                      </div>

                      {!role.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id, role.slug)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete custom role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ───────────────────────────────────────────────────────────
              TAB 3: FULL PERMISSIONS MATRIX
          ─────────────────────────────────────────────────────────── */}
          <TabsContent value="matrix" className="space-y-4">
            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Cross-Role Capabilities Matrix
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Comprehensive grid showing exact permissions per role across all platform modules.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                    {ALL_PERMISSIONS.length} Permissions • {roles.length} Roles
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[300px] min-w-[250px] font-semibold text-xs text-foreground uppercase tracking-wider">
                        Module & Capability
                      </TableHead>
                      {roles.map((r) => (
                        <TableHead
                          key={r.slug}
                          className="text-center min-w-[120px] font-semibold text-xs text-foreground"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{r.name}</span>
                            <span className="text-[10px] font-normal text-muted-foreground font-mono">
                              ({r.permissions.length} active)
                            </span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {permissionCategories.map((category) => {
                      const catPerms = ALL_PERMISSIONS.filter((p) => p.category === category);

                      return (
                        <>
                          {/* Category Header Row */}
                          <TableRow key={`cat_${category}`} className="bg-muted/40 font-semibold">
                            <TableCell
                              colSpan={roles.length + 1}
                              className="py-2.5 px-4 text-xs font-bold text-foreground uppercase tracking-wider bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                {category}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Specific Permission Rows */}
                          {catPerms.map((perm) => (
                            <TableRow key={perm.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="py-2.5 px-4">
                                <p className="text-xs font-medium text-foreground">{perm.name}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{perm.description}</p>
                              </TableCell>

                              {roles.map((r) => {
                                const hasPermission = r.permissions.includes(perm.id);

                                return (
                                  <TableCell key={`${r.slug}_${perm.id}`} className="text-center py-2.5">
                                    {hasPermission ? (
                                      <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600">
                                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground/30">
                                        <span className="text-xs font-mono">—</span>
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL 1: CREATE / EDIT CUSTOM ROLE
      ─────────────────────────────────────────────────────────── */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveRole}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom Master Role"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Design custom organizational roles like "Technical Architect", "Compliance Officer", or "Regional Director" with surgical permission toggles.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role-name">Role Title *</Label>
                  <Input
                    id="role-name"
                    placeholder="e.g. Technical Architect"
                    value={roleName}
                    onChange={(e) => {
                      setRoleName(e.target.value);
                      if (!editingRole) {
                        setRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role-slug">System Identifier (Slug) *</Label>
                  <Input
                    id="role-slug"
                    placeholder="e.g. tech_architect"
                    value={roleSlug}
                    onChange={(e) => setRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    disabled={editingRole?.isSystem}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  placeholder="Summarize the core operational responsibilities of this role..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role Color Accent</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Indigo", value: "from-blue-600 to-indigo-600" },
                    { label: "Emerald", value: "from-emerald-600 to-teal-600" },
                    { label: "Purple", value: "from-purple-600 to-pink-600" },
                    { label: "Amber", value: "from-orange-500 to-amber-600" },
                    { label: "Cyan", value: "from-cyan-600 to-blue-500" },
                    { label: "Rose", value: "from-rose-600 to-red-600" },
                    { label: "Dark", value: "from-slate-800 to-slate-950" },
                  ].map((colorOpt) => (
                    <button
                      type="button"
                      key={colorOpt.value}
                      onClick={() => setRoleColor(colorOpt.value)}
                      className={`h-7 px-3 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${colorOpt.value} transition-all ${
                        roleColor === colorOpt.value ? "ring-2 ring-offset-2 ring-primary scale-105" : "opacity-75"
                      }`}
                    >
                      {colorOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Assign Permissions</h4>
                    <p className="text-xs text-muted-foreground">
                      Select which capabilities delegates with this role will be permitted to access.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-bold text-primary">
                    {selectedPermissions.length} of {ALL_PERMISSIONS.length} Selected
                  </Badge>
                </div>

                <div className="space-y-4">
                  {permissionCategories.map((category) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === category);
                    const allCatSelected = catPerms.every((p) => selectedPermissions.includes(p.id));

                    return (
                      <div key={category} className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {category}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryPermissions(category)}
                            className="h-6 text-[11px] px-2 text-primary hover:text-primary/80"
                          >
                            {allCatSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {catPerms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.id);

                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-primary/5 border-primary/40 text-foreground"
                                    : "bg-background border-border/60 text-muted-foreground hover:bg-muted/40"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                  className="mt-0.5"
                                />
                                <div>
                                  <p className="font-medium text-xs text-foreground leading-tight">{perm.name}</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">{perm.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                <Check className="h-4 w-4 mr-2" />
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────
          MODAL 2: INVITE / ADD STAFF MEMBER
      ─────────────────────────────────────────────────────────── */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveStaff}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {editingStaff ? "Edit Staff Delegate" : "Invite Master Staff Delegate"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authorize an executive, architect, or manager to sign in and handle platform operations on behalf of Master Admin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Full Name *</Label>
                <Input
                  id="staff-name"
                  placeholder="e.g. Vikram Sharma"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Work Email *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="e.g. vikram.architect@orbitlms.in"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-phone">Phone / WhatsApp</Label>
                <Input
                  id="staff-phone"
                  placeholder="+91 98765 43210"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-dept">Department</Label>
                <Input
                  id="staff-dept"
                  placeholder="e.g. Cloud Engineering & Architecture"
                  value={staffDepartment}
                  onChange={(e) => setStaffDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-role">Assigned Delegation Role *</Label>
                <Select value={staffRoleSlug} onValueChange={setStaffRoleSlug}>
                  <SelectTrigger id="staff-role">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${r.color}`} />
                          <span>{r.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({r.permissions.length} perms)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!editingStaff && (
                <div className="space-y-1.5">
                  <Label htmlFor="staff-pwd">Initial Password</Label>
                  <Input
                    id="staff-pwd"
                    type="text"
                    value={staffInitialPassword}
                    onChange={(e) => setStaffInitialPassword(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Staff member will log in with their email and this password at <code className="bg-muted px-1 rounded">/master/login</code>.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                <Check className="h-4 w-4 mr-2" />
                {editingStaff ? "Save Updates" : "Grant Delegation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────
          MODAL 3: RESET STAFF PASSWORD / CREDENTIALS
      ─────────────────────────────────────────────────────────── */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Reset Staff Security Hash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate a secure temporary password for <strong>{selectedStaffForPassword?.fullName}</strong> ({selectedStaffForPassword?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 bg-muted rounded-xl space-y-2 border">
              <Label className="text-xs text-muted-foreground">Generated Temporary Password</Label>
              <div className="flex items-center justify-between gap-2">
                <code className="text-base font-mono font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border w-full">
                  {tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(tempPassword, "pwd")}
                  className="shrink-0"
                >
                  {copiedId === "pwd" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-300">Login Instructions</p>
              <p className="text-blue-800 dark:text-blue-400">
                Direct the staff member to sign in at <strong className="underline">/master/login</strong> using:
              </p>
              <ul className="list-disc pl-4 text-blue-800 dark:text-blue-400">
                <li>Username: <code>{selectedStaffForPassword?.email}</code></li>
                <li>Password: <code>{tempPassword}</code></li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => {
                setIsResetPasswordModalOpen(false);
              }}
            >
              Done & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
