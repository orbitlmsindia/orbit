import { useEffect, useState } from "react";
import { getTopicRelatedThumbnail } from "@/lib/thumbnailUtils";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { CertificateCourseDetailModal } from "@/components/courses/CertificateCourseDetailModal";
import { CourseAchievementsModal } from "@/components/gamification/CourseAchievementsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Search,
    Users,
    BookOpen,
    Loader2,
    PlayCircle,
    Layers,
    Code,
    Brain,
    Shield,
    Cloud,
    Palette,
    Sparkles,
    User,
    Building2,
    FileText,
    CheckCircle2,
    Info,
    Lock,
    Video,
    HelpCircle,
    GraduationCap,
    Clock,
    Award,
    ShieldCheck,
    Globe,
    ExternalLink,
    IndianRupee,
    Ticket,
    Tag,
    Trophy,
    Lightbulb
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Video Embed Helper (YouTube, Google Drive, Direct Video)
const getEmbeddableVideoUrl = (url: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be/')) {
        let videoId = "";
        if (trimmed.includes('youtu.be/')) {
            videoId = trimmed.split('youtu.be/')[1]?.split('?')[0] || "";
        } else {
            const match = trimmed.match(/[?&]v=([^&]+)/);
            if (match && match[1]) videoId = match[1];
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmed.includes('drive.google.com')) {
        const driveId = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
        if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
    }
    return trimmed;
};

// Domain Preset Icons Helper
const getDomainIcon = (domainName: string) => {
    const d = domainName.toLowerCase();
    if (d.includes("code") || d.includes("software") || d.includes("programming") || d.includes("dev")) return Code;
    if (d.includes("ai") || d.includes("data") || d.includes("science") || d.includes("machine")) return Brain;
    if (d.includes("cyber") || d.includes("security")) return Shield;
    if (d.includes("cloud") || d.includes("devops")) return Cloud;
    if (d.includes("design") || d.includes("ui") || d.includes("ux")) return Palette;
    return Sparkles;
};

export default function StudentCourses() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [certPrograms, setCertPrograms] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDomain, setSelectedDomain] = useState<string>("All Domains");

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        const searchParam = searchParams.get("search");
        if (tabParam === "programs") {
            setActiveTab("programs");
        }
        if (searchParam) {
            setSearchTerm(searchParam);
        }
    }, [searchParams]);
    const [enrolledCourseStatus, setEnrolledCourseStatus] = useState<Record<string, string>>({});

    // New Swap View & Filters State
    const [activeTab, setActiveTab] = useState<"solo" | "programs">("solo");
    const [creditFilter, setCreditFilter] = useState<string>("all");
    const [weeklyFilter, setWeeklyFilter] = useState<string>("all");
    const [selectedInstructor, setSelectedInstructor] = useState<string>("all");
    const [selectedOrganization, setSelectedOrganization] = useState<string>("all");
    const [selectedProgramForPreview, setSelectedProgramForPreview] = useState<any | null>(null);
    const [selectedAchievementCourse, setSelectedAchievementCourse] = useState<{ id: string; title: string } | null>(null);

    // Course Overview Preview Modal State
    const [selectedCourseForPreview, setSelectedCourseForPreview] = useState<any | null>(null);
    const [previewCurriculum, setPreviewCurriculum] = useState<any[]>([]);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);

    // Payment / Enrollment Dialog State
    const [enrollmentDialog, setEnrollmentDialog] = useState<{
        isOpen: boolean;
        courseId: string | null;
        courseName: string | null;
        coursePrice: number;
        collegeId?: string | null;
    }>({ isOpen: false, courseId: null, courseName: null, coursePrice: 0, collegeId: null });
    const [transactionId, setTransactionId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Coupon State
    const [couponCode, setCouponCode] = useState("");
    const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; type: string; value: number } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: myEnrollments } = await supabase
                    .from('enrollments')
                    .select('course_id, status')
                    .eq('student_id', user.id);

                const statusMap: Record<string, string> = {};
                myEnrollments?.forEach((e: any) => {
                    statusMap[e.course_id] = e.status || 'approved';
                });
                setEnrolledCourseStatus(statusMap);
            }

            // Fetch published courses with sections and content counts to calculate exact modules and hours
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    id,
                    title,
                    description,
                    domain,
                    credit_points,
                    objectives,
                    instructions,
                    instructor_intro,
                    exam_policy,
                    instructor_video_url,
                    instructor_qualifications,
                    instructor_socials,
                    thumbnail_url,
                    teacher_id,
                    price,
                    original_price,
                    currency,
                    organization_name,
                    organization_logo_url,
                    course_domain,
                    course_status,
                    course_language,
                    course_level,
                    course_type,
                    intended_audience,
                    duration_hours,
                    start_date,
                    end_date,
                    enrollment_end_date,
                    exam_date,
                    exam_reg_end_date,
                    books_references,
                    syllabus_modules,
                    assessment_internal_marks,
                    assessment_external_marks,
                    assessment_total_marks,
                    min_pass_internal_pct,
                    min_pass_internal_marks,
                    min_pass_external_pct,
                    min_pass_external_marks,
                    min_pass_total_pct,
                    min_pass_total_marks,
                    instructor_name,
                    instructor_designation,
                    instructor_department,
                    instructor_photo_url,
                    teacher:users!teacher_id(full_name, email, avatar_url, role),
                    enrollments(count),
                    course_sections(id, title, order_index, week_number, allocated_hours, topic_name, section_contents(id))
                `)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (coursesError) {
                console.warn("Error querying courses table:", coursesError.message);
            }

            let formatted: any[] = [];
            if (coursesData && coursesData.length > 0) {
                formatted = coursesData.map((c: any) => {
                    const explicitWeeks = c.duration_weeks;
                    const credits = c.credit_points || 3;
                    const sections = c.course_sections || [];
                    const secCount = sections.length;
                    const totalLessons = sections.reduce((acc: number, sec: any) => acc + (sec.section_contents?.length || 0), 0);

                    const modules = secCount > 0 ? secCount : Math.max(4, credits * 2);
                    const weeks = (explicitWeeks && Number(explicitWeeks) > 0) ? Number(explicitWeeks) : modules;
                    const hours = (c.duration_hours && Number(c.duration_hours) > 0) ? Number(c.duration_hours) : (totalLessons > 0 ? Math.round(totalLessons * 1.5) : (weeks * 4));

                    const savedInst = localStorage.getItem("orbit_institute_settings");
                    const defaultInst = savedInst ? JSON.parse(savedInst) : {};

                    // Auto-derive syllabus modules from curriculum sections if not explicitly set
                    const autoSyllabusModules = (c.syllabus_modules && Array.isArray(c.syllabus_modules) && c.syllabus_modules.length > 0)
                        ? c.syllabus_modules
                        : (sections && sections.length > 0)
                            ? sections.map((sec: any, idx: number) => ({
                                module_no: sec.week_number ? `Week ${sec.week_number}` : `Module-${idx + 1}`,
                                content: sec.title ? (sec.topic_name ? `${sec.title}: ${sec.topic_name}` : sec.title) : (sec.topic_name || `Module ${idx + 1}`),
                                hrs: Number(sec.allocated_hours) || 4
                            }))
                            : [];

                    return {
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        domain: c.domain || "Software Engineering",
                        creditPoints: credits,
                        totalModules: modules,
                        durationWeeks: weeks,
                        durationHours: hours,
                        objectives: c.objectives,
                        instructions: c.instructions,
                        instructor_intro: c.instructor_intro,
                        exam_policy: c.exam_policy,
                        instructor_video_url: c.instructor_video_url,
                        instructor_qualifications: c.instructor_qualifications,
                        instructor_socials: c.instructor_socials,
                        instructor: c.teacher?.full_name || "Course Instructor",
                        instructorEmail: c.teacher?.email || "",
                        instructorAvatar: c.teacher?.avatar_url,
                        students: c.enrollments?.[0]?.count || 0,
                        image: c.thumbnail_url || getTopicRelatedThumbnail(c.title, c.id),
                        price: parseFloat(c.price) || 0,
                        original_price: parseFloat(c.original_price) || 0,
                        currency: c.currency || 'INR',
                        organization_name: c.organization_name?.trim() || defaultInst.name || 'Orbit LMS Innovation Academy',
                        organization_logo_url: c.organization_logo_url?.trim() || defaultInst.logoUrl || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
                        teacher_id: c.teacher_id,
                        course_sections: sections,
                        
                        // Pass along all dynamic certificate fields
                        course_domain: c.course_domain,
                        course_status: c.course_status,
                        course_language: c.course_language,
                        course_level: c.course_level,
                        course_type: c.course_type,
                        intended_audience: c.intended_audience,
                        duration_hours: c.duration_hours,
                        start_date: c.start_date,
                        end_date: c.end_date,
                        enrollment_end_date: c.enrollment_end_date,
                        exam_date: c.exam_date,
                        exam_reg_end_date: c.exam_reg_end_date,
                        books_references: c.books_references,
                        syllabus_modules: autoSyllabusModules,
                        assessment_internal_marks: c.assessment_internal_marks,
                        assessment_external_marks: c.assessment_external_marks,
                        assessment_total_marks: c.assessment_total_marks,
                        min_pass_internal_pct: c.min_pass_internal_pct,
                        min_pass_internal_marks: c.min_pass_internal_marks,
                        min_pass_external_pct: c.min_pass_external_pct,
                        min_pass_external_marks: c.min_pass_external_marks,
                        min_pass_total_pct: c.min_pass_total_pct,
                        min_pass_total_marks: c.min_pass_total_marks,
                        instructor_name: c.instructor_name,
                        instructor_designation: c.instructor_designation,
                        instructor_department: c.instructor_department,
                        instructor_photo_url: c.instructor_photo_url
                    };
                });
            }

            setCourses(formatted);

            // Fetch Certificate Programs from Database if present
            try {
                const { data: progsData } = await supabase
                    .from('certificate_programs')
                    .select(`
                        id,
                        title,
                        description,
                        total_credits,
                        created_at,
                        program_courses(
                            id,
                            course:courses(id, title, domain, credit_points, thumbnail_url, course_sections(id, section_contents(id)))
                        )
                    `);

                if (progsData && progsData.length > 0) {
                    const formattedProgs = progsData.map((p: any) => {
                        const included = (p.program_courses || []).map((pc: any) => pc.course).filter(Boolean);
                        const dom = included[0]?.domain || "Software Engineering";
                        const totalCreds = p.total_credits || (included.reduce((sum: number, ic: any) => sum + (ic.credit_points || 3), 0) || 20);

                        // Calculate total weeks, modules, and hours from all bundled courses
                        let calcWeeks = 0;
                        let calcModules = 0;
                        let calcHours = 0;

                        if (included.length > 0) {
                            included.forEach((ic: any) => {
                                const secs = ic.course_sections || [];
                                const secCnt = secs.length > 0 ? secs.length : 4;
                                const lesCnt = secs.reduce((sum: number, s: any) => sum + (s.section_contents?.length || 0), 0) || (secCnt * 2);
                                calcModules += secCnt;
                                calcWeeks += secCnt;
                                calcHours += Math.round(lesCnt * 1.5);
                            });
                        } else {
                            calcWeeks = Math.max(12, Math.ceil(totalCreds * 0.75));
                            calcModules = Math.ceil(totalCreds * 0.85);
                            calcHours = calcWeeks * 4;
                        }

                        return {
                            id: p.id,
                            title: p.title,
                            description: p.description || "Official Domain Certification Program bundled with academic credit requirements.",
                            domain: dom,
                            totalCredits: totalCreds,
                            durationWeeks: calcWeeks,
                            totalModules: calcModules,
                            totalHours: calcHours,
                            includedCourses: included.length > 0 ? included : [
                                { title: "Core Fundamentals & Architecture", credit_points: 4 },
                                { title: "Advanced Practical Engineering", credit_points: 4 },
                                { title: "Cloud Systems & Security", credit_points: 4 },
                                { title: "Capstone Project & Mastery", credit_points: 4 }
                            ],
                            image: included[0]?.thumbnail_url || getTopicRelatedThumbnail(p.title, p.id)
                        };
                    });
                    setCertPrograms(formattedProgs);
                } else {
                    setCertPrograms([]);
                }
            } catch (certErr) {
                console.warn("Could not load certPrograms from DB, using defaults:", certErr);
                setCertPrograms([]);
            }

        } catch (error) {
            console.error("Error in fetchCourses:", error);
        } finally {
            setLoading(false);
        }
    };

    // Open Course Preview Modal & Fetch Modules / Curriculum
    const handleOpenPreviewModal = async (course: any) => {
        setSelectedCourseForPreview(course);
        setLoadingCurriculum(true);
        setPreviewCurriculum([]);

        try {
            const { data: sectionsData, error } = await supabase
                .from('course_sections')
                .select(`
                    id, title, order_index,
                    items:section_contents(id, title, video_url, pdf_url, content_text, order_index, created_at),
                    assignments(id, title, type, created_at)
                `)
                .eq('course_id', course.id)
                .order('order_index', { ascending: true });

            if (error) throw error;

            const sortedSections = (sectionsData || []).map((s: any) => {
                const contents = s.items?.map((i: any) => ({ ...i, itemType: 'content' })) || [];
                const assigns = s.assignments?.map((a: any) => ({ ...a, itemType: 'assignment' })) || [];
                const allItems = [...contents, ...assigns].sort((a: any, b: any) => {
                    if (a.order_index !== undefined && b.order_index !== undefined) return a.order_index - b.order_index;
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });
                return { ...s, items: allItems };
            });

            setPreviewCurriculum(sortedSections);
        } catch (err) {
            console.error("Error loading course curriculum preview:", err);
        } finally {
            setLoadingCurriculum(false);
        }
    };

    const handleEnrollClick = (course: any) => {
        setEnrollmentDialog({
            isOpen: true,
            courseId: course.id,
            courseName: course.title,
            coursePrice: course.price || 0,
            collegeId: course.college_id || null,
        });
        setTransactionId("");
        setCouponCode("");
        setCouponApplied(null);
        setCouponError("");
    };

    // Coupon validation
    // Coupon validation with active/disabled checking, institution isolation, max uses limit and local fallback
    const handleApplyCoupon = async () => {
        const cleanCode = couponCode.toUpperCase().trim();
        if (!cleanCode) {
            setCouponError("Please enter a coupon code.");
            return;
        }
        try {
            setCouponLoading(true);
            setCouponError("");
            setCouponApplied(null);

            let coupon: any = null;

            // 1. First try Supabase query
            try {
                const { data, error } = await supabase
                    .from('coupons')
                    .select('*')
                    .eq('code', cleanCode)
                    .maybeSingle();

                if (!error && data) {
                    coupon = data;
                }
            } catch (e) {
                console.warn("Supabase coupon lookup error, checking local storage:", e);
            }

            // 2. Fallback to localStorage orbit_coupons
            if (!coupon) {
                const localStr = localStorage.getItem("orbit_coupons");
                if (localStr) {
                    try {
                        const localList = JSON.parse(localStr);
                        coupon = localList.find((c: any) => c.code.toUpperCase().trim() === cleanCode);
                    } catch (e) {}
                }
            }

            if (!coupon) {
                setCouponError("Invalid coupon code. Please verify the code.");
                return;
            }

            // Extract institution scope if encoded in description
            if (!coupon.college_id && coupon.description) {
                const match = coupon.description.match(/\[(INST|COLLEGE):([^\]]+)\]/);
                if (match) {
                    coupon.college_id = match[2];
                }
            }

            // Check if coupon has been disabled by Administrator
            if (coupon.is_active === false) {
                setCouponError("This coupon has been disabled by the administrator.");
                return;
            }

            // Check expiry
            if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
                setCouponError("This coupon has expired.");
                return;
            }

            // Check max uses limit (Limit of usage)
            if (coupon.max_uses !== null && coupon.max_uses !== undefined && Number(coupon.max_uses) > 0 && (coupon.used_count || 0) >= Number(coupon.max_uses)) {
                setCouponError(`This coupon has reached its maximum usage limit of ${coupon.max_uses} redemptions.`);
                return;
            }

            // Check course-specific restriction
            if (coupon.course_id && coupon.course_id !== enrollmentDialog.courseId) {
                setCouponError("This coupon is not valid for this course.");
                return;
            }

            // Check institution-specific coupon restriction
            if (coupon.college_id) {
                const courseCollege = enrollmentDialog.collegeId;
                if (courseCollege && coupon.college_id !== courseCollege) {
                    setCouponError("This coupon code is valid only for a specific institution.");
                    return;
                }
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser) {
                    const { data: userProfile } = await supabase
                        .from('users')
                        .select('college_id')
                        .eq('id', currentUser.id)
                        .maybeSingle();
                    if (userProfile?.college_id && userProfile.college_id !== coupon.college_id) {
                        setCouponError("This coupon code is valid only for students of a specific institution.");
                        return;
                    }
                }
            }

            // Check min purchase
            if (coupon.min_purchase > 0 && enrollmentDialog.coursePrice < coupon.min_purchase) {
                setCouponError(`Minimum purchase of ₹${coupon.min_purchase} required for this coupon.`);
                return;
            }

            // Check if student already used this coupon for this course
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                try {
                    const { data: usage } = await supabase
                        .from('coupon_usage')
                        .select('id')
                        .eq('coupon_id', coupon.id)
                        .eq('student_id', user.id)
                        .eq('course_id', enrollmentDialog.courseId)
                        .maybeSingle();
                    if (usage) {
                        setCouponError("You have already used this coupon for this course.");
                        return;
                    }
                } catch (e) {}
            }

            // Calculate discount
            let discount = 0;
            if (coupon.discount_type === 'percentage') {
                discount = Math.round((enrollmentDialog.coursePrice * Number(coupon.discount_value)) / 100);
            } else {
                discount = Math.min(Number(coupon.discount_value), enrollmentDialog.coursePrice);
            }

            setCouponApplied({
                code: coupon.code,
                discount,
                type: coupon.discount_type,
                value: Number(coupon.discount_value)
            });

        } catch (err: any) {
            setCouponError(err.message || "Error validating coupon.");
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponApplied(null);
        setCouponCode("");
        setCouponError("");
    };

    const handleConfirmEnrollment = async () => {
        const isFree = enrollmentDialog.coursePrice <= 0 || (couponApplied && couponApplied.discount >= enrollmentDialog.coursePrice);
        if (!isFree && !transactionId.trim()) {
            toast({ variant: "destructive", title: "Transaction ID Required", description: "Please enter your UPI / Reference Transaction ID." });
            return;
        }

        try {
            setIsSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingEnrollment } = await supabase
                .from('enrollments')
                .select('id, status')
                .eq('student_id', user.id)
                .eq('course_id', enrollmentDialog.courseId)
                .maybeSingle();

            if (existingEnrollment) {
                toast({ title: "Already Enrolled", description: "You already have an enrollment record for this course." });
                setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: existingEnrollment.status || 'approved' }));
                setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null, coursePrice: 0 });
                return;
            }

            const enrollmentStatus = isFree ? 'approved' : 'pending';
            const finalTxnId = isFree ? (transactionId.trim() || 'FREE_ENROLLMENT') : transactionId.trim();

            const { data: insertedEnrollment, error } = await supabase
                .from('enrollments')
                .insert([{
                    student_id: user.id,
                    course_id: enrollmentDialog.courseId,
                    transaction_id: finalTxnId,
                    status: enrollmentStatus
                }])
                .select('id')
                .single();

            if (error) throw error;

            // Notify Teacher & Admin in real-time
            try {
                const { data: courseInfo } = await supabase
                    .from('courses')
                    .select('id, title, teacher_id')
                    .eq('id', enrollmentDialog.courseId)
                    .maybeSingle();

                const { data: studentInfo } = await supabase
                    .from('users')
                    .select('full_name, email')
                    .eq('id', user.id)
                    .maybeSingle();

                const studentName = studentInfo?.full_name || user.user_metadata?.full_name || user.email || 'A student';
                const courseTitle = courseInfo?.title || enrollmentDialog.courseName || 'Course';

                const notifRows: any[] = [];
                if (courseInfo?.teacher_id) {
                    notifRows.push({
                        user_id: courseInfo.teacher_id,
                        title: isFree ? "Student Enrolled (Free Course)" : "New Student Enrollment Verification",
                        message: isFree 
                            ? `${studentName} has enrolled in your free course: ${courseTitle}.` 
                            : `${studentName} has enrolled in your course: ${courseTitle} (Txn: ${finalTxnId}). Review & Approve.`,
                        notification_type: "course",
                        sender_role: "student",
                        is_read: false,
                        course_id: enrollmentDialog.courseId,
                        enrollment_id: insertedEnrollment?.id || null
                    });
                }

                // Notify all Administrators
                const { data: adminUsers } = await supabase
                    .from('users')
                    .select('id')
                    .in('role', ['admin', 'super_admin', 'master_admin']);

                if (adminUsers && adminUsers.length > 0) {
                    adminUsers.forEach((adm: any) => {
                        if (adm.id !== courseInfo?.teacher_id) {
                            notifRows.push({
                                user_id: adm.id,
                                title: isFree ? "New Free Course Enrollment" : "New Student Enrollment",
                                message: isFree
                                    ? `${studentName} enrolled in free course: ${courseTitle}.`
                                    : `${studentName} has enrolled in course: ${courseTitle} (Txn: ${finalTxnId}). Approval required.`,
                                notification_type: "course",
                                sender_role: "student",
                                is_read: false,
                                course_id: enrollmentDialog.courseId,
                                enrollment_id: insertedEnrollment?.id || null
                            });
                        }
                    });
                }

                if (notifRows.length > 0) {
                    await supabase.from('notifications').insert(notifRows);
                }
            } catch (notifErr) {
                console.warn("Could not dispatch client-side notification:", notifErr);
            }

            // Track coupon usage if coupon was applied
            if (couponApplied) {
                try {
                    const { data: couponData } = await supabase
                        .from('coupons')
                        .select('id, used_count')
                        .eq('code', couponApplied.code)
                        .maybeSingle();

                    if (couponData) {
                        await supabase.from('coupon_usage').insert([{
                            coupon_id: couponData.id,
                            student_id: user.id,
                            course_id: enrollmentDialog.courseId,
                            discount_applied: couponApplied.discount
                        }]);

                        await supabase
                            .from('coupons')
                            .update({ used_count: (couponData.used_count || 0) + 1 })
                            .eq('id', couponData.id);
                    }
                    // Update local storage orbit_coupons
                    try {
                        const localStr = localStorage.getItem("orbit_coupons");
                        if (localStr) {
                            const list = JSON.parse(localStr);
                            const updated = list.map((c: any) => 
                                c.code.toUpperCase().trim() === couponApplied.code.toUpperCase().trim() 
                                    ? { ...c, used_count: (c.used_count || 0) + 1 } 
                                    : c
                            );
                            localStorage.setItem("orbit_coupons", JSON.stringify(updated));
                        }
                    } catch (e) {}
                } catch (cErr) {
                    console.error("Error recording coupon usage:", cErr);
                }
            }

            if (isFree) {
                toast({
                    title: "Enrollment Successful! 🎉",
                    description: `You are now enrolled in ${enrollmentDialog.courseName || 'the course'}. Start learning immediately!`
                });
                setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: 'approved' }));
            } else {
                toast({
                    title: "Enrollment Submitted!",
                    description: "Your payment reference has been submitted. Course access will be granted once verified."
                });
                setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: 'pending' }));
            }

            setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null, coursePrice: 0 });

            // Close preview modal as well if open for the same course
            if (selectedCourseForPreview?.id === enrollmentDialog.courseId) {
                setSelectedCourseForPreview(null);
            }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Enrollment Failed", description: error.message || "An error occurred during enrollment." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate unique domains and course counts
    const domainCounts: Record<string, number> = {};
    courses.forEach(c => {
        const d = c.domain || "Software Engineering";
        domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    const uniqueDomains = Object.keys(domainCounts);

    const uniqueInstructors = Array.from(new Set(courses.map(c => c.instructor).filter(Boolean)));
    const uniqueOrganizations = Array.from(new Set(
        courses.flatMap(c => [
            c.organization_name,
            c.instructorOrganization,
            ...(c.partnerOrganizations || [])
        ]).filter(Boolean)
    ));

    const filteredCourses = courses.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.instructor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.organization_name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDomain = selectedDomain === "All Domains" || (c.domain || "Software Engineering") === selectedDomain;
        const matchesInstructor = selectedInstructor === "all" || c.instructor === selectedInstructor;
        const matchesOrg = selectedOrganization === "all" ||
            (c.organization_name === selectedOrganization) ||
            (c.instructorOrganization === selectedOrganization) ||
            ((c.partnerOrganizations || []).includes(selectedOrganization));

        let matchesCredit = true;
        if (creditFilter === "1-2") matchesCredit = c.creditPoints >= 1 && c.creditPoints <= 2;
        else if (creditFilter === "3-4") matchesCredit = c.creditPoints >= 3 && c.creditPoints <= 4;
        else if (creditFilter === "5+") matchesCredit = c.creditPoints >= 5;

        let matchesWeekly = true;
        if (weeklyFilter === "1-4") matchesWeekly = c.durationWeeks >= 1 && c.durationWeeks <= 4;
        else if (weeklyFilter === "5-8") matchesWeekly = c.durationWeeks >= 5 && c.durationWeeks <= 8;
        else if (weeklyFilter === "9-12") matchesWeekly = c.durationWeeks >= 9 && c.durationWeeks <= 12;
        else if (weeklyFilter === "12+") matchesWeekly = c.durationWeeks >= 12;

        return matchesSearch && matchesDomain && matchesInstructor && matchesOrg && matchesCredit && matchesWeekly;
    });

    const filteredCertPrograms = certPrograms.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDomain = selectedDomain === "All Domains" || p.domain === selectedDomain;

        let matchesCredit = true;
        if (creditFilter === "1-2") matchesCredit = p.totalCredits >= 1 && p.totalCredits <= 2;
        else if (creditFilter === "3-4") matchesCredit = p.totalCredits >= 3 && p.totalCredits <= 4;
        else if (creditFilter === "5+") matchesCredit = p.totalCredits >= 5;

        let matchesWeekly = true;
        if (weeklyFilter === "1-4") matchesWeekly = p.durationWeeks >= 1 && p.durationWeeks <= 4;
        else if (weeklyFilter === "5-8") matchesWeekly = p.durationWeeks >= 5 && p.durationWeeks <= 8;
        else if (weeklyFilter === "9-12") matchesWeekly = p.durationWeeks >= 9 && p.durationWeeks <= 12;
        else if (weeklyFilter === "12+") matchesWeekly = p.durationWeeks >= 12;

        return matchesSearch && matchesDomain && matchesCredit && matchesWeekly;
    });

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            {/* Header Title */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between animate-fade-in mb-4">
                <div>
                    <h1 className="text-3xl font-display font-bold tracking-tight">Course Discovery & Catalog</h1>
                    <p className="text-muted-foreground">Explore domain pathways, inspect detailed course syllabi, and enroll in your next learning journey.</p>
                </div>
            </div>

            {/* Academic Credit & Domain Certification Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-primary/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <Award className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                            Academic Credit Policy & 20-Credit Certification Pathway
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Earn Academic Credits for completing courses. Mix and complete courses in your chosen Domain — reach <strong>20 Credits</strong> to earn an official <strong>Domain Mastery Certification</strong>!
                        </p>
                    </div>
                </div>
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-mono shrink-0 py-1.5 px-3">
                    🎓 20 Domain Credits = Certificate
                </Badge>
            </div>

            {/* VIEW SWAP CONTROL: SOLO COURSES VS CERTIFICATION PROGRAMS */}
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-card border border-border shadow-xs animate-fade-in">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab("solo")}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === "solo"
                                ? "bg-primary text-primary-foreground shadow-md scale-[1.01]"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        Solo Courses
                        <Badge variant={activeTab === "solo" ? "secondary" : "outline"} className="text-[10px] px-2 py-0.5">
                            {courses.length}
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("programs")}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === "programs"
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-[1.01]"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Award className="h-4 w-4 text-amber-300" />
                        Certification Programs
                        <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] px-2 py-0.5">
                            {certPrograms.length} Pathways
                        </Badge>
                    </button>
                </div>

                <div className="text-xs text-muted-foreground font-medium hidden md:block pr-3">
                    {activeTab === "solo" ? "✨ Browsing individual credit courses" : "📜 Browsing multi-course domain mastery certifications"}
                </div>
            </div>

            {/* DOMAINS FIRST SECTION */}
            <div className="mb-8 animate-fade-in delay-75">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold font-display">Explore Learning Domains</h2>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                        {activeTab === "solo" ? `${courses.length} total courses` : `${certPrograms.length} total certification pathways`}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <button
                        type="button"
                        onClick={() => setSelectedDomain("All Domains")}
                        className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            selectedDomain === "All Domains"
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                                : "bg-card border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <GraduationCap className={`h-5 w-5 ${selectedDomain === "All Domains" ? "text-primary-foreground" : "text-primary"}`} />
                            <Badge variant={selectedDomain === "All Domains" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                                {activeTab === "solo" ? courses.length : certPrograms.length}
                            </Badge>
                        </div>
                        <div>
                            <p className="font-bold text-xs line-clamp-1">All Domains</p>
                            <p className="text-[10px] opacity-80 mt-0.5">Browse all</p>
                        </div>
                    </button>

                    {uniqueDomains.map(domain => {
                        const IconComponent = getDomainIcon(domain);
                        const count = domainCounts[domain] || 0;
                        const isSelected = selectedDomain === domain;

                        return (
                            <button
                                key={domain}
                                type="button"
                                onClick={() => setSelectedDomain(domain)}
                                className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/30"
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <IconComponent className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                                    <Badge variant={isSelected ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                                        {count}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="font-bold text-xs line-clamp-1">{domain}</p>
                                    <p className="text-[10px] opacity-80 mt-0.5">{count} {count === 1 ? "Course" : "Courses"}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SEARCH & DYNAMIC FILTER BAR (Credit Filter & Weekly Duration Filter) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 animate-fade-in delay-100">
                {/* Search Box */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={activeTab === "solo" ? `Search solo courses in ${selectedDomain}...` : `Search certification pathways in ${selectedDomain}...`}
                        className="pl-10 text-xs bg-card"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Controls: Credit Points & Weekly Duration */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    {/* Credit-Based Filter */}
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl shrink-0">
                        <Award className="h-4 w-4 text-purple-500" />
                        <select
                            value={creditFilter}
                            onChange={(e) => setCreditFilter(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-background">🎓 All Credits</option>
                            <option value="1-2" className="bg-background">🎓 1 - 2 Credits</option>
                            <option value="3-4" className="bg-background">🎓 3 - 4 Credits</option>
                            <option value="5+" className="bg-background">🎓 5+ Credits</option>
                        </select>
                    </div>

                    {/* Weekly Duration Filter */}
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl shrink-0">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <select
                            value={weeklyFilter}
                            onChange={(e) => setWeeklyFilter(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-background">⏱️ All Durations</option>
                            <option value="1-4" className="bg-background">⏱️ 1 - 4 Weeks</option>
                            <option value="5-8" className="bg-background">⏱️ 5 - 8 Weeks</option>
                            <option value="9-12" className="bg-background">⏱️ 9 - 12 Weeks</option>
                            <option value="12+" className="bg-background">⏱️ 12+ Weeks</option>
                        </select>
                    </div>

                    {/* Instructor Filter */}
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl shrink-0">
                        <User className="h-4 w-4 text-emerald-500" />
                        <select
                            value={selectedInstructor}
                            onChange={(e) => setSelectedInstructor(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer max-w-[150px]"
                        >
                            <option value="all" className="bg-background">👨‍🏫 All Instructors</option>
                            {uniqueInstructors.map(inst => (
                                <option key={inst} value={inst} className="bg-background">👨‍🏫 {inst}</option>
                            ))}
                        </select>
                    </div>

                    {/* Organization Filter */}
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl shrink-0">
                        <Building2 className="h-4 w-4 text-amber-500" />
                        <select
                            value={selectedOrganization}
                            onChange={(e) => setSelectedOrganization(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer max-w-[170px]"
                        >
                            <option value="all" className="bg-background">🏢 All Partner Orgs</option>
                            {uniqueOrganizations.map(org => (
                                <option key={org} value={org} className="bg-background">🏢 {org}</option>
                            ))}
                        </select>
                    </div>

                    {/* Active Filters Clear Button */}
                    {(selectedDomain !== "All Domains" || creditFilter !== "all" || weeklyFilter !== "all" || selectedInstructor !== "all" || selectedOrganization !== "all" || searchTerm) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedDomain("All Domains");
                                setCreditFilter("all");
                                setWeeklyFilter("all");
                                setSelectedInstructor("all");
                                setSelectedOrganization("all");
                                setSearchTerm("");
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                        >
                            Reset Filters ✕
                        </Button>
                    )}
                </div>
            </div>

            {/* CONTENT GRID */}
            {activeTab === "solo" ? (
                /* SOLO COURSES GRID */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in delay-150">
                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => {
                            const enrollmentStatus = enrolledCourseStatus[course.id];
                            const isApproved = enrollmentStatus === 'approved';
                            const isPending = enrollmentStatus === 'pending';

                            return (
                                <div 
                                    key={course.id} 
                                    onClick={() => handleOpenPreviewModal(course)}
                                    className="group bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer hover:-translate-y-1 touch-press"
                                >
                                    <div className="relative h-48 bg-muted overflow-hidden shrink-0">
                                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="h-12 w-12 text-primary/40" />
                                        </div>
                                        <img
                                            src={course.image}
                                            alt={course.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.opacity = '0';
                                            }}
                                        />
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                            <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-semibold shadow-xs">
                                                {course.domain}
                                            </Badge>
                                        </div>

                                        {/* Credit Points & Weekly Duration Badges */}
                                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                                            <Badge className="bg-purple-600/90 backdrop-blur-md text-white font-mono text-[10px] shadow-xs">
                                                🎓 {course.creditPoints} {course.creditPoints === 1 ? 'Credit' : 'Credits'}
                                            </Badge>
                                            <Badge className="bg-slate-900/90 backdrop-blur-md text-white font-mono text-[10px] shadow-xs">
                                                ⏱️ {course.durationWeeks} Weeks ({course.totalModules || 4} Modules • {course.durationHours || 16}h)
                                            </Badge>
                                        </div>

                                        {isApproved && (
                                            <div className="absolute top-3 right-3">
                                                <Badge variant="success" className="shadow-xs">Enrolled</Badge>
                                            </div>
                                        )}
                                        {isPending && (
                                            <div className="absolute top-3 right-3">
                                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-xs">Pending Approval</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 flex flex-col flex-1 justify-between">
                                        <div>
                                            {/* Organization Logo + Name */}
                                            {course.organization_name && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    {course.organization_logo_url ? (
                                                        <img
                                                            src={course.organization_logo_url}
                                                            alt={course.organization_name}
                                                            className="h-5 w-5 rounded-full object-cover border border-border shadow-sm"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <Building2 className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    <span className="text-xs font-semibold text-muted-foreground truncate">{course.organization_name}</span>
                                                </div>
                                            )}
                                            <h3 className="font-display font-bold text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-2">
                                                {course.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                {course.description || "Click to inspect objectives, instructor introduction, and full module index."}
                                            </p>
                                            {/* Price Display */}
                                            <div className="flex items-center gap-2 mb-2">
                                                {course.price > 0 ? (
                                                    <>
                                                        <span className="text-lg font-bold text-foreground flex items-center">
                                                            <IndianRupee className="h-4 w-4" />{course.price.toLocaleString('en-IN')}
                                                        </span>
                                                        {course.original_price > 0 && course.original_price > course.price && (
                                                            <span className="text-xs text-muted-foreground line-through">
                                                                ₹{course.original_price.toLocaleString('en-IN')}
                                                            </span>
                                                        )}
                                                        {course.original_price > 0 && course.original_price > course.price && (
                                                            <Badge className="bg-green-600/90 text-white text-[10px] font-bold">
                                                                {Math.round(((course.original_price - course.price) / course.original_price) * 100)}% OFF
                                                            </Badge>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Badge className="bg-emerald-600 text-white font-bold text-xs">FREE</Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2 border-t border-border/60">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5 text-primary" />
                                                    <span>{course.students} Enrolled</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">{course.instructor}</span>
                                                </div>
                                            </div>

                                            {isApproved ? (
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="flex items-center gap-2 w-full">
                                                        <Link 
                                                            to={`/student/courses/${course.id}/learn`} 
                                                            className="flex-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button className="w-full gap-2 font-semibold" variant="secondary">
                                                                <PlayCircle className="h-4 w-4 text-primary" /> Continue Learning
                                                            </Button>
                                                        </Link>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-10 px-3 gap-1.5 shrink-0 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 font-semibold"
                                                            title="Course Achievements & Aura Leaderboard"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedAchievementCourse({ id: course.id, title: course.title });
                                                            }}
                                                        >
                                                            <Trophy className="h-4 w-4" />
                                                            <span className="text-xs">Aura</span>
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                                                        <Link 
                                                            to={`/student/flashcards?courseId=${course.id}`} 
                                                            className="flex-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] gap-1 text-muted-foreground hover:text-indigo-500 font-medium">
                                                                <Layers className="h-3 w-3 text-indigo-500" /> Flashcards
                                                            </Button>
                                                        </Link>
                                                        <Link 
                                                            to={`/student/mnemonics?courseId=${course.id}`} 
                                                            className="flex-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] gap-1 text-muted-foreground hover:text-amber-500 font-medium">
                                                                <Lightbulb className="h-3 w-3 text-amber-500" /> Mnemonics
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ) : isPending ? (
                                                <Button 
                                                    className="w-full gap-2" 
                                                    variant="outline" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenPreviewModal(course);
                                                    }}
                                                >
                                                    <Info className="h-4 w-4 text-yellow-600" /> Pending Verification
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        className="w-full gap-1.5 font-semibold" 
                                                        variant="default"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenPreviewModal(course);
                                                        }}
                                                    >
                                                        View Details & Syllabus
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl bg-card">
                            <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                            <h3 className="text-lg font-bold">No solo courses found matching filters</h3>
                            <p className="text-sm text-muted-foreground mt-1 mb-4">Try adjusting your weekly duration or credit filter settings.</p>
                            <Button variant="outline" onClick={() => { setSelectedDomain("All Domains"); setCreditFilter("all"); setWeeklyFilter("all"); setSearchTerm(""); }}>
                                Reset All Filters
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                /* CERTIFICATION PROGRAMS GRID */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in delay-150">
                    {filteredCertPrograms.length > 0 ? (
                        filteredCertPrograms.map((prog) => (
                            <div 
                                key={prog.id} 
                                onClick={() => setSelectedProgramForPreview(prog)}
                                className="group bg-card rounded-2xl border border-purple-500/30 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer hover:-translate-y-1 relative"
                            >
                                <div className="relative h-48 bg-muted overflow-hidden shrink-0">
                                    <img
                                        src={prog.image}
                                        alt={prog.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                                    
                                    <div className="absolute top-3 left-3">
                                        <Badge className="bg-purple-600 text-white font-semibold">
                                            {prog.domain}
                                        </Badge>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <Badge className="bg-amber-500 text-slate-950 font-bold flex items-center gap-1">
                                            <Award className="h-3.5 w-3.5" /> Certificate Program
                                        </Badge>
                                    </div>

                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                                        <span className="font-mono bg-purple-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/40">
                                            🎓 {prog.totalCredits} Total Credits
                                        </span>
                                        <span className="font-mono bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700">
                                            ⏱️ {prog.durationWeeks} Weeks Pathway
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                                    <div>
                                        <h3 className="font-display font-bold text-lg line-clamp-2 group-hover:text-purple-400 transition-colors mb-2">
                                            {prog.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                                            {prog.description}
                                        </p>

                                        {/* Included Courses Preview */}
                                        <div className="space-y-1.5 pt-2">
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                Bundled Certification Courses:
                                            </span>
                                            <div className="space-y-1">
                                                {prog.includedCourses.slice(0, 3).map((ic: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-muted/40 border border-border/40">
                                                        <span className="truncate max-w-[200px] font-medium text-foreground">{ic.title}</span>
                                                        <span className="text-[10px] text-purple-400 font-mono shrink-0">+{ic.credit_points || 4} Cr</span>
                                                    </div>
                                                ))}
                                                {prog.includedCourses.length > 3 && (
                                                    <p className="text-[11px] text-muted-foreground font-medium pl-1">
                                                        + {prog.includedCourses.length - 3} more specialized courses
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Button className="w-full gap-2 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md">
                                        <Award className="h-4 w-4" /> View Certification Pathway
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl bg-card">
                            <Award className="h-12 w-12 text-purple-400/40 mx-auto mb-3" />
                            <h3 className="text-lg font-bold">No certification programs found</h3>
                            <p className="text-sm text-muted-foreground mt-1 mb-4">Try selecting another domain or clearing your credit / duration filters.</p>
                            <Button variant="outline" onClick={() => { setSelectedDomain("All Domains"); setCreditFilter("all"); setWeeklyFilter("all"); setSearchTerm(""); }}>
                                Reset Filters
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* CERTIFICATION PROGRAM PREVIEW DIALOG */}
            <Dialog
                open={!!selectedProgramForPreview}
                onOpenChange={(open) => !open && setSelectedProgramForPreview(null)}
            >
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    {selectedProgramForPreview && (
                        <>
                            <div className="relative h-44 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 flex flex-col justify-end shrink-0">
                                <img
                                    src={selectedProgramForPreview.image}
                                    alt={selectedProgramForPreview.title}
                                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
                                />
                                <div className="relative z-10 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-purple-600 text-white font-semibold">
                                            {selectedProgramForPreview.domain}
                                        </Badge>
                                        <Badge className="bg-amber-400 text-slate-950 font-bold">
                                            🎓 {selectedProgramForPreview.totalCredits} Academic Credits
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl font-display font-bold leading-tight line-clamp-2">
                                        {selectedProgramForPreview.title}
                                    </h2>
                                </div>
                            </div>

                            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1 text-xs">
                                    <span className="font-bold text-purple-600 dark:text-purple-300 block text-sm">
                                        📜 Domain Mastery Certification Pathway
                                    </span>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Completing all bundled courses in this specialization awards <strong>{selectedProgramForPreview.totalCredits} Academic Credits</strong> and issues the official <strong>{selectedProgramForPreview.title}</strong> completion certificate!
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Program Overview & Syllabus
                                    </h4>
                                    <p className="text-xs leading-relaxed text-foreground bg-card p-3.5 rounded-xl border">
                                        {selectedProgramForPreview.description}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                        Bundled Courses ({selectedProgramForPreview.includedCourses?.length || 0})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedProgramForPreview.includedCourses?.map((course: any, idx: number) => (
                                            <div key={idx} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-semibold text-foreground">{course.title}</span>
                                                </div>
                                                <Badge variant="outline" className="text-purple-600 border-purple-500/30 text-[10px] font-mono shrink-0">
                                                    +{course.credit_points || 4} Credits
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex flex-col text-xs font-mono text-left">
                                    <span className="font-bold text-foreground">
                                        Estimated Duration: {selectedProgramForPreview.durationWeeks} Weeks
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        ({selectedProgramForPreview.totalModules || (selectedProgramForPreview.includedCourses?.length * 4)} Learning Modules • {selectedProgramForPreview.totalHours || (selectedProgramForPreview.durationWeeks * 4)} Hours Total Study Time)
                                    </span>
                                </div>
                                <Button
                                    onClick={() => {
                                        setSelectedProgramForPreview(null);
                                        toast({
                                            title: "Program Selection Saved",
                                            description: `Enrolling in individual courses within ${selectedProgramForPreview.domain} counts towards this certification!`,
                                        });
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shrink-0"
                                >
                                    <Award className="h-4 w-4" /> Enroll in Certification Pathway
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* COURSE ACHIEVEMENTS & AURA MODAL */}
            {selectedAchievementCourse && (
                <CourseAchievementsModal
                    isOpen={!!selectedAchievementCourse}
                    onClose={() => setSelectedAchievementCourse(null)}
                    courseId={selectedAchievementCourse.id}
                    courseTitle={selectedAchievementCourse.title}
                />
            )}

            {/* CERTIFICATE COURSE PREVIEW MODAL */}
            <CertificateCourseDetailModal
                course={selectedCourseForPreview}
                isOpen={!!selectedCourseForPreview}
                onClose={() => setSelectedCourseForPreview(null)}
                isEnrolled={selectedCourseForPreview ? enrolledCourseStatus[selectedCourseForPreview.id] === 'approved' : false}
                isPending={selectedCourseForPreview ? enrolledCourseStatus[selectedCourseForPreview.id] === 'pending' : false}
                onEnroll={(course) => {
                    if (enrolledCourseStatus[course.id] === 'approved') {
                        navigate(`/student/courses/${course.id}/learn`);
                    } else {
                        setSelectedCourseForPreview(null);
                        handleEnrollClick(course);
                    }
                }}
            />

            {/* ENROLLMENT / PAYMENT DIALOG */}
            <Dialog open={enrollmentDialog.isOpen} onOpenChange={(open) => { setEnrollmentDialog(prev => ({ ...prev, isOpen: open })); if (!open) { setCouponApplied(null); setCouponCode(""); setCouponError(""); } }}>
                <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-border/80">
                    <DialogHeader className="p-5 sm:p-6 pb-3 border-b bg-card shrink-0">
                        <DialogTitle className="text-lg sm:text-xl font-bold">Enroll in {enrollmentDialog.courseName}</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            {enrollmentDialog.coursePrice > 0
                                ? "Please scan the QR code to pay the course fee. You can apply a coupon code for a discount."
                                : "This course is free! Click submit to enroll."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 max-h-[calc(90vh-130px)]">
                        {enrollmentDialog.coursePrice > 0 && (
                            <>
                                {/* Pricing Summary */}
                                <div className="p-3.5 sm:p-4 rounded-xl bg-muted/30 border space-y-2">
                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                        <span className="text-muted-foreground">Course Price</span>
                                        <span className="font-bold">₹{enrollmentDialog.coursePrice.toLocaleString('en-IN')}</span>
                                    </div>
                                    {couponApplied && (
                                        <div className="flex items-center justify-between text-xs sm:text-sm">
                                            <span className="text-emerald-600 flex items-center gap-1">
                                                <Ticket className="h-3.5 w-3.5" />
                                                Coupon ({couponApplied.code})
                                            </span>
                                            <span className="font-bold text-emerald-600">-₹{couponApplied.discount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm sm:text-base font-bold pt-2 border-t border-border">
                                        <span>Total Payable</span>
                                        <span className={Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) === 0 ? "text-emerald-600 font-extrabold text-base" : "text-primary"}>
                                            ₹{Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)).toLocaleString('en-IN')}
                                            {Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) === 0 && " (100% Free Waiver)"}
                                        </span>
                                    </div>
                                </div>

                                {/* Coupon Code Input */}
                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                                        <Ticket className="h-4 w-4 text-emerald-600" /> Have a Coupon Code?
                                    </label>
                                    {couponApplied ? (
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">{couponApplied.code}</span>
                                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                                    {couponApplied.type === 'percentage' ? `${couponApplied.value}% OFF` : `₹${couponApplied.value} OFF`}
                                                </Badge>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-600 text-xs h-7">
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                value={couponCode}
                                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                                placeholder="Enter coupon code (e.g. WELCOME100)"
                                                className="font-mono uppercase text-xs sm:text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={handleApplyCoupon}
                                                disabled={couponLoading || !couponCode.trim()}
                                                className="shrink-0 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 text-xs sm:text-sm"
                                            >
                                                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                                                Apply
                                            </Button>
                                        </div>
                                    )}
                                    {couponError && (
                                        <p className="text-xs text-red-500 font-medium">{couponError}</p>
                                    )}
                                </div>

                                {/* QR Code & Payment Instructions (Only if amount remains > 0) */}
                                {Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) > 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-1 bg-muted/20 rounded-xl p-3 border border-border/50">
                                        <div className="w-32 h-32 sm:w-40 sm:h-40 border rounded-xl bg-white p-2.5 shadow-xs flex items-center justify-center">
                                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example_payment_link" alt="Payment QR Code" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-center space-y-0.5">
                                            <p className="text-xs font-semibold text-foreground">Scan to Pay via UPI / Any Payment App</p>
                                            <p className="text-[11px] text-muted-foreground">After payment, enter the Reference/UPI Transaction ID below.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-xs sm:text-sm">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="font-bold">100% Scholarship / Fee Waiver Active</p>
                                            <p className="text-xs opacity-90">No payment is required. You can click "Enroll Free Now" to immediately access your course!</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="space-y-2 pt-1">
                            {Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) > 0 ? (
                                <>
                                    <label htmlFor="transactionId" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                                        Transaction / Reference ID *
                                    </label>
                                    <Input
                                        id="transactionId"
                                        placeholder="e.g. 12-digit UTR or UPI Transaction ID (e.g. 423456789012)"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        className="font-mono text-xs sm:text-sm h-10 border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Kindly double check your Transaction/UTR number for quick verification by college admin/teacher.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <label htmlFor="transactionId" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                        Optional Note / Student Remarks
                                    </label>
                                    <Input
                                        id="transactionId"
                                        placeholder="Optional remark or left empty"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        className="text-xs sm:text-sm h-10 border-border"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 sm:p-5 bg-muted/30 border-t shrink-0 flex flex-row items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null, coursePrice: 0 })} disabled={isSubmitting} className="text-xs sm:text-sm">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmEnrollment} 
                            disabled={isSubmitting || (Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) > 0 && !transactionId.trim())} 
                            className={`text-xs sm:text-sm font-semibold ${Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) === 0 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)) === 0 ? "Enroll Free Now 🎉" : "Submit for Verification"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StudentLayout>
    );
}

