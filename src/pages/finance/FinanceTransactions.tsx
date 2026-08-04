import { useState } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, FileText, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FinanceTransactions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState([
    { id: "TXN-901", student: "Aarav Sharma", email: "aarav@gmail.com", course: "Foundations of AI & ML", amount: 4999, utr: "938472910482", status: "completed", date: "2026-08-03" },
    { id: "TXN-902", student: "Priya Patel", email: "priya@gmail.com", course: "Intelligent Data Analytics", amount: 3999, utr: "837492019485", status: "completed", date: "2026-08-02" },
    { id: "TXN-903", student: "Rohan Verma", email: "rohan@gmail.com", course: "Embedded Robotics & IoT", amount: 5999, utr: "736482910471", status: "pending", date: "2026-08-02" },
    { id: "TXN-904", student: "Neha Singh", email: "neha@gmail.com", course: "Mastering OOP with Java", amount: 2999, utr: "625471902847", status: "completed", date: "2026-08-01" },
    { id: "TXN-905", student: "Vikram Rathore", email: "vikram@gmail.com", course: "Civil Engineering & TKS", amount: 4499, utr: "514360891736", status: "pending", date: "2026-08-01" },
  ]);

  const handleApprove = (id: string) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    toast({ title: "Payment Approved", description: `Transaction ${id} verified and enrollment activated.` });
  };

  const handleReject = (id: string) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'rejected' } : t));
    toast({ variant: "destructive", title: "Payment Rejected", description: `Transaction ${id} marked as invalid UTR.` });
  };

  const filtered = transactions.filter(t => 
    t.student.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.utr.toLowerCase().includes(search.toLowerCase())
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
            <CardDescription className="text-slate-400">Search by student name, transaction ID, or UTR number</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search receipts or UTR..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-slate-950 border-slate-800 text-white"
            />
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
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
                <TableRow key={t.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell className="font-mono text-emerald-400 font-medium">{t.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-white">{t.student}</div>
                    <div className="text-xs text-slate-400">{t.email}</div>
                  </TableCell>
                  <TableCell className="text-slate-300">{t.course}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-300">{t.utr}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-400">₹{t.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {t.status === 'completed' && <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">Approved</Badge>}
                    {t.status === 'pending' && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>}
                    {t.status === 'rejected' && <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Rejected</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'pending' ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => handleApprove(t.id)} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(t.id)} className="h-8 px-2 text-xs">
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
        </CardContent>
      </Card>
    </FinanceLayout>
  );
}
