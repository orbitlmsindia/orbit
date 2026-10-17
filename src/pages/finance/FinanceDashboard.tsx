import { useState, useEffect } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, CreditCard, TrendingUp, CheckCircle, Clock, ArrowUpRight, ShieldCheck, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function FinanceDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenueINR: 0,
    pendingPaymentsCount: 0,
    approvedEnrollmentsCount: 0,
    activeCouponsCount: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchFinanceMetrics();
  }, []);

  const fetchFinanceMetrics = async () => {
    try {
      setLoading(true);
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          course_id,
          student_id,
          status,
          transaction_id,
          payment_method,
          enrolled_at,
          courses (id, title, price),
          users:users!student_id (id, full_name, email)
        `)
        .order("enrolled_at", { ascending: false });

      if (error) {
        console.warn("Could not query enrollments for finance:", error);
      }

      const list = (enrollments as any[]) || [];
      const approved = list.filter((e: any) => e.status === "approved" || e.status === "active");
      const pending = list.filter((e: any) => e.status === "pending");

      const totalRevenue = approved.reduce((sum: number, item: any) => {
        const p = Number(item.courses?.price) || 0;
        return sum + p;
      }, 0);

      let couponCount = 0;
      try {
        const { count } = await supabase.from("coupons").select("*", { count: "exact", head: true });
        couponCount = count || 0;
      } catch {
        couponCount = 0;
      }

      setStats({
        totalRevenueINR: totalRevenue,
        pendingPaymentsCount: pending.length,
        approvedEnrollmentsCount: approved.length,
        activeCouponsCount: couponCount,
      });

      const formatted = list.slice(0, 10).map((tx: any) => ({
        id: tx.transaction_id || `TXN-${tx.id.slice(0, 8).toUpperCase()}`,
        student: tx.users?.full_name || tx.users?.email || "Student",
        course: tx.courses?.title || "Standard Course",
        amount: Number(tx.courses?.price) || 0,
        mode: (tx.payment_method || "UPI / QR").toUpperCase(),
        status: tx.status === "approved" || tx.status === "active" ? "completed" : tx.status,
        date: tx.enrolled_at ? new Date(tx.enrolled_at).toISOString().split("T")[0] : "Recent",
      }));

      setRecentTransactions(formatted);
    } catch (err) {
      console.error("Finance metrics error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinanceLayout
      headerTitle="Finance & Sales Dashboard"
      headerDescription="Manage student course payments, revenue collections, and transaction approvals in Indian Rupees (₹)."
    >
      <div className="space-y-6">
        {/* Financial KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Revenue (₹ INR)</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                ₹{stats.totalRevenueINR.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" /> +18.4% this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Pending Verification</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{stats.pendingPaymentsCount} Receipts</div>
              <p className="text-xs text-slate-400 mt-1">Requires Payment Officer Approval</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Paid Course Enrollments</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.approvedEnrollmentsCount} Students</div>
              <p className="text-xs text-slate-400 mt-1">Verified & Active</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Coupons</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Tag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeCouponsCount} Active</div>
              <p className="text-xs text-slate-400 mt-1">Flat & Percentage Discounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Recent Student Transactions</CardTitle>
              <CardDescription className="text-slate-400">Review UPI/QR and Net Banking fee payments</CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 w-fit">
              Currency: INR (₹)
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[750px]">
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Transaction ID</TableHead>
                  <TableHead className="text-slate-300">Student Name</TableHead>
                  <TableHead className="text-slate-300">Course Title</TableHead>
                  <TableHead className="text-slate-300 text-right">Amount (₹)</TableHead>
                  <TableHead className="text-slate-300">Mode</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/40">
                    <TableCell className="font-mono font-medium text-emerald-400">{tx.id}</TableCell>
                    <TableCell className="font-medium text-white">{tx.student}</TableCell>
                    <TableCell className="text-slate-300">{tx.course}</TableCell>
                    <TableCell className="text-right font-bold text-white">₹{tx.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300">{tx.mode}</Badge></TableCell>
                    <TableCell>
                      {tx.status === 'completed' ? (
                        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">Verified</Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending Review</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-400 text-xs">{tx.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FinanceLayout>
  );
}
