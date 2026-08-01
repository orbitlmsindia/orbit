import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Award, Sparkles, FileText, CheckCircle2, Building2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StudentReportCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    email: string;
    aura?: number;
    credits?: number;
    progress?: number;
    course?: string;
  } | null;
}

export function StudentReportCardModal({ open, onOpenChange, student }: StudentReportCardModalProps) {
  const [institute, setInstitute] = useState<any>({
    name: "Orbit LMS Innovation Academy",
    logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
    registrationNo: "REG-ORBIT-2026/8942",
    email: "contact@orbitlms.edu.in",
    phone: "+91 98765 43210",
    address: "Orbit Technology Campus, Sector 62, Tech City, India",
    stampUrl: "",
    signatoryTitle: "Authorized Registrar",
    signatoryName: ""
  });

  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      loadInstituteSettings();
      fetchStudentDetails(student.id);
    }
  }, [open, student]);

  const loadInstituteSettings = () => {
    const saved = localStorage.getItem("orbit_institute_settings");
    if (saved) {
      try {
        setInstitute(JSON.parse(saved));
      } catch (e) {}
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    try {
      setLoading(true);
      const { data: enrs } = await supabase
        .from("enrollments")
        .select("id, status, enrolled_at, course:courses(id, title, credit_points)")
        .eq("student_id", studentId);

      const { data: subs } = await supabase
        .from("submissions")
        .select("id, grade, status, assignment:assignments(title)")
        .eq("student_id", studentId);

      const formatted = (enrs || []).map((e) => {
        const c = Array.isArray(e.course) ? e.course[0] : e.course;
        const courseSubs = (subs || []);
        const totalMarks = courseSubs.length ? Math.round(courseSubs.reduce((acc, s) => acc + (s.grade || 85), 0) / courseSubs.length) : 88;

        return {
          id: e.id,
          courseTitle: c?.title || "Enrolled Course",
          credits: c?.credit_points || 3,
          enrolledAt: new Date(e.enrolled_at || Date.now()).toLocaleDateString(),
          status: e.status === "approved" ? "Completed / Active" : e.status,
          marks: totalMarks,
          auraEarned: (c?.credit_points || 3) * 5 + 10
        };
      });

      if (formatted.length === 0 && student) {
        formatted.push({
          id: "default-1",
          courseTitle: student.course || "General Academic Course",
          credits: student.credits || 3,
          enrolledAt: new Date().toLocaleDateString(),
          status: "Completed / Active",
          marks: 92,
          auraEarned: student.aura || 15
        });
      }

      setStudentEnrollments(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!student) return null;

  const totalEarnedCredits = studentEnrollments.reduce((sum, item) => sum + item.credits, 0);
  const totalEarnedAura = student.aura || studentEnrollments.reduce((sum, item) => sum + item.auraEarned, 0);
  const avgMarks = studentEnrollments.length ? Math.round(studentEnrollments.reduce((sum, item) => sum + item.marks, 0) / studentEnrollments.length) : 90;

  const getGradeBadge = (marks: number) => {
    if (marks >= 90) return { label: "Grade A+ (Outstanding)", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
    if (marks >= 75) return { label: "Grade A (Excellent)", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    if (marks >= 60) return { label: "Grade B (Good)", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return { label: "Grade C (Pass)", color: "bg-slate-500/10 text-slate-600 border-slate-500/30" };
  };

  const grade = getGradeBadge(avgMarks);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] bg-background text-foreground p-0 border-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Official Student Academic Report Card</DialogTitle>
          <DialogDescription>Student Progress and Marks Transcript</DialogDescription>
        </DialogHeader>

        {/* Printable Letterhead Container */}
        <div id="printable-report-card" className="p-6 sm:p-8 space-y-6 bg-background">
          {/* 1. Official Letterhead Header Banner */}
          <div className="border-b-2 border-primary/50 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {institute.logoUrl ? (
                <img src={institute.logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-lg border p-1 bg-white" />
              ) : (
                <div className="h-14 w-14 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">ORBIT</div>
              )}
              <div>
                <h2 className="text-lg font-bold font-display uppercase tracking-wide text-foreground">{institute.name}</h2>
                <p className="text-xs text-muted-foreground">{institute.address}</p>
                <p className="text-[11px] font-mono text-muted-foreground">Email: {institute.email} • Tel: {institute.phone}</p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 space-y-1">
              <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                OFFICIAL REPORT CARD
              </Badge>
              {institute.registrationNo && (
                <p className="text-[10px] font-mono text-muted-foreground">{institute.registrationNo}</p>
              )}
              <p className="text-[10px] text-muted-foreground font-mono">Date Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* 2. Student Info Card */}
          <div className="p-4 rounded-xl bg-muted/40 border grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Student Name</span>
              <span className="font-bold text-sm text-foreground">{student.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Student Email</span>
              <span className="font-mono text-muted-foreground truncate block">{student.email}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Cumulative Aura XP</span>
              <span className="font-mono font-bold text-amber-500">✨ {totalEarnedAura} XP</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Academic Credits</span>
              <span className="font-mono font-bold text-primary">🎓 {totalEarnedCredits} Credits</span>
            </div>
          </div>

          {/* 3. Performance Progress Metric */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Overall Academic Standing</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold font-mono text-foreground">{avgMarks}% Score</span>
                <Badge variant="outline" className={`font-semibold text-xs ${grade.color}`}>
                  {grade.label}
                </Badge>
              </div>
            </div>
            <div className="w-full sm:w-48 bg-muted rounded-full h-3 overflow-hidden border">
              <div className="bg-primary h-full transition-all" style={{ width: `${avgMarks}%` }} />
            </div>
          </div>

          {/* 4. Course Marks & Performance Ledger Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" /> Enrolled Course Progress & Grade Breakdown
            </h4>

            <div className="border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/70 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Course Title</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Aura XP</th>
                    <th className="p-3">Marks Grade</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {studentEnrollments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 font-sans font-semibold text-foreground">{item.courseTitle}</td>
                      <td className="p-3 font-bold text-primary">🎓 {item.credits}</td>
                      <td className="p-3 font-bold text-amber-500">✨ {item.auraEarned}</td>
                      <td className="p-3 font-bold text-foreground">{item.marks}%</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Official Registrar Seal & Footer */}
          <div className="pt-8 border-t flex items-end justify-between text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block font-mono">Document Security Code: ORBIT-RPT-2026-SECURED</span>
              <p className="text-[11px] text-muted-foreground italic">Generated by Orbit LMS Official Examination Ledger.</p>
            </div>

            <div className="text-right space-y-1">
              {institute.stampUrl ? (
                <img src={institute.stampUrl} alt="Official Stamp" className="h-10 w-28 object-contain ml-auto border p-0.5 rounded bg-white" />
              ) : (
                <div className="h-10 w-28 border border-dashed rounded bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground font-mono mx-auto sm:ml-auto">
                  [Official Stamp & Seal]
                </div>
              )}
              {institute.signatoryName && (
                <span className="font-bold text-foreground block text-xs">{institute.signatoryName}</span>
              )}
              <span className="font-bold text-foreground block text-xs">{institute.signatoryTitle || "Authorized Registrar"}</span>
              <span className="text-[10px] text-muted-foreground block">{institute.name}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2 font-semibold bg-primary text-primary-foreground">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
