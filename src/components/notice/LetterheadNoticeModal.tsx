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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Building2, ShieldCheck, CheckCircle2, Send, Download, UploadCloud, Image as ImageIcon, PenTool, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface LetterheadNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderType?: "teacher" | "admin";
  defaultCourseTitle?: string;
}

export function LetterheadNoticeModal({
  open,
  onOpenChange,
  senderType = "teacher",
  defaultCourseTitle = "All Enrolled Students"
}: LetterheadNoticeModalProps) {
  const { toast } = useToast();
  const [institute, setInstitute] = useState<any>({
    name: "ORBIT LMS ACADEMIC INNOVATION COUNCIL",
    tagline: "Official Academic Governing Body & Center for Excellence",
    campus: "Orbit Technology Campus, Sector 62, Tech City, India",
    registrationNo: "REG-ORBIT-2026/OFFICIAL-NOTICE",
    email: "notices@orbitlms.edu.in",
    phone: "+91 98765 43210",
    logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80"
  });

  const [refNo, setRefNo] = useState(`ORBIT/${new Date().getFullYear()}/CIRC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetBatch, setTargetBatch] = useState(defaultCourseTitle);
  const [subject, setSubject] = useState("IMPORTANT ACADEMIC ANNOUNCEMENT & REGULAR SCHEDULE UPDATE");
  const [noticeBody, setNoticeBody] = useState(
    "It is hereby informed to all students that the upcoming regular lectures and examination assessments have been scheduled as per the academic calendar. Students are advised to ensure 100% attendance and submit all pending module assignments prior to the specified deadlines."
  );
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryRole, setSignatoryRole] = useState(senderType === "admin" ? "Chief Academic Controller" : "Course Instructor & Department Head");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [customHeaderBanner, setCustomHeaderBanner] = useState("");

  useEffect(() => {
    if (open) {
      loadInstituteSettings();
      fetchSenderDetails();
    }
  }, [open]);

  const loadInstituteSettings = async () => {
    let adminInst = {
      name: "ORBIT LMS ACADEMIC INNOVATION COUNCIL",
      tagline: "Official Academic Governing Body & Center for Excellence",
      campus: "Orbit Technology Campus, Sector 62, Tech City, India",
      registrationNo: "REG-ORBIT-2026/OFFICIAL-NOTICE",
      email: "notices@orbitlms.edu.in",
      phone: "+91 98765 43210",
      logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
      signatureUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80"
    };

    const saved = localStorage.getItem("orbit_institute_settings");
    if (saved) {
      try {
        adminInst = { ...adminInst, ...JSON.parse(saved) };
      } catch (e) {}
    }
    setInstitute(adminInst);
    setCompanyLogoUrl(adminInst.logoUrl);
    if (adminInst.signatureUrl) setSignatureUrl(adminInst.signatureUrl);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const savedTeacherLH = localStorage.getItem(`orbit_teacher_letterhead_${user.id}`) || localStorage.getItem("orbit_teacher_letterhead");
        if (savedTeacherLH) {
          const parsed = JSON.parse(savedTeacherLH);
          if (parsed.companyLogoUrl) setCompanyLogoUrl(parsed.companyLogoUrl);
          if (parsed.signatureUrl) setSignatureUrl(parsed.signatureUrl);
          if (parsed.letterheadHeaderUrl) setCustomHeaderBanner(parsed.letterheadHeaderUrl);
          if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
          if (parsed.companyName) {
            setInstitute((prev: any) => ({ ...prev, name: parsed.companyName, tagline: parsed.companyTagline || prev.tagline }));
          }
        }
      }
    } catch (e) {}
  };

  const handleSyncAdminDefaults = () => {
    const saved = localStorage.getItem("orbit_institute_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInstitute(parsed);
        if (parsed.logoUrl) setCompanyLogoUrl(parsed.logoUrl);
        if (parsed.signatureUrl) setSignatureUrl(parsed.signatureUrl);
        toast({ title: "Synced Admin Profile Defaults! 🏫", description: "Reflected company logo & institute details from Admin settings." });
      } catch (e) {}
    }
  };

  const fetchSenderDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("full_name, role, qualifications")
        .eq("id", user.id)
        .single();

      if (data) {
        if (!signatoryName) setSignatoryName(data.full_name || "Academic Authority");
        if (data.role === "admin") {
          setSignatoryRole("Chief Academic Officer");
        } else {
          setSignatoryRole(`Course Instructor ${data.qualifications ? `(${data.qualifications})` : ""}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 bg-card border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Official Institutional Letterhead Notice Generator
          </DialogTitle>
          <DialogDescription>
            Auto-fetches your official credentials to generate a formal printable letterhead circular.
          </DialogDescription>
        </DialogHeader>

        {/* Input Form Controls */}
        <div className="space-y-3 p-4 rounded-xl border bg-muted/20 text-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Notice Details & Target Audience
            </h4>
            <Button type="button" variant="outline" size="sm" onClick={handleSyncAdminDefaults} className="h-7 text-[11px] gap-1 font-bold">
              <RefreshCw className="h-3 w-3" /> Sync Admin Profile Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Notice Ref No.</Label>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of Issue</Label>
              <Input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Batch / Course</Label>
              <Input value={targetBatch} onChange={(e) => setTargetBatch(e.target.value)} className="text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Subject Header Title</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-xs font-semibold" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notice Content Body</Label>
            <Textarea value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} className="min-h-[80px] text-xs leading-relaxed" />
          </div>

          {/* Letterhead Banner, Logo & Signature Controls */}
          <div className="pt-2 border-t space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Letterhead Header & Signature Customization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Custom Header Graphic Banner */}
              <div className="space-y-1">
                <Label className="text-[11px]">Letterhead Header Banner</Label>
                <div className="flex gap-1">
                  <Input value={customHeaderBanner} onChange={(e) => setCustomHeaderBanner(e.target.value)} placeholder="Header Banner URL" className="text-[11px] h-8" />
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={() => document.getElementById('modal-header-file')?.click()}>
                    <UploadCloud className="h-3 w-3" />
                  </Button>
                  <input id="modal-header-file" type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) => setCustomHeaderBanner(ev.target?.result as string);
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
              </div>

              {/* Company Logo Upload */}
              <div className="space-y-1">
                <Label className="text-[11px]">Company / Institute Logo</Label>
                <div className="flex gap-1">
                  <Input value={companyLogoUrl} onChange={(e) => setCompanyLogoUrl(e.target.value)} placeholder="Logo Image URL" className="text-[11px] h-8" />
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={() => document.getElementById('modal-logo-file')?.click()}>
                    <UploadCloud className="h-3 w-3" />
                  </Button>
                  <input id="modal-logo-file" type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) => setCompanyLogoUrl(ev.target?.result as string);
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
              </div>

              {/* Digital Signature Upload */}
              <div className="space-y-1">
                <Label className="text-[11px]">Digital Signature (PNG)</Label>
                <div className="flex gap-1">
                  <Input value={signatureUrl} onChange={(e) => setSignatureUrl(e.target.value)} placeholder="Signature PNG URL" className="text-[11px] h-8" />
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={() => document.getElementById('modal-sig-file')?.click()}>
                    <UploadCloud className="h-3 w-3" />
                  </Button>
                  <input id="modal-sig-file" type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) => setSignatureUrl(ev.target?.result as string);
                      r.readAsDataURL(f);
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRINTABLE LETTERHEAD NOTICE PREVIEW */}
        <div id="printable-letterhead-notice" className="mt-4 p-8 rounded-2xl bg-white text-slate-900 border-2 border-slate-200 shadow-xl relative select-none font-sans">
          {/* Custom Graphic Header Banner or Standard Header */}
          {customHeaderBanner ? (
            <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-300 mb-6 shadow-xs">
              <img src={customHeaderBanner} alt="Official Letterhead Banner" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="border-b-4 border-slate-900 pb-4 mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                  {companyLogoUrl || institute.logoUrl ? (
                    <img src={companyLogoUrl || institute.logoUrl} alt="Logo" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <Building2 className="h-9 w-9 text-amber-400" />
                  )}
                </div>
                <div>
                  <h2 className="font-extrabold text-base uppercase tracking-wider text-slate-950 leading-tight">{institute.name}</h2>
                  <p className="text-xs font-semibold text-slate-600">{institute.tagline}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{institute.campus} • Reg: {institute.registrationNo}</p>
                </div>
              </div>
              <div className="text-right shrink-0 font-mono text-[10px] text-slate-600">
                <p>Email: {institute.email}</p>
                <p>Phone: {institute.phone}</p>
              </div>
            </div>
          )}

          {/* Reference & Date Line */}
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 mb-6 pb-2 border-b border-slate-200">
            <span>REF NO: {refNo}</span>
            <span>DATE: {new Date(noticeDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>

          {/* Target Audience Badge */}
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">TO: </span>
            <span className="text-xs font-extrabold text-slate-900 underline">{targetBatch}</span>
          </div>

          {/* Subject Line */}
          <div className="mb-6 bg-slate-100 p-3 rounded-lg border border-slate-300">
            <h4 className="font-extrabold text-sm uppercase text-slate-950 tracking-wide text-center">
              SUBJECT: {subject}
            </h4>
          </div>

          {/* Main Notice Body Text */}
          <div className="text-xs leading-relaxed text-slate-800 space-y-3 min-h-[140px] whitespace-pre-line font-serif">
            {noticeBody}
          </div>

          {/* Official Signatory Box & Seal */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex items-end justify-between">
            <div className="space-y-1 text-[10px] font-mono text-slate-500">
              <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-300 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED ACADEMIC CIRCULAR
              </div>
              <p>Generated via Orbit LMS Institutional Portal</p>
            </div>

            <div className="text-right space-y-1">
              <div className="min-h-[40px] flex items-center justify-end">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="h-10 max-w-[150px] object-contain border-b border-slate-400 pb-0.5" />
                ) : (
                  <span className="font-serif italic text-base text-slate-800 font-bold border-b border-slate-400 px-4">{signatoryName || "Authorized Signatory"}</span>
                )}
              </div>
              <p className="font-extrabold text-xs text-slate-900">{signatoryName}</p>
              <p className="text-[10px] font-semibold text-slate-600 font-mono">{signatoryRole}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 bg-slate-900 text-white hover:bg-slate-800 font-bold">
            <Printer className="h-4 w-4" /> Print / Export Official Notice PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
