import { useState, useEffect } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface TransactionRow {
  enrollmentId: string;
  id: string;
  student: string;
  email: string;
  course: string;
  amount: number;
  utr: string;
  status: "approved" | "pending" | "rejected";
  date: string;
}

export default function FinanceTransactions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          status,
          transaction_id,
          payment_method,
          enrolled_at,
          courses (id, title, price),
          users:users!student_id (id, full_name, email)
        `)
        .order("enrolled_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch transactions from enrollments:", error);
      }

      const rows: TransactionRow[] = ((data as any[]) || []).map((item) => ({
        enrollmentId: item.id,
        id: item.transaction_id || `TXN-${item.id.slice(0, 8).toUpperCase()}`,
        student: item.users?.full_name || item.users?.email || "Student",
        email: item.users?.email || "No email",
        course: item.courses?.title || "Standard Course",
        amount: Number(item.courses?.price) || 0,
        utr: item.transaction_id || "Direct / QR",
        status: (item.status === "active" ? "approved" : item.status) || "pending",
        date: item.enrolled_at ? new Date(item.enrolled_at).toISOString().split("T")[0] : "Recent",
      }));

      setTransactions(rows);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollmentId: string, txnId: string) => {
    setProcessingId(enrollmentId);
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: "approved" })
        .eq("id", enrollmentId);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((t) => (t.enrollmentId === enrollmentId ? { ...t, status: "approved" } : t))
      );
      toast({
        title: "Payment Approved",
        description: `Receipt ${txnId} verified and course access granted.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: err.message || "Could not update enrollment status in Supabase.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (enrollmentId: string, txnId: string) => {
    setProcessingId(enrollmentId);
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: "rejected" })
        .eq("id", enrollmentId);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((t) => (t.enrollmentId === enrollmentId ? { ...t, status: "rejected" } : t))
      );
      toast({
        variant: "destructive",
        title: "Payment Rejected",
        description: `Receipt ${txnId} flagged as invalid reference.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: err.message || "Could not update status.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = transactions.filter((t) =>
    t.student.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.utr.toLowerCase().includes(search.toLowerCase()) ||
    t.course.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FinanceLayout
      headerTitle="Student Fee Transactions & Verification"
      headerDescription="Verify payment UTR/Transaction numbers for UPI/QR and direct transfers."
    >
      <Card className="bg-slate-900 border-slate-800 text-slate-100 space-y-4">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>All Student Receipts</CardTitle>
            <CardDescription className="text-slate-400">
              Live database records of student fee submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search receipts, student or UTR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTransactions}
              className="border-slate-800 hover:bg-slate-800 shrink-0"
              title="Refresh Transactions"
            >
              <RefreshCw className={`h-4 w-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-indigo-400" />
              Loading real transactions from database...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No transactions match your search filter.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Transaction ID</TableHead>
                  <TableHead className="text-slate-300">Student & Email</TableHead>
                  <TableHead className="text-slate-300">Course</TableHead>
                  <TableHead className="text-slate-300">UTR / Ref No.</TableHead>
                  <TableHead className="text-slate-300 text-right">Amount (₹)</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.enrollmentId} className="border-slate-800 hover:bg-slate-800/40">
                    <TableCell className="font-mono text-emerald-400 font-medium">{t.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{t.student}</div>
                      <div className="text-xs text-slate-400">{t.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-300">{t.course}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{t.utr}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-400">
                      ₹{t.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {t.status === "approved" && (
                        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                          Approved
                        </Badge>
                      )}
                      {t.status === "pending" && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Pending Review
                        </Badge>
                      )}
                      {t.status === "rejected" && (
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "pending" ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            disabled={processingId === t.enrollmentId}
                            onClick={() => handleApprove(t.enrollmentId, t.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={processingId === t.enrollmentId}
                            onClick={() => handleReject(t.enrollmentId, t.id)}
                            className="h-8 px-2 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </FinanceLayout>
  );
}
