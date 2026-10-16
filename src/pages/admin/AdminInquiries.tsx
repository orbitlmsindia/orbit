import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Trash2,
  ExternalLink,
  UserCheck,
  Filter,
  Inbox,
  GraduationCap,
  XCircle,
  Phone,
  Shield,
  Eye,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  status: "pending" | "contacted" | "resolved";
  notes?: string;
  created_at: string;
}

interface StudentApplication {
  id: string;
  full_name: string | null;
  email: string;
  mobile_number?: string | null;
  address?: string | null;
  aadhar_number?: string | null;
  status?: string | null;
  created_at: string;
  aura_points?: number;
}

export default function AdminInquiries() {
  const { toast } = useToast();
  const [activeMainTab, setActiveMainTab] = useState("contact");

  // Contact Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Student Admissions State
  const [students, setStudents] = useState<StudentApplication[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentApplication | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchContactMessages();
    fetchStudentApplications();
  }, []);

  const fetchContactMessages = async () => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch contact_messages table:", error);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
    } catch (e) {
      console.error("Error fetching contact messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchStudentApplications = async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, mobile_number, address, aadhar_number, status, created_at, aura_points")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch students from users table:", error);
      } else {
        setStudents(data || []);
      }
    } catch (e) {
      console.error("Error fetching student applications:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "contacted" | "resolved", updatedNotes?: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({
          status: newStatus,
          notes: updatedNotes !== undefined ? updatedNotes : selectedMessage?.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.warn("Direct update error, updating local state:", error);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? { ...msg, status: newStatus, notes: updatedNotes !== undefined ? updatedNotes : msg.notes }
            : msg
        )
      );

      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({
          ...selectedMessage,
          status: newStatus,
          notes: updatedNotes !== undefined ? updatedNotes : selectedMessage.notes,
        });
      }

      toast({
        title: "Status Updated",
        description: `Inquiry marked as ${newStatus}.`,
      });
    } catch (e) {
      toast({
        title: "Update Failed",
        description: "Could not update inquiry status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact message?")) return;
    try {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) {
        console.warn("Delete error, removing from local state:", error);
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      if (selectedMessage?.id === id) {
        setIsDetailOpen(false);
      }
      toast({
        title: "Inquiry Deleted",
        description: "The message was deleted.",
      });
    } catch (e) {
      toast({
        title: "Delete Failed",
        description: "Could not delete inquiry.",
        variant: "destructive",
      });
    }
  };

  const handleApproveStudent = async (studentId: string, studentName?: string) => {
    setProcessingStudentId(studentId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", studentId);

      if (error) throw error;

      // Send welcome / admission approved notification
      try {
        await supabase.from("notifications").insert({
          user_id: studentId,
          title: "Admission Approved! 🎓",
          message: "Welcome to Orbit LMS! Your student admission has been approved by the administration. You can now enroll in courses, access the calendar, and participate in live sessions.",
          notification_type: "general",
          sender_role: "admin",
          is_read: false,
          created_at: new Date().toISOString()
        });
      } catch (notifErr) {
        console.warn("Could not insert admission notification:", notifErr);
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: "active" } : s))
      );

      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({ ...selectedStudent, status: "active" });
      }

      toast({
        title: "Admission Approved",
        description: `${studentName || "Student"} admission has been approved. Status is now Active.`,
      });
    } catch (err: any) {
      console.error("Error approving student admission:", err);
      toast({
        title: "Approval Failed",
        description: err.message || "Could not approve student admission.",
        variant: "destructive",
      });
    } finally {
      setProcessingStudentId(null);
    }
  };

  const handleRejectStudent = async (studentId: string, studentName?: string) => {
    if (!confirm(`Are you sure you want to reject the admission application for ${studentName || "this student"}?`)) {
      return;
    }
    setProcessingStudentId(studentId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", studentId);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: "rejected" } : s))
      );

      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({ ...selectedStudent, status: "rejected" });
      }

      toast({
        title: "Admission Rejected",
        description: `${studentName || "Student"} admission has been marked as rejected.`,
      });
    } catch (err: any) {
      console.error("Error rejecting student admission:", err);
      toast({
        title: "Rejection Failed",
        description: err.message || "Could not reject student admission.",
        variant: "destructive",
      });
    } finally {
      setProcessingStudentId(null);
    }
  };

  const openDetailModal = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.notes || "");
    setIsDetailOpen(true);
  };

  const openStudentModal = (student: StudentApplication) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      `${msg.first_name} ${msg.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = messages.length;
  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const contactedCount = messages.filter((m) => m.status === "contacted").length;
  const resolvedCount = messages.filter((m) => m.status === "resolved").length;

  // Filter student admissions
  const filteredStudents = students.filter((s) => {
    const nameMatch = (s.full_name || "").toLowerCase().includes(studentSearchQuery.toLowerCase());
    const emailMatch = (s.email || "").toLowerCase().includes(studentSearchQuery.toLowerCase());
    const phoneMatch = (s.mobile_number || "").includes(studentSearchQuery);
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    const studentStatus = s.status || "pending";
    const matchesStatus =
      studentStatusFilter === "all" ||
      (studentStatusFilter === "pending" && (studentStatus === "pending" || !s.status)) ||
      studentStatus === studentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalStudents = students.length;
  const pendingStudents = students.filter((s) => !s.status || s.status === "pending").length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const rejectedStudents = students.filter((s) => s.status === "rejected").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Inquiries & Admissions Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Review public contact inquiries and student registration admission requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchContactMessages();
                fetchStudentApplications();
              }}
              disabled={loadingMessages || loadingStudents}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingMessages || loadingStudents ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="bg-muted/60 p-1 border">
            <TabsTrigger value="contact" className="gap-2 text-xs font-semibold">
              <Inbox className="h-4 w-4" />
              Public Inquiries
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="admissions" className="gap-2 text-xs font-semibold">
              <GraduationCap className="h-4 w-4" />
              Student Registration & Admissions
              {pendingStudents > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0">
                  {pendingStudents}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Public Contact Inquiries */}
          <TabsContent value="contact" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Received</p>
                    <p className="text-2xl font-bold">{totalCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pending Action</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Contacted</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{contactedCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Resolved</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email or message..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                      className="text-xs rounded-lg"
                    >
                      All ({totalCount})
                    </Button>
                    <Button
                      variant={statusFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("pending")}
                      className="text-xs rounded-lg border-amber-500/40"
                    >
                      Pending ({pendingCount})
                    </Button>
                    <Button
                      variant={statusFilter === "contacted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("contacted")}
                      className="text-xs rounded-lg border-blue-500/40"
                    >
                      Contacted ({contactedCount})
                    </Button>
                    <Button
                      variant={statusFilter === "resolved" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("resolved")}
                      className="text-xs rounded-lg border-emerald-500/40"
                    >
                      Resolved ({resolvedCount})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages Table */}
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadingMessages ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">Loading inquiries...</div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No contact inquiries found</p>
                    <p className="text-xs text-muted-foreground">
                      Submissions from the Get In Touch home page form will appear here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Contact Person</TableHead>
                        <TableHead className="text-xs">Work Email</TableHead>
                        <TableHead className="text-xs">Message</TableHead>
                        <TableHead className="text-xs">Received Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((msg) => (
                        <TableRow key={msg.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-xs py-3">
                            {msg.first_name} {msg.last_name}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <a
                              href={`mailto:${msg.email}`}
                              className="text-primary hover:underline flex items-center gap-1.5"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              {msg.email}
                            </a>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3 max-w-xs truncate">
                            {msg.message}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3 whitespace-nowrap">
                            {new Date(msg.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="py-3">
                            {msg.status === "pending" && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                <Clock className="h-3 w-3 mr-1" /> Pending
                              </Badge>
                            )}
                            {msg.status === "contacted" && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                                <UserCheck className="h-3 w-3 mr-1" /> Contacted
                              </Badge>
                            )}
                            {msg.status === "resolved" && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs px-2"
                                onClick={() => openDetailModal(msg)}
                              >
                                View
                              </Button>
                              {msg.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px] px-2 text-blue-600 border-blue-500/30"
                                  onClick={() => handleUpdateStatus(msg.id, "contacted")}
                                  disabled={updatingId === msg.id}
                                >
                                  Mark Contacted
                                </Button>
                              )}
                              {msg.status !== "resolved" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px] px-2 text-emerald-600 border-emerald-500/30"
                                  onClick={() => handleUpdateStatus(msg.id, "resolved")}
                                  disabled={updatingId === msg.id}
                                >
                                  Resolve
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Student Registration & Admissions */}
          <TabsContent value="admissions" className="space-y-6">
            {/* Student Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Registered Students</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingStudents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Approved / Active</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeStudents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rejected</p>
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{rejectedStudents}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student name, email, or phone..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Button
                      variant={studentStatusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStudentStatusFilter("all")}
                      className="text-xs rounded-lg"
                    >
                      All ({totalStudents})
                    </Button>
                    <Button
                      variant={studentStatusFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStudentStatusFilter("pending")}
                      className="text-xs rounded-lg border-amber-500/40"
                    >
                      Pending ({pendingStudents})
                    </Button>
                    <Button
                      variant={studentStatusFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStudentStatusFilter("active")}
                      className="text-xs rounded-lg border-emerald-500/40"
                    >
                      Approved ({activeStudents})
                    </Button>
                    <Button
                      variant={studentStatusFilter === "rejected" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStudentStatusFilter("rejected")}
                      className="text-xs rounded-lg border-rose-500/40"
                    >
                      Rejected ({rejectedStudents})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students Table */}
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadingStudents ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">Loading student registration applications...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-semibold">No student applications found</p>
                    <p className="text-xs text-muted-foreground">
                      Newly registered students requiring admission approval will appear here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Student Name</TableHead>
                        <TableHead className="text-xs">Email & Contact</TableHead>
                        <TableHead className="text-xs">Address / Location</TableHead>
                        <TableHead className="text-xs">Applied Date</TableHead>
                        <TableHead className="text-xs">Admission Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((st) => (
                        <TableRow key={st.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-xs py-3">
                            <div className="flex flex-col">
                              <span>{st.full_name || "New Student"}</span>
                              {st.aadhar_number && (
                                <span className="text-[10px] text-muted-foreground">
                                  ID: {st.aadhar_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <div className="flex flex-col gap-0.5">
                              <a
                                href={`mailto:${st.email}`}
                                className="text-primary hover:underline flex items-center gap-1 text-xs"
                              >
                                <Mail className="h-3 w-3" />
                                {st.email}
                              </a>
                              {st.mobile_number && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {st.mobile_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3 max-w-[200px] truncate">
                            {st.address || "Not provided"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3 whitespace-nowrap">
                            {new Date(st.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="py-3">
                            {(!st.status || st.status === "pending") && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                <Clock className="h-3 w-3 mr-1" /> Pending Approval
                              </Badge>
                            )}
                            {st.status === "active" && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                              </Badge>
                            )}
                            {st.status === "rejected" && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                <XCircle className="h-3 w-3 mr-1" /> Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs px-2"
                                onClick={() => openStudentModal(st)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Details
                              </Button>

                              {(!st.status || st.status === "pending" || st.status === "rejected") && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleApproveStudent(st.id, st.full_name || st.email)}
                                  disabled={processingStudentId === st.id}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                              )}

                              {st.status !== "rejected" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px] px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                  onClick={() => handleRejectStudent(st.id, st.full_name || st.email)}
                                  disabled={processingStudentId === st.id}
                                >
                                  Reject
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedMessage && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-display flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Inquiry Details
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Submitted on {new Date(selectedMessage.created_at).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border">
                    <div>
                      <span className="text-muted-foreground font-medium">Name:</span>
                      <p className="font-bold text-sm">
                        {selectedMessage.first_name} {selectedMessage.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Email:</span>
                      <p className="font-bold text-sm text-primary">{selectedMessage.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground">Full Message:</span>
                    <div className="p-3 bg-card rounded-xl border whitespace-pre-wrap font-normal text-xs leading-relaxed max-h-48 overflow-y-auto">
                      {selectedMessage.message}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold text-muted-foreground">Admin Internal Notes:</span>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add private admin follow-up notes..."
                      className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary h-20 resize-none"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status, adminNotes)}
                      className="text-xs"
                    >
                      Save Admin Notes
                    </Button>
                  </div>
                </div>

                <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Orbit%20LMS%20Support%20Inquiry%20Response`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      Reply via Email
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </Button>
                  </a>

                  <div className="flex items-center gap-2">
                    {selectedMessage.status !== "contacted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedMessage.id, "contacted", adminNotes)}
                        className="text-xs text-blue-600 border-blue-500/30"
                      >
                        Mark Contacted
                      </Button>
                    )}
                    {selectedMessage.status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedMessage.id, "resolved", adminNotes)}
                        className="text-xs text-emerald-600 border-emerald-500/30"
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Student Admission Application Modal */}
        <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedStudent && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-display flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Student Admission Application
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Registered on {new Date(selectedStudent.created_at).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border">
                    <div>
                      <span className="text-muted-foreground font-medium">Full Name:</span>
                      <p className="font-bold text-sm">{selectedStudent.full_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Current Status:</span>
                      <div>
                        {(!selectedStudent.status || selectedStudent.status === "pending") && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                            Pending Approval
                          </Badge>
                        )}
                        {selectedStudent.status === "active" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Approved / Active
                          </Badge>
                        )}
                        {selectedStudent.status === "rejected" && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-3.5 bg-card rounded-xl border">
                    <div className="flex items-center justify-between py-1 border-b">
                      <span className="text-muted-foreground">Email Address:</span>
                      <a href={`mailto:${selectedStudent.email}`} className="text-primary font-medium hover:underline">
                        {selectedStudent.email}
                      </a>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b">
                      <span className="text-muted-foreground">Phone Number:</span>
                      <span className="font-medium">{selectedStudent.mobile_number || "Not provided"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b">
                      <span className="text-muted-foreground">Govt ID / Aadhar:</span>
                      <span className="font-medium">{selectedStudent.aadhar_number || "Not provided"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b">
                      <span className="text-muted-foreground">Address / Campus:</span>
                      <span className="font-medium">{selectedStudent.address || "Not provided"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground">Aura Reward Points:</span>
                      <span className="font-medium text-amber-600 font-mono">
                        {selectedStudent.aura_points || 0} pts
                      </span>
                    </div>
                  </div>

                  {(!selectedStudent.status || selectedStudent.status === "pending") && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        Approving this admission application will activate the student's account, grant access to course enrollment, and enable calendar session participation.
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex items-center justify-between gap-2 border-t pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setIsStudentModalOpen(false)} className="text-xs">
                    Close
                  </Button>

                  <div className="flex items-center gap-2">
                    {selectedStudent.status !== "rejected" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                        onClick={() => {
                          handleRejectStudent(selectedStudent.id, selectedStudent.full_name || selectedStudent.email);
                          setIsStudentModalOpen(false);
                        }}
                        disabled={processingStudentId === selectedStudent.id}
                      >
                        Reject Application
                      </Button>
                    )}
                    {(!selectedStudent.status || selectedStudent.status === "pending" || selectedStudent.status === "rejected") && (
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        onClick={() => {
                          handleApproveStudent(selectedStudent.id, selectedStudent.full_name || selectedStudent.email);
                          setIsStudentModalOpen(false);
                        }}
                        disabled={processingStudentId === selectedStudent.id}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Admission
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
