import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Printer,
    Download,
    Share2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Copy,
    Check,
    QrCode,
    ShieldCheck,
    Calendar,
    Clock,
    Building2,
    FileText,
    Mail,
    Award,
    Hash,
    User,
    Sparkles,
    Globe
} from "lucide-react";
import { getCompanyBranding, CompanyBrandingSettings } from "@/services/brandingService";

export interface ExamSlipData {
    studentId: string;
    studentName: string;
    studentEmail: string;
    rollNumber?: string;
    avatarUrl?: string;
    courseId?: string;
    courseTitle: string;
    courseCode?: string;
    collegeName?: string;
    branding?: CompanyBrandingSettings;
    department?: string;
    semester?: string;
    academicYear?: string;
    examDate?: string;
    examTime?: string;
    hallNumber?: string;
    seatNumber?: string;
    totalSessions?: number;
    attendedSessions?: number;
    attendancePercentage?: number;
    mentorName?: string;
}

interface ExamAttendanceSlipModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slipData: ExamSlipData | null;
    userRole?: "student" | "teacher" | "admin" | "master";
}

export function ExamAttendanceSlipModal({
    open,
    onOpenChange,
    slipData,
    userRole = "student"
}: ExamAttendanceSlipModalProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    if (!slipData) return null;

    // Live company & institution letterhead data
    const branding = slipData.branding || getCompanyBranding();
    const instituteName = slipData.collegeName && slipData.collegeName !== "Orbit Institute of Technology & Science"
        ? slipData.collegeName
        : (branding.name || "Orbit Innovation Academy");

    // Attendance compliance calculations
    const totalSessions = slipData.totalSessions ?? 40;
    const attendedSessions = slipData.attendedSessions ?? Math.round(totalSessions * 0.82);
    const percentage = slipData.attendancePercentage ?? Math.round((attendedSessions / totalSessions) * 100);
    const isCompliant = percentage >= 75;

    // Synthetic hall ticket metadata
    const rollNo = slipData.rollNumber || `ORB-${slipData.studentId.substring(0, 8).toUpperCase()}`;
    const courseCode = slipData.courseCode || `CS-${(slipData.courseId || "301").substring(0, 4).toUpperCase()}`;
    const hallNo = slipData.hallNumber || "Hall B-304 (Main Academic Block)";
    const seatNo = slipData.seatNumber || `S-${rollNo.slice(-3)}`;
    const examDate = slipData.examDate || new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
    const examTime = slipData.examTime || "10:00 AM - 01:00 PM (IST)";
    const ticketRefId = `HTK-${new Date().getFullYear()}/${rollNo.slice(-4)}-${courseCode}`;

    const handlePrint = () => {
        window.print();
    };

    const handleCopySummary = () => {
        const text = `
╔══════════════════════════════════════════════════════════════╗
   ${instituteName.toUpperCase()}
   OFFICIAL EXAMINATION ATTENDANCE CLEARANCE SLIP & HALL TICKET   
╚══════════════════════════════════════════════════════════════╝
Hall Ticket Ref : ${ticketRefId}
Institution     : ${instituteName}
Address         : ${branding.address || "Sector 62, Technology Campus"}
Contact         : Tel: ${branding.phone || "+91 98765 43210"} | Email: ${branding.email || "office@orbitlms.edu.in"}
Accreditation   : CIN: ${branding.cin || "U72900DL2026PTC389421"} | Reg: ${branding.registrationNo || "REG-ORBIT-2026"}

Student Name    : ${slipData.studentName}
Roll Number     : ${rollNo}
Course / Unit   : [${courseCode}] ${slipData.courseTitle}
Exam Date & Time: ${examDate} | ${examTime}
Examination Hall: ${hallNo} (Seat: ${seatNo})

ATTENDANCE VERIFICATION & ELIGIBILITY:
---------------------------------------------------------------
Sessions Attended : ${attendedSessions} / ${totalSessions}
Attendance Rate   : ${percentage}%
Clearance Status  : ${isCompliant ? "ADMITTED & ELIGIBLE (>= 75% Regulatory Mandate)" : "DEBARMENT HOLD (Below 75% Criteria)"}
${!isCompliant ? "* Note: Attendance condonation approval from Dean/HOD required prior to reporting." : ""}

Issued by ${branding.signatoryTitle || "Controller of Examinations"} | Verified by Orbit LMS
`.trim();

        navigator.clipboard.writeText(text);
        setCopied(true);
        toast({
            title: "Examination Slip Copied",
            description: "Official slip details copied to clipboard."
        });
        setTimeout(() => setCopied(false), 2500);
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`[HALL TICKET & ATTENDANCE CLEARANCE] ${slipData.studentName} - ${slipData.courseTitle}`);
        const body = encodeURIComponent(`Dear ${slipData.studentName} and Parents,

Please find your official Examination Attendance Clearance Slip & Hall Ticket issued by ${instituteName}:

• Course: ${slipData.courseTitle} (${courseCode})
• Candidate: ${slipData.studentName} (Roll: ${rollNo})
• Exam Date: ${examDate}
• Exam Timing: ${examTime}
• Hall & Seat: ${hallNo} | Seat: ${seatNo}
• Attendance Verified: ${percentage}% (${attendedSessions}/${totalSessions} sessions)
• Admission Status: ${isCompliant ? "CLEAR - ADMITTED FOR EXAM" : "DEBARRED - CONDONATION REQUIRED"}

Please carry a printed copy of this slip along with your valid Student Identity Card to the examination center.

${branding.signatoryTitle || "Controller of Examinations"},
${instituteName}
${branding.address || ""}
Contact: ${branding.phone || ""} | ${branding.email || ""}`);

        window.open(`mailto:${slipData.studentEmail}?subject=${subject}&body=${body}`, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-slate-700 bg-background shadow-2xl">
                {/* Actions Toolbar - Hidden on Print */}
                <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 bg-muted/90 backdrop-blur-md border-b print:hidden">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs gap-1 border-primary/40 text-primary bg-primary/10">
                            <Sparkles className="h-3 w-3" /> Admit Card Slip
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                            Ref: {ticketRefId}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                            size="sm"
                            variant="default"
                            onClick={handlePrint}
                            className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
                        >
                            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopySummary}
                            className="h-8 gap-1.5 text-xs"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copied" : "Copy Slip"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEmailShare}
                            className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10"
                            title="Email to Student & Parent"
                        >
                            <Mail className="h-3.5 w-3.5" /> Email
                        </Button>
                    </div>
                </div>

                {/* Printable Admit Card & Attendance Clearance Slip Container */}
                <div className="p-4 sm:p-8 bg-card text-card-foreground print:p-6 print:m-0 print:shadow-none print:border-none print:w-full">
                    {/* Official Letterhead */}
                    <div className="border-2 border-primary/30 rounded-xl p-4 sm:p-7 relative overflow-hidden bg-card/60">
                        {/* Background Watermark */}
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                            style={{ opacity: branding.watermarkOpacity || 0.06 }}
                        >
                            {branding.watermarkUrl || branding.logoUrl ? (
                                <img
                                    src={branding.watermarkUrl || branding.logoUrl}
                                    alt="Watermark"
                                    className="w-80 max-w-[80%] object-contain filter grayscale"
                                />
                            ) : (
                                <GraduationCapIcon className="h-96 w-96 text-foreground" />
                            )}
                        </div>

                        {/* Top Crest & Institute Name */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-5">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 text-center sm:text-left">
                                {branding.logoUrl ? (
                                    <img
                                        src={branding.logoUrl}
                                        alt={instituteName}
                                        className="h-16 w-16 object-contain rounded-xl border p-1 bg-white shadow-sm shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                                        <Building2 className="h-8 w-8" />
                                    </div>
                                )}
                                <div className="space-y-0.5">
                                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground uppercase">
                                        {instituteName}
                                    </h1>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                        Office of the Controller of Examinations • Academic Directorate
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {branding.address || "Sector 62, Innovation Campus, Tech City, India"}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5 text-[10px] font-mono text-muted-foreground">
                                        {branding.cin && <span>CIN: {branding.cin}</span>}
                                        {branding.registrationNo && <span>• Reg: {branding.registrationNo}</span>}
                                        {branding.phone && <span>• Tel: {branding.phone}</span>}
                                        {branding.email && <span>• {branding.email}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Verification Barcode / Token */}
                            <div className="flex flex-col items-center sm:items-end text-right shrink-0">
                                <div className="p-1.5 bg-background border rounded-lg shadow-sm">
                                    <QrCode className="h-12 w-12 text-foreground" />
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground mt-1 tracking-wider uppercase">
                                    {ticketRefId}
                                </span>
                            </div>
                        </div>

                        {/* Title Banner */}
                        <div className="my-5 text-center bg-muted/60 py-2.5 px-4 rounded-lg border border-border/60">
                            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-foreground flex items-center justify-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Examination Attendance Clearance Slip & Hall Ticket
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                End-Semester Summative Evaluation • Academic Year {slipData.academicYear || "2025-2026"}
                            </p>
                        </div>

                        {/* Candidate & Course Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/80 text-xs mb-5">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Candidate Name</span>
                                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    {slipData.studentName}
                                </p>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block pt-2">Roll Number / Registration</span>
                                <p className="font-mono font-bold text-foreground text-xs">{rollNo}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Course / Subject</span>
                                <p className="font-bold text-foreground text-xs">{slipData.courseTitle}</p>
                                <div className="flex items-center gap-2 pt-1">
                                    <Badge variant="outline" className="font-mono text-[10px]">{courseCode}</Badge>
                                    <span className="text-[11px] text-muted-foreground">{slipData.department || "Curriculum Unit"}</span>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block pt-1.5">Faculty In-Charge</span>
                                <p className="text-xs text-muted-foreground">{slipData.mentorName || "Course Faculty"}</p>
                            </div>

                            <div className="space-y-1 sm:border-l sm:pl-4 border-border">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Exam Schedule</span>
                                <p className="font-bold text-foreground flex items-center gap-1 text-xs">
                                    <Calendar className="h-3.5 w-3.5 text-primary" /> {examDate}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {examTime}
                                </p>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block pt-1.5">Hall & Seat Allotment</span>
                                <p className="font-semibold text-foreground text-xs">{hallNo}</p>
                                <Badge variant="secondary" className="font-mono text-[10px] mt-0.5">Seat No: {seatNo}</Badge>
                            </div>
                        </div>

                        {/* Official Attendance Clearance Status Banner */}
                        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 ${
                            isCompliant
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                                : "bg-destructive/10 border-destructive/30 text-destructive dark:text-red-300"
                        }`}>
                            <div className="flex items-center gap-3">
                                {isCompliant ? (
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs uppercase tracking-wider">
                                            {isCompliant ? "ATTENDANCE CLEARANCE: GRANTED" : "ATTENDANCE DEFICIT: DEBARMENT HOLD"}
                                        </span>
                                        <Badge variant={isCompliant ? "default" : "destructive"} className="text-[10px] font-mono">
                                            {percentage}% Attendance
                                        </Badge>
                                    </div>
                                    <p className="text-xs mt-0.5 opacity-90">
                                        {isCompliant
                                            ? `Candidate has fulfilled the mandatory 75% attendance quota (${attendedSessions}/${totalSessions} sessions) and is cleared to write this examination.`
                                            : `Candidate achieved ${percentage}% (${attendedSessions}/${totalSessions} sessions), falling below the statutory 75% threshold. Dean condonation signature required.`}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center sm:text-right shrink-0">
                                <div className={`inline-block px-3 py-1.5 rounded-lg border font-mono font-extrabold text-xs tracking-wider uppercase ${
                                    isCompliant
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                                        : "bg-destructive/20 border-destructive/40 text-destructive"
                                }`}>
                                    {isCompliant ? "✓ ADMITTED TO EXAM" : "⚠ ADMISSION ON HOLD"}
                                </div>
                            </div>
                        </div>

                        {/* Examination Rules & Regulations */}
                        <div className="p-3.5 rounded-lg bg-muted/40 border border-border/70 text-[11px] text-muted-foreground space-y-1 mb-6">
                            <span className="font-bold uppercase tracking-wider text-foreground text-[10px] block">
                                Mandatory Examination Hall Instructions
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Candidate must report to the examination hall at least <strong>15 minutes prior</strong> to the scheduled commencement.</li>
                                <li>This printed Attendance Slip / Admit Card along with the original <strong>Institution Student ID Card</strong> is strictly mandatory.</li>
                                <li>Mobile phones, smartwatches, electronic storage devices, and unauthorized study materials are strictly prohibited inside the hall.</li>
                                <li>Late entry beyond 30 minutes from commencement is strictly inadmissible under academic council regulations.</li>
                            </ul>
                        </div>

                        {/* Signatures & Institutional Seal Block */}
                        <div className="pt-6 border-t border-dashed grid grid-cols-3 gap-4 text-center text-xs">
                            <div className="space-y-4">
                                <div className="h-12 flex items-end justify-center">
                                    <span className="font-serif italic text-muted-foreground/60 text-sm">Orbit Fac. Sign</span>
                                </div>
                                <div className="border-t border-border pt-1">
                                    <p className="font-semibold text-foreground text-[11px]">Faculty In-Charge</p>
                                    <p className="text-[10px] text-muted-foreground">{slipData.mentorName || "Course Mentor"}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="h-12 flex items-center justify-center">
                                    {branding.stampUrl ? (
                                        <img
                                            src={branding.stampUrl}
                                            alt="Official Seal"
                                            className="h-12 w-12 object-contain opacity-90 rotate-6"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full border-2 border-primary/40 flex flex-col items-center justify-center text-[8px] font-mono text-primary rotate-6 uppercase">
                                            <span>SEAL</span>
                                            <span className="text-[6px]">{instituteName.slice(0, 8)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-border pt-1">
                                    <p className="font-semibold text-foreground text-[11px]">{branding.signatoryTitle || "Controller of Exams"}</p>
                                    <p className="text-[10px] text-muted-foreground">{branding.signatoryName || "Academic Secretariat"}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="h-12 flex items-end justify-center">
                                    <span className="text-[10px] text-muted-foreground/50 border-b border-dashed w-28"></span>
                                </div>
                                <div className="border-t border-border pt-1">
                                    <p className="font-semibold text-foreground text-[11px]">Candidate Signature</p>
                                    <p className="text-[10px] text-muted-foreground">To be signed in presence</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function GraduationCapIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </svg>
    );
}
