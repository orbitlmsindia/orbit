import { MasterLayout } from "@/components/layout/MasterLayout";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Shield, CreditCard, Activity, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MasterCollegeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [college, setCollege] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        const fetchDetails = async () => {
            // Load College Meta
            const { data: colData } = await supabase.from('colleges').select('*').eq('id', id).single();
            setCollege(colData);

            // Log Audit Event for "VIEW" securely via backend
            if (colData) {
                await supabase.rpc('log_audit_action', { 
                    p_action: 'VIEW_DETAILS', 
                    p_entity_type: 'colleges', 
                    p_entity_id: id 
                });
            }

            // Load Users (Master Admins bypass RLS implicitly so we just filter by ID manually)
            const { data: usersData } = await supabase.from('users').select('*').eq('college_id', id);
            if (usersData) {
                setStudents(usersData.filter(u => u.role === 'student'));
                setTeachers(usersData.filter(u => u.role === 'teacher' || u.role === 'admin'));
            }

            // Load Courses explicitly for this tenant
            const { data: coursesData } = await supabase.from('courses').select('id, title, is_published').eq('college_id', id);
            if (coursesData) setCourses(coursesData);
        };
        if (id) fetchDetails();
    }, [id]);

    const handleImpersonate = () => {
        sessionStorage.setItem('impersonator', 'true');
        sessionStorage.setItem('collegeId', id as string);
        toast({ title: "Impersonation Link Active", description: "You are now injecting College " + college?.name });
        window.open('/admin', '_blank'); // Open their instance in new tab seamlessly
    };

    if (!college) return <MasterLayout headerTitle="Loading Domain..." headerDescription="Please wait"></MasterLayout>;

    return (
        <MasterLayout
            headerTitle={`${college.name} Deep Dive`}
            headerDescription={`UUID: ${college.id} • Mode: Cross-Tenant View Only`}
            action={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/master/colleges')}><ArrowLeft className="w-4 h-4 mr-2"/> Return</Button>
                    <Button onClick={handleImpersonate} className="bg-emerald-600 hover:bg-emerald-700">
                        <ExternalLink className="w-4 h-4 mr-2" /> Read-Only Impersonate UI
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <Tabs defaultValue="students" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 h-12">
                        <TabsTrigger value="students" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2"/> Students Directory</TabsTrigger>
                        <TabsTrigger value="teachers" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"><Shield className="w-4 h-4 mr-2"/> Teachers & Admins</TabsTrigger>
                        <TabsTrigger value="courses" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"><BookOpen className="w-4 h-4 mr-2"/> Courses Matrix</TabsTrigger>
                        <TabsTrigger value="payments" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"><CreditCard className="w-4 h-4 mr-2"/> Revenue Stream</TabsTrigger>
                        <TabsTrigger value="attendance" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"><Activity className="w-4 h-4 mr-2"/> Engagement Stats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="students" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Enrolled Student Base</CardTitle>
                                <CardDescription>All authorized students provisioned under this tenant mapping.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>System ID</TableHead>
                                            <TableHead>Full Legal Name</TableHead>
                                            <TableHead>Contact Email</TableHead>
                                            <TableHead>Active State</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map(s => (
                                            <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => alert(`View Full Profile Feature: ${s.full_name}`)}>
                                                <TableCell className="font-mono text-xs">{s.id.split('-')[0]}...</TableCell>
                                                <TableCell className="font-medium text-blue-600">{s.full_name}</TableCell>
                                                <TableCell>{s.email}</TableCell>
                                                <TableCell>{s.status || 'Active'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="teachers" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Authorized Staff Directory</CardTitle>
                                <CardDescription>Tenant Administrators and Verified Instructor licenses.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Permission Level</TableHead>
                                            <TableHead>Staff Identity</TableHead>
                                            <TableHead>Account Email</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teachers.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>{t.role}</span></TableCell>
                                                <TableCell className="font-medium">{t.full_name}</TableCell>
                                                <TableCell>{t.email}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="courses" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Deployed Modules & Materials</CardTitle>
                                <CardDescription>Courses available inside this tenant instance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Course UUID Identifier</TableHead>
                                            <TableHead>Course Curriculum Title</TableHead>
                                            <TableHead>Visibility</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {courses.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-mono text-xs">{c.id.substring(0,8)}...</TableCell>
                                                <TableCell className="font-medium">{c.title}</TableCell>
                                                <TableCell>{c.is_published ? 'Published' : 'Draft Mode'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Placeholder tabs for payments and analytics visualization */}
                    <TabsContent value="payments" className="mt-4">
                        <Card><CardHeader><CardTitle>SaaS Billing & Invoices (Coming Soon)</CardTitle></CardHeader></Card>
                    </TabsContent>
                    
                    <TabsContent value="attendance" className="mt-4">
                        <Card><CardHeader><CardTitle>Instance Global Engagement Telemetry</CardTitle></CardHeader></Card>
                    </TabsContent>

                </Tabs>
            </div>
        </MasterLayout>
    );
}
