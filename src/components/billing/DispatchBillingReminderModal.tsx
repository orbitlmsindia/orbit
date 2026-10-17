import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  BellRing,
  Send,
  Share2,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  AlertTriangle,
  Receipt
} from "lucide-react";

export interface CollegeReminderTarget {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  subscription_expiry_date?: string;
  max_students?: number;
  pendingInvoicesCount?: number;
  pendingAmount?: number;
}

interface DispatchBillingReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  college: CollegeReminderTarget | null;
  onSuccess?: () => void;
}

export function DispatchBillingReminderModal({
  open,
  onOpenChange,
  college,
  onSuccess,
}: DispatchBillingReminderModalProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  // Form Fields
  const [reminderType, setReminderType] = useState<string>("subscription");
  const [demandAmount, setDemandAmount] = useState<string>("0");
  const [customMessage, setCustomMessage] = useState<string>("");

  useEffect(() => {
    if (college) {
      const pendingAmt = college.pendingAmount || 0;
      setDemandAmount(pendingAmt > 0 ? String(pendingAmt) : "25000");
      generateTemplate(reminderType, college, pendingAmt > 0 ? String(pendingAmt) : "25000");
    }
  }, [college, open]);

  const generateTemplate = (type: string, col: CollegeReminderTarget, amount: string) => {
    const expiryDateStr = col.subscription_expiry_date
      ? new Date(col.subscription_expiry_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Upcoming Billing Cycle";

    const daysLeft = col.subscription_expiry_date
      ? Math.ceil(
          (new Date(col.subscription_expiry_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    let text = "";

    if (type === "subscription") {
      text = `Official Notice from Master Admin: Your institutional subscription license for ${col.name} is scheduled for renewal (validity until ${expiryDateStr}${daysLeft !== null ? `, ${daysLeft} days remaining` : ""}). Please reconcile the renewal remittance to ensure zero disruption for your students and faculty.`;
    } else if (type === "seat_capacity") {
      text = `Official Notice from Master Admin: Regarding additional student seat licensing for ${col.name}. Seat expansion demand amount of ₹${Number(amount).toLocaleString("en-IN")} is due for settlement. Kindly confirm payment to activate additional student batches.`;
    } else if (type === "pending_invoice") {
      text = `Official Notice from Master Admin: This is an urgent payment reminder regarding pending institutional billing invoices for ${col.name}. Outstanding demand: ₹${Number(amount).toLocaleString("en-IN")}. Please remit via bank transfer or UPI and share the transaction UTR number.`;
    } else {
      text = `Official Notice from Master Admin for ${col.name}: Please review your institutional account status and billing invoices. Contact Master Admin directly for any licensing or billing queries.`;
    }

    setCustomMessage(text);
  };

  const handleTypeChange = (val: string) => {
    setReminderType(val);
    if (college) {
      generateTemplate(val, college, demandAmount);
    }
  };

  const handleDispatch = async () => {
    if (!college?.id) return;
    setSending(true);

    try {
      // 1. Update the college record with the active reminder
      const { error: colError } = await supabase
        .from("colleges")
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_note: customMessage,
          billing_reminder_active: true,
        })
        .eq("id", college.id);

      if (colError) {
        console.warn("Warning updating colleges reminder fields:", colError.message);
      }

      // 2. Fetch all administrators for this college
      const { data: adminUsers } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("college_id", college.id)
        .in("role", ["admin", "super_admin"]);

      // 3. Insert notification for each college administrator
      const targetAdmins = adminUsers || [];
      if (targetAdmins.length > 0) {
        const notifPayloads = targetAdmins.map((adm) => ({
          user_id: adm.id,
          title: "🔔 Official Purchase & Renewal Reminder from Master Admin",
          message: customMessage,
          notification_type: "billing",
          priority: 3, // High priority system notice
          sender_role: "admin",
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifPayloads);

        if (notifError) {
          console.warn("Notice insertion warning:", notifError.message);
        }
      }

      // 4. WhatsApp Outreach Dispatch
      const rawPhone = (college.phone || "").replace(/[^0-9]/g, "");
      const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

      const waFullMessage = `🔔 *ORBIT LMS - INSTITUTIONAL REMINDER NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ *Institution:* ${college.name}
👤 *Attn:* ${college.contact_person || "Administrator"}
📅 *Notice Date:* ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}

📢 *Directive / Message:*
${customMessage}

💳 *Remittance Details:*
• UPI VPA: *billing@orbitlms*
• Account: *SIN Education And Technology Pvt Ltd*
• Bank: *HDFC Bank | Current A/C: 50200088991122*
• IFSC: *HDFC0001234*

📞 *Master Admin Priority Desk:*
• WhatsApp Support: +91 98765 43210
• Email: billing@orbitlms.in

_Orbit LMS Enterprise Academic Intelligence Platform_`;

      const encoded = encodeURIComponent(waFullMessage);
      const waUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

      window.open(waUrl, "_blank");

      toast({
        title: "Reminder Dispatched! 🚀",
        description: `In-app notice & notifications sent to ${college.name} Admin(s). WhatsApp opened.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error Dispatching Reminder",
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  if (!college) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-slate-900 border-slate-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <BellRing className="h-5 w-5 text-amber-400" />
            Dispatch Purchase & Renewal Reminder to Institution
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Send an official in-app notice, push notification, and WhatsApp directive directly to the administrators of <b>{college.name}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Institution Info Badge Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <div>
                <p className="font-semibold text-white">{college.name}</p>
                <p className="text-slate-400 text-[11px]">
                  Contact: {college.contact_person || "College Administrator"} ({college.phone || "No phone"})
                </p>
              </div>
            </div>
            {college.subscription_expiry_date && (
              <Badge variant="outline" className="border-amber-500/30 text-amber-300 font-mono text-[11px]">
                <Calendar className="h-3 w-3 mr-1 inline" />
                Valid: {new Date(college.subscription_expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Badge>
            )}
          </div>

          {/* Reminder Type Select */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Notice Category / Reason</Label>
            <Select value={reminderType} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs">
                <SelectValue placeholder="Select Reminder Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                <SelectItem value="subscription">Subscription Plan Renewal Notice</SelectItem>
                <SelectItem value="seat_capacity">Student Seats Capacity Expansion Purchase</SelectItem>
                <SelectItem value="pending_invoice">Outstanding Billing Invoice Settlement Due</SelectItem>
                <SelectItem value="custom">General Administrative / Purchasing Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Demand Amount Input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Amount Demand / Fee (₹ INR)</Label>
            <Input
              type="number"
              value={demandAmount}
              onChange={(e) => {
                setDemandAmount(e.target.value);
                generateTemplate(reminderType, college, e.target.value);
              }}
              className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
              placeholder="e.g. 50000"
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">In-App Notice & Notification Message</Label>
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Will display on College Admin Dashboard & TopBar
              </span>
            </div>
            <Textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-xs leading-relaxed font-sans"
              placeholder="Write official directive..."
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
              Delivery Channels:
            </p>
            <p className="text-slate-400">
              1. <b>In-App Banner:</b> Prominently pinned to the Institution Admin's Dashboard & Billing page.
            </p>
            <p className="text-slate-400">
              2. <b>Real-Time Push Notification:</b> Ringing bell icon in the admin's navbar.
            </p>
            <p className="text-slate-400">
              3. <b>WhatsApp Direct:</b> Formatted message dispatched directly to official phone.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={sending || !customMessage.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Dispatch Reminder Notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
