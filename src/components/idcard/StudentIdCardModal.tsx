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
import { Printer, ShieldCheck, CheckCircle2, QrCode, User, Building2, Calendar, Award } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StudentIdCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
    enrolled_at?: string;
    domain?: string;
  } | null;
}

export function StudentIdCardModal({ open, onOpenChange, student }: StudentIdCardModalProps) {
  const [institute, setInstitute] = useState<any>({
    name: "Orbit LMS Academic Council",
    tagline: "Empowering Next-Gen Learners & Innovators",
    campus: "Orbit Tech Campus, Tech City, India",
    registrationNo: "ORBIT-ACAD-2026-REG",
    logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80"
  });

  const [studentDetails, setStudentDetails] = useState<any>(null);

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
      const { data } = await supabase
        .from("users")
        .select("full_name, email, avatar_url, role, created_at, bio, qualifications")
        .eq("id", studentId)
        .single();

      if (data) {
        setStudentDetails(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!student) return null;

  const rollNo = `ORB-${student.id.substring(0, 8).toUpperCase()}`;
  const validUntil = "2026 - 2027";
  const avatar = studentDetails?.avatar_url || student.avatar || "";
  const studentName = studentDetails?.full_name || student.name || "Student Name";
  const studentEmail = studentDetails?.email || student.email || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verified Digital Student ID Card
          </DialogTitle>
          <DialogDescription>
            Official institutional identification credential & verification QR barcode.
          </DialogDescription>
        </DialogHeader>

        {/* PRINTABLE ID CARD WRAPPER */}
        <div id="printable-id-card" className="mt-3 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white border-2 border-primary/40 shadow-2xl relative overflow-hidden select-none">
          {/* Top Decorative Background Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-primary leading-tight">{institute.name}</h3>
                <p className="text-[10px] text-zinc-400 font-mono">{institute.campus}</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border border-primary/40 text-[9px] uppercase font-bold tracking-widest">
              ACADEMIC ID
            </Badge>
          </div>

          {/* Body Section */}
          <div className="flex items-start gap-4">
            {/* Student Avatar / Photo */}
            <div className="relative shrink-0">
              <div className="h-24 w-20 rounded-xl bg-zinc-800 border-2 border-primary/50 overflow-hidden flex items-center justify-center text-zinc-400 font-bold text-2xl shadow-inner">
                {avatar ? (
                  <img src={avatar} alt={studentName} className="h-full w-full object-cover" />
                ) : (
                  studentName.charAt(0)
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-black p-0.5 rounded-full border-2 border-zinc-900" title="Verified Record">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Student Info Metadata Grid */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div>
                <h4 className="font-extrabold text-base text-white truncate leading-snug">{studentName}</h4>
                <p className="text-xs text-primary font-medium truncate">{studentEmail}</p>
              </div>

              <div className="pt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
                <div>
                  <span className="text-zinc-500 uppercase text-[9px] block">ROLL NO:</span>
                  <span className="font-bold text-white tracking-wider">{rollNo}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase text-[9px] block">VALID THRU:</span>
                  <span className="font-semibold text-zinc-300">{validUntil}</span>
                </div>
                <div className="col-span-2 pt-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] block">MAJOR PROGRAM:</span>
                  <span className="font-semibold text-primary/90 text-xs">{student.domain || "Software Engineering & Computer Science"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Verification QR & Barcode Line */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                <QrCode className="h-7 w-7 text-zinc-900" />
              </div>
              <div className="text-[9px] text-zinc-400 font-mono">
                <p className="font-bold text-zinc-200 uppercase tracking-wider">OFFICIALLY VERIFIED</p>
                <p>Scan to verify record integrity</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-mono font-bold">
                <ShieldCheck className="h-3 w-3" /> VERIFIED
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 bg-primary text-primary-foreground font-bold">
            <Printer className="h-4 w-4" /> Print / Download ID Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
