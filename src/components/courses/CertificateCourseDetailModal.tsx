import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen,
    GraduationCap,
    Clock,
    Award,
    Calendar,
    CheckCircle2,
    FileText,
    UserCheck,
    Globe,
    Sparkles,
    ShieldCheck,
    ExternalLink,
    PlayCircle
} from "lucide-react";

export interface SyllabusModule {
    module_no: string;
    content: string;
    hrs: number;
}

export interface CertificateCourseData {
    id: string;
    title: string;
    description?: string;
    course_domain?: string;
    creditPoints?: number;
    credit_points?: number;
    durationHours?: number;
    duration_hours?: number;
    course_status?: string;
    course_language?: string;
    course_level?: string;
    course_type?: string;
    intended_audience?: string;
    start_date?: string;
    end_date?: string;
    enrollment_end_date?: string;
    exam_date?: string;
    exam_reg_end_date?: string;
    books_references?: string[];
    syllabus_modules?: SyllabusModule[];
    course_sections?: any[];
    assessment_internal_marks?: number;
    assessment_external_marks?: number;
    assessment_total_marks?: number;
    min_pass_internal_pct?: number;
    min_pass_internal_marks?: number;
    min_pass_external_pct?: number;
    min_pass_external_marks?: number;
    min_pass_total_pct?: number;
    min_pass_total_marks?: number;
    instructor_name?: string;
    instructor_designation?: string;
    instructor_department?: string;
    instructor_photo_url?: string;
    instructor_intro?: string;
    instructor?: string;
    instructorEmail?: string;
    instructorAvatar?: string;
    instructor_qualifications?: any;
    instructor_socials?: any;
    image?: string;
    thumbnail_url?: string;
    price?: number;
    currency?: string;
    organization_name?: string;
}

interface CertificateCourseDetailModalProps {
    course: CertificateCourseData | null;
    isOpen: boolean;
    onClose: () => void;
    onEnroll: (course: CertificateCourseData) => void;
    isEnrolled?: boolean;
    isPending?: boolean;
}

export const CertificateCourseDetailModal: React.FC<CertificateCourseDetailModalProps> = ({
    course,
    isOpen,
    onClose,
    onEnroll,
    isEnrolled = false,
    isPending = false,
}) => {
    if (!course) return null;

    const [activeSection, setActiveSection] = useState<string>("info");

    const domainName = course.course_domain || course.domain || "";
    const credits = course.creditPoints || course.credit_points || 3;
    const totalHours = course.durationHours || course.duration_hours || 0;
    const instructorName = course.instructor_name || course.instructor || "";
    const instructorDesig = course.instructor_designation || "";
    const departmentName = course.instructor_department || "";

    // Dynamic modules auto-fetched from curriculum sections or syllabus_modules
    const modules: SyllabusModule[] = (course.syllabus_modules && Array.isArray(course.syllabus_modules) && course.syllabus_modules.length > 0)
        ? course.syllabus_modules
        : (course.course_sections && Array.isArray(course.course_sections) && course.course_sections.length > 0)
            ? course.course_sections.map((sec: any, idx: number) => ({
                module_no: sec.week_number ? `Week ${sec.week_number}` : `Module-${idx + 1}`,
                content: sec.title ? (sec.topic_name ? `${sec.title}: ${sec.topic_name}` : sec.title) : (sec.topic_name || `Module ${idx + 1}`),
                hrs: Number(sec.allocated_hours) || 4
            }))
            : [];
    const hasModules = modules.length > 0;

    // Dynamic books from database — no hardcoded fallback
    const books: string[] = (course.books_references && Array.isArray(course.books_references) && course.books_references.length > 0) ? course.books_references : [];
    const hasBooks = books.length > 0;

    const calculatedTotalHours = hasModules ? modules.reduce((acc, m) => acc + (Number(m.hrs) || 0), 0) : totalHours;

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl">
                
                {/* ── HEADER BANNER ── */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-primary text-white p-6 sm:p-8 relative shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1 max-w-2xl">
                            {domainName && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md">
                                <Sparkles className="h-3.5 w-3.5" /> Domain: {domainName}
                            </div>
                            )}
                            <h3 className="text-red-100 font-bold uppercase tracking-wider text-xs sm:text-sm pt-2">
                                Welcome to the Certificate Course
                            </h3>
                            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-tight">
                                {course.title}
                            </h1>
                            <p className="text-red-100 text-sm font-semibold flex items-center gap-2 pt-1">
                                <Award className="h-4 w-4 text-yellow-300 shrink-0" />
                                <span className="font-bold text-yellow-200">({credits} Credit Course)</span>
                            </p>
                            {instructorName && (
                            <p className="text-white/90 text-xs sm:text-sm font-medium pt-1">
                                By: <span className="font-bold underline decoration-white/40">{instructorName}</span>{instructorDesig ? `, ${instructorDesig}` : ""}
                            </p>
                            )}
                            {departmentName && (
                            <p className="text-red-200 text-xs italic">
                                (By {departmentName})
                            </p>
                            )}
                        </div>

                        {/* Domain Image / Illustration */}
                        <div className="relative shrink-0 self-center sm:self-auto">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                                <img
                                    src={course.image || course.thumbnail_url || "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format&fit=crop&q=80"}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
                                {credits} Credits
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── QUICK NAVIGATION BAR ── */}
                <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-medium">
                    {[
                        { id: "sec-info", label: "Course Information" },
                        { id: "sec-summary", label: "Course Summary" },
                        { id: "sec-outline", label: "Course Outline" },
                        { id: "sec-books", label: "Books and References" },
                        { id: "sec-instructor", label: "Instructor Biography" },
                        { id: "sec-registration", label: "Course Registration" },
                        { id: "sec-requirements", label: "Requirements to Earn a Certificate" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => scrollToSection(tab.id)}
                            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 ${
                                activeSection === tab.id
                                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── SCROLLABLE BODY ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 text-foreground">

                    {/* SECTION 1: COURSE INFORMATION */}
                    <div id="sec-info" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <BookOpen className="h-5 w-5 text-red-600" /> Course Information
                        </h2>
                        <div className="space-y-3 leading-relaxed text-sm">
                            <p>
                                <span className="font-bold text-foreground">About the Certificate Course:</span>{" "}
                                {course.description || `Details for ${course.title} will be updated by the instructor soon.`}
                            </p>
                            {(course.intended_audience) && (
                            <p>
                                <span className="font-bold text-foreground">Intended Audience:</span>{" "}
                                {course.intended_audience}
                            </p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: COURSE SUMMARY */}
                    <div id="sec-summary" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <Calendar className="h-5 w-5 text-red-600" /> Course Summary
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 border rounded-xl p-4 bg-card text-sm">
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Course Domain</span>
                                <span className="text-muted-foreground font-medium">{domainName || <span className="italic text-muted-foreground/60">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Course Status</span>
                                <span className="text-emerald-600 font-bold">{course.course_status || <span className="text-muted-foreground/60 italic font-normal">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Course Language</span>
                                <span className="text-muted-foreground font-medium">{course.course_language || <span className="italic text-muted-foreground/60">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Course Level</span>
                                <span className="text-muted-foreground font-medium">{course.course_level || <span className="italic text-muted-foreground/60">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Course Type</span>
                                <span className="text-muted-foreground font-medium">{course.course_type || <span className="italic text-muted-foreground/60">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Duration</span>
                                <span className="text-muted-foreground font-medium">{calculatedTotalHours ? `${calculatedTotalHours} Hours` : <span className="italic text-muted-foreground/60">Not set</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Credit Points</span>
                                <span className="text-primary font-bold">{credits}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Start Date</span>
                                <span className="text-muted-foreground font-medium">{course.start_date || <span className="italic text-muted-foreground/60">TBD</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">End Date</span>
                                <span className="text-muted-foreground font-medium">{course.end_date || <span className="italic text-muted-foreground/60">TBD</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Enrollment Ends</span>
                                <span className="text-muted-foreground font-medium">{course.enrollment_end_date || <span className="italic text-muted-foreground/60">TBD</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Exam Date</span>
                                <span className="text-muted-foreground font-medium">{course.exam_date || <span className="italic text-muted-foreground/60">TBD</span>}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="font-bold text-foreground">Exam Registration Ends</span>
                                <span className="text-muted-foreground font-medium">{course.exam_reg_end_date || <span className="italic text-muted-foreground/60">TBD</span>}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: COURSE OUTLINE */}
                    <div id="sec-outline" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <FileText className="h-5 w-5 text-red-600" /> Course Outline
                        </h2>
                        {hasModules ? (
                        <div className="overflow-hidden border rounded-xl bg-card shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-foreground font-bold border-b">
                                    <tr>
                                        <th className="p-3 border-r w-32">Module No.</th>
                                        <th className="p-3 border-r">Content</th>
                                        <th className="p-3 w-36 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center justify-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-red-600" /> Time Required
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {modules.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3 border-r font-bold text-primary font-mono whitespace-nowrap">
                                                {m.module_no}
                                            </td>
                                            <td className="p-3 border-r font-medium text-foreground">
                                                {m.content}
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold text-primary whitespace-nowrap">
                                                {m.hrs} {Number(m.hrs) === 1 ? 'hr' : 'hrs'}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-muted/60 font-bold border-t">
                                        <td colSpan={2} className="p-3 text-right border-r uppercase tracking-wider text-xs">
                                            Total Completion Time
                                        </td>
                                        <td className="p-3 text-center font-mono text-base font-extrabold text-red-600 whitespace-nowrap">
                                            {calculatedTotalHours} hrs
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        ) : (
                        <div className="p-6 rounded-xl border bg-muted/20 text-center">
                            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground italic">Course syllabus modules will be updated by the instructor.</p>
                        </div>
                        )}
                    </div>

                    {/* SECTION 4: BOOKS AND REFERENCES */}
                    <div id="sec-books" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <GraduationCap className="h-5 w-5 text-red-600" /> Books and References
                        </h2>
                        {hasBooks ? (
                        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground bg-muted/20 p-4 rounded-xl border">
                            {books.map((b, idx) => (
                                <li key={idx} className="leading-relaxed font-medium">
                                    {b}
                                </li>
                            ))}
                        </ol>
                        ) : (
                        <div className="p-6 rounded-xl border bg-muted/20 text-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground italic">Books and references will be updated by the instructor.</p>
                        </div>
                        )}
                    </div>

                    {/* SECTION 5: INSTRUCTOR BIOGRAPHY */}
                    <div id="sec-instructor" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <UserCheck className="h-5 w-5 text-red-600" /> Instructor Biography
                        </h2>
                        <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                {(course.instructor_photo_url || course.instructorAvatar) && (
                                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-primary shadow shrink-0">
                                    <img
                                        src={course.instructor_photo_url || course.instructorAvatar}
                                        alt={instructorName}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                )}
                                <div className="space-y-1 text-center sm:text-left flex-1">
                                    <h3 className="text-lg font-bold text-foreground">{instructorName || <span className="italic text-muted-foreground/60">Instructor name not set</span>}</h3>
                                    {instructorDesig && <p className="text-xs font-semibold text-primary">{instructorDesig}</p>}
                                    {departmentName && <p className="text-xs text-muted-foreground">{departmentName}</p>}
                                    {course.instructorEmail && (
                                        <p className="text-xs text-muted-foreground pt-1">📧 {course.instructorEmail}</p>
                                    )}
                                </div>
                            </div>

                            {course.instructor_intro && (
                            <p className="text-sm leading-relaxed text-muted-foreground bg-muted/30 p-4 rounded-xl border">
                                {course.instructor_intro}
                            </p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 6: COURSE REGISTRATION */}
                    <div id="sec-registration" className="space-y-4 scroll-mt-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <CheckCircle2 className="h-5 w-5 text-red-600" /> Course Registration
                        </h2>
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-primary/20 space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-base text-foreground">Ready to start this Certificate Course?</h3>
                                <p className="text-xs text-muted-foreground">
                                    {course.enrollment_end_date ? <>Enroll before <span className="font-bold text-foreground">{course.enrollment_end_date}</span> to reserve your seat and access all lectures, assignments, and exam certification.</> : <>Enroll now to reserve your seat and access all lectures, assignments, and exam certification.</>}
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="gap-2 font-bold shadow-lg bg-red-600 hover:bg-red-700 text-white shrink-0"
                                onClick={() => onEnroll(course)}
                            >
                                <GraduationCap className="h-5 w-5" /> Register / Enroll Now
                            </Button>
                        </div>
                    </div>

                    {/* SECTION 7: REQUIREMENTS TO EARN A CERTIFICATE */}
                    <div id="sec-requirements" className="space-y-4 scroll-mt-6 pb-6">
                        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                            <ShieldCheck className="h-5 w-5 text-red-600" /> Requirements to Earn a Certificate
                        </h2>

                        <div className="space-y-6 text-sm">
                            {/* Assessment Break-Up Table */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-foreground text-sm">Assessment Break-Up:</h3>
                                <div className="overflow-hidden border rounded-xl bg-card">
                                    <table className="w-full text-center text-xs sm:text-sm">
                                        <thead className="bg-muted text-foreground font-bold border-b">
                                            <tr>
                                                <th className="p-3 border-r">Internal Assessment/ Assignment Marks</th>
                                                <th className="p-3 border-r">External Assessment Marks</th>
                                                <th className="p-3">Total Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="font-mono font-bold text-foreground">
                                                <td className="p-3 border-r">{course.assessment_internal_marks || 30}</td>
                                                <td className="p-3 border-r">{course.assessment_external_marks || 70}</td>
                                                <td className="p-3 text-primary">{course.assessment_total_marks || 100}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Minimum Passing Marks Table */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-foreground text-sm">Minimum Passing Marks for declaring a candidate Pass:</h3>
                                <div className="overflow-hidden border rounded-xl bg-card">
                                    <table className="w-full text-center text-xs sm:text-sm">
                                        <thead className="bg-muted text-foreground font-bold border-b">
                                            <tr>
                                                <th colSpan={3} className="p-2 border-b text-center text-xs uppercase tracking-wider text-muted-foreground">
                                                    Minimum Passing Marks
                                                </th>
                                            </tr>
                                            <tr>
                                                <th className="p-3 border-r">Internal Assessment/ Assignment</th>
                                                <th className="p-3 border-r">External Assessment</th>
                                                <th className="p-3">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="font-mono font-bold text-foreground">
                                                <td className="p-3 border-r">
                                                    {course.min_pass_internal_pct || 40}% ({course.min_pass_internal_marks || 12} marks)
                                                </td>
                                                <td className="p-3 border-r">
                                                    {course.min_pass_external_pct || 40}% ({course.min_pass_external_marks || 28} marks)
                                                </td>
                                                <td className="p-3 text-emerald-600 font-extrabold">
                                                    {course.min_pass_total_pct || 50}% ({course.min_pass_total_marks || 50} marks)
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── FOOTER ACTIONS ── */}
                <div className="p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-muted-foreground text-center sm:text-left">
                        Status: <span className="font-bold text-foreground">{isEnrolled ? "Enrolled Student" : isPending ? "Verification Pending" : "Registration Open"}</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Close
                        </Button>
                        {isEnrolled ? (
                            <Button size="sm" className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onEnroll(course)}>
                                <PlayCircle className="h-4 w-4" /> Go to Course Player
                            </Button>
                        ) : (
                            <Button size="sm" className="gap-2 font-bold bg-red-600 hover:bg-red-700 text-white shadow" onClick={() => onEnroll(course)}>
                                <GraduationCap className="h-4 w-4" /> Enroll Now
                            </Button>
                        )}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
};
