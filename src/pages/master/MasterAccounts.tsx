import { useState, useEffect, useMemo } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  Download, 
  Search, 
  Building2, 
  RefreshCw, 
  Eye, 
  Mail, 
  Calendar, 
  FileSpreadsheet, 
  CreditCard,
  UserCheck,
  UserX,
  Phone,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function MasterAccounts() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // User Deep Dive Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const fetchAccountsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all colleges for filter dropdown & name mapping
      const { data: colData } = await supabase
        .from("colleges")
        .select("id, name, email, subscription_status, activation_status")
        .order("name", { ascending: true });

      setColleges(colData || []);

      // 2. Fetch all user accounts
      const { data: usersData, error } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          phone,
          role,
          college_id,
          department,
          status,
          aura_points,
          bonus_credits,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(usersData || []);
    } catch (err: any) {
      console.error("Error loading master accounts:", err);
      toast({
        title: "Accounts Load Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsData();
  }, []);

  // Map college name helper
  const getCollegeName = (colId: string | null) => {
    if (!colId) return "Orbit LMS (Global / Central)";
    const match = colleges.find((c) => c.id === colId);
    return match ? match.name : "Registered Tenant";
  };

  // Filtered accounts list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // College Filter
      if (selectedCollege !== "all") {
        if (selectedCollege === "global" && u.college_id !== null) return false;
        if (selectedCollege !== "global" && u.college_id !== selectedCollege) return false;
      }

      // Role Filter
      if (selectedRole !== "all" && u.role?.toLowerCase() !== selectedRole.toLowerCase()) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== "all" && (u.status || "active").toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = (u.full_name || "").toLowerCase().includes(query);
        const emailMatch = (u.email || "").toLowerCase().includes(query);
        const deptMatch = (u.department || "").toLowerCase().includes(query);
        const phoneMatch = (u.phone || "").toLowerCase().includes(query);
        const colMatch = getCollegeName(u.college_id).toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !deptMatch && !phoneMatch && !colMatch) {
          return false;
        }
      }

      return true;
    });
  }, [users, colleges, selectedCollege, selectedRole, selectedStatus, searchQuery]);

  // Download filtered accounts as CSV
  const handleDownloadCSV = () => {
    try {
      const nowStr = new Date().toISOString().split("T")[0];
      const selectedColName = selectedCollege === "all" 
        ? "All_Institutions" 
        : (colleges.find(c => c.id === selectedCollege)?.name || "Institution").replace(/[^a-zA-Z0-9]/g, "_");

      let csv = `ORBIT LMS - MASTER ACCOUNTS REGISTRY EXPORT\n`;
      csv += `Export Date,${new Date().toLocaleString('en-IN')}\n`;
      csv += `Institution Filter,${selectedColName}\n`;
      csv += `Role Filter,${selectedRole.toUpperCase()}\n`;
      csv += `Total Accounts Exported,${filteredUsers.length}\n\n`;

      csv += `User ID,Full Name,Email Address,Phone,Role,Institution / College Name,Department,Status,Aura XP,Created At\n`;

      filteredUsers.forEach((u) => {
        const id = u.id || "";
        const name = `"${(u.full_name || "").replace(/"/g, '""')}"`;
        const email = u.email || "";
        const phone = u.phone || "N/A";
        const role = (u.role || "student").toUpperCase();
        const collegeName = `"${getCollegeName(u.college_id).replace(/"/g, '""')}"`;
        const department = `"${(u.department || "General").replace(/"/g, '""')}"`;
        const status = (u.status || "active").toUpperCase();
        const aura = u.aura_points || 0;
        const createdAt = u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "";

        csv += `${id},${name},${email},${phone},${role},${collegeName},${department},${status},${aura},${createdAt}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orbit_master_accounts_${selectedColName}_${nowStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Accounts Exported Successfully",
        description: `Saved ${filteredUsers.length} accounts to CSV.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Open user deep dive
  const handleOpenUserDetail = async (user: any) => {
    setSelectedUser(user);
    setModalOpen(true);
    setLoadingEnrollments(true);
    try {
      if (user.role === "student") {
        const { data: enrs } = await supabase
          .from("enrollments")
          .select("id, status, progress, course:courses(title, price, credit_points)")
          .eq("student_id", user.id);
        setUserEnrollments(enrs || []);
      } else {
        const { data: coursesTaught } = await supabase
          .from("courses")
          .select("id, title, is_published, credit_points, created_at")
          .eq("teacher_id", user.id);
        setUserEnrollments(coursesTaught || []);
      }
    } catch (err) {
      console.warn("Could not load user activities:", err);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  // Impersonate / Campus View as User
  const handleImpersonateUser = (user: any) => {
    if (user.college_id) {
      sessionStorage.setItem("collegeId", user.college_id);
    }
    sessionStorage.setItem("userRole", user.role?.toLowerCase() || "student");
    toast({
      title: "Switching Context",
      description: `Viewing portal as ${user.full_name} (${user.role}).`,
    });

    if (user.role === "admin") navigate("/admin");
    else if (user.role === "teacher") navigate("/teacher");
    else if (user.role === "finance") navigate("/finance");
    else navigate("/student");
  };

  // Counts summary
  const studentCount = users.filter((u) => u.role === "student").length;
  const teacherCount = users.filter((u) => u.role === "teacher").length;
  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super_admin").length;
  const financeCount = users.filter((u) => u.role === "finance").length;

  return (
    <MasterLayout
      headerTitle="Global Accounts & Institutional Registry"
      headerDescription="Comprehensive directory of all student, faculty, and administrative accounts created across every tenant college, institute, or university."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccountsData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Registry
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download Accounts ({filteredUsers.length})
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Registered Accounts</span>
                <Users className="h-4 w-4 text-sky-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-white">{users.length}</div>
              <p className="text-xs text-slate-400 mt-1">Across all organizations & institutions</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Student Learners</span>
                <GraduationCap className="h-4 w-4 text-emerald-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-emerald-400">{studentCount}</div>
              <p className="text-xs text-slate-400 mt-1">Enrolled across campus portals</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Faculty & Instructors</span>
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-indigo-400">{teacherCount}</div>
              <p className="text-xs text-slate-400 mt-1">Course creators and examiners</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Institutional Admins & Finance</span>
                <CreditCard className="h-4 w-4 text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-amber-400">{adminCount + financeCount}</div>
              <p className="text-xs text-slate-400 mt-1">Campus controllers and administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              {/* College Filter */}
              <div>
                <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="All Colleges / Institutes" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">All Institutions ({colleges.length})</SelectItem>
                    <SelectItem value="global">Global / Central (No College ID)</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students ({studentCount})</SelectItem>
                    <SelectItem value="teacher">Teachers / Faculty ({teacherCount})</SelectItem>
                    <SelectItem value="admin">College Admins ({users.filter(u => u.role === 'admin').length})</SelectItem>
                    <SelectItem value="finance">Finance Controllers ({financeCount})</SelectItem>
                    <SelectItem value="super_admin">Master SaaS Admins ({users.filter(u => u.role === 'super_admin').length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive / Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Accounts Registry Ledger
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Showing {filteredUsers.length} of {users.length} total accounts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/80">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300 pl-6">Account Holder</TableHead>
                    <TableHead className="text-slate-300">Affiliated College / Organization</TableHead>
                    <TableHead className="text-center text-slate-300">Role Privilege</TableHead>
                    <TableHead className="text-slate-300">Department</TableHead>
                    <TableHead className="text-center text-slate-300">Aura Points</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-300 pr-6">Deep Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        <RefreshCw className="h-5 w-5 animate-spin inline mr-2 text-emerald-400" />
                        Loading multi-tenant accounts registry from database...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        No accounts match the selected filters or search keyword.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const collegeName = getCollegeName(u.college_id);
                      const isMaster = u.role === "super_admin";
                      const isAdmin = u.role === "admin";
                      const isTeacher = u.role === "teacher";
                      const isFinance = u.role === "finance";

                      return (
                        <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/40">
                          {/* Name & Email */}
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                                {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                  {u.full_name || "Unnamed Account"}
                                </div>
                                <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3 text-slate-500" />
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* College Affiliation */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-200">{collegeName}</span>
                            </div>
                            {u.college_id && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                ID: {u.college_id.slice(0, 8)}...
                              </div>
                            )}
                          </TableCell>

                          {/* Role Badge */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-mono capitalize ${
                                isMaster
                                  ? "border-amber-500/50 text-amber-400 bg-amber-950/20"
                                  : isAdmin
                                  ? "border-indigo-500/50 text-indigo-400 bg-indigo-950/20"
                                  : isTeacher
                                  ? "border-purple-500/50 text-purple-400 bg-purple-950/20"
                                  : isFinance
                                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/20"
                                  : "border-sky-500/50 text-sky-400 bg-sky-950/20"
                              }`}
                            >
                              {u.role || "student"}
                            </Badge>
                          </TableCell>

                          {/* Department */}
                          <TableCell className="text-xs text-slate-300">
                            {u.department || "General Curriculum"}
                          </TableCell>

                          {/* Aura Points */}
                          <TableCell className="text-center font-mono text-xs font-semibold text-emerald-400">
                            {u.aura_points || 0} XP
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={u.status === "inactive" ? "destructive" : "default"}
                              className={
                                u.status === "inactive"
                                  ? "bg-rose-600 text-white text-[11px]"
                                  : "bg-emerald-600 text-white text-[11px]"
                              }
                            >
                              {(u.status || "active").toUpperCase()}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1.5 items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUserDetail(u)}
                                className="h-7 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1 px-2.5"
                                title="Inspect Full Account Details & Enrolled Courses"
                              >
                                <Eye className="h-3 w-3 text-sky-400" /> Deep Dive
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleImpersonateUser(u)}
                                className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-2"
                                title="Switch Context to This Account"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Deep Dive Inspection Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
              <Eye className="h-5 w-5 text-sky-400" />
              Account Inspection: {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2">
              {/* Account Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Full Name</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedUser.full_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Official Email</span>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Affiliated Institution</span>
                  <p className="text-slate-200 font-semibold mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {getCollegeName(selectedUser.college_id)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Role</span>
                  <p className="text-slate-200 font-mono uppercase mt-0.5 font-semibold">
                    {selectedUser.role}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Gamified Aura Points</span>
                  <p className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
                    {selectedUser.aura_points || 0} XP
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Registered Date</span>
                  <p className="text-slate-300 font-mono mt-0.5">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Associated Courses / Enrolled Content */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-purple-400" />
                  {selectedUser.role === "student" ? "Enrolled Courses & Progress" : "Curriculums Authored / Managed"}
                </h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <Table>
                    <TableHeader className="bg-slate-900/60">
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400 text-xs">Course Title</TableHead>
                        <TableHead className="text-center text-slate-400 text-xs">
                          {selectedUser.role === "student" ? "Progress" : "Credit Value"}
                        </TableHead>
                        <TableHead className="text-right text-slate-400 text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEnrollments ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                            Loading curriculum records...
                          </TableCell>
                        </TableRow>
                      ) : userEnrollments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                            No courses mapped to this account yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        userEnrollments.map((item, idx) => (
                          <TableRow key={idx} className="border-slate-800 hover:bg-slate-900/40">
                            <TableCell className="text-xs font-semibold text-slate-200">
                              {item.course?.title || item.title || "Curriculum Unit"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono text-emerald-400">
                              {selectedUser.role === "student" ? `${item.progress || 0}% Complete` : `${item.credit_points || 3} Credits`}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                                {(item.status || (item.is_published ? "Published" : "Active")).toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleImpersonateUser(selectedUser)}
                  className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30 text-xs h-8"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Log in as this User
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 text-xs h-8"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
