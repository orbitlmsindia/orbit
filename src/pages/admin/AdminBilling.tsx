import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  Download, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  RefreshCw, 
  Building2, 
  Phone, 
  Mail, 
  Share2, 
  ShieldCheck,
  IndianRupee,
  HelpCircle,
  BellRing,
  Sparkles,
  CheckCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { InvoiceReceiptModal, InvoiceData } from "@/components/billing/InvoiceReceiptModal";

export default function AdminBilling() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [college, setCollege] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const fetchCollegeAndInvoices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let collegeId = sessionStorage.getItem("collegeId");

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("college_id, full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        if (userData?.college_id) {
          collegeId = userData.college_id;
        }
      }

      if (!collegeId) {
        collegeId = "00000000-0000-0000-0000-000000000001";
      }

      // 1. Fetch College Subscription Details
      const { data: colData } = await supabase
        .from("colleges")
        .select("id, name, email, phone, contact_person, subscription_status, activation_status, subscription_expiry_date, max_students, currency, reminder_note, last_reminder_sent_at, billing_reminder_active")
        .eq("id", collegeId)
        .maybeSingle();

      if (colData) {
        setCollege(colData);
      }

      // 2. Fetch Issued Invoices for this College
      const { data: invData } = await supabase
        .from("invoices")
        .select("id, invoice_number, student_count, cost_per_student, total_amount, status, created_at, courses(title)")
        .eq("college_id", collegeId)
        .order("created_at", { ascending: false });

      if (invData) {
        setInvoices(invData);
      }
    } catch (err: any) {
      console.error("Error loading institutional billing:", err);
      toast({
        title: "Error Loading Billing Data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollegeAndInvoices();
  }, []);

  const openReceipt = (inv: any) => {
    setSelectedInvoice({
      id: inv.id,
      invoice_number: inv.invoice_number,
      college_name: college?.name || "Educational Institution",
      college_phone: college?.phone || "+91 98765 43210",
      college_email: college?.email || "admin@orbitlms.edu.in",
      contact_person: college?.contact_person || "Administrator",
      curriculum_target: inv.courses?.title || "Full Institutional Platform Access",
      student_count: inv.student_count || 1,
      cost_per_student: inv.cost_per_student || 100,
      total_amount: inv.total_amount || 0,
      status: inv.status || "pending",
      created_at: inv.created_at || new Date().toISOString(),
    });
    setReceiptModalOpen(true);
  };

  const handleAcknowledgeReminder = async () => {
    if (!college?.id) return;
    try {
      await supabase
        .from("colleges")
        .update({ billing_reminder_active: false })
        .eq("id", college.id);

      setCollege((prev: any) => prev ? { ...prev, billing_reminder_active: false } : null);
      toast({
        title: "Directive Acknowledged",
        description: "Master Admin reminder marked as acknowledged.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to acknowledge reminder",
        variant: "destructive",
      });
    }
  };

  const daysRemaining = college?.subscription_expiry_date 
    ? Math.ceil((new Date(college.subscription_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const totalDemand = invoices
    .filter(i => i.status === 'pending')
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Institutional Subscription & Billing Demands
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review official seat invoices, subscription validity, and payment receipts issued by Orbit LMS Master Admin.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCollegeAndInvoices} 
            disabled={loading} 
            className="gap-1.5 self-start sm:self-auto text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Ledger
          </Button>
        </div>

        {/* Master Admin Reminder Notice Banner */}
        {(college?.billing_reminder_active || Boolean(college?.reminder_note) || daysRemaining !== null || totalDemand > 0) && (
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all ${
            college?.billing_reminder_active
              ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
              : daysRemaining !== null && daysRemaining <= 15
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : totalDemand > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-primary/5 border-primary/20 text-foreground"
          }`}>
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                college?.billing_reminder_active
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                  : daysRemaining !== null && daysRemaining <= 15
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-primary/10 text-primary"
              }`}>
                {college?.billing_reminder_active ? <BellRing className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                    {college?.billing_reminder_active
                      ? "Purchasing & Billing Directive from Master Admin"
                      : "Official Subscription & Billing Notice"}
                  </h3>
                  {college?.billing_reminder_active && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[11px] font-semibold gap-1">
                      <Sparkles className="h-3 w-3" /> Priority Notice
                    </Badge>
                  )}
                  {daysRemaining !== null && (
                    <Badge variant={daysRemaining <= 15 ? "destructive" : "default"} className="text-xs font-mono">
                      <Calendar className="h-3 w-3 mr-1 inline" />
                      {daysRemaining > 0 ? `${daysRemaining} Days Remaining` : "Renewal Due"}
                    </Badge>
                  )}
                  {totalDemand > 0 && (
                    <Badge variant="outline" className="border-rose-500/50 text-rose-400 text-xs font-mono bg-rose-950/20">
                      ₹{totalDemand.toLocaleString("en-IN")} Pending Demand
                    </Badge>
                  )}
                </div>

                {college?.reminder_note ? (
                  <div className="p-3 rounded-xl bg-background/80 border border-border/80 text-foreground text-xs leading-relaxed space-y-1 shadow-2xs">
                    <div className="font-semibold text-primary flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Orbit HQ Master Admin Directive:
                    </div>
                    <p className="font-medium text-foreground whitespace-pre-wrap">{college.reminder_note}</p>
                    {college.last_reminder_sent_at && (
                      <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" /> Dispatched: {new Date(college.last_reminder_sent_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {college?.subscription_expiry_date
                      ? `Valid until ${new Date(college.subscription_expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Please reconcile pending invoices to maintain continuous tenant access for faculty and students.`
                      : "Please ensure all institutional invoice demands are reconciled in a timely manner."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => window.open(`https://wa.me/918770233075?text=${encodeURIComponent(`Hello Master Admin, this is ${college?.name} regarding our institutional billing & renewal directive: "${college?.reminder_note || ''}"`)}`, "_blank")}
                className="text-xs font-semibold h-8 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Share2 className="h-3.5 w-3.5" /> WhatsApp HQ
              </Button>
              {college?.billing_reminder_active && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAcknowledgeReminder}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Acknowledge
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Active Plan & Seats</span>
                <Building2 className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">
                {college?.max_students || 1000} <span className="text-sm font-sans font-normal text-muted-foreground">Enrolled Capacity</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Status: <span className="capitalize font-semibold text-foreground">{college?.subscription_status || "Active"}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Pending Demand Due</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-500">
                ₹{totalDemand.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices.filter(i => i.status === 'pending').length} invoice(s) awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Total Settled & Paid</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-500">
                ₹{totalPaid.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices.filter(i => i.status === 'paid').length} finalized receipts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Ledger Table */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Official Invoices Issued by Master Admin
                </CardTitle>
                <CardDescription className="text-xs">
                  Click "View / Download Receipt" to download as vector PDF, PNG image, or verify payment breakdown.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Invoice #</TableHead>
                  <TableHead>Billing Date</TableHead>
                  <TableHead>Service Scope</TableHead>
                  <TableHead className="text-center">Seats</TableHead>
                  <TableHead className="text-right">Total Demand</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right pr-6">Receipt & Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                      <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                      Loading institutional invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                      No invoices have been issued to this institution yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold pl-6 text-foreground">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {inv.courses?.title || "Full Institutional Platform Access"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {inv.student_count} Seats
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        ₹{inv.total_amount?.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.status === "paid" ? "default" : "outline"}
                          className={
                            inv.status === "paid"
                              ? "bg-emerald-600 text-white font-mono text-xs"
                              : "border-amber-500/50 text-amber-500 font-mono text-xs"
                          }
                        >
                          {inv.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReceipt(inv)}
                          className="h-8 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <FileText className="h-3.5 w-3.5" /> View / Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bank & Remittance Instructions */}
        <Card className="shadow-sm border bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Remittance & Settlement Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              To settle any pending demand invoices, direct funds via NEFT/RTGS or UPI to the master enterprise account below:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-background rounded-lg border font-mono text-foreground">
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">UPI VPA:</span>
                billing@orbitlms
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Beneficiary:</span>
                SIN Education And Technology
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Bank & Account:</span>
                HDFC Bank • A/C 50200088991122
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">IFSC Code:</span>
                HDFC0001234
              </div>
            </div>
            <p className="text-[11px] pt-1">
              Once paid, share transaction screenshot to <strong className="text-foreground">support@orbitlms.in</strong> or WhatsApp <strong className="text-foreground">+91 98765 43210</strong> for instant ledger reconciliation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Official Tax Invoice Modal for Admin */}
      <InvoiceReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        invoice={selectedInvoice}
      />
    </AdminLayout>
  );
}
