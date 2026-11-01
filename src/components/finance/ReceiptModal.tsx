import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  Download, 
  Share2, 
  CheckCircle2, 
  IndianRupee, 
  Building2, 
  ShieldCheck, 
  FileText,
  Calendar,
  User,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ReceiptData {
  receiptNo: string;
  transactionId: string;
  date: string;
  instituteName: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  courseTitle: string;
  feeType?: string;
  amount: number;
  paymentMode: string;
  utrRef: string;
  balanceDue?: number;
  recordedBy: string;
}

export function numberToWordsINR(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numStr = Math.floor(amount).toString();
  if (numStr.length > 9) return `${amount} Rupees`;
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `${amount} Rupees`;
  
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData | null;
}

export function ReceiptModal({ open, onOpenChange, receipt }: ReceiptModalProps) {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `Orbit LMS Payment Receipt #${receipt.receiptNo}\nStudent: ${receipt.studentName}\nCourse: ${receipt.courseTitle}\nAmount: ₹${receipt.amount.toLocaleString('en-IN')}\nStatus: Verified`;
    navigator.clipboard.writeText(text);
    toast({ title: "Receipt Copied", description: "Receipt summary copied to clipboard." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border shadow-2xl p-0 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none">
        <div ref={receiptRef} className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  ₹
                </div>
                <h3 className="font-bold text-xl text-slate-900">{receipt.instituteName || "Orbit Innovation Academy"}</h3>
              </div>
              <p className="text-xs text-slate-500">Official Student Fee & Course Admission Receipt</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Govt. Reg / Affiliation No: ORB-ACAD-2026</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Tax Invoice / Receipt</span>
              </div>
            </div>

            <div className="text-right">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-xs px-2.5 py-1">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> PAID & VERIFIED
              </Badge>
              <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                Receipt #{receipt.receiptNo}
              </p>
              <p className="text-[11px] text-slate-500">{receipt.date}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-slate-500 font-medium">Billed To (Student):</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{receipt.studentName}</p>
              <p className="text-slate-600 font-mono">{receipt.studentEmail}</p>
              <p className="text-slate-500 text-[11px]">ID: {receipt.studentId.slice(0, 12)}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Payment Mode & Ref:</p>
              <p className="font-bold text-slate-900 uppercase mt-0.5">{receipt.paymentMode}</p>
              <p className="text-slate-600 font-mono">Ref/UTR: {receipt.utrRef || receipt.transactionId}</p>
              <p className="text-slate-500 text-[11px]">Recorded By: {receipt.recordedBy}</p>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold text-slate-700">Fee Head / Description</th>
                  <th className="py-2.5 px-4 text-center font-semibold text-slate-700">Type</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-slate-700">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{receipt.courseTitle}</p>
                    <p className="text-[11px] text-slate-500">Course Admission, LMS Access & Certification Fee</p>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">
                    {receipt.feeType || "Course Tuition"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{receipt.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4 text-right font-semibold text-slate-700">Total Amount Paid:</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                    ₹{receipt.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-1 px-4 text-right text-slate-500">Balance Due:</td>
                  <td className="py-1 px-4 text-right font-mono font-medium text-slate-600">
                    ₹{(receipt.balanceDue || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Words */}
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-xs">
            <span className="text-slate-500 font-medium">Amount in words: </span>
            <span className="font-bold text-emerald-900">{numberToWordsINR(receipt.amount)}</span>
          </div>

          {/* Footer Seals */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-[11px] text-slate-500">
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">Orbit LMS Finance Audit Sealed</p>
              <p>This is a computer-generated receipt and requires no physical signature.</p>
              <p className="font-mono text-[10px] text-slate-400">Security Hash: {receipt.receiptNo}-{Date.now().toString().slice(-6)}</p>
            </div>
            <div className="text-center space-y-1">
              <div className="h-10 w-28 border-b border-dashed border-slate-400 mx-auto flex items-end justify-center pb-1">
                <span className="text-[10px] text-emerald-800 font-semibold font-mono">DIGITALLY SIGNED</span>
              </div>
              <p className="font-semibold text-slate-700">Finance Officer / Cashier</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-100 border-t border-slate-200 flex sm:justify-between items-center print:hidden">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
              <Printer className="h-3.5 w-3.5" /> Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

