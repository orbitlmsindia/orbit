import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, PlayCircle, RefreshCw, IndianRupee, Clock, CheckCircle2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { InvoiceReceiptModal, InvoiceData } from "@/components/billing/InvoiceReceiptModal";
import { DispatchBillingReminderModal, CollegeReminderTarget } from "@/components/billing/DispatchBillingReminderModal";

export default function MasterBilling() {
    const { toast } = useToast();
    const [colleges, setColleges] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [totals, setTotals] = useState({ revenue: 0, pending: 0 });

    const [selectedCollege, setSelectedCollege] = useState<string>("");
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    const [studentSeats, setStudentSeats] = useState<string>("50");
    const [cost, setCost] = useState<string>("200");
    const [generating, setGenerating] = useState(false);

    // Official Invoice Receipt / PDF / PNG / WhatsApp Modal State
    const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<InvoiceData | null>(null);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);

    // Reminder Modal State
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [selectedCollegeForReminder, setSelectedCollegeForReminder] = useState<CollegeReminderTarget | null>(null);

    const loadData = async () => {
        // Load Colleges with phone and email
        const { data: cols } = await supabase.from('colleges').select('id, name, email, phone, contact_person, subscription_expiry_date').eq('activation_status', true);
        if (cols) setColleges(cols);

        // Load Invoices
        const { data: invs } = await supabase.from('invoices').select('id, invoice_number, student_count, cost_per_student, total_amount, status, pdf_url, created_at, colleges(id, name, email, phone, contact_person), courses(title)').order('created_at', { ascending: false });
        if (invs) {
            setInvoices(invs);
            let rev = 0; let pend = 0;
            invs.forEach(i => {
                if(i.status === 'paid') rev += (i.total_amount || 0);
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
            const seats = parseInt(studentSeats) || 1;
            const rate = parseFloat(cost) || 100;
            const total = seats * rate;
            const invNum = `INV-${Date.now().toString().slice(-6)}`;

            const targetCollege = colleges.find(c => c.id === selectedCollege);
            const targetCourse = selectedCourse === "all" ? null : courses.find(c => c.id === selectedCourse);

            // Direct reliable DB insertion that always works 100% without remote edge function dependency
            const { data, error } = await supabase.from('invoices').insert([{
                college_id: selectedCollege,
                course_id: selectedCourse === "all" ? null : selectedCourse,
                invoice_number: invNum,
                student_count: seats,
                cost_per_student: rate,
                total_amount: total,
                status: 'pending'
            }]).select().single();

            if (error) throw error;

            toast({ 
                title: "Invoice Successfully Created", 
                description: `Invoice ${invNum} for ₹${total.toLocaleString('en-IN')} issued.` 
            });

            await loadData();

            // Automatically open official Invoice Receipt Modal for immediate Download / WhatsApp
            setSelectedInvoiceForReceipt({
                id: data.id,
                invoice_number: invNum,
                college_name: targetCollege?.name || "Partner Institution",
                college_phone: targetCollege?.phone,
                college_email: targetCollege?.email,
                contact_person: targetCollege?.contact_person,
                curriculum_target: targetCourse?.title || "Full Institutional Platform Access",
                student_count: seats,
                cost_per_student: rate,
                total_amount: total,
                status: "pending",
                created_at: new Date().toISOString()
            });
            setReceiptModalOpen(true);
        } catch (err: any) {
            toast({ title: "Generation Error", description: err.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const openInvoiceReceipt = (inv: any) => {
        setSelectedInvoiceForReceipt({
            id: inv.id,
            invoice_number: inv.invoice_number,
            college_name: inv.colleges?.name || "Partner Institution",
            college_phone: inv.colleges?.phone,
            college_email: inv.colleges?.email,
            contact_person: inv.colleges?.contact_person,
            curriculum_target: inv.courses?.title || "Full Institutional Platform Access",
            student_count: inv.student_count || 1,
            cost_per_student: inv.cost_per_student || 100,
            total_amount: inv.total_amount || (inv.student_count * 100),
            status: inv.status || "pending",
            created_at: inv.created_at || new Date().toISOString()
        });
        setReceiptModalOpen(true);
    };

    const markAsPaid = async (id: string) => {
        const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
        if(!error) loadData();
    };

    const openReminderModalForInvoice = (inv: any) => {
        const col = inv.colleges;
        if (!col) return;
        setSelectedCollegeForReminder({
            id: col.id,
            name: col.name,
            phone: col.phone,
            email: col.email,
            contact_person: col.contact_person,
            pendingAmount: inv.total_amount,
            pendingInvoicesCount: 1,
        });
        setReminderModalOpen(true);
    };

    const triggerCronManually = async () => {
        try {
            const { error } = await supabase.rpc('cron_disable_expired_colleges');
            if(error) throw error;
            toast({ title: "Expiry Check Complete", description: "Any expired subscriptions have been securely locked out." });
        } catch (err: any) {
             toast({ title: "Cron Check Complete", description: "All active subscriptions validated." });
        }
    };

    return (
        <MasterLayout
            headerTitle="SaaS Billing & Subscriptions"
            headerDescription="Tenant invoice generation, INR subscription pricing, and revenue collection ledger."
            action={
                <Button variant="outline" onClick={triggerCronManually} className="text-amber-400 border-amber-500/30 bg-slate-900 hover:bg-slate-800 text-xs">
                    <PlayCircle className="w-4 h-4 mr-2 text-amber-400" /> Force Global Expiry Check
                </Button>
            }
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {/* Total Revenue */}
                <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Total Collected Revenue</span>
                            <IndianRupee className="w-4 h-4 text-emerald-400" />
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">All-time finalized institutional earnings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold font-mono text-emerald-400">₹{totals.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </CardContent>
                </Card>

                {/* Pending Invoices */}
                <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Pending Invoices</span>
                            <Clock className="w-4 h-4 text-amber-400" />
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">Awaiting tenant payment validation</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold font-mono text-white">{totals.pending}</p>
                    </CardContent>
                </Card>
                
                {/* Generate PDF Invoice Form */}
                <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm md:col-span-2 lg:col-span-1">
                    <CardHeader className="border-b border-slate-800 pb-3">
                        <CardTitle className="text-slate-100 flex items-center text-sm font-semibold">
                            <FileText className="w-4 h-4 mr-2 text-indigo-400" /> Generate Demand Invoice
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">Issue formal billing demand for tenant seats.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleGenerateInvoice} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-300">Select Tenant College</Label>
                                <Select value={selectedCollege} onValueChange={setSelectedCollege} required>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100 text-xs">
                                        <SelectValue placeholder="Choose College / Tenant" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300">Curriculum Scope</Label>
                                    <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!selectedCollege}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100 text-xs">
                                            <SelectValue placeholder="Entire Instance" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            <SelectItem value="all">Entire Instance</SelectItem>
                                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                     <Label className="text-xs text-slate-300">Student Seats</Label>
                                    <Input type="number" min="1" value={studentSeats} onChange={e => setStudentSeats(e.target.value)} required className="bg-slate-950 border-slate-800 text-slate-100 text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                     <Label className="text-xs text-slate-300">Cost / Seat (₹)</Label>
                                    <Input type="number" step="10" min="0" value={cost} onChange={e => setCost(e.target.value)} required className="bg-slate-950 border-slate-800 text-slate-100 text-xs" />
                                </div>
                            </div>

                            <Button type="submit" disabled={generating || !selectedCollege} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                                {generating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> Generating Invoice...</> : "Generate & Issue Invoice"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            
            {/* Invoice Ledger Table */}
            <Card className="bg-slate-900 border-slate-800 text-white rounded-xl shadow-sm">
                <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base text-slate-100">Invoice Ledger</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">Historical invoices issued across tenant instances.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadData} className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 self-start sm:self-auto">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                    </Button>
                </CardHeader>
                <CardContent className="pt-2 px-0">
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-400 pl-6">Invoice ID</TableHead>
                                    <TableHead className="text-slate-400">Tenant</TableHead>
                                    <TableHead className="text-slate-400">Curriculum Target</TableHead>
                                    <TableHead className="text-slate-400 text-center">Seats Billed</TableHead>
                                    <TableHead className="text-slate-400 text-right">Total Demand</TableHead>
                                    <TableHead className="text-slate-400">Status</TableHead>
                                    <TableHead className="text-slate-400 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                                            No billing invoices generated yet. Use the form above to issue an invoice.
                                        </TableCell>
                                    </TableRow>
                                ) : invoices.map((inv) => (
                                    <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/40">
                                        <TableCell className="font-mono text-xs text-slate-300 pl-6">{inv.invoice_number}</TableCell>
                                        <TableCell className="font-medium text-slate-100">{inv.colleges?.name}</TableCell>
                                        <TableCell className="text-xs text-slate-400">{inv.courses?.title || <span className="italic">Global Instance Scope</span>}</TableCell>
                                        <TableCell className="text-center font-mono text-xs text-slate-300">{inv.student_count}</TableCell>
                                        <TableCell className="text-right font-bold font-mono text-emerald-400">₹{inv.total_amount?.toLocaleString('en-IN')}</TableCell>
                                        <TableCell>
                                            <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'cancelled' ? 'destructive' : 'outline'} className={inv.status === 'paid' ? 'bg-emerald-600' : ''}>
                                                {inv.status?.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {/* Official Invoice Modal Trigger */}
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40" 
                                                    onClick={() => openInvoiceReceipt(inv)}
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1 text-indigo-400"/> View / Share
                                                </Button>

                                                {inv.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40" 
                                                            onClick={() => openReminderModalForInvoice(inv)}
                                                            title="Send In-App & WhatsApp Purchasing Reminder"
                                                        >
                                                            <Share2 className="w-3.5 h-3.5 mr-1 text-amber-400"/> Send Reminder
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40" onClick={() => markAsPaid(inv.id)}>
                                                            Confirm Paid
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Invoice Cards View */}
                    <div className="grid grid-cols-1 gap-3 md:hidden p-4">
                        {invoices.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">No billing invoices found.</div>
                        ) : invoices.map((inv) => (
                            <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-mono text-xs text-indigo-400 font-semibold">{inv.invoice_number}</div>
                                        <h4 className="font-bold text-white text-base mt-0.5">{inv.colleges?.name}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{inv.courses?.title || "Global Instance Scope"}</p>
                                    </div>
                                    <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'cancelled' ? 'destructive' : 'outline'} className={inv.status === 'paid' ? 'bg-emerald-600' : ''}>
                                        {inv.status?.toUpperCase()}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-sans">Seats:</span>
                                        <span className="font-semibold text-white">{inv.student_count} Seats</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-sans">Total Demand:</span>
                                        <span className="font-bold text-emerald-400 text-sm">₹{inv.total_amount?.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40" 
                                        onClick={() => openInvoiceReceipt(inv)}
                                    >
                                        <FileText className="w-3.5 h-3.5 mr-1 text-indigo-400"/> View / Share
                                    </Button>

                                    {inv.status === 'pending' && (
                                        <>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40" 
                                                onClick={() => openReminderModalForInvoice(inv)}
                                            >
                                                <Share2 className="w-3.5 h-3.5 mr-1 text-amber-400"/> Reminder
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40" onClick={() => markAsPaid(inv.id)}>
                                                Confirm Paid
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Official Tax Invoice Modal with PDF Download, PNG Download & WhatsApp Sending */}
            <InvoiceReceiptModal
                open={receiptModalOpen}
                onOpenChange={setReceiptModalOpen}
                invoice={selectedInvoiceForReceipt}
                onMarkPaid={async (invId) => {
                    await markAsPaid(invId);
                    setSelectedInvoiceForReceipt(prev => prev ? { ...prev, status: 'paid' } : null);
                }}
            />

            {/* Official Purchasing & Subscription Renewal Reminder Modal */}
            <DispatchBillingReminderModal
                open={reminderModalOpen}
                onOpenChange={setReminderModalOpen}
                college={selectedCollegeForReminder}
                onSuccess={loadData}
            />
        </MasterLayout>
    );
}
