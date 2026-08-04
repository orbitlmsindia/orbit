import { useState } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Plus, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FinanceInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([
    { id: "INV-2026-001", student: "Aarav Sharma", course: "AI & ML Certificate", amount: 4999, status: "Paid", date: "2026-08-03" },
    { id: "INV-2026-002", student: "Priya Patel", course: "Data Analytics Specialization", amount: 3999, status: "Paid", date: "2026-08-02" },
    { id: "INV-2026-003", student: "Rohan Verma", course: "Embedded Robotics Program", amount: 5999, status: "Pending", date: "2026-08-02" },
  ]);

  const handleDownloadInvoice = (id: string) => {
    toast({ title: "Invoice Downloaded", description: `Official PDF receipt for ${id} generated.` });
  };

  return (
    <FinanceLayout
      headerTitle="Invoices & Fee Receipts"
      headerDescription="Generate and download official PDF tax invoices formatted in Indian Rupees (₹)."
    >
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Issued Student Invoices</CardTitle>
            <CardDescription className="text-slate-400">All course fee tax receipts</CardDescription>
          </div>
          <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            GST & Fee Receipts (₹)
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-300">Invoice No.</TableHead>
                <TableHead className="text-slate-300">Student Name</TableHead>
                <TableHead className="text-slate-300">Course / Program</TableHead>
                <TableHead className="text-slate-300 text-right">Amount (₹)</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell className="font-mono text-emerald-400 font-medium">{inv.id}</TableCell>
                  <TableCell className="font-medium text-white">{inv.student}</TableCell>
                  <TableCell className="text-slate-300">{inv.course}</TableCell>
                  <TableCell className="text-right font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge className={inv.status === 'Paid' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(inv.id)} className="border-slate-700 hover:bg-slate-800 text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF Receipt
                    </Button>
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
