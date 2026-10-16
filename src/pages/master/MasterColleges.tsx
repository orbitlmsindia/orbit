import { MasterLayout } from "@/components/layout/MasterLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Plus, 
  Eye, 
  Sliders, 
  Building2, 
  Power, 
  PowerOff, 
  Receipt, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight,
  ExternalLink,
  PlusCircle,
  Loader2,
  Calendar,
  Share2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DispatchBillingReminderModal, CollegeReminderTarget } from "@/components/billing/DispatchBillingReminderModal";
import { InvoiceReceiptModal, InvoiceData } from "@/components/billing/InvoiceReceiptModal";

const ALL_FEATURES = [
  { id: "live_classes", label: "Live Online Classes & Video Streams" },
  { id: "certificates", label: "20-Credit Domain Certificates" },
  { id: "gamification", label: "Daily Streaks & Aura XP Points" },
  { id: "quizzes", label: "Interactive Timed Quizzes" },
  { id: "assignments", label: "Assignment Submission Portal" },
  { id: "ai_json_builder", label: "AI & JSON Bulk Course Importer" },
  { id: "leaderboard", label: "Student & Faculty Leaderboards" },
  { id: "ticket_raising", label: "Help Center Ticket Support Desk" },
  { id: "coupon_engine", label: "Coupon Engine & UPI Payment QR" },
  { id: "attendance_tracker", label: "Student Live Session Attendance" },
];

export default function MasterColleges() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollege, setNewCollege] = useState({ name: '', shortName: '' });
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  // Edit / Customization Modal State
  const [editCollegeModalOpen, setEditCollegeModalOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    currency: "INR",
    maxStudents: 1000,
    features: ALL_FEATURES.map(f => f.id)
  });

  // Dedicated Invoices & Billing Modal per College
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingCollege, setBillingCollege] = useState<any>(null);
  const [collegeInvoices, setCollegeInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [newInvoiceSeats, setNewInvoiceSeats] = useState("50");
  const [newInvoiceRate, setNewInvoiceRate] = useState("200");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Official Invoice Receipt / PDF / Image / WhatsApp Modal
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<InvoiceData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Reminder Modal State
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedCollegeForReminder, setSelectedCollegeForReminder] = useState<CollegeReminderTarget | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchColleges = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name, email, contact_person, phone, currency, max_students, enabled_features, activation_status, subscription_status, subscription_expiry_date, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching colleges:", error);
      } else if (data) {
        setColleges(data);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  // WhatsApp Subscription Renewal Reminder
  const handleSendSubscriptionReminder = (college: any) => {
    const rawPhone = (college.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const expiryDateStr = college.subscription_expiry_date 
      ? new Date(college.subscription_expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : "Upcoming Billing Cycle";

    const daysLeft = college.subscription_expiry_date 
      ? Math.ceil((new Date(college.subscription_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const statusNote = daysLeft !== null
      ? daysLeft > 0 
        ? `⏳ *${daysLeft} days remaining* before expiration.` 
        : `⚠️ *EXPIRED / RENEWAL DUE IMMEDIATELY*.`
      : "";

    const message = 
`🔔 *ORBIT LMS - SUBSCRIPTION RENEWAL REMINDER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ *Institution:* ${college.name}
👤 *Contact:* ${college.contact_person || "Administrator"}
📅 *Subscription Expiry:* ${expiryDateStr}
${statusNote}

🛡️ *Service Continuity:*
To avoid automated service maintenance interruption and ensure uninterrupted access for students & faculty, please settle your institutional license renewal.

💳 *Remittance Details:*
• UPI VPA: *billing@orbitlms*
• Account: *SIN Education And Technology Pvt Ltd*
• Bank: *HDFC Bank | Current A/C: 50200088991122*
• IFSC: *HDFC0001234*

📞 *Priority Support:*
• Phone: +91 98765 43210
• Email: support@orbitlms.in

_Orbit LMS Enterprise Cloud Services_`;

    const encoded = encodeURIComponent(message);
    const waUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank");
    toast({
      title: "Opening WhatsApp",
      description: `Sending subscription reminder for ${college.name}`,
    });
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const shortPrefix = newCollege.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const adminEmail = `admin@${shortPrefix}.orbitlms.edu.in`;
      const tempPassword = "OrbitAdmin@2026";

      const { data, error } = await supabase.from('colleges').insert([{
        name: newCollege.name,
        email: adminEmail,
        contact_person: `${newCollege.name} Administrator`,
        phone: '0000000000',
        currency: "INR",
        max_students: 1000,
        activation_status: true,
        subscription_status: 'active',
        enabled_features: ALL_FEATURES.map(f => f.id)
      }]).select().single();

      if (error) throw error;

      toast({ title: "Tenant Provisioned", description: `${newCollege.name} successfully deployed.` });
      setCredentials({ email: adminEmail, password: tempPassword });
      fetchColleges();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Turn ON / Turn OFF Power Action
  const toggleCollegeStatus = async (id: string, currentStatus: boolean, collegeName: string) => {
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from('colleges')
        .update({ activation_status: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (newStatus === false) {
        toast({
          title: "Service Deactivated (Turned OFF)",
          description: `${collegeName} has been turned OFF. All student & faculty traffic will now be blocked and directed to the Service Maintenance & Customer Care screen.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Service Restored (Turned ON)",
          description: `${collegeName} has been turned ON. Full portal access is now active and operational.`,
        });
      }

      fetchColleges();
    } catch (err: any) {
      toast({ title: "Toggle Failed", description: err.message, variant: "destructive" });
    }
  };

  // Open Billing & Invoices Modal for a specific college
  const openBillingModal = async (college: any) => {
    setBillingCollege(college);
    setBillingModalOpen(true);
    setInvoicesLoading(true);

    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('college_id', college.id)
        .order('created_at', { ascending: false });

      setCollegeInvoices(data || []);
    } catch (err) {
      console.error("Error loading college invoices:", err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleIssueInvoiceForCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingCollege) return;
    setCreatingInvoice(true);

    try {
      const seats = parseInt(newInvoiceSeats) || 1;
      const rate = parseFloat(newInvoiceRate) || 100;
      const total = seats * rate;
      const invNum = `INV-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase.from('invoices').insert([{
        college_id: billingCollege.id,
        invoice_number: invNum,
        student_count: seats,
        cost_per_student: rate,
        total_amount: total,
        status: 'pending'
      }]).select().single();

      if (error) throw error;

      toast({
        title: "Billing Invoice Generated",
        description: `Invoice ${invNum} for ₹${total.toLocaleString('en-IN')} issued to ${billingCollege.name}.`,
      });

      // Reload invoices
      openBillingModal(billingCollege);
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
      toast({ title: "Invoice Marked Paid", description: "Payment status updated to PAID." });
      if (billingCollege) openBillingModal(billingCollege);
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const openInvoiceReceipt = (inv: any, college: any) => {
    setSelectedInvoiceForReceipt({
      id: inv.id,
      invoice_number: inv.invoice_number,
      college_name: college?.name || billingCollege?.name || "Partner Institution",
      college_phone: college?.phone || billingCollege?.phone,
      college_email: college?.email || billingCollege?.email,
      contact_person: college?.contact_person || billingCollege?.contact_person,
      curriculum_target: "Full Institutional Platform Access",
      student_count: inv.student_count || 1,
      cost_per_student: inv.cost_per_student || 100,
      total_amount: inv.total_amount || (inv.student_count * inv.cost_per_student),
      status: inv.status || "pending",
      created_at: inv.created_at || new Date().toISOString(),
    });
    setReceiptModalOpen(true);
  };

  const openEditModal = (college: any) => {
    setSelectedCollege(college);
    const existingFeatures = Array.isArray(college.enabled_features) 
      ? college.enabled_features 
      : ALL_FEATURES.map(f => f.id);

    setEditForm({
      name: college.name || "",
      currency: college.currency || "INR",
      maxStudents: college.max_students || 1000,
      features: existingFeatures
    });
    setEditCollegeModalOpen(true);
  };

  const handleSaveCollegeCustomization = async () => {
    if (!selectedCollege) return;
    try {
      const { error } = await supabase
        .from('colleges')
        .update({
          name: editForm.name,
          currency: editForm.currency,
          max_students: editForm.maxStudents,
          enabled_features: editForm.features
        })
        .eq('id', selectedCollege.id);

      if (error) throw error;
      toast({ title: "Customization Saved", description: `${editForm.name} features and settings updated.` });
      setEditCollegeModalOpen(false);
      fetchColleges();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleFeature = (featureId: string) => {
    setEditForm(prev => {
      const exists = prev.features.includes(featureId);
      return {
        ...prev,
        features: exists 
          ? prev.features.filter(id => id !== featureId)
          : [...prev.features, featureId]
      };
    });
  };

  return (
    <MasterLayout
      headerTitle="Tenant College Registry & Service Control"
      headerDescription="Turn ON/OFF tenant access, manage institutional billing and invoices, and configure modules per campus."
      action={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs">
              <Plus className="w-4 h-4 mr-1.5" /> Provision New College
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Provision SaaS Tenant Instance</DialogTitle>
            </DialogHeader>
            {credentials ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-emerald-400">Successfully Provisioned Database Schema & Admin Rights.</p>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono text-xs">
                  <p><span className="text-slate-400">Admin Email:</span> {credentials.email}</p>
                  <p><span className="text-slate-400">Password:</span> {credentials.password}</p>
                </div>
                <Button onClick={() => { setIsCreateOpen(false); setCredentials(null); }} className="w-full bg-emerald-600 hover:bg-emerald-700">Close</Button>
              </div>
            ) : (
              <form onSubmit={handleCreateCollege} className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-300">Formal College / Institution Name</Label>
                  <Input required value={newCollege.name} onChange={e => setNewCollege({ ...newCollege, name: e.target.value })} placeholder="e.g. JIET Group of Institutions" className="bg-slate-950 border-slate-800 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Subdomain Prefix</Label>
                  <Input required value={newCollege.shortName} onChange={e => setNewCollege({ ...newCollege, shortName: e.target.value })} placeholder="e.g. jiet" className="bg-slate-950 border-slate-800 text-xs mt-1" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold">
                  {loading ? "Deploying Tenant..." : "Deploy Tenant Instance"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      {/* Mobile Responsive Tenant Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {colleges.filter(c => c.subscription_status !== 'deleted').map((college) => {
          const activeCount = Array.isArray(college.enabled_features) ? college.enabled_features.length : ALL_FEATURES.length;
          const collegeSubdomain = college.email?.split('@')[0] || `${college.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const isTurnedOn = college.activation_status === true;

          return (
            <div key={college.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-100">{college.name}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{collegeSubdomain}.orbitlms.edu.in</p>
                </div>
                <Badge variant={isTurnedOn ? "default" : "destructive"} className={isTurnedOn ? "bg-emerald-600 shrink-0" : "bg-rose-600 shrink-0"}>
                  {isTurnedOn ? "Turned ON" : "Turned OFF"}
                </Badge>
              </div>

              {/* Service Toggle Bar on Mobile */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Power className="h-4 w-4 text-emerald-400" />
                  Service Power State
                </span>
                <Button
                  size="sm"
                  variant={isTurnedOn ? "destructive" : "default"}
                  onClick={() => toggleCollegeStatus(college.id, college.activation_status, college.name)}
                  className={`h-7 text-xs font-semibold ${isTurnedOn ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {isTurnedOn ? (
                    <><PowerOff className="h-3.5 w-3.5 mr-1" /> Turn OFF</>
                  ) : (
                    <><Power className="h-3.5 w-3.5 mr-1" /> Turn ON</>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">STUDENTS</div>
                  <div className="font-bold text-slate-200 mt-0.5">{college.max_students || 1000}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">CURRENCY</div>
                  <div className="font-bold text-emerald-400 mt-0.5">₹ {college.currency || 'INR'}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">MODULES</div>
                  <div className="font-bold text-indigo-400 mt-0.5">{activeCount} / {ALL_FEATURES.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <Button size="sm" variant="outline" onClick={() => openBillingModal(college)} className="border-indigo-500/40 text-indigo-300 bg-slate-800 text-xs">
                  <Receipt className="h-3.5 w-3.5 mr-1 text-indigo-400" /> Invoices
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEditModal(college)} className="border-slate-700 bg-slate-800 text-xs">
                  <Sliders className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Customize
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader className="bg-slate-950/80">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-300 pl-6">Institution & Subdomain</TableHead>
              <TableHead className="text-center text-slate-300">Subscription & Expiry</TableHead>
              <TableHead className="text-center text-slate-300">Student Capacity</TableHead>
              <TableHead className="text-center text-slate-300">Currency & SLA</TableHead>
              <TableHead className="text-center text-slate-300">Modules Active</TableHead>
              <TableHead className="text-center text-slate-300">Turn ON / OFF Button</TableHead>
              <TableHead className="text-right text-slate-300 pr-6">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    Loading real tenant college data from database...
                  </div>
                </TableCell>
              </TableRow>
            ) : colleges.filter(c => c.subscription_status !== 'deleted').length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                  No tenant colleges provisioned in the database.
                </TableCell>
              </TableRow>
            ) : colleges.filter(c => c.subscription_status !== 'deleted').map((college) => {
              const activeCount = Array.isArray(college.enabled_features) ? college.enabled_features.length : ALL_FEATURES.length;
              const collegeSubdomain = college.email?.split('@')[0] || `${college.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
              const isTurnedOn = college.activation_status === true;

              const daysRemaining = college.subscription_expiry_date 
                ? Math.ceil((new Date(college.subscription_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <TableRow key={college.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell className="pl-6">
                    <div 
                      className="font-semibold text-slate-100 hover:text-emerald-400 cursor-pointer flex items-center gap-1.5" 
                      onClick={() => navigate(`/master/colleges/${college.id}`)}
                    >
                      {college.name}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {collegeSubdomain}.orbitlms.edu.in
                    </div>
                  </TableCell>

                  {/* SUBSCRIPTION EXPIRY & WHATSAPP REMINDER */}
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      {college.subscription_expiry_date ? (
                        <>
                          <Badge 
                            variant="outline" 
                            className={daysRemaining !== null && daysRemaining <= 15 
                              ? "border-rose-500/50 text-rose-400 bg-rose-950/20 text-[11px] font-mono" 
                              : "border-sky-500/40 text-sky-300 bg-sky-950/20 text-[11px] font-mono"
                            }
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(college.subscription_expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Badge>
                          <span className={`text-[10px] font-medium ${daysRemaining !== null && daysRemaining <= 15 ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
                            {daysRemaining !== null ? `${daysRemaining} days left` : 'Active'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Rolling Plan</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCollegeForReminder(college);
                          setReminderModalOpen(true);
                        }}
                        className="h-6 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 px-2 py-0 font-medium"
                        title="Dispatch Purchasing & Subscription Expiry Reminder"
                      >
                        <Share2 className="h-3 w-3 mr-1 text-amber-400" /> Send Reminder
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="text-center font-mono font-medium text-slate-200">
                    {college.max_students || 1000} Seats
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono">
                      ₹ {college.currency || 'INR'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge className="bg-slate-800 text-slate-300 font-mono">
                      {activeCount} / {ALL_FEATURES.length} Modules
                    </Badge>
                  </TableCell>

                  {/* PROMINENT TURN ON / TURN OFF BUTTON */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                      {isTurnedOn ? (
                        <>
                          <span className="flex items-center text-xs font-semibold text-emerald-400 px-2 py-0.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                            ON
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => toggleCollegeStatus(college.id, college.activation_status, college.name)}
                            className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1 font-semibold px-2.5 shadow-sm"
                            title="Turn OFF: Service maintenance mode will block tenant users"
                          >
                            <PowerOff className="h-3 w-3" /> Turn OFF
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center text-xs font-semibold text-rose-400 px-2 py-0.5">
                            <span className="h-2 w-2 rounded-full bg-rose-400 mr-1.5" />
                            OFF
                          </span>
                          <Button
                            size="sm"
                            onClick={() => toggleCollegeStatus(college.id, college.activation_status, college.name)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold px-2.5 shadow-sm"
                            title="Turn ON: Restore full portal operation"
                          >
                            <Power className="h-3 w-3" /> Turn ON
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* ACTION CONTROLS */}
                  <TableCell className="text-right pr-6">
                    <div className="flex gap-2 justify-end items-center">
                      {/* Invoices & Billing Modal Button */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openBillingModal(college)} 
                        className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 text-xs h-8"
                        title="View & Issue Invoices for this college"
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1 text-indigo-400" /> Invoices
                      </Button>

                      {/* Customize Features */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openEditModal(college)} 
                        className="border-slate-700 hover:bg-slate-800 text-xs text-slate-200 h-8"
                      >
                        <Sliders className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Customize
                      </Button>

                      {/* Dropdown for More */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-800">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100">
                          <DropdownMenuItem onClick={() => navigate(`/master/colleges/${college.id}`)}>
                            <Eye className="mr-2 h-4 w-4 text-sky-400" /> View Tenant Deep Dive
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openBillingModal(college)}>
                            <Receipt className="mr-2 h-4 w-4 text-indigo-400" /> Billing & Invoicing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCollegeStatus(college.id, college.activation_status, college.name)}>
                            {isTurnedOn ? <PowerOff className="mr-2 h-4 w-4 text-rose-400" /> : <Power className="mr-2 h-4 w-4 text-emerald-400" />}
                            {isTurnedOn ? "Turn OFF (Maintenance Mode)" : "Turn ON (Active Operation)"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* DEDICATED BILLING & INVOICES DIALOG PER COLLEGE */}
      <Dialog open={billingModalOpen} onOpenChange={setBillingModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
              <Receipt className="h-5 w-5 text-indigo-400" />
              Tenant Billing & Invoices: {billingCollege?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Total Invoices</span>
                <p className="text-xl font-bold font-mono text-white">{collegeInvoices.length}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Collected Revenue</span>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  ₹{collegeInvoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Pending Amount</span>
                <p className="text-xl font-bold font-mono text-amber-400">
                  ₹{collegeInvoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Issue New Invoice for this College Form */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-emerald-400" /> Issue Billing Invoice to {billingCollege?.name}
              </h4>
              <form onSubmit={handleIssueInvoiceForCollege} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Enrolled Student Seats</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={newInvoiceSeats} 
                    onChange={e => setNewInvoiceSeats(e.target.value)} 
                    className="bg-slate-900 border-slate-800 text-white text-xs h-9" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Cost per Seat (₹ INR)</Label>
                  <Input 
                    type="number" 
                    min="10" 
                    value={newInvoiceRate} 
                    onChange={e => setNewInvoiceRate(e.target.value)} 
                    className="bg-slate-900 border-slate-800 text-white text-xs h-9" 
                    required 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={creatingInvoice} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
                >
                  {creatingInvoice ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/> Issuing...</> : "Generate & Bill"}
                </Button>
              </form>
            </div>

            {/* Invoices List Table */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                Issued Invoices History
              </h4>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <Table>
                  <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400 text-xs">Invoice #</TableHead>
                      <TableHead className="text-center text-slate-400 text-xs">Seats</TableHead>
                      <TableHead className="text-right text-slate-400 text-xs">Total Demand</TableHead>
                      <TableHead className="text-slate-400 text-xs">Status</TableHead>
                      <TableHead className="text-right text-slate-400 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                          Loading invoices...
                        </TableCell>
                      </TableRow>
                    ) : collegeInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                          No invoices issued for this institution yet. Use the form above to generate the first invoice.
                        </TableCell>
                      </TableRow>
                    ) : collegeInvoices.map((inv) => (
                      <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-900/40">
                        <TableCell className="font-mono text-xs font-semibold text-slate-200">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-300">
                          {inv.student_count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                          ₹{inv.total_amount?.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className={inv.status === 'paid' ? 'bg-emerald-600 text-xs' : 'border-amber-500/40 text-amber-400 text-xs'}>
                            {inv.status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* View & Share Official Invoice Modal */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40" 
                              onClick={() => openInvoiceReceipt(inv, billingCollege)}
                            >
                              <FileText className="h-3 w-3 mr-1 text-indigo-400" /> View / Share
                            </Button>

                            {inv.status === 'pending' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40" onClick={() => markInvoicePaid(inv.id)}>
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setBillingModalOpen(false)} className="text-slate-400 text-xs">
                Close
              </Button>
              <Button 
                onClick={() => { setBillingModalOpen(false); navigate('/master/billing'); }} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Open Full Global Billing Panel <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Tax Invoice Modal with PDF Download, PNG Download & WhatsApp Sending */}
      <InvoiceReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        invoice={selectedInvoiceForReceipt}
        onMarkPaid={async (invId) => {
          await markInvoicePaid(invId);
          setSelectedInvoiceForReceipt(prev => prev ? { ...prev, status: 'paid' } : null);
        }}
      />

      {/* College Features & Settings Customization Dialog */}
      <Dialog open={editCollegeModalOpen} onOpenChange={setEditCollegeModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Customize Organization & Features: {selectedCollege?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 my-2">
            {/* General Information & Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="md:col-span-2">
                <Label className="text-slate-300 text-xs">Organization / College Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-xs">Currency (Default: ₹ INR)</Label>
                <Select value={editForm.currency} onValueChange={val => setEditForm({ ...editForm, currency: val })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-white mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                    <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-xs">Maximum Student Capacity</Label>
                <Input 
                  type="number"
                  value={editForm.maxStudents} 
                  onChange={e => setEditForm({ ...editForm, maxStudents: parseInt(e.target.value) || 0 })} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 text-xs"
                />
              </div>
            </div>

            {/* Feature Modules Toggles (Checkboxes) */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">SaaS Feature Modules</h4>
                <p className="text-xs text-slate-400">Check/uncheck feature flags to enable or disable them inside this college's portal.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map((feature) => {
                  const isChecked = editForm.features.includes(feature.id);
                  return (
                    <div 
                      key={feature.id} 
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-slate-800/80 border-emerald-500/50 shadow-sm' 
                          : 'bg-slate-950/60 border-slate-800 opacity-60'
                      }`}
                    >
                      <Checkbox 
                        checked={isChecked} 
                        onCheckedChange={() => toggleFeature(feature.id)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div className="space-y-0.5 select-none">
                        <Label className="text-xs font-medium cursor-pointer text-slate-200">{feature.label}</Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCollegeModalOpen(false)} className="text-slate-400 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveCollegeCustomization} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              Save Customization & Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Purchasing & Subscription Renewal Reminder Modal */}
      <DispatchBillingReminderModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        college={selectedCollegeForReminder}
        onSuccess={fetchColleges}
      />
    </MasterLayout>
  );
}
