import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function MasterBilling() {
    const { toast } = useToast();
    const [colleges, setColleges] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [totals, setTotals] = useState({ revenue: 0, pending: 0 });

    const [selectedCollege, setSelectedCollege] = useState<string>("");
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    const [cost, setCost] = useState<string>("10");
    const [generating, setGenerating] = useState(false);

    const loadData = async () => {
        // Load Colleges
        const { data: cols } = await supabase.from('colleges').select('id, name').eq('activation_status', true);
        if (cols) setColleges(cols);

        // Load Invoices
        const { data: invs } = await supabase.from('invoices').select('*, colleges(name), courses(title)').order('created_at', { ascending: false });
        if (invs) {
            setInvoices(invs);
            let rev = 0; let pend = 0;
            invs.forEach(i => {
                if(i.status === 'paid') rev += i.total_amount;
                if(i.status === 'pending') pend++;
            });
            setTotals({ revenue: rev, pending: pend });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // When college changes, fetch its courses
    useEffect(() => {
        if (selectedCollege) {
            supabase.from('courses').select('id, title').eq('college_id', selectedCollege).then(({ data }) => {
                setCourses(data || []);
                setSelectedCourse("all"); // reset
            });
        }
    }, [selectedCollege]);

    const handleGenerateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const payload = {
                collegeId: selectedCollege,
                courseId: selectedCourse === "all" ? null : selectedCourse,
                costPerStudent: parseFloat(cost)
            };

            const { data, error } = await supabase.functions.invoke('generate-invoice', {
                body: payload
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast({ title: "Invoice Issued", description: `PDF successfully generated` });
            loadData(); // refresh table
            
            // Auto open PDF
            if(data.invoice?.pdf_url) {
                window.open(data.invoice.pdf_url, '_blank');
            }
        } catch (err: any) {
            toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const markAsPaid = async (id: string) => {
        const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
        if(!error) loadData();
    };

    const triggerCronManually = async () => {
        try {
            const { error } = await supabase.rpc('cron_disable_expired_colleges');
            if(error) throw error;
            toast({ title: "Expiry Check Complete", description: "Any expired subscriptions have been securely locked out." });
        } catch (err: any) {
             toast({ title: "Cron Check Failed", description: err.message, variant: "destructive" });
        }
    }

    return (
        <MasterLayout
            headerTitle="SaaS Billing & Subscriptions"
            headerDescription="Invoice Generation, Subscription Locking, and Revenue Tracking"
            action={
                <Button variant="outline" onClick={triggerCronManually} className="text-amber-700 border-amber-300 bg-amber-50">
                    <PlayCircle className="w-4 h-4 mr-2" /> Force Global Expiry Cron Job
                </Button>
            }
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Collected Revenue</CardTitle>
                        <CardDescription>All time finalized earnings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Invoices</CardTitle>
                        <CardDescription>Awaiting payment validation</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totals.pending}</p>
                    </CardContent>
                </Card>
                
                <Card className="border-indigo-200">
                    <CardHeader className="bg-indigo-50/50 pb-4">
                        <CardTitle className="text-indigo-800 flex items-center"><FileText className="w-5 h-5 mr-2"/> Generate PDF Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleGenerateInvoice} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Tenant</Label>
                                <Select value={selectedCollege} onValueChange={setSelectedCollege} required>
                                    <SelectTrigger><SelectValue placeholder="Choose College / Tenant" /></SelectTrigger>
                                    <SelectContent>
                                        {colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Course Scope</Label>
                                    <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!selectedCollege}>
                                        <SelectTrigger><SelectValue placeholder="Entire Instance" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Entire Instance</SelectItem>
                                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cost per Seat ($)</Label>
                                    <Input type="number" step="0.50" min="0" value={cost} onChange={e => setCost(e.target.value)} required />
                                </div>
                            </div>

                            <Button type="submit" disabled={generating || !selectedCollege} className="w-full bg-slate-900 hover:bg-slate-800">
                                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Generating PDF...</> : "Generate Target Invoice"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Invoice Ledger</span>
                        <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Tenant Domain</TableHead>
                                <TableHead>Course Target</TableHead>
                                <TableHead className="text-center">Seats Billed</TableHead>
                                <TableHead className="text-right">Total Demand</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 && (
                                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">No invoices mapped yet.</TableCell></TableRow>
                            )}
                            {invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                                    <TableCell className="font-medium">{inv.colleges?.name}</TableCell>
                                    <TableCell>{inv.courses?.title || <span className="text-slate-400 italic">Global Instance Scope</span>}</TableCell>
                                    <TableCell className="text-center">{inv.student_count}</TableCell>
                                    <TableCell className="text-right font-bold tracking-tight">${inv.total_amount?.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'cancelled' ? 'destructive' : 'outline'} className={inv.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                            {inv.status?.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 text-slate-500">
                                            {inv.status === 'pending' && (
                                                <Button size="sm" variant="outline" className="h-8 shadow-sm flex items-center text-emerald-600 border-emerald-200" onClick={() => markAsPaid(inv.id)}>
                                                    Confirm Paid
                                                </Button>
                                            )}
                                            {inv.pdf_url && (
                                                <Button size="sm" variant="ghost" className="h-8 flex items-center gap-1" onClick={() => window.open(inv.pdf_url, '_blank')}>
                                                    <Download className="w-4 h-4"/> PDF
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </MasterLayout>
    );
}
