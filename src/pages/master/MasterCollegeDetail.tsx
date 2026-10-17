import { MasterLayout } from "@/components/layout/MasterLayout";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  BookOpen, 
  Shield, 
  Activity, 
  ArrowLeft, 
  ExternalLink, 
  Power, 
  PowerOff, 
  Receipt, 
  Download, 
  PlusCircle,
  Loader2,
  Clock,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  XCircle,
  Sparkles,
  Save,
  UserPlus,
  Trash2
} from "lucide-react";
import { MasterCreateAccountModal } from "@/components/master/MasterCreateAccountModal";
import { MasterDeleteUserModal } from "@/components/master/MasterDeleteUserModal";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRegisteredFeatures, getRegisteredPlans, updateCollegeCustomFeatures } from "@/services/featuresService";
import { DEFAULT_PLANS } from "@/types/plans";

export default function MasterCollegeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [allFeatures, setAllFeatures] = useState(() => getRegisteredFeatures());
    const [allPlans, setAllPlans] = useState(() => getRegisteredPlans());
    const [college, setCollege] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Invoice form state
    const [invoiceSeats, setInvoiceSeats] = useState("50");
    const [invoiceRate, setInvoiceRate] = useState("200");
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    // Plan & Feature checklist state
    const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
    const [selectedPlanPreset, setSelectedPlanPreset] = useState<string>("");
    const [customMaxStudents, setCustomMaxStudents] = useState<number>(1000);
    const [savingFeatures, setSavingFeatures] = useState(false);
    const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
    const [createAccountRole, setCreateAccountRole] = useState<"admin" | "teacher" | "student" | "finance">("student");
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const fetchDetails = async () => {
        try {
            setAllFeatures(getRegisteredFeatures());
            setAllPlans(getRegisteredPlans());

            // Load College Meta
            const { data: colData } = await supabase.from('colleges').select('*').eq('id', id).single();
            setCollege(colData);
            if (colData) {
                setActiveFeatures(
                    Array.isArray(colData.enabled_features)
                        ? colData.enabled_features
                        : getRegisteredFeatures().map(f => f.id)
                );
                setCustomMaxStudents(colData.max_students || 1000);
            }

            // Load Users for this college
            const { data: usersData } = await supabase
                .from('users')
                .select('id, role, full_name, email, status, department, created_at')
                .eq('college_id', id).neq('status', 'deleted');

            if (usersData) {
                setStudents(usersData.filter(u => u.role === 'student'));
                setTeachers(usersData.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'finance'));
            }

            // Load Courses explicitly for this tenant
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, title, is_published, created_at')
                .eq('college_id', id);

            if (coursesData) setCourses(coursesData);

            // Load Enrollments for this tenant
            const { data: enrData } = await supabase
                .from('enrollments')
                .select('id, status, progress, student_id, course:courses(title), enrolled_at')
                .eq('college_id', id);

            if (enrData) setEnrollments(enrData);

            // Load Invoices for this tenant
            const { data: invData } = await supabase
                .from('invoices')
                .select('*')
                .eq('college_id', id)
                .order('created_at', { ascending: false });

            if (invData) setInvoices(invData);
        } catch (err) {
            console.error("Error loading college details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetails();
    }, [id]);

    const handleTogglePower = async () => {
        if (!college) return;
        const newStatus = !college.activation_status;
        try {
            const { error } = await supabase.from('colleges').update({ activation_status: newStatus }).eq('id', id);
            if (error) throw error;

            setCollege({ ...college, activation_status: newStatus });
            if (newStatus) {
                toast({
                    title: "Service Turned ON",
                    description: `${college.name} is active. Full student and teacher access is now restored.`,
                });
            } else {
                toast({
                    title: "Service Turned OFF",
                    description: `${college.name} is deactivated. All users will now see the Service Maintenance & Customer Care screen.`,
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            toast({ title: "Toggle Error", description: err.message, variant: "destructive" });
        }
    };

    const handleToggleFeature = (featureId: string) => {
        setActiveFeatures(prev => 
            prev.includes(featureId) ? prev.filter(f => f !== featureId) : [...prev, featureId]
        );
    };

    const handleApplyPlanPreset = (planId: string) => {
        const found = allPlans.find(p => p.id === planId);
        if (found) {
            setSelectedPlanPreset(planId);
            setActiveFeatures(found.features);
            setCustomMaxStudents(found.maxStudents);
            toast({
                title: "Plan Template Applied",
                description: `Loaded "${found.name}" configuration (${found.features.length} modules, ${found.maxStudents} seats). Click Save to commit.`
            });
        }
    };

    const handleSaveFeatures = async () => {
        setSavingFeatures(true);
        try {
            const { error } = await supabase
                .from('colleges')
                .update({ 
                    enabled_features: activeFeatures,
                    max_students: Number(customMaxStudents)
                })
                .eq('id', id);

            if (error) throw error;

            setCollege({ ...college, enabled_features: activeFeatures, max_students: Number(customMaxStudents) });
            toast({
                title: "Features & Quotas Saved",
                description: `Successfully updated permissions (${activeFeatures.length} active features) for ${college.name}.`
            });
        } catch (err: any) {
            toast({
                title: "Save Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setSavingFeatures(false);
        }
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingInvoice(true);
        try {
            const seats = parseInt(invoiceSeats) || 1;
            const rate = parseFloat(invoiceRate) || 100;
            const total = seats * rate;
            const invNum = `INV-${Date.now().toString().slice(-6)}`;

            const { data, error } = await supabase.from('invoices').insert([{
                college_id: id,
                invoice_number: invNum,
                student_count: seats,
                cost_per_student: rate,
                total_amount: total,
                status: 'pending'
            }]).select().single();

            if (error) throw error;

            toast({
                title: "Invoice Generated",
                description: `Invoice ${invNum} for ₹${total.toLocaleString('en-IN')} issued.`,
            });
            fetchDetails();
        } catch (err: any) {
            toast({ title: "Invoice Error", description: err.message, variant: "destructive" });
        } finally {
            setCreatingInvoice(false);
        }
    };

    const markInvoicePaid = async (invId: string) => {
        try {
            const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', invId);
            if (error) throw error;
            toast({ title: "Invoice Paid", description: "Status updated to PAID." });
            fetchDetails();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const handleImpersonate = async () => {
        try {
            sessionStorage.setItem('collegeId', id as string);
            sessionStorage.setItem('userRole', 'admin');
            toast({ title: "Campus Admin Switch", description: `Switching to ${college?.name} administration.` });
            navigate('/admin');
        } catch (err: any) {
            toast({ title: 'Navigation Failed', description: err.message, variant: 'destructive' });
        }
    };

    const downloadCSV = (filename: string, header: string, rows: string[]) => {
        const csv = `${header}\n${rows.join('\n')}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Accounts Exported", description: `Exported ${rows.length} records to ${filename}` });
    };

    const handleDownloadStudents = () => {
        const safeName = (college?.name || "Institution").replace(/[^a-zA-Z0-9]/g, '_');
        const header = "Student ID,Full Name,Email Address,Department,Status,Joined Date";
        const rows = students.map(s => 
            `${s.id},"${(s.full_name || '').replace(/"/g, '""')}",${s.email},"${s.department || 'General'}",${s.status || 'Active'},${s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}`
        );
        downloadCSV(`${safeName}_Students_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    };

    const handleDownloadFaculty = () => {
        const safeName = (college?.name || "Institution").replace(/[^a-zA-Z0-9]/g, '_');
        const header = "Staff ID,Role,Full Name,Email Address,Department,Status";
        const rows = teachers.map(t => 
            `${t.id},${(t.role || 'teacher').toUpperCase()},"${(t.full_name || '').replace(/"/g, '""')}",${t.email},"${t.department || 'Academic Affairs'}",${t.status || 'Active'}`
        );
        downloadCSV(`${safeName}_Faculty_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    };

    const handleDownloadCourses = () => {
        const safeName = (college?.name || "Institution").replace(/[^a-zA-Z0-9]/g, '_');
        const header = "Course ID,Curriculum Title,Publication Status,Created Date";
        const rows = courses.map(c => 
            `${c.id},"${(c.title || '').replace(/"/g, '""')}",${c.is_published ? 'Published' : 'Draft'},${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}`
        );
        downloadCSV(`${safeName}_Courses_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    };

    const handleDownloadEnrollments = () => {
        const safeName = (college?.name || "Institution").replace(/[^a-zA-Z0-9]/g, '_');
        const header = "Enrollment ID,Course Title,Student ID,Progress,Status,Enrolled Date";
        const rows = enrollments.map(e => {
            const title = Array.isArray(e.course) ? e.course[0]?.title : e.course?.title || 'Course';
            return `${e.id},"${(title || '').replace(/"/g, '""')}",${e.student_id},${e.progress || 0}%,${e.status || 'APPROVED'},${e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : ''}`;
        });
        downloadCSV(`${safeName}_Enrollments_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    };

    if (loading || !college) {
        return (
            <MasterLayout headerTitle="Loading Institution..." headerDescription="Retrieving tenant database mapping.">
                <div className="py-20 text-center text-slate-400">Loading tenant details...</div>
                {/* 🚀 Provision Institutional ID & Account Modal */}
            <MasterCreateAccountModal
                open={createAccountModalOpen}
                onOpenChange={setCreateAccountModalOpen}
                initialCollegeId={id}
                initialRole={createAccountRole}
                onSuccess={fetchDetails}
            />
            {/* 🗑️ Permanent ID & Account Deletion Modal */}
            <MasterDeleteUserModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                user={userToDelete}
                onSuccess={fetchDetails}
            />
        </MasterLayout>
        );
    }

    const isTurnedOn = college.activation_status === true;

    return (
        <MasterLayout
            headerTitle={`${college.name}`}
            headerDescription={`Tenant UUID: ${college.id} • Currency: ₹ ${college.currency || 'INR'} • Capacity: ${college.max_students || 1000} Seats`}
            action={
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => navigate('/master/colleges')} className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5"/> All Colleges
                    </Button>

                    {/* TURN ON / TURN OFF BUTTON */}
                    <Button
                        variant={isTurnedOn ? "destructive" : "default"}
                        onClick={handleTogglePower}
                        className={`text-xs font-semibold ${isTurnedOn ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                    >
                        {isTurnedOn ? (
                            <><PowerOff className="w-3.5 h-3.5 mr-1.5" /> Turn OFF (Maintenance)</>
                        ) : (
                            <><Power className="w-3.5 h-3.5 mr-1.5" /> Turn ON (Restore Access)</>
                        )}
                    </Button>

                    <Button onClick={handleImpersonate} className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Campus Admin View
                    </Button>
                    <Button
                        onClick={() => { setCreateAccountRole("admin"); setCreateAccountModalOpen(true); }}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold gap-1.5"
                    >
                        <UserPlus className="w-3.5 h-3.5" /> Provision College User
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* State Banner */}
                {!isTurnedOn && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <PowerOff className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>
                                <strong>Service Maintenance Active:</strong> This college is currently turned OFF. All student & faculty accounts attempting to log in will see the Service Maintenance & Customer Care screen.
                            </span>
                        </div>
                        <Button size="sm" onClick={handleTogglePower} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shrink-0 w-full sm:w-auto">
                            Turn ON Now
                        </Button>
                    </div>
                )}

                <Tabs defaultValue="students" className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1">
                        <TabsList className="inline-flex min-w-max h-auto p-1 bg-slate-900 border border-slate-800 text-slate-400 gap-1">
                            <TabsTrigger value="students" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Students ({students.length})
                            </TabsTrigger>
                            <TabsTrigger value="teachers" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-400"/> Faculty ({teachers.length})
                            </TabsTrigger>
                            <TabsTrigger value="courses" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-purple-400"/> Courses ({courses.length})
                            </TabsTrigger>
                            <TabsTrigger value="enrollments" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <Activity className="w-3.5 h-3.5 mr-1.5 text-sky-400"/> Enrollments ({enrollments.length})
                            </TabsTrigger>
                            <TabsTrigger value="billing" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <Receipt className="w-3.5 h-3.5 mr-1.5 text-amber-400"/> Invoices ({invoices.length})
                            </TabsTrigger>
                            <TabsTrigger value="plan_features" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs py-2 px-3">
                                <Layers className="w-3.5 h-3.5 mr-1.5 text-cyan-400"/> Plan & Features
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Students Tab */}
                    <TabsContent value="students" className="mt-4">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base text-slate-100">Enrolled Student Directory</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">Active learner accounts associated with this institution.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button 
                                        size="sm" 
                                        onClick={() => { setCreateAccountRole("student"); setCreateAccountModalOpen(true); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-sm"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" /> Provision Student ID
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={handleDownloadStudents} 
                                        className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
                                    >
                                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Download Students ({students.length})
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2 px-0">
                                <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[650px]">
                                        <TableHeader>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableHead className="text-slate-400 pl-6">Student Name</TableHead>
                                                <TableHead className="text-slate-400">Email Address</TableHead>
                                                <TableHead className="text-slate-400">Department</TableHead>
                                                <TableHead className="text-slate-400 text-center">Status</TableHead>
                                                <TableHead className="text-slate-400 text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                                        No students enrolled in this college yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : students.map(s => (
                                                <TableRow key={s.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="font-semibold text-slate-100 pl-6">{s.full_name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-300">{s.email}</TableCell>
                                                    <TableCell className="text-xs text-slate-400">{s.department || 'General'}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={s.status === 'active' ? 'default' : 'outline'} className={s.status === 'active' ? 'bg-emerald-600 text-white' : ''}>
                                                            {s.status || 'Active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => { setUserToDelete(s); setDeleteModalOpen(true); }}
                                                            className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs gap-1 border border-rose-900/40"
                                                            title="Delete Student ID"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete ID
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Faculty Tab */}
                    <TabsContent value="teachers" className="mt-4">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base text-slate-100">Faculty & Administrators Directory</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">Assigned teachers, institutional admins, and finance officers.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button 
                                        size="sm" 
                                        onClick={() => { setCreateAccountRole("teacher"); setCreateAccountModalOpen(true); }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-sm"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" /> Provision Faculty / Admin ID
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={handleDownloadFaculty} 
                                        className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
                                    >
                                        <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" /> Download Faculty ({teachers.length})
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2 px-0">
                                <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[650px]">
                                        <TableHeader>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableHead className="text-slate-400 pl-6">Role Privilege</TableHead>
                                                <TableHead className="text-slate-400">Staff Member</TableHead>
                                                <TableHead className="text-slate-400">Official Email</TableHead>
                                                <TableHead className="text-slate-400">Department</TableHead>
                                                <TableHead className="text-slate-400 text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {teachers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                                        No faculty members mapped to this college yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : teachers.map(t => (
                                                <TableRow key={t.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="pl-6">
                                                        <Badge variant="outline" className={`font-mono text-xs ${t.role === 'admin' ? 'border-indigo-500/40 text-indigo-400' : 'border-purple-500/40 text-purple-400'}`}>
                                                            {t.role?.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-slate-100">{t.full_name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-300">{t.email}</TableCell>
                                                    <TableCell className="text-xs text-slate-400">{t.department || 'Academic Affairs'}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => { setUserToDelete(t); setDeleteModalOpen(true); }}
                                                            className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs gap-1 border border-rose-900/40"
                                                            title="Delete Institutional ID"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete ID
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Courses Tab */}
                    <TabsContent value="courses" className="mt-4">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base text-slate-100">Course Curriculum Matrix</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">Curriculums deployed and assigned to this college instance.</CardDescription>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleDownloadCourses} 
                                    className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-purple-400" /> Download Courses ({courses.length})
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-2 px-0">
                                <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[500px]">
                                        <TableHeader>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableHead className="text-slate-400 pl-6">Curriculum Title</TableHead>
                                                <TableHead className="text-slate-400">Status</TableHead>
                                                <TableHead className="text-slate-400 text-right pr-6">Deployed On</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {courses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                                                        No courses currently provisioned under this college ID.
                                                    </TableCell>
                                                </TableRow>
                                            ) : courses.map(c => (
                                                <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="font-semibold text-slate-100 pl-6">{c.title}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={c.is_published ? 'default' : 'outline'} className={c.is_published ? 'bg-emerald-600' : 'text-slate-400'}>
                                                            {c.is_published ? 'Published' : 'Draft'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-slate-400 pr-6">
                                                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Enrollments Tab */}
                    <TabsContent value="enrollments" className="mt-4">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base text-slate-100">Enrollment Telemetry</CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">Live course completion and student enrollment records.</CardDescription>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleDownloadEnrollments} 
                                    className="border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1.5"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-sky-400" /> Download Enrollments ({enrollments.length})
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-2 px-0">
                                <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[500px]">
                                        <TableHeader>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableHead className="text-slate-400 pl-6">Course</TableHead>
                                                <TableHead className="text-slate-400">Progress</TableHead>
                                                <TableHead className="text-slate-400 text-right pr-6">Enrollment Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {enrollments.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                                                        No active course enrollments mapped to this tenant yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : enrollments.map(e => (
                                                <TableRow key={e.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="font-semibold text-slate-100 pl-6">
                                                        {Array.isArray(e.course) ? e.course[0]?.title : e.course?.title || 'Course'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-emerald-400">
                                                        {e.progress || 0}% Complete
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                                                            {e.status?.toUpperCase() || 'APPROVED'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Billing & Invoices Tab */}
                    <TabsContent value="billing" className="mt-4 space-y-6">
                        {/* Issue New Invoice Form */}
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3">
                                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                                    <PlusCircle className="h-4 w-4 text-emerald-400" /> Issue Invoice to {college.name}
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs">
                                    Issue billing demand for student seats and course licensing in Indian Rupees (₹).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-300">Enrolled Student Seats</Label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={invoiceSeats} 
                                            onChange={e => setInvoiceSeats(e.target.value)} 
                                            className="bg-slate-950 border-slate-800 text-white text-xs h-9" 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-300">Cost per Seat (₹ INR)</Label>
                                        <Input 
                                            type="number" 
                                            min="10" 
                                            value={invoiceRate} 
                                            onChange={e => setInvoiceRate(e.target.value)} 
                                            className="bg-slate-950 border-slate-800 text-white text-xs h-9" 
                                            required 
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={creatingInvoice} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
                                    >
                                        {creatingInvoice ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/> Generating...</> : "Generate & Issue Invoice"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Invoices List */}
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3">
                                <CardTitle className="text-base text-slate-100">Historical Invoices</CardTitle>
                                <CardDescription className="text-slate-400 text-xs">All invoices generated for this institutional instance.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2 px-0">
                                <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[550px]">
                                        <TableHeader>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableHead className="text-slate-400 pl-6">Invoice #</TableHead>
                                                <TableHead className="text-center text-slate-400">Seats</TableHead>
                                                <TableHead className="text-right text-slate-400">Demand Amount</TableHead>
                                                <TableHead className="text-slate-400">Status</TableHead>
                                                <TableHead className="text-right text-slate-400 pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoices.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                                        No invoices issued for this college yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : invoices.map(inv => (
                                                <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="font-mono text-xs font-semibold text-slate-200 pl-6">{inv.invoice_number}</TableCell>
                                                    <TableCell className="text-center font-mono text-xs text-slate-300">{inv.student_count}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                                                        ₹{inv.total_amount?.toLocaleString('en-IN')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className={inv.status === 'paid' ? 'bg-emerald-600' : 'border-amber-500/40 text-amber-400'}>
                                                            {inv.status?.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            {inv.status === 'pending' && (
                                                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40" onClick={() => markInvoicePaid(inv.id)}>
                                                                    Mark Paid
                                                                </Button>
                                                            )}
                                                            {inv.pdf_url && (
                                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white" onClick={() => window.open(inv.pdf_url, '_blank')}>
                                                                    <Download className="h-3 w-3 mr-1" /> PDF
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Plan & Features Management Tab */}
                    <TabsContent value="plan_features" className="mt-4 space-y-6">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                            <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-cyan-400" />
                                        Institutional Plan & Feature Controls
                                    </CardTitle>
                                    <CardDescription className="text-slate-400 text-xs">
                                        Customize active platform features, student quotas, and preset plans specifically for {college.name}.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleSaveFeatures}
                                        disabled={savingFeatures}
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold h-8 shadow-md"
                                    >
                                        {savingFeatures ? (
                                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/> Saving...</>
                                        ) : (
                                            <><Save className="h-3.5 w-3.5 mr-1.5"/> Save Permissions & Quotas</>
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6 space-y-6">
                                {/* Preset Plan Template Picker */}
                                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                            Apply a Preset Subscription Plan
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            Current Quota: <strong className="text-white">{customMaxStudents} Students</strong>
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                        {(allPlans?.length ? allPlans : DEFAULT_PLANS).map(plan => (
                                            <div
                                                key={plan.id}
                                                onClick={() => handleApplyPlanPreset(plan.id)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                    selectedPlanPreset === plan.id
                                                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="text-xs font-bold text-white truncate">{plan.name}</div>
                                                <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                                    ₹{plan.priceMonthlyINR.toLocaleString('en-IN')} / mo
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                                    <span>{plan.maxStudents} Seats</span>
                                                    <span>{plan.features.length} Feats</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Seat Capacity */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-xs text-slate-300">Max Student Seat Quota</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={customMaxStudents}
                                            onChange={e => setCustomMaxStudents(parseInt(e.target.value) || 1)}
                                            className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs text-slate-300">Enforcement Scope</Label>
                                        <div className="text-xs text-slate-400 p-2 rounded-lg bg-slate-950 border border-slate-800">
                                            Features checked below are immediately live for all registered students & faculty at {college.name}.
                                        </div>
                                    </div>
                                </div>

                                {/* Granular Platform Feature Checklist */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <div className="text-xs font-semibold text-slate-200">
                                            Platform Feature Checklist ({activeFeatures.length}/{allFeatures.length} Enabled)
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setActiveFeatures(allFeatures.map(f => f.id))}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 h-6 px-2"
                                            >
                                                Enable All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setActiveFeatures([])}
                                                className="text-xs text-slate-400 hover:text-white h-6 px-2"
                                            >
                                                Disable All
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {allFeatures.map(feat => {
                                            const isChecked = activeFeatures.includes(feat.id);
                                            return (
                                                <div
                                                    key={feat.id}
                                                    onClick={() => handleToggleFeature(feat.id)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                        isChecked
                                                            ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100 shadow-sm'
                                                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleToggleFeature(feat.id)}
                                                            className="mt-0.5 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                                                        />
                                                        <div className="space-y-0.5 truncate">
                                                            <div className="text-xs font-semibold text-white truncate">
                                                                {feat.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                                                                {feat.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </MasterLayout>
    );
}
