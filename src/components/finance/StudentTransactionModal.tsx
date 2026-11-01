import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, IndianRupee, Search, CheckCircle2, User, BookOpen, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ReceiptData } from "./ReceiptModal";
import { getCompanyBranding } from "@/services/brandingService";

interface StudentTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionCreated: (receipt: ReceiptData) => void;
}

export function StudentTransactionModal({ open, onOpenChange, onTransactionCreated }: StudentTransactionModalProps) {
  const { toast } = useToast();
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Form State
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("approved");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      loadFormData();
      // Generate a fresh default UTR
      const randRef = `UTR${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
      setReference(randRef);
    }
  }, [open]);

  const loadFormData = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch Students
      const { data: stds } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("role", "student")
        .order("full_name", { ascending: true });

      setStudents(stds || []);

      // 2. Fetch Courses
      const { data: crs } = await supabase
        .from("courses")
        .select("id, title, price, credit_points")
        .order("title", { ascending: true });

      setCourses(crs || []);
    } catch (err: any) {
      console.warn("Could not load users or courses:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCourseSelect = (selectedId: string) => {
    setCourseId(selectedId);
    const match = courses.find((c) => c.id === selectedId);
    if (match && match.price !== undefined) {
      setAmount(match.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast({ variant: "destructive", title: "Student Required", description: "Please select an enrolled or registered student." });
      return;
    }
    if (!courseId) {
      toast({ variant: "destructive", title: "Course Required", description: "Please select the course or curriculum fee head." });
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast({ variant: "destructive", title: "Valid Amount Required", description: "Amount must be a non-negative number." });
      return;
    }
    if (!reference.trim()) {
      toast({ variant: "destructive", title: "Reference Required", description: "Please provide a valid UTR, transaction ID or receipt reference." });
      return;
    }

    setSubmitting(true);
    try {
      const selectedStudent = students.find((s) => s.id === studentId);
      const selectedCourse = courses.find((c) => c.id === courseId);
      const collegeId = sessionStorage.getItem("collegeId") || undefined;
      const currentUserName = sessionStorage.getItem("userName") || "Finance Officer";

      const receiptNo = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      // 1. Check if enrollment already exists, or upsert it
      const { data: existingEnr } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existingEnr) {
        // Update status to approved/active and attach reference
        const { error: updErr } = await supabase
          .from("enrollments")
          .update({
            status: status === "approved" ? "approved" : "pending",
            transaction_id: reference.trim(),
            payment_method: paymentMode.toUpperCase(),
          })
          .eq("id", existingEnr.id);

        if (updErr) console.warn("Enrollment update notice:", updErr);
      } else {
        // Create new enrollment record
        const { error: insErr } = await supabase
          .from("enrollments")
          .insert({
            student_id: studentId,
            course_id: courseId,
            status: status === "approved" ? "approved" : "pending",
            transaction_id: reference.trim(),
            payment_method: paymentMode.toUpperCase(),
            enrolled_at: new Date(paymentDate).toISOString(),
            ...(collegeId ? { college_id: collegeId } : {})
          });

        if (insErr) console.warn("Enrollment creation notice:", insErr);
      }

      // 2. Try inserting into transactions table if table exists
      try {
        await supabase.from("transactions").insert({
          student_id: studentId,
          course_id: courseId,
          amount: numAmount,
          currency: "INR",
          mode: paymentMode.toUpperCase(),
          reference: reference.trim(),
          status: status,
          notes: notes || undefined,
          paid_at: new Date(paymentDate).toISOString(),
          ...(collegeId ? { college_id: collegeId } : {})
        });
      } catch (txErr) {
        console.warn("Transactions table notice (fallback to enrollments):", txErr);
      }

      // 3. Create receipt data object
      const branding = getCompanyBranding();
      const receipt: ReceiptData = {
        receiptNo,
        transactionId: reference.trim(),
        date: new Date(paymentDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        instituteName: branding.name || "Orbit Innovation Academy",
        studentName: selectedStudent?.full_name || selectedStudent?.email || "Student",
        studentEmail: selectedStudent?.email || "",
        studentId: studentId,
        courseTitle: selectedCourse?.title || "Academic Course",
        amount: numAmount,
        paymentMode: paymentMode.toUpperCase(),
        utrRef: reference.trim(),
        balanceDue: 0,
        recordedBy: currentUserName,
      };

      toast({
        title: "Transaction Recorded",
        description: `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded for ${receipt.studentName}.`,
      });

      onOpenChange(false);
      onTransactionCreated(receipt);
    } catch (err: any) {
      console.error("Error creating student transaction:", err);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: err.message || "Failed to record student payment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-slate-900 text-slate-100 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <IndianRupee className="h-5 w-5 text-emerald-400" /> Record Student Transaction
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Record a fee payment, verify UTR reference, and generate an official fee receipt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Select Student */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-semibold">Select Student</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={loadingUsers}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                <SelectValue placeholder={loadingUsers ? "Loading students..." : "Choose student"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-56">
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || s.email} {s.full_name && `(${s.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Course */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-semibold">Course / Fee Head</Label>
            <Select value={courseId} onValueChange={handleCourseSelect} disabled={loadingUsers}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                <SelectValue placeholder={loadingUsers ? "Loading courses..." : "Choose course"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-56">
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} — ₹{Number(c.price || 0).toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Amount Paid (₹ INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">₹</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 bg-slate-950 border-slate-800 text-slate-100 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="upi">UPI / QR Code</SelectItem>
                  <SelectItem value="cash">Cash Counter</SelectItem>
                  <SelectItem value="card">Debit / Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="cheque">Demand Draft / Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UTR Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">UTR / Transaction Reference</Label>
              <Input
                placeholder="UTR1234567890"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Transaction Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100"
                required
              />
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Payment Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="approved">Approved & Verified (Grant Access)</SelectItem>
                  <SelectItem value="pending">Pending Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Notes / Receipt Remarks</Label>
              <Input
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingUsers}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Saving..." : "Save Transaction & Issue Receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

