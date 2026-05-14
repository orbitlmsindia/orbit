import { MasterLayout } from "@/components/layout/MasterLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Eye, Play, Pause, Trash2, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MasterColleges() {
    const [colleges, setColleges] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newCollege, setNewCollege] = useState({ name: '', shortName: '' });
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState<any>(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchColleges = async () => {
        // We use the Postgres View we created for optimized aggregated counts
        const { data, error } = await supabase.from('college_stats_view').select('*').order('created_at', { ascending: false });
        if (data) setColleges(data);
    };

    useEffect(() => {
        fetchColleges();
    }, []);

    const handleCreateCollege = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Call our Edge Function securely
            const { data, error } = await supabase.functions.invoke('create-college', {
                body: { collegeName: newCollege.name, shortName: newCollege.shortName }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast({ title: "Success", description: "College and Admin auto-provisioned securely." });
            setCredentials(data.credentials);
            fetchColleges();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const toggleCollegeStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('colleges').update({ activation_status: !currentStatus }).eq('id', id);
            if (error) throw error;
            toast({ title: "Status Updated", description: "College access has been " + (!currentStatus ? "Activated" : "Suspended") });
            
            // Audit Logging
            await supabase.rpc('log_audit_action', { p_action: !currentStatus ? 'ACTIVATE' : 'SUSPEND', p_entity_type: 'colleges', p_entity_id: id });
            
            fetchColleges();
        } catch(err:any) {
            toast({ title: "Action Failed", description: err.message, variant: "destructive" });
        }
    };

    const softDeleteCollege = async (id: string) => {
        if (!confirm("Are you sure? Soft delete will hide this college entirely.")) return;
        try {
            // Implementation of Soft Delete (assumes a deleted_at or similar column, or for now we just suspend permanently)
            const { error } = await supabase.from('colleges').update({ activation_status: false, subscription_status: 'deleted' }).eq('id', id);
            if (error) throw error;
            await supabase.rpc('log_audit_action', { p_action: 'SOFT_DELETE', p_entity_type: 'colleges', p_entity_id: id });
            fetchColleges();
        } catch(err:any) {
            toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
        }
    }

    return (
        <MasterLayout
            headerTitle="Tenant College Registry"
            headerDescription="SaaS Global Management View (Strictly Confined to Master Admin)"
            action={
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 border"><Plus className="w-4 h-4 mr-2" /> Provision New College</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Provision SaaS Tenant</DialogTitle>
                        </DialogHeader>
                        {credentials ? (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-emerald-600">Successfully Provisioned Database Schema & Admin Rights.</p>
                                <div className="p-4 bg-slate-100 rounded border">
                                    <p className="text-sm"><span className="font-bold">Login Email:</span> {credentials.email}</p>
                                    <p className="text-sm"><span className="font-bold">Password:</span> {credentials.password}</p>
                                    <p className="text-xs text-muted-foreground mt-2">Email notification dispatched secretly to Admin.</p>
                                </div>
                                <Button onClick={() => { setIsCreateOpen(false); setCredentials(null); }} className="w-full">Close Window</Button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateCollege} className="space-y-4">
                                <div>
                                    <Label>Formal College Name</Label>
                                    <Input required value={newCollege.name} onChange={e => setNewCollege({...newCollege, name: e.target.value})} placeholder="Harvard University" />
                                </div>
                                <div>
                                    <Label>Short Identifier Namespace (For Login Prefix)</Label>
                                    <Input required value={newCollege.shortName} onChange={e => setNewCollege({...newCollege, shortName: e.target.value})} placeholder="harvard" />
                                </div>
                                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                    {loading ? "Provisioning Architecture..." : "Deploy Tenant"}
                                </Button>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            }
        >
            <div className="bg-white rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>College Name</TableHead>
                            <TableHead className="text-center">Students</TableHead>
                            <TableHead className="text-center">Teachers</TableHead>
                            <TableHead className="text-center">Courses</TableHead>
                            <TableHead>Subscription</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Manage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {colleges.filter(c => c.subscription_status !== 'deleted').map((college) => (
                            <TableRow key={college.id}>
                                <TableCell className="font-medium text-slate-800">{college.name}</TableCell>
                                <TableCell className="text-center">{college.student_count || 0}</TableCell>
                                <TableCell className="text-center">{college.teacher_count || 0}</TableCell>
                                <TableCell className="text-center">{college.course_count || 0}</TableCell>
                                <TableCell>
                                    <Badge variant={college.subscription_status === 'active' ? "default" : "outline"} className="capitalize">
                                        {college.subscription_status || 'Trial'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={college.activation_status ? "default" : "destructive"}>
                                        {college.activation_status ? "Active" : "Suspended (Locked)"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => navigate(`/master/colleges/${college.id}`)}>
                                                <Eye className="mr-2 h-4 w-4" /> Deep Dive View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toggleCollegeStatus(college.id, college.activation_status)}>
                                                {college.activation_status ? <Pause className="mr-2 h-4 w-4 text-orange-500" /> : <Play className="mr-2 h-4 w-4 text-emerald-500" />}
                                                {college.activation_status ? "Suspend Operations" : "Activate Instance"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                sessionStorage.setItem('impersonator', 'true');
                                                sessionStorage.setItem('collegeId', college.id);
                                                window.open('/admin', '_blank');
                                            }}>
                                                <Key className="mr-2 h-4 w-4" /> Impersonate (Read-Only)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => softDeleteCollege(college.id)} className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" /> Soft Delete Data
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </MasterLayout>
    );
}
