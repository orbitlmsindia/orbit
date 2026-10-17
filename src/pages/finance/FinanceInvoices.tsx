import { useState, useEffect } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Loader2, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface InvoiceRow {
  id: string;
  enrollmentId: string;
  student: string;
  email: string;
  course: string;
  amount: number;
  status: string;
  date: string;
  transactionId: string;
}

export default function FinanceInvoices() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          status,
          transaction_id,
          enrolled_at,
          courses (id, title, price),
          users:users!student_id (id, full_name, email)
        `)
        .order("enrolled_at", { ascending: false });

      if (error) {
        console.warn("Could not query enrollments for invoices:", error);
      }

      const rows: InvoiceRow[] = ((data as any[]) || []).map((item, index) => {
        const year = item.enrolled_at ? new Date(item.enrolled_at).getFullYear() : 2026;
        const invNum = `INV-${year}-${String(index + 1).padStart(4, "0")}`;
        const isPaid = item.status === "approved" || item.status === "active";
        return {
          id: invNum,
          enrollmentId: item.id,
          student: item.users?.full_name || item.users?.email || "Student",
          email: item.users?.email || "N/A",
          course: item.courses?.title || "Course Program",
          amount: Number(item.courses?.price) || 0,
          status: isPaid ? "Paid" : "Pending",
          date: item.enrolled_at ? new Date(item.enrolled_at).toLocaleDateString("en-IN") : "Recent",
          transactionId: item.transaction_id || "Direct-UTR",
        };
      });

      setInvoices(rows);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (inv: InvoiceRow) => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("ORBIT LMS", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("OFFICIAL STUDENT FEE TAX INVOICE", 14, 28);
      doc.text(`Invoice No: ${inv.id}`, 145, 20);
      doc.text(`Date: ${inv.date}`, 145, 28);

      // Student & Course details
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Billed To:", 14, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Student Name: ${inv.student}`, 14, 63);
      doc.text(`Email Address: ${inv.email}`, 14, 70);
      doc.text(`Reference / Transaction ID: ${inv.transactionId}`, 14, 77);

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, 90, 182, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Item / Course Description", 18, 96);
      doc.text("Status", 130, 96);
      doc.text("Amount (INR)", 165, 96);

      // Table Content
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const splitTitle = doc.splitTextToSize(inv.course, 105);
      doc.text(splitTitle, 18, 108);
      doc.text(inv.status.toUpperCase(), 130, 108);
      doc.text(`Rs. ${inv.amount.toLocaleString("en-IN")}`, 165, 108);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 130, 196, 130);

      // Total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Total Paid Amount:", 115, 142);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`Rs. ${inv.amount.toLocaleString("en-IN")}`, 165, 142);

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("This is an electronically generated receipt for Orbit LMS course admission.", 14, 180);
      doc.text("Powered by Orbit SaaS LMS Multi-tenant Platform.", 14, 186);

      doc.save(`${inv.id}_${inv.student.replace(/\s+/g, "_")}.pdf`);
      toast({
        title: "Invoice Downloaded",
        description: `Official PDF receipt for ${inv.id} generated and saved.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: err.message || "Could not generate invoice PDF.",
      });
    }
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.student.toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.course.toLowerCase().includes(search.toLowerCase()) ||
      inv.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FinanceLayout
      headerTitle="Invoices & Fee Receipts"
      headerDescription="Generate and download official PDF tax invoices formatted in Indian Rupees (₹)."
    >
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Issued Student Invoices</CardTitle>
            <CardDescription className="text-slate-400">
              Live enrollment course fee tax receipts
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchInvoices}
              className="border-slate-800 hover:bg-slate-800 shrink-0"
              title="Refresh Invoices"
            >
              <RefreshCw className={`h-4 w-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-indigo-400" />
              Loading invoices from database...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No invoices match your search.
            </div>
          ) : (
            <Table className="min-w-[700px]">
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
                {filtered.map((inv) => (
                  <TableRow key={inv.enrollmentId} className="border-slate-800 hover:bg-slate-800/40">
                    <TableCell className="font-mono text-emerald-400 font-medium">{inv.id}</TableCell>
                    <TableCell className="font-medium text-white">
                      <div>{inv.student}</div>
                      <div className="text-xs text-slate-400">{inv.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-300">{inv.course}</TableCell>
                    <TableCell className="text-right font-bold text-white">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          inv.status === "Paid"
                            ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadInvoice(inv)}
                        className="border-slate-700 hover:bg-slate-800 text-xs"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF Receipt
                      </Button>
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
