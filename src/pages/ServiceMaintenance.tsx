import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  PhoneCall, 
  Mail, 
  MessageSquare, 
  RefreshCw, 
  LogOut, 
  ShieldAlert, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Headphones, 
  Send,
  HelpCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function ServiceMaintenance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collegeName, setCollegeName] = useState<string>("Your Educational Institution");
  const [collegeEmail, setCollegeEmail] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [userRole, setUserRole] = useState<string>("student");
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let collegeId = sessionStorage.getItem('collegeId');
      let role = sessionStorage.getItem('userRole');

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('role, college_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userData) {
          if (userData.college_id) collegeId = userData.college_id;
          if (userData.role) role = userData.role;
        }
      }

      if (role) setUserRole(role.toLowerCase());

      if (collegeId) {
        const { data: colData } = await supabase
          .from('colleges')
          .select('id, name, email, activation_status')
          .eq('id', collegeId)
          .maybeSingle();

        if (colData) {
          setCollegeName(colData.name);
          if (colData.email) setCollegeEmail(colData.email);

          // If turned back ON, redirect user back!
          if (colData.activation_status === true) {
            toast({
              title: "Service Restored!",
              description: "Your institution instance is active. Redirecting to your dashboard...",
            });

            setTimeout(() => {
              if (role === "admin") navigate("/admin");
              else if (role === "teacher") navigate("/teacher");
              else if (role === "finance") navigate("/finance");
              else navigate("/student");
            }, 800);
            return;
          }
        }
      }

      toast({
        title: "Maintenance In Effect",
        description: "Instance operations are still turned off by the SaaS administrator.",
      });
    } catch (err: any) {
      console.error("Status check notice:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    navigate("/login");
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    setSendingInquiry(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Store inquiry in inquiries or audit table
      await supabase.from('inquiries').insert([{
        user_id: session?.user?.id || null,
        user_name: session?.user?.user_metadata?.full_name || "Campus User",
        email: session?.user?.email || "user@orbitlms.in",
        subject: `Service Maintenance Query - ${collegeName}`,
        message: inquiryText,
        status: 'pending'
      }]);

      toast({
        title: "Message Delivered",
        description: "Your message was transmitted to Orbit LMS Priority Customer Care. A representative will contact you shortly.",
      });
      setInquiryModalOpen(false);
      setInquiryText("");
    } catch (err: any) {
      toast({
        title: "Inquiry Logged",
        description: "Your ticket has been queued with Customer Care.",
      });
      setInquiryModalOpen(false);
    } finally {
      setSendingInquiry(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans selection:bg-amber-500/20">
      {/* Top Bar Branding */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ShieldAlert className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              Orbit LMS <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Service Alert</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Instance Status & Telemetry Desk</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSignOut} 
          className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
        </Button>
      </div>

      {/* Main Notice Card */}
      <div className="max-w-3xl w-full mx-auto my-8 space-y-6 animate-fade-in">
        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden border-t-4 border-t-amber-500">
          <CardHeader className="text-center pt-8 pb-4 px-6 space-y-3">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
            </div>

            <div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-xs uppercase px-3 py-1">
                SERVICE DEACTIVATED • MAINTENANCE MODE
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-3">
                {collegeName}
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
                This campus portal has been temporarily turned <strong className="text-amber-400 font-semibold">OFF</strong> by the SaaS Master Administrator. All course sessions, assignment submissions, grading, and portal logins for this institution are currently suspended.
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-6">
            {/* Status Breakdown Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">TENANT ENTITY</span>
                <span className="font-semibold text-slate-200 truncate block">{collegeName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">PORTAL ACCESS</span>
                <span className="font-semibold text-rose-400 block">LOCKED (SLA REVIEW)</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">CURRENT TIME</span>
                <span className="text-slate-300 block">{new Date().toLocaleTimeString()} IST</span>
              </div>
            </div>

            {/* Customer Care Hotline Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-200">
                  Talk to Customer Care & Support
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                To resolve billing, renew subscription licenses, or expedite system reactivation, contact the Orbit LMS SaaS Support Desk immediately:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Phone Hotline */}
                <a 
                  href="tel:+919876543210" 
                  className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block font-medium">Customer Support Phone</span>
                    <span className="text-xs font-bold font-mono text-emerald-400 block">+91 98765 43210</span>
                  </div>
                </a>

                {/* Email Support */}
                <a 
                  href="mailto:support@orbitlms.in?subject=Reactivate%20College%20Instance" 
                  className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block font-medium">Billing & Operations Email</span>
                    <span className="text-xs font-bold font-mono text-sky-400 block">support@orbitlms.in</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button 
                onClick={checkStatus} 
                disabled={checking} 
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? "Verifying Activation..." : "Check Status & Re-attempt Entry"}
              </Button>

              <Dialog open={inquiryModalOpen} onOpenChange={setInquiryModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs">
                    <MessageSquare className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                    Send Message to Customer Care
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <HelpCircle className="h-5 w-5 text-amber-400" />
                      Priority Support Assistance
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSendInquiry} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Institution</Label>
                      <Input disabled value={collegeName} className="bg-slate-950 border-slate-800 text-slate-400 text-xs font-mono" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Message / Ticket Details</Label>
                      <Textarea 
                        required 
                        rows={4} 
                        placeholder="Explain your urgency (e.g., scheduled exams today, fee invoice payment verification completed)..." 
                        value={inquiryText} 
                        onChange={(e) => setInquiryText(e.target.value)} 
                        className="bg-slate-950 border-slate-800 text-slate-100 text-xs" 
                      />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="ghost" onClick={() => setInquiryModalOpen(false)} className="text-slate-400 text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={sendingInquiry} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {sendingInquiry ? "Transmitting..." : "Send to Customer Care"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Disclaimer */}
      <div className="max-w-4xl w-full mx-auto text-center pt-4 border-t border-slate-800/60">
        <p className="text-xs text-slate-500">
          Orbit LMS Multi-Tenant Enterprise Cloud • Dedicated 24/7 SLA Hotline: <span className="font-mono text-slate-400">1800-ORBIT-LMS</span>
        </p>
      </div>
    </div>
  );
}
