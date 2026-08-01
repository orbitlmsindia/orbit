import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BulkGradeImporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSubmissions: any[];
  onSuccess: () => void;
}

export function BulkGradeImporterModal({
  open,
  onOpenChange,
  existingSubmissions,
  onSuccess
}: BulkGradeImporterModalProps) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sample CSV Template Download
  const handleDownloadTemplate = () => {
    const csvContent = "student_email,assignment_title,grade_score,feedback\n" +
      "ceo@sintechnologies.in,Build Portfolio Website,88,Great design and responsive layout!\n" +
      "student@example.com,Build Portfolio Website,92,Excellent code structure.";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_grading_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Template Downloaded", description: "bulk_grading_template.csv downloaded." });
  };

  // CSV Parser & Matcher
  const handleCsvChange = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    // Skip header line if present
    const startIndex = lines[0].toLowerCase().includes("student_email") ? 1 : 0;
    const rows: any[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length < 3) continue;

      const studentEmail = parts[0];
      const assignmentTitle = parts[1];
      const gradeScore = parseFloat(parts[2]);
      const feedback = parts.slice(3).join(", ").replace(/^"|"$/g, ""); // join remaining parts as feedback

      // Match with existing submissions
      const matched = existingSubmissions.find((sub) => {
        const emailMatch = sub.student?.email?.toLowerCase() === studentEmail.toLowerCase();
        const titleMatch = sub.assignment?.title?.toLowerCase() === assignmentTitle.toLowerCase() ||
                           assignmentTitle.toLowerCase() === "all" ||
                           lines.length === 2; // if single assignment match
        return emailMatch || (emailMatch && titleMatch);
      });

      rows.push({
        id: `row-${i}`,
        studentEmail,
        assignmentTitle,
        gradeScore: isNaN(gradeScore) ? null : gradeScore,
        feedback,
        matchedSubmission: matched,
        isValid: !!matched && !isNaN(gradeScore)
      });
    }

    setParsedRows(rows);
  };

  // Handle File Drag & Drop or Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleCsvChange(content);
      }
    };
    reader.readAsText(file);
  };

  // Batch Update Submissions in Database
  const handleApplyBulkGrades = async () => {
    const validRows = parsedRows.filter(r => r.isValid && r.matchedSubmission);
    if (validRows.length === 0) return;

    try {
      setIsUpdating(true);
      let successCount = 0;

      for (const r of validRows) {
        const { error } = await supabase
          .from("submissions")
          .update({
            grade: r.gradeScore,
            feedback: r.feedback || null,
            status: "graded",
            graded_at: new Date().toISOString()
          })
          .eq("id", r.matchedSubmission.id);

        if (!error) successCount++;
      }

      toast({
        title: "Bulk Grading Complete! 🎉",
        description: `Successfully updated grades for ${successCount} student submission(s).`
      });

      setCsvText("");
      setParsedRows([]);
      onOpenChange(false);
      onSuccess();

    } catch (err: any) {
      toast({ variant: "destructive", title: "Bulk Update Error", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Grade Import & Review (CSV / Excel)
          </DialogTitle>
          <DialogDescription>
            Import grades and feedback for multiple students at once using a CSV spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
              <span>Columns: <strong>student_email, assignment_title, grade_score, feedback</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5 text-xs h-8">
                <Download className="h-3.5 w-3.5" /> Download Template
              </Button>
              <label htmlFor="csv-file-input">
                <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer" onClick={() => document.getElementById('csv-file-input')?.click()}>
                  <UploadCloud className="h-3.5 w-3.5" /> Upload File
                </Button>
              </label>
              <input id="csv-file-input" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <Textarea
              placeholder={`Paste CSV content here...\n\nExample:\nstudent_email,assignment_title,grade_score,feedback\nceo@sintechnologies.in,Build Portfolio Website,88,Excellent work!\nstudent2@example.com,Build Portfolio Website,95,Great design.`}
              className="font-mono text-xs min-h-[140px] bg-background"
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
            />
          </div>

          {/* Interactive Review Table */}
          {parsedRows.length > 0 && (
            <div className="border rounded-xl overflow-hidden text-xs">
              <div className="px-4 py-2.5 bg-muted/60 font-semibold border-b flex items-center justify-between">
                <span>Pre-Update Review ({parsedRows.length} Rows Parsed)</span>
                <Badge variant={validCount > 0 ? "success" : "destructive"} className="font-mono">
                  {validCount} Matched / Ready
                </Badge>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y">
                {parsedRows.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{r.studentEmail}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{r.assignmentTitle}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic line-clamp-1">{r.feedback || "No feedback provided."}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-sm text-primary">{r.gradeScore !== null ? `${r.gradeScore} pts` : "Invalid Grade"}</span>
                      </div>
                      {r.isValid ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> Not Found
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyBulkGrades}
            disabled={validCount === 0 || isUpdating}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUpdating ? "Saving Grades..." : `Apply & Update Grades (${validCount} Submissions)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
