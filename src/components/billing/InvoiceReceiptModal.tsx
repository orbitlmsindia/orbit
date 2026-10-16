import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, CheckCircle2, Clock, Building2, Phone, Mail, FileText, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface InvoiceData {
  id: string;
  invoice_number: string;
  college_name: string;
  college_phone?: string;
  college_email?: string;
  contact_person?: string;
  curriculum_target?: string;
  student_count: number;
  cost_per_student: number;
  total_amount: number;
  status: "paid" | "pending" | "cancelled" | string;
  created_at: string;
}

interface InvoiceReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onMarkPaid?: (invoiceId: string) => Promise<void>;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  open,
  onOpenChange,
  invoice,
  onMarkPaid,
}) => {
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  if (!invoice) return null;

  const invoiceDate = new Date(invoice.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dueDate = new Date(new Date(invoice.created_at).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subtotal = invoice.student_count * invoice.cost_per_student;
  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = invoice.total_amount || (subtotal + gstAmount);

  // 1. Download as High Resolution PNG Image
  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return;
    setDownloadingImg(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#0f172a",
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${invoice.invoice_number}_Receipt.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Image Downloaded",
        description: `Saved ${invoice.invoice_number}_Receipt.png successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to render image receipt.",
        variant: "destructive",
      });
    } finally {
      setDownloadingImg(false);
    }
  };

  // 2. Download as Multi-tenant Official Vector PDF
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#0f172a",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoice_number}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: `Saved ${invoice.invoice_number}.pdf successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "PDF Generation Failed",
        description: err.message || "Failed to export PDF invoice.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 3. Send on WhatsApp directly
  const handleSendOnWhatsApp = () => {
    const rawPhone = (invoice.college_phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const message = 
`🧾 *ORBIT LMS - OFFICIAL BILLING INVOICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Invoice No:* ${invoice.invoice_number}
🏛️ *Institution:* ${invoice.college_name}
📅 *Billing Date:* ${invoiceDate}
⏳ *Due Date:* ${dueDate}

📊 *SUMMARY OF SERVICES:*
• Enrolled Seats: *${invoice.student_count} Students*
• Cost per Seat: *₹${invoice.cost_per_student.toLocaleString("en-IN")}*
• Scope: *${invoice.curriculum_target || "Full Institutional Platform Access"}*
• Status: *${invoice.status.toUpperCase()}*

💰 *TOTAL AMOUNT DUE:* *₹${grandTotal.toLocaleString("en-IN")}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 *Payment Details / Bank Transfer:*
• UPI VPA: *billing@orbitlms*
• Account: *SIN Education And Technology Pvt Ltd*
• Bank: *HDFC Bank | Current A/C: 50200088991122*
• IFSC: *HDFC0001234*

📞 *Support & Invoicing Help:*
• Phone: +91 98765 43210
• Email: support@orbitlms.in

_Please reply with payment confirmation screenshot to reconcile license renewal instantly._`;

    const encodedText = encodeURIComponent(message);
    const waUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encodedText}` 
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, "_blank");
    toast({
      title: "Opening WhatsApp",
      description: formattedPhone 
        ? `Directing message to ${formattedPhone}` 
        : "Opening WhatsApp share dialog.",
    });
  };

  const handleConfirmPaid = async () => {
    if (!onMarkPaid) return;
    setMarkingPaid(true);
    try {
      await onMarkPaid(invoice.id);
      toast({ title: "Updated", description: "Invoice marked as PAID." });
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <FileText className="h-5 w-5 text-indigo-400" />
              Tax Invoice & Payment Receipt
            </DialogTitle>
            <Badge
              variant={invoice.status === "paid" ? "default" : "outline"}
              className={
                invoice.status === "paid"
                  ? "bg-emerald-600 text-white font-mono text-xs"
                  : "border-amber-500/50 text-amber-400 bg-amber-950/30 font-mono text-xs"
              }
            >
              {invoice.status === "paid" ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> PAID
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> PAYMENT DUE
                </span>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable / Renderable Container */}
        <div className="p-6 space-y-6" ref={invoiceRef}>
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                  O
                </div>
                <span className="font-bold text-xl tracking-tight text-white">ORBIT LMS</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">SIN Education And Technology Pvt Ltd</p>
              <p className="text-[11px] text-slate-500">GSTIN: 29AABCU9603R1ZM • Bangalore, India</p>
              <p className="text-[11px] text-slate-500">support@orbitlms.in • +91 98765 43210</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                Official Tax Invoice
              </span>
              <p className="text-xl font-bold font-mono text-white tracking-tight">
                {invoice.invoice_number}
              </p>
              <div className="text-xs text-slate-400 space-y-0.5 mt-1 font-mono">
                <p>Date: <span className="text-slate-200">{invoiceDate}</span></p>
                <p>Due Date: <span className="text-slate-200">{dueDate}</span></p>
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Billed To (Tenant Institution)
              </span>
              <h3 className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-sky-400" />
                {invoice.college_name}
              </h3>
              {invoice.contact_person && (
                <p className="text-xs text-slate-300 mt-1">Attn: {invoice.contact_person}</p>
              )}
              {invoice.college_email && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3 text-slate-500" /> {invoice.college_email}
                </p>
              )}
              {invoice.college_phone && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3 text-slate-500" /> {invoice.college_phone}
                </p>
              )}
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Remittance & UPI Details
              </span>
              <div className="text-xs space-y-1 text-slate-300 font-mono">
                <p><span className="text-slate-500">UPI ID:</span> billing@orbitlms</p>
                <p><span className="text-slate-500">Beneficiary:</span> SIN Education And Technology</p>
                <p><span className="text-slate-500">Bank:</span> HDFC Bank (A/C: 50200088991122)</p>
                <p><span className="text-slate-500">IFSC:</span> HDFC0001234</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Description / Platform Service</th>
                  <th className="py-2.5 px-3 text-center">Seats</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white">
                      Orbit LMS Institutional SaaS Subscription
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {invoice.curriculum_target || "Full Platform Access (Courses, Quizzes, Certificates, AI Builders)"}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-semibold">
                    {invoice.student_count}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    ₹{invoice.cost_per_student.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Base Demand):</span>
                <span className="font-mono text-slate-200">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Integrated Maintenance & Platform Fee:</span>
                <span className="font-mono text-slate-200">Included</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Demand:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  ₹{invoice.total_amount?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Terms Footer */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Payment & SLA Policy:</p>
            <p>1. Subscription access remains operational during billing grace period.</p>
            <p>2. If deactivated, service can be reactivated instantly upon remittance verification.</p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <DialogFooter className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/80 sticky bottom-0 z-10 backdrop-blur-md flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            {invoice.status === "pending" && onMarkPaid && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirmPaid}
                disabled={markingPaid}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40 text-xs h-9"
              >
                {markingPaid ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Mark Paid
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={downloadingImg}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs h-9"
            >
              {downloadingImg ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
              )}
              Download Image (.PNG)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs h-9"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
              )}
              Download PDF (.PDF)
            </Button>

            <Button
              size="sm"
              onClick={handleSendOnWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-md shadow-emerald-900/30"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Send on WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
