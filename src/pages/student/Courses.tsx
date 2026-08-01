import { useEffect, useState } from "react";
import { getTopicRelatedThumbnail } from "@/lib/thumbnailUtils";
import { StudentLayout } from "@/components/layout/StudentLayout";
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
    Tag
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

    // Course Overview Preview Modal State
    const [selectedCourseForPreview, setSelectedCourseForPreview] = useState<any | null>(null);
    const [previewCurriculum, setPreviewCurriculum] = useState<any[]>([]);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);

    // Payment / Enrollment Dialog State
    const [enrollmentDialog, setEnrollmentDialog] = useState<{ isOpen: boolean; courseId: string | null; courseName: string | null; coursePrice: number }>({ isOpen: false, courseId: null, courseName: null, coursePrice: 0 });
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
                    teacher:users!teacher_id(full_name, email, avatar_url, role),
                    enrollments(count),
                    course_sections(id, title, section_contents(id))
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
                        teacher_id: c.teacher_id
                    };
                });
            }

            // Default Fallback Solo Courses across domains if DB table is empty or unpopulated
            const fallbackCourses = [
                {
                    id: "demo-course-1",
                    title: "Full-Stack Web Development & Next.js Architecture",
                    description: "Master modern React 19, TypeScript, Next.js App Router, Node.js microservices, and PostgreSQL database design with hands-on projects.",
                    domain: "Software Engineering",
                    creditPoints: 4,
                    totalModules: 8,
                    durationWeeks: 8,
                    durationHours: 32,
                    objectives: "Build production-grade full-stack web applications with authentication, server actions, and cloud deployment.",
                    instructor: "Dr. Mohit Mehta",
                    instructorEmail: "mohit@orbitlms.edu.in",
                    students: 142,
                    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "demo-course-2",
                    title: "Data Science, Neural Networks & Generative AI",
                    description: "Explore Python data analysis, pandas, PyTorch neural networks, predictive modeling, and LLM application engineering.",
                    domain: "Data Science & AI",
                    creditPoints: 5,
                    totalModules: 10,
                    durationWeeks: 10,
                    durationHours: 40,
                    objectives: "Train machine learning models, build RAG pipelines, and integrate AI APIs into enterprise apps.",
                    instructor: "Prof. Harshvardhan Purohit",
                    instructorEmail: "harsh@orbitlms.edu.in",
                    students: 98,
                    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "demo-course-3",
                    title: "Cyber Security & Defensive Network Infrastructure",
                    description: "Understand network security architecture, vulnerability assessment, ethical hacking principles, and incident response.",
                    domain: "Cyber Security",
                    creditPoints: 4,
                    totalModules: 6,
                    durationWeeks: 6,
                    durationHours: 24,
                    objectives: "Conduct security audits, implement encryption protocols, and defend cloud infrastructure against cyber threats.",
                    instructor: "Vikramaditya Sharma",
                    instructorEmail: "vikram@orbitlms.edu.in",
                    students: 76,
                    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "demo-course-4",
                    title: "Cloud Computing, Kubernetes & DevOps Pipeline Mastery",
                    description: "Design automated CI/CD pipelines with GitHub Actions, Docker containers, Kubernetes clusters, and AWS/GCP cloud services.",
                    domain: "Cloud Computing & DevOps",
                    creditPoints: 4,
                    totalModules: 8,
                    durationWeeks: 8,
                    durationHours: 32,
                    objectives: "Containerize microservices, manage multi-region cloud deployments, and automate zero-downtime releases.",
                    instructor: "Ananya Roy",
                    instructorEmail: "ananya@orbitlms.edu.in",
                    students: 110,
                    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "demo-course-5",
                    title: "UI/UX Design Systems & Micro-Interactions",
                    description: "Craft modern design systems in Figma, master typography, user research, wireframing, and interactive micro-animations.",
                    domain: "UI/UX & Product Design",
                    creditPoints: 3,
                    totalModules: 4,
                    durationWeeks: 4,
                    durationHours: 16,
                    objectives: "Design accessible, highly polished web and mobile user interfaces from wireframe to interactive prototype.",
                    instructor: "Sophia Patel",
                    instructorEmail: "sophia@orbitlms.edu.in",
                    students: 85,
                    image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "demo-course-6",
                    title: "Cross-Platform Mobile App Development with React Native",
                    description: "Build native iOS and Android applications with single codebase React Native, Expo, and push notifications.",
                    domain: "Web & Mobile Development",
                    creditPoints: 4,
                    totalModules: 6,
                    durationWeeks: 6,
                    durationHours: 24,
                    objectives: "Deploy mobile applications to App Store and Google Play with smooth 60fps animations.",
                    instructor: "Rohan Kapoor",
                    instructorEmail: "rohan@orbitlms.edu.in",
                    students: 64,
                    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500&auto=format&fit=crop&q=80"
                }
            ];

            const activeCourses = formatted.length > 0 ? formatted : fallbackCourses;
            setCourses(activeCourses);

            // Calculate Certification Programs total weeks, modules, and hours by summing bundled courses
            const fallbackCertPrograms = [
                {
                    id: "cert-1",
                    title: "Full-Stack Software Engineering Mastery Certification",
                    description: "Complete 20 Credits across core Web Architecture, React, Node.js, and Cloud Computing modules to earn official Domain Mastery Certification.",
                    domain: "Software Engineering",
                    totalCredits: 20,
                    durationWeeks: 16,
                    totalModules: 18,
                    totalHours: 64,
                    includedCourses: [
                        { title: "React & Next.js Architecture", credit_points: 4, durationWeeks: 4, modules: 4, hours: 16 },
                        { title: "Node.js Microservices & PostgreSQL", credit_points: 4, durationWeeks: 4, modules: 4, hours: 16 },
                        { title: "Cloud Deployment & DevOps Pipeline", credit_points: 4, durationWeeks: 4, modules: 5, hours: 16 },
                        { title: "System Design & Distributed Systems", credit_points: 4, durationWeeks: 4, modules: 5, hours: 16 }
                    ],
                    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "cert-2",
                    title: "AI, Data Science & Neural Engineering Specialization",
                    description: "Master Machine Learning, Python Neural Networks, and Generative AI Application Engineering to achieve 20 Academic Credits.",
                    domain: "Data Science & AI",
                    totalCredits: 20,
                    durationWeeks: 18,
                    totalModules: 20,
                    totalHours: 72,
                    includedCourses: [
                        { title: "Python for Data Science & ML", credit_points: 5, durationWeeks: 4, modules: 5, hours: 18 },
                        { title: "Deep Learning & PyTorch Frameworks", credit_points: 5, durationWeeks: 4, modules: 5, hours: 18 },
                        { title: "Generative AI & LLM Engineering", credit_points: 5, durationWeeks: 5, modules: 5, hours: 18 },
                        { title: "Computer Vision & Advanced NLP", credit_points: 5, durationWeeks: 5, modules: 5, hours: 18 }
                    ],
                    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "cert-3",
                    title: "Cyber Security & Defensive Infrastructure Specialist",
                    description: "Comprehensive hands-on training in network defense, ethical hacking, vulnerability management, and threat analysis.",
                    domain: "Cyber Security",
                    totalCredits: 16,
                    durationWeeks: 14,
                    totalModules: 16,
                    totalHours: 56,
                    includedCourses: [
                        { title: "Ethical Hacking & Reconnaissance", credit_points: 4, durationWeeks: 3, modules: 4, hours: 14 },
                        { title: "Network Defense Architecture", credit_points: 4, durationWeeks: 3, modules: 4, hours: 14 },
                        { title: "Applied Cryptography & Security", credit_points: 4, durationWeeks: 4, modules: 4, hours: 14 },
                        { title: "Incident Response & Digital Forensics", credit_points: 4, durationWeeks: 4, modules: 4, hours: 14 }
                    ],
                    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80"
                },
                {
                    id: "cert-4",
                    title: "Cloud DevOps & Multi-Region Systems Architecture",
                    description: "Architect cloud infrastructure, container orchestration, automated CI/CD pipelines, and high availability systems.",
                    domain: "Cloud Computing & DevOps",
                    totalCredits: 18,
                    durationWeeks: 14,
                    totalModules: 16,
                    totalHours: 56,
                    includedCourses: [
                        { title: "Docker & Kubernetes Orchestration", credit_points: 4, durationWeeks: 3, modules: 4, hours: 14 },
                        { title: "AWS & GCP Multi-Region Architecture", credit_points: 5, durationWeeks: 4, modules: 4, hours: 14 },
                        { title: "Terraform Infrastructure as Code", credit_points: 4, durationWeeks: 3, modules: 4, hours: 14 },
                        { title: "CI/CD & Observability Pipelines", credit_points: 5, durationWeeks: 4, modules: 4, hours: 14 }
                    ],
                    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80"
                }
            ];

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
                    setCertPrograms(fallbackCertPrograms);
                }
            } catch (certErr) {
                console.warn("Could not load certPrograms from DB, using defaults:", certErr);
                setCertPrograms(fallbackCertPrograms);
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
        setEnrollmentDialog({ isOpen: true, courseId: course.id, courseName: course.title, coursePrice: course.price || 0 });
        setTransactionId("");
        setCouponCode("");
        setCouponApplied(null);
        setCouponError("");
    };

    // Coupon validation
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code.");
            return;
        }
        try {
            setCouponLoading(true);
            setCouponError("");
            setCouponApplied(null);

            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase().trim())
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;
            if (!coupon) {
                setCouponError("Invalid or expired coupon code.");
                return;
            }

            // Check expiry
            if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
                setCouponError("This coupon has expired.");
                return;
            }

            // Check max uses
            if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
                setCouponError("This coupon has reached its maximum usage limit.");
                return;
            }

            // Check course-specific
            if (coupon.course_id && coupon.course_id !== enrollmentDialog.courseId) {
                setCouponError("This coupon is not valid for this course.");
                return;
            }

            // Check min purchase
            if (coupon.min_purchase > 0 && enrollmentDialog.coursePrice < coupon.min_purchase) {
                setCouponError(`Minimum purchase of \u20b9${coupon.min_purchase} required for this coupon.`);
                return;
            }

            // Check if student already used this coupon for this course
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
            }

            // Calculate discount
            let discount = 0;
            if (coupon.discount_type === 'percentage') {
                discount = Math.round((enrollmentDialog.coursePrice * coupon.discount_value) / 100);
            } else {
                discount = Math.min(coupon.discount_value, enrollmentDialog.coursePrice);
            }

            setCouponApplied({
                code: coupon.code,
                discount,
                type: coupon.discount_type,
                value: coupon.discount_value
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
        if (!transactionId.trim()) {
            toast({ variant: "destructive", title: "Error", description: "Please enter your transaction ID." });
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
                toast({ title: "Already Enrolled", description: "You already have a requested or active enrollment for this course." });
                setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: existingEnrollment.status || 'pending' }));
                setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null });
                return;
            }

            const { error } = await supabase
                .from('enrollments')
                .insert([{
                    student_id: user.id,
                    course_id: enrollmentDialog.courseId,
                    transaction_id: transactionId,
                    status: 'pending'
                }]);

            if (error) throw error;

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
                } catch (cErr) {
                    console.error("Error recording coupon usage:", cErr);
                }
            }

            toast({ title: "Enrollment Submitted!", description: "Your enrollment is pending admin verification." });
            setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: 'pending' }));
            setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null });

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

    const uniqueDomains = Array.from(new Set([
        "Software Engineering",
        "Data Science & AI",
        "Web & Mobile Development",
        "Cyber Security",
        "Cloud Computing & DevOps",
        "UI/UX & Product Design",
        ...Object.keys(domainCounts)
    ])).filter(d => domainCounts[d] !== undefined || d === "Software Engineering");

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
                                    className="group bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-pointer hover:-translate-y-1"
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
                                                <Link 
                                                    to={`/student/courses/${course.id}/learn`} 
                                                    className="w-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button className="w-full gap-2 font-semibold" variant="secondary">
                                                        <PlayCircle className="h-4 w-4 text-primary" /> Continue Learning
                                                    </Button>
                                                </Link>
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
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
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

            {/* PRE-ENROLLMENT COURSE OVERVIEW & SYLLABUS PREVIEW MODAL */}
            <Dialog 
                open={!!selectedCourseForPreview} 
                onOpenChange={(open) => !open && setSelectedCourseForPreview(null)}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    {selectedCourseForPreview && (() => {
                        const course = selectedCourseForPreview;
                        const status = enrolledCourseStatus[course.id];
                        const isEnrolled = status === 'approved';
                        const isPending = status === 'pending';

                        return (
                            <>
                                {/* Dialog Top Header / Banner */}
                                <div className="relative h-44 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground p-6 flex flex-col justify-end shrink-0 overflow-hidden">
                                    <img 
                                        src={course.image} 
                                        alt={course.title}
                                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
                                    />
                                    <div className="relative z-10 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-background/90 text-foreground backdrop-blur-md border-none font-semibold">
                                                {course.domain}
                                            </Badge>
                                            {isEnrolled && <Badge variant="success">Enrolled</Badge>}
                                            {isPending && <Badge className="bg-yellow-500 text-white">Pending Approval</Badge>}
                                        </div>
                                        <h2 className="text-2xl font-display font-bold leading-tight line-clamp-1">{course.title}</h2>
                                        <div className="flex items-center gap-4 text-xs opacity-90">
                                            <span>Instructor: <strong>{course.instructor}</strong></span>
                                            <span>•</span>
                                            <span>{course.students} enrolled students</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Tabs Content */}
                                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                                    <div className="px-6 pt-3 border-b bg-muted/20">
                                        <TabsList className="grid grid-cols-3 w-full max-w-md">
                                            <TabsTrigger value="overview">Overview & Objectives</TabsTrigger>
                                            <TabsTrigger value="instructor">Instructor Intro</TabsTrigger>
                                            <TabsTrigger value="syllabus">Modules & Syllabus</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {/* TAB 1: OVERVIEW & OBJECTIVES */}
                                        <TabsContent value="overview" className="mt-0 space-y-6">
                                            {/* Description */}
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-primary" /> About This Course
                                                </h3>
                                                <p className="text-sm leading-relaxed text-foreground bg-card p-4 rounded-xl border">
                                                    {course.description || "No general description provided by instructor."}
                                                </p>
                                            </div>

                                            {/* Academic Credit & Domain Certification Pathway */}
                                            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                                        <Award className="h-4 w-4 text-purple-600" /> Academic Credit & Domain Certification Pathway
                                                    </h3>
                                                    <Badge className="bg-purple-600 text-white text-xs font-bold font-mono">
                                                        +{(course.creditPoints ?? course.credit_points ?? 3)} Credits
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-foreground/90 leading-relaxed">
                                                    • <strong>Course Credit Weightage:</strong> Completing this course awards <strong>{(course.creditPoints ?? course.credit_points ?? 3)} Academic Credits</strong> under the <strong>{course.domain}</strong> domain pathway.
                                                </p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    • <strong>20-Credit Domain Certification Rule:</strong> Completing courses in the <strong>{course.domain}</strong> domain until accumulating <strong>20 Credits</strong> unlocks an official <strong>Domain Mastery Certificate</strong>.
                                                </p>
                                            </div>

                                            {/* Objectives */}
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Learning Objectives & Outcomes
                                                </h3>
                                                <div className="bg-card p-4 rounded-xl border space-y-2 text-sm text-foreground">
                                                    {course.objectives ? (
                                                        <div className="whitespace-pre-line leading-relaxed">
                                                            {course.objectives}
                                                        </div>
                                                    ) : (
                                                        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                                                            <li>Master essential principles and core concepts in {course.domain}.</li>
                                                            <li>Gain practical hands-on experience through structured modules.</li>
                                                            <li>Complete assignments and quizzes to demonstrate proficiency.</li>
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>

                                            {/* General Instructions */}
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" /> General Instructions & Guidelines
                                                </h3>
                                                <div className="bg-muted/30 p-4 rounded-xl border text-sm text-foreground space-y-2">
                                                    {course.instructions ? (
                                                        <div className="whitespace-pre-line leading-relaxed">
                                                            {course.instructions}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1.5 text-xs text-muted-foreground">
                                                            <p>• Access course material anytime from your student portal.</p>
                                                            <p>• Minimum 80% video watch progress is required to mark lessons as completed.</p>
                                                            <p>• Complete quizzes and submit assignments before deadlines for final evaluation.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Exam Policy */}
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                    <Award className="h-4 w-4 text-purple-600" /> Exam Policy & Evaluation Rules
                                                </h3>
                                                <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl text-sm text-foreground space-y-2">
                                                    {course.exam_policy ? (
                                                        <div className="whitespace-pre-line leading-relaxed">
                                                            {course.exam_policy}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1.5 text-xs text-muted-foreground">
                                                            <p>• <strong>Passing Threshold:</strong> Minimum 70% aggregate score required on quizzes & assessments for completion certificate.</p>
                                                            <p>• <strong>Attempt Limits:</strong> Quizzes permit up to 3 attempt submissions.</p>
                                                            <p>• <strong>Submission Rules:</strong> Assignments must be turned in prior to deadline dates.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* TAB 2: INSTRUCTOR INTRO */}
                                        <TabsContent value="instructor" className="mt-0 space-y-4">
                                            <div className="bg-card border p-5 rounded-2xl space-y-5">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl overflow-hidden shrink-0">
                                                            {course.instructorAvatar ? (
                                                                <img src={course.instructorAvatar} alt={course.instructor} className="h-full w-full object-cover" />
                                                            ) : (
                                                                course.instructor.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg">{course.instructor}</h3>
                                                            <p className="text-xs text-primary font-semibold">Course Instructor & Subject Matter Expert</p>
                                                            {course.instructorEmail && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">📧 {course.instructorEmail}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Social Links */}
                                                    {course.instructor_socials && (course.instructor_socials.linkedin || course.instructor_socials.youtube || course.instructor_socials.twitter || course.instructor_socials.instagram) && (
                                                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                            {course.instructor_socials.linkedin && (
                                                                <a href={course.instructor_socials.linkedin} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                                                                        <Globe className="h-3.5 w-3.5" /> LinkedIn ↗
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            {course.instructor_socials.youtube && (
                                                                <a href={course.instructor_socials.youtube} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                                                        <Video className="h-3.5 w-3.5" /> YouTube ↗
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            {course.instructor_socials.twitter && (
                                                                <a href={course.instructor_socials.twitter} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-sky-500/30 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950">
                                                                        <Globe className="h-3.5 w-3.5" /> X ↗
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            {course.instructor_socials.instagram && (
                                                                <a href={course.instructor_socials.instagram} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-pink-500/30 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950">
                                                                        <Globe className="h-3.5 w-3.5" /> Instagram ↗
                                                                    </Button>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Qualifications & Experience Overview (LinkedIn Style) */}
                                                {course.instructor_qualifications && (
                                                    <div className="pt-3 border-t border-border space-y-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                            <GraduationCap className="h-4 w-4 text-primary" /> Qualifications & Experience Overview
                                                        </h4>

                                                        {Array.isArray(course.instructor_qualifications) && course.instructor_qualifications.length > 0 ? (
                                                            <div className="space-y-2.5">
                                                                {course.instructor_qualifications.map((q: any, idx: number) => (
                                                                    <div key={idx} className="p-3.5 rounded-xl border bg-muted/20 flex items-start gap-3">
                                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                                                            {q.image_url ? (
                                                                                <img src={q.image_url} alt={q.title} className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <GraduationCap className="h-5 w-5" />
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-0.5 flex-1">
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                                <h5 className="font-bold text-sm text-foreground">{q.title}</h5>
                                                                                {q.year && (
                                                                                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono w-fit">
                                                                                        📅 {q.year}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            {q.institution && (
                                                                                <p className="text-xs font-semibold text-primary">🏛️ {q.institution}</p>
                                                                            )}
                                                                            {q.description && (
                                                                                <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{q.description}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                                                                <GraduationCap className="h-4 w-4 shrink-0" />
                                                                <span>{typeof course.instructor_qualifications === 'object' ? JSON.stringify(course.instructor_qualifications) : course.instructor_qualifications}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Embedded Video Introduction (YouTube / Google Drive / MP4) */}
                                                {course.instructor_video_url && (
                                                    <div className="pt-3 border-t border-border space-y-2">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                            <Video className="h-4 w-4 text-red-500" /> Instructor Introduction Video
                                                        </h4>
                                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-sm">
                                                            <iframe
                                                                src={getEmbeddableVideoUrl(course.instructor_video_url)}
                                                                className="w-full h-full border-none"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                                allowFullScreen
                                                                title="Instructor Video Introduction"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-3 border-t border-border">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Instructor Message & Bio</h4>
                                                    <div className="text-sm leading-relaxed text-foreground bg-muted/20 p-4 rounded-xl border">
                                                        {course.instructor_intro ? (
                                                            <div className="whitespace-pre-line">{course.instructor_intro}</div>
                                                        ) : (
                                                            <p className="text-muted-foreground italic">
                                                                "Welcome! I will be guiding you step-by-step through the modules of this course. Feel free to reach out with any questions during live sessions or assignment reviews."
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* TAB 3: MODULES & SYLLABUS (PREVIEW WITHOUT ENROLLMENT) */}
                                        <TabsContent value="syllabus" className="mt-0 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-primary" /> Content Index & Curriculum
                                                </h3>
                                                <span className="text-xs text-muted-foreground">{previewCurriculum.length} Modules</span>
                                            </div>

                                            {loadingCurriculum ? (
                                                <div className="flex py-12 justify-center items-center">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                </div>
                                            ) : previewCurriculum.length > 0 ? (
                                                <Accordion type="single" collapsible defaultValue="module-0" className="w-full space-y-3">
                                                    {previewCurriculum.map((section: any, sIdx: number) => (
                                                        <AccordionItem key={section.id} value={`module-${sIdx}`} className="border rounded-xl px-4 bg-card">
                                                            <AccordionTrigger className="hover:no-underline py-3">
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                                                                        {sIdx + 1}
                                                                    </span>
                                                                    <div>
                                                                        <h4 className="font-bold text-sm leading-snug">{section.title}</h4>
                                                                        <p className="text-xs text-muted-foreground font-normal">{section.items?.length || 0} Lessons & Activities</p>
                                                                    </div>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pb-3 pt-1 space-y-2">
                                                                {section.items?.length > 0 ? (
                                                                    section.items.map((item: any, iIdx: number) => (
                                                                        <div key={item.id || iIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                {item.itemType === 'assignment' ? (
                                                                                    <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
                                                                                ) : item.video_url ? (
                                                                                    <Video className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                ) : (
                                                                                    <FileText className="h-4 w-4 text-green-500 shrink-0" />
                                                                                )}
                                                                                <span className="font-medium truncate">{item.title}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                                                                    {item.itemType === 'assignment' ? (item.type === 'quiz' ? 'Quiz' : 'Assignment') : (item.video_url ? 'Video Lesson' : 'Reading')}
                                                                                </Badge>
                                                                                <Lock className="h-3 w-3 text-muted-foreground/60" />
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground italic px-2">No lesson items added to this module yet.</p>
                                                                )}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                                                    No public modules listed for this course yet.
                                                </div>
                                            )}
                                        </TabsContent>
                                    </div>
                                </Tabs>

                                {/* Modal Footer CTA */}
                                    <div className="p-4 border-t bg-card flex items-center justify-between gap-4 shrink-0">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground">Course Status</p>
                                            <p className="text-sm font-bold text-foreground">
                                                {isEnrolled ? "Enrolled Student" : isPending ? "Verification Pending" : "Available for Enrollment"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" onClick={() => setSelectedCourseForPreview(null)}>
                                                Close
                                            </Button>
                                            {isEnrolled ? (
                                                <Link to={`/student/courses/${course.id}/learn`}>
                                                    <Button className="gap-2 font-bold" variant="secondary">
                                                        <PlayCircle className="h-4 w-4 text-primary" /> Start / Continue Course
                                                    </Button>
                                                </Link>
                                            ) : isPending ? (
                                                <Button variant="outline" disabled className="gap-2">
                                                    <Clock className="h-4 w-4 text-yellow-500" /> Pending Admin Approval
                                                </Button>
                                            ) : (
                                                <Button className="gap-2 font-bold" onClick={() => handleEnrollClick(course)}>
                                                    <GraduationCap className="h-4 w-4" /> Enroll Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* ENROLLMENT / PAYMENT DIALOG */}
            <Dialog open={enrollmentDialog.isOpen} onOpenChange={(open) => { setEnrollmentDialog(prev => ({ ...prev, isOpen: open })); if (!open) { setCouponApplied(null); setCouponCode(""); setCouponError(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enroll in {enrollmentDialog.courseName}</DialogTitle>
                        <DialogDescription>
                            {enrollmentDialog.coursePrice > 0
                                ? "Please scan the QR code to pay the course fee. You can apply a coupon code for a discount."
                                : "This course is free! Click submit to enroll."}
                        </DialogDescription>
                    </DialogHeader>

                    {enrollmentDialog.coursePrice > 0 && (
                        <>
                            {/* Pricing Summary */}
                            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Course Price</span>
                                    <span className="font-bold">₹{enrollmentDialog.coursePrice.toLocaleString('en-IN')}</span>
                                </div>
                                {couponApplied && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-emerald-600 flex items-center gap-1">
                                            <Ticket className="h-3.5 w-3.5" />
                                            Coupon ({couponApplied.code})
                                        </span>
                                        <span className="font-bold text-emerald-600">-₹{couponApplied.discount.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-border">
                                    <span>Total Payable</span>
                                    <span className="text-primary">
                                        ₹{Math.max(0, enrollmentDialog.coursePrice - (couponApplied?.discount || 0)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* Coupon Code Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Ticket className="h-4 w-4 text-emerald-600" /> Have a Coupon Code?
                                </label>
                                {couponApplied ? (
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">{couponApplied.code}</span>
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
                                            placeholder="Enter coupon code"
                                            className="font-mono uppercase"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading || !couponCode.trim()}
                                            className="shrink-0 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
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

                            {/* QR Code */}
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="w-40 h-40 border rounded-lg bg-muted flex flex-col items-center justify-center p-3">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example_payment_link" alt="Payment QR Code" className="w-full h-full opacity-80" />
                                </div>
                                <p className="text-xs font-medium text-muted-foreground">Scan to Pay via UPI / QR</p>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="transactionId" className="text-sm font-medium">
                            {enrollmentDialog.coursePrice > 0 ? "Transaction / Reference ID" : "Any Reference Note (optional)"}
                        </label>
                        <Input
                            id="transactionId"
                            placeholder={enrollmentDialog.coursePrice > 0 ? "e.g. UPI123456789" : "Optional"}
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null, coursePrice: 0 })} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmEnrollment} disabled={isSubmitting || (enrollmentDialog.coursePrice > 0 && !transactionId.trim())}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {enrollmentDialog.coursePrice > 0 ? "Submit for Verification" : "Enroll Now"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StudentLayout>
    );
}

