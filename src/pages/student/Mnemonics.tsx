import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    BrainCircuit,
    Lightbulb,
    Sparkles,
    Search,
    BookOpen,
    Bookmark,
    BookmarkCheck,
    CheckCircle2,
    Copy,
    Share2,
    Zap,
    Trophy,
    HelpCircle,
    RotateCw,
    Plus,
    Check,
    Quote,
    Download,
    ChevronLeft
} from "lucide-react";
import { triggerConfetti } from "@/lib/confetti";
import { supabase } from "@/lib/supabase";
import { downloadJsonFile, copyJsonToClipboard, importMnemonicsFromJson } from "@/lib/courseJsonImporter";

export interface MnemonicItem {
    id: string;
    courseId?: string | null;
    course?: string;
    phrase: string;
    acronym: string;
    title: string;
    subject: string;
    category: string;
    explanation: string;
    breakdown: {
        letter: string;
        word: string;
        meaning: string;
        example?: string;
    }[];
    examTip: string;
    isBookmarked?: boolean;
}

const PRESET_MNEMONICS: MnemonicItem[] = [
    {
        id: "mne-osi",
        title: "OSI 7 Layers (Bottom to Top)",
        acronym: "PDNTSPA",
        phrase: "Please Do Not Throw Sausage Pizza Away",
        subject: "Computer Networks",
        category: "Network Architecture",
        explanation: "Memorizes the standard 7 Open Systems Interconnection layers starting from Layer 1 (Physical) to Layer 7 (Application).",
        breakdown: [
            { letter: "P", word: "Physical (Layer 1)", meaning: "Transmits raw bitstream over physical media (cables, fiber, RF radio signals).", example: "RJ45, Ethernet cables, Hubs" },
            { letter: "D", word: "Data Link (Layer 2)", meaning: "Node-to-node data transfer, error framing, and physical MAC addressing.", example: "Ethernet switches, MAC addresses" },
            { letter: "N", word: "Network (Layer 3)", meaning: "Routing packets across networks and logical IP addressing.", example: "IPv4/IPv6, Routers, ICMP" },
            { letter: "T", word: "Transport (Layer 4)", meaning: "End-to-end delivery, flow control, segmentation, and reliability.", example: "TCP, UDP, Ports" },
            { letter: "S", word: "Session (Layer 5)", meaning: "Establishes, manages, and terminates interactive dialogue sessions between applications.", example: "RPC, Sockets, NetBIOS" },
            { letter: "P", word: "Presentation (Layer 6)", meaning: "Data translation, character encoding, compression, and cryptographic encryption.", example: "SSL/TLS, JSON, JPEG, ASCII" },
            { letter: "A", word: "Application (Layer 7)", meaning: "End-user interface and application protocols.", example: "HTTP/HTTPS, DNS, SSH, SMTP" }
        ],
        examTip: "If the question asks from Top to Bottom (Layer 7 to 1), reverse it: 'All People Seem To Need Data Processing'!",
        isBookmarked: true
    },
    {
        id: "mne-acid",
        title: "ACID Database Transaction Properties",
        acronym: "ACID",
        phrase: "Atomic Code Is Durable",
        subject: "Databases",
        category: "Transaction Management",
        explanation: "The four non-negotiable guarantees required for reliable database transaction processing.",
        breakdown: [
            { letter: "A", word: "Atomicity", meaning: "All-or-nothing execution. Either all modifications commit, or the entire transaction is rolled back.", example: "Bank transfer: money deducted from A must reach B, or nothing happens" },
            { letter: "C", word: "Consistency", meaning: "The database transitions from one valid state to another, strictly obeying all constraints and foreign keys.", example: "Account balance cannot drop below min balance constraint" },
            { letter: "I", word: "Isolation", meaning: "Concurrent transactions execute independently without partial reads or dirty data interference.", example: "Serializable / Repeatable Read isolation levels" },
            { letter: "D", word: "Durability", meaning: "Once a transaction is committed, changes survive system crashes and power failures via WAL (Write-Ahead Logging).", example: "Disk sync & transaction log recovery" }
        ],
        examTip: "Examiners love asking about Isolation Anomalies: Dirty Reads, Non-repeatable Reads, and Phantom Reads!"
    },
    {
        id: "mne-solid",
        title: "SOLID Principles of Object-Oriented Design",
        acronym: "SOLID",
        phrase: "Software Organizes Logical Interfaces Dependably",
        subject: "Software Engineering",
        category: "Design Patterns",
        explanation: "Five core design principles introduced by Robert C. Martin (Uncle Bob) to build maintainable, decoupled codebases.",
        breakdown: [
            { letter: "S", word: "Single Responsibility", meaning: "A class or module should have only one reason to change, fulfilling one focused purpose.", example: "Separate InvoiceCalculator from InvoicePdfPrinter" },
            { letter: "O", word: "Open / Closed", meaning: "Software entities should be open for extension, but closed for modification.", example: "Use interfaces and polymorphism instead of modifying core switch statements" },
            { letter: "L", word: "Liskov Substitution", meaning: "Subclasses must be substitutable for their base classes without breaking program correctness.", example: "Square extending Rectangle is a classic LSP violation" },
            { letter: "I", word: "Interface Segregation", meaning: "Clients should not be forced to depend on methods they do not use; prefer small, specific interfaces.", example: "Printer vs Scanner interfaces instead of bloated God-Interface" },
            { letter: "D", word: "Dependency Inversion", meaning: "High-level modules should not depend on low-level modules; both should depend on abstractions.", example: "Inject interfaces via Constructor Dependency Injection" }
        ],
        examTip: "Always tie Liskov Substitution Principle to behavioral subtyping when writing long-form answers."
    },
    {
        id: "mne-http",
        title: "HTTP Status Code Families",
        acronym: "1-2-3-4-5",
        phrase: "1xx Hold on, 2xx Here you go, 3xx Go away, 4xx You screwed up, 5xx I screwed up",
        subject: "Web Development",
        category: "Protocols",
        explanation: "Quick rule of thumb for identifying the five classes of HTTP server response status codes.",
        breakdown: [
            { letter: "1xx", word: "Informational", meaning: "Request received, continuing process.", example: "100 Continue, 101 Switching Protocols" },
            { letter: "2xx", word: "Success", meaning: "Action was successfully received, understood, and accepted.", example: "200 OK, 201 Created, 204 No Content" },
            { letter: "3xx", word: "Redirection", meaning: "Further action must be taken by client to complete request.", example: "301 Moved Permanently, 304 Not Modified" },
            { letter: "4xx", word: "Client Error", meaning: "Request contains bad syntax or cannot be fulfilled due to client mistake.", example: "400 Bad Request, 401 Unauthorized, 404 Not Found" },
            { letter: "5xx", word: "Server Error", meaning: "Server failed to fulfill an apparently valid request.", example: "500 Internal Server Error, 502 Bad Gateway, 503 Unavailable" }
        ],
        examTip: "Remember 401 means Unauthorized (missing credentials), whereas 403 means Forbidden (credentials known but lacking permission)!"
    },
    {
        id: "mne-tcp",
        title: "TCP 3-Way Handshake",
        acronym: "SYN-ACK",
        phrase: "Say You're Near, Affirm Correct Knot, Acknowledge Connection",
        subject: "Computer Networks",
        category: "Transport Layer",
        explanation: "The connection establishment protocol ensuring both client and server are synchronized and ready before sending payload.",
        breakdown: [
            { letter: "1", word: "SYN", meaning: "Client transmits SYN segment containing client Initial Sequence Number (ISN_c).", example: "Flags: SYN=1, ACK=0" },
            { letter: "2", word: "SYN-ACK", meaning: "Server responds acknowledging client sequence and transmitting server sequence (ISN_s).", example: "Flags: SYN=1, ACK=1" },
            { letter: "3", word: "ACK", meaning: "Client sends acknowledgment of server sequence. Full duplex connection established.", example: "Flags: ACK=1" }
        ],
        examTip: "Connection teardown requires 4 packets (FIN, ACK, FIN, ACK) because TCP connections are full-duplex and close in halves!"
    },
    {
        id: "mne-oops",
        title: "Core Pillars of Object-Oriented Programming (OOPS)",
        acronym: "APIE",
        phrase: "A Pie: Abstraction, Polymorphism, Inheritance, Encapsulation",
        subject: "Computer Science",
        category: "Software Fundamentals",
        explanation: "The four bedrock foundations of object-oriented languages (Java, C++, Python, TypeScript).",
        breakdown: [
            { letter: "A", word: "Abstraction", meaning: "Hiding internal implementation details and exposing only the essential interface to the outside world.", example: "Abstract classes, interfaces" },
            { letter: "P", word: "Polymorphism", meaning: "The ability of an entity to take multiple forms (compile-time overloading vs runtime overriding).", example: "shape.draw() behaving differently for Circle and Square" },
            { letter: "I", word: "Inheritance", meaning: "Mechanism where a new class inherits properties and behaviors from an existing superclass.", example: "class Dog extends Animal" },
            { letter: "E", word: "Encapsulation", meaning: "Bundling data (attributes) and methods that operate on that data into a single unit, with private access restrictions.", example: "Private variables with getters/setters" }
        ],
        examTip: "Abstraction focuses on WHAT an object does, while Encapsulation focuses on HOW it hides its internal state."
    }
];

export default function StudentMnemonics() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const courseIdParam = searchParams.get("courseId");

    const [mnemonics, setMnemonics] = useState<MnemonicItem[]>([]);
    const [selectedMnemonic, setSelectedMnemonic] = useState<MnemonicItem | null>(null);
    const [courseInfo, setCourseInfo] = useState<{ id: string; title: string; domain?: string } | null>(null);
    const [enrolledCourses, setEnrolledCourses] = useState<{ id: string; title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdParam || "all");
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [filterBookmarked, setFilterBookmarked] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [revealedLetters, setRevealedLetters] = useState<Record<number, boolean>>({});

    // Sync selectedCourseId if courseIdParam changes
    useEffect(() => {
        if (courseIdParam) {
            setSelectedCourseId(courseIdParam);
        }
    }, [courseIdParam]);

    // Load Mnemonics & Course Context
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                let currentCourseTitle = "";
                let userEnrolledIds: string[] = [];
                let userEnrolledCoursesList: { id: string; title: string }[] = [];

                // 1. If courseIdParam is present, fetch course metadata
                if (courseIdParam) {
                    const { data: cData } = await supabase
                        .from("courses")
                        .select("id, title, domain")
                        .eq("id", courseIdParam)
                        .maybeSingle();
                    if (isMounted && cData) {
                        setCourseInfo(cData);
                        currentCourseTitle = cData.title;
                    }

                    // Check section_contents for embedded mnemonics
                    try {
                        const { data: sections } = await supabase
                            .from("course_sections")
                            .select("id")
                            .eq("course_id", courseIdParam);
                        if (sections && sections.length > 0) {
                            const secIds = sections.map(s => s.id);
                            const { data: contents } = await supabase
                                .from("section_contents")
                                .select("id, title, content_text")
                                .in("section_id", secIds);
                            if (contents) {
                                for (const c of contents) {
                                    if (c.content_text?.includes("<!-- ORBIT_MNEMONICS_JSON:")) {
                                        const match = c.content_text.match(/<!-- ORBIT_MNEMONICS_JSON:\s*(.+?)\s*-->/s);
                                        if (match && match[1]) {
                                            try {
                                                const parsed = JSON.parse(match[1]);
                                                importMnemonicsFromJson(parsed, courseIdParam, cData?.title);
                                            } catch (e) {
                                                console.warn("Error parsing embedded mnemonics:", e);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (secErr) {
                        console.warn("Could not check section contents:", secErr);
                    }
                } else {
                    // 2. No courseId in URL: fetch student's enrolled courses
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: enrollments } = await supabase
                            .from("enrollments")
                            .select("course_id, courses(id, title)")
                            .eq("student_id", user.id);
                        if (enrollments && enrollments.length > 0) {
                            userEnrolledCoursesList = enrollments
                                .map((e: any) => e.courses ? { id: e.courses.id, title: e.courses.title } : null)
                                .filter(Boolean) as { id: string; title: string }[];
                            userEnrolledIds = userEnrolledCoursesList.map(c => c.id);
                            if (isMounted) setEnrolledCourses(userEnrolledCoursesList);
                        }
                    }
                }

                // 3. Load stored mnemonics from localStorage
                const stored = localStorage.getItem("orbit_mnemonics");
                let allStoredMnemonics: MnemonicItem[] = [];
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            allStoredMnemonics = parsed.map((m: any) => ({
                                id: m.id,
                                courseId: m.courseId || null,
                                course: m.course || m.subject || "Course Mnemonic",
                                title: m.title || "Concept",
                                acronym: m.acronym || "MNE",
                                phrase: m.phrase || "",
                                subject: m.subject || m.course || "General",
                                category: m.category || "General",
                                explanation: m.explanation || "",
                                breakdown: Array.isArray(m.breakdown) ? m.breakdown : [],
                                examTip: m.examTip || m.exam_tip || "",
                                isBookmarked: Boolean(m.isBookmarked)
                            }));
                        }
                    } catch (err) {
                        console.error("Error parsing stored mnemonics:", err);
                    }
                }

                // 4. Strict Scoping Filter: NEVER show un-enrolled / un-scoped mock mnemonics
                let scopedMnemonics: MnemonicItem[] = [];
                if (courseIdParam) {
                    const targetTitleNorm = (currentCourseTitle || "").trim().toLowerCase();
                    scopedMnemonics = allStoredMnemonics.filter(m => {
                        if (m.courseId === courseIdParam) return true;
                        if (targetTitleNorm && m.course?.trim().toLowerCase() === targetTitleNorm) return true;
                        if (targetTitleNorm && m.subject?.trim().toLowerCase() === targetTitleNorm) return true;
                        return false;
                    });
                } else {
                    // Filter by selectedCourseId or all enrolled courses
                    scopedMnemonics = allStoredMnemonics.filter(m => {
                        if (selectedCourseId !== "all") {
                            return m.courseId === selectedCourseId;
                        }
                        if (userEnrolledIds.length > 0) {
                            const enrolledIds = new Set(userEnrolledIds);
                            const enrolledTitles = new Set(userEnrolledCoursesList.map(c => c.title.trim().toLowerCase()));
                            if (m.courseId && enrolledIds.has(m.courseId)) return true;
                            if (m.course && enrolledTitles.has(m.course.trim().toLowerCase())) return true;
                            return false;
                        }
                        return false;
                    });
                }

                if (isMounted) {
                    setMnemonics(scopedMnemonics);
                    if (scopedMnemonics.length > 0) {
                        setSelectedMnemonic(scopedMnemonics[0]);
                    } else {
                        setSelectedMnemonic(null);
                    }
                }
            } catch (e) {
                console.error("Error loading mnemonics:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [courseIdParam, selectedCourseId]);

    // Mnemonic Generator Modal State
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [genTopic, setGenTopic] = useState("");
    const [genWords, setGenWords] = useState("");
    const [genSubject, setGenSubject] = useState("Computer Science");
    const [generating, setGenerating] = useState(false);

    const categories = ["all", ...Array.from(new Set(mnemonics.map(m => m.subject)))];

    const filteredMnemonics = mnemonics.filter(m => {
        const matchesQuery = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.acronym.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || m.subject.toLowerCase() === selectedCategory.toLowerCase();
        const matchesBookmark = !filterBookmarked || m.isBookmarked;
        return matchesQuery && matchesCategory && matchesBookmark;
    });

    const toggleBookmark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setMnemonics(prev => prev.map(m => {
            if (m.id === id) {
                const nextState = !m.isBookmarked;
                toast({
                    title: nextState ? "Mnemonic Bookmarked 📌" : "Bookmark Removed",
                    description: nextState ? `Added "${m.title}" to quick exam revision.` : "Removed from saved list."
                });
                return { ...m, isBookmarked: nextState };
            }
            return m;
        }));
    };

    const handleCopyMnemonic = (m: MnemonicItem) => {
        const text = `
💡 [ORBIT LMS MNEMONIC] ${m.title}
Acronym : ${m.acronym}
Hook    : "${m.phrase}"

BREAKDOWN:
${m.breakdown.map(b => `• ${b.letter}: ${b.word} — ${b.meaning}`).join('\n')}

Exam Tip: ${m.examTip}
`.trim();

        navigator.clipboard.writeText(text);
        toast({
            title: "Mnemonic Copied to Clipboard! 📋",
            description: "Ready to share with study groups or notes."
        });
    };

    const handleGenerateMnemonic = () => {
        if (!genWords.trim() || !genTopic.trim()) {
            toast({ variant: "destructive", title: "Missing Terms", description: "Enter topic name and comma-separated items." });
            return;
        }

        setGenerating(true);
        setTimeout(() => {
            const rawList = genWords.split(',').map(w => w.trim()).filter(Boolean);
            const letters = rawList.map(w => w.charAt(0).toUpperCase()).join('');

            // Sample generated phrase based on first letters
            const funWords: Record<string, string[]> = {
                A: ["Always", "Agile", "Adaptive"],
                B: ["Build", "Brilliant", "Binary"],
                C: ["Clean", "Clever", "Connected"],
                D: ["Deploy", "Dynamic", "Data"],
                E: ["Efficient", "Engineered", "Exact"],
                F: ["Fast", "Flawless", "Focused"],
                G: ["Global", "Great", "Guaranteed"],
                H: ["High-speed", "Harmonious", "Healthy"],
                I: ["Intelligent", "Innovative", "Instant"],
                J: ["Joint", "Joyful"],
                K: ["Keen", "Key"],
                L: ["Logical", "Linked", "Layered"],
                M: ["Master", "Modular", "Modern"],
                N: ["Networked", "Next-gen", "Neat"],
                O: ["Optimal", "Open", "Organized"],
                P: ["Powerful", "Precise", "Protected"],
                Q: ["Quick", "Quality"],
                R: ["Reliable", "Robust", "Rapid"],
                S: ["Smart", "Scalable", "Secure"],
                T: ["Tested", "Trusted", "Total"],
                U: ["Unified", "Ultimate", "Ultra"],
                V: ["Verified", "Versatile", "Vital"],
                W: ["Well-architected", "Wise"],
                X: ["Xtra"],
                Y: ["Yielding"],
                Z: ["Zero-defect"]
            };

            const phraseWords = letters.split('').map((char, idx) => {
                const list = funWords[char] || ["Great"];
                return list[idx % list.length];
            });

            const effectiveCourseId = courseIdParam || (selectedCourseId !== "all" ? selectedCourseId : null);
            const effectiveCourseTitle = courseInfo?.title || 
                (effectiveCourseId ? enrolledCourses.find(c => c.id === effectiveCourseId)?.title : null) || 
                genSubject;

            const newMne: MnemonicItem = {
                id: `mne-gen-${Date.now()}`,
                courseId: effectiveCourseId,
                course: effectiveCourseTitle,
                title: genTopic,
                acronym: letters,
                phrase: phraseWords.join(' '),
                subject: effectiveCourseTitle,
                category: "Custom Student Mnemonic",
                explanation: `Custom cognitive memory technique generated for ${genTopic}.`,
                breakdown: rawList.map((item, idx) => ({
                    letter: item.charAt(0).toUpperCase(),
                    word: item,
                    meaning: `Core concept in ${genTopic} memorized via letter '${item.charAt(0).toUpperCase()}'.`
                })),
                examTip: `Remember the rhythm: "${phraseWords.join(' ')}" during your exam!`,
                isBookmarked: true
            };

            // Save to localStorage
            try {
                const stored = localStorage.getItem("orbit_mnemonics");
                const existing = stored ? JSON.parse(stored) : [];
                const updated = [newMne, ...(Array.isArray(existing) ? existing : [])];
                localStorage.setItem("orbit_mnemonics", JSON.stringify(updated));
            } catch (e) {
                console.error("Error saving mnemonic:", e);
            }

            setMnemonics([newMne, ...mnemonics]);
            setSelectedMnemonic(newMne);
            setGenerating(false);
            setGeneratorOpen(false);
            setGenTopic("");
            setGenWords("");

            triggerConfetti({
                particleCount: 60,
                spread: 60,
                origin: { y: 0.6 }
            });

            toast({
                title: "Mnemonic Generated! ✨",
                description: `Created acronym "${newMne.acronym}" — "${newMne.phrase}"`
            });
        }, 600);
    };

    const toggleLetterReveal = (idx: number) => {
        setRevealedLetters(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const handleExportMnemonics = async () => {
        try {
            downloadJsonFile(mnemonics, "my_mnemonics.json");
            await copyJsonToClipboard(mnemonics);
            toast({
                title: "Mnemonics Exported! 📥",
                description: "Downloaded my_mnemonics.json & copied JSON to clipboard."
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Export Error", description: e.message });
        }
    };

    return (
        <StudentLayout>
            <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20 animate-in fade-in duration-300">
                {/* Course Context Header / Breadcrumb */}
                {courseIdParam ? (
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 flex-wrap gap-2">
                        <Link to={`/student/courses/${courseIdParam}/learn`}>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 -ml-2">
                                <ChevronLeft className="h-4 w-4" /> Back to Course Player
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Viewing Course:</span>
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                                {courseInfo?.title || "Enrolled Course"}
                            </Badge>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <Link to="/student/courses">
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground -ml-2">
                                <ChevronLeft className="h-4 w-4" /> Back to My Courses
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Enrolled Course Filter (When accessed from main navigation) */}
                {!courseIdParam && enrolledCourses.length > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-foreground">Filter by Enrolled Course:</span>
                        </div>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            aria-label="Filter by Enrolled Course"
                            className="h-8 text-xs rounded-lg border border-border bg-background px-3 py-1 text-foreground font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                            <option value="all">All Enrolled Courses ({enrolledCourses.length})</option>
                            {enrolledCourses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                <BrainCircuit className="h-5 w-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                {courseIdParam ? `${courseInfo?.title || "Course"} Mnemonics` : "Mnemonics & Memory Studio"}
                            </h1>
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-mono">
                                {courseIdParam ? "Course-Scoped" : "Cognitive Learning Aids"}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                            {courseIdParam
                                ? `Cognitive memory hooks and acronym breakdowns published for ${courseInfo?.title || "this course"}.`
                                : "Lock complex sequences, architectural layers, protocols, and formulas into long-term memory through catchy acronyms and mental hooks."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportMnemonics}
                            className="h-9 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5 font-semibold"
                        >
                            <Download className="h-3.5 w-3.5" /> Export JSON
                        </Button>

                        <Button
                            variant={filterBookmarked ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterBookmarked(!filterBookmarked)}
                            className="h-9 text-xs gap-1.5"
                        >
                            <Bookmark className="h-3.5 w-3.5" />
                            {filterBookmarked ? "Showing Bookmarks" : "Saved Bookmarks"}
                        </Button>

                        {/* Mnemonic Generator Dialog */}
                        <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 text-xs font-semibold h-9 shadow-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                                    <Sparkles className="h-4 w-4" /> Generate Mnemonic
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base">
                                        <Sparkles className="h-4 w-4 text-amber-500" /> Smart Mnemonic Generator
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2 text-xs">
                                    <div>
                                        <label className="font-semibold text-foreground">Concept or Topic Title</label>
                                        <Input
                                            placeholder="e.g. SDLC Phases, Machine Learning Pipeline"
                                            value={genTopic}
                                            onChange={e => setGenTopic(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Subject / Course</label>
                                        <Input
                                            placeholder="e.g. Software Engineering, AI & Robotics"
                                            value={genSubject}
                                            onChange={e => setGenSubject(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Terms to Memorize (Comma Separated)</label>
                                        <Textarea
                                            placeholder="e.g. Planning, Analysis, Design, Implementation, Testing, Maintenance"
                                            value={genWords}
                                            onChange={e => setGenWords(e.target.value)}
                                            className="mt-1 text-xs"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" size="sm" onClick={() => setGeneratorOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleGenerateMnemonic} disabled={generating}>
                                        {generating ? "Crafting Memory Hook..." : "Generate Mnemonic ✨"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Main Content Layout: Sidebar List & Deep Dive Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Mnemonics Catalog (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Search and Filters */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search mnemonics, OSI, ACID, SOLID..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                {categories.map(c => (
                                    <Button
                                        key={c}
                                        size="sm"
                                        variant={selectedCategory === c ? "default" : "outline"}
                                        onClick={() => setSelectedCategory(c)}
                                        className="h-7 text-[11px] capitalize shrink-0 px-2.5"
                                    >
                                        {c === "all" ? "All Subjects" : c}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* List of Mnemonics */}
                        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                            {filteredMnemonics.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs space-y-3">
                                    <BrainCircuit className="h-8 w-8 mx-auto text-muted-foreground/40" />
                                    <p className="font-semibold text-foreground">No Mnemonics Found For This Course</p>
                                    <p className="text-xs text-muted-foreground">
                                        {courseIdParam
                                            ? "This course does not have published mnemonics yet. Generate your own or check back later!"
                                            : "No mnemonics available for your enrolled courses."}
                                    </p>
                                    {courseIdParam && (
                                        <Link to={`/student/courses/${courseIdParam}/learn`}>
                                            <Button variant="outline" size="sm" className="text-xs mt-2">
                                                Return to Course Player
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                filteredMnemonics.map(m => {
                                    const isSelected = selectedMnemonic?.id === m.id;
                                    return (
                                        <Card
                                            key={m.id}
                                            onClick={() => {
                                                setSelectedMnemonic(m);
                                                setTestMode(false);
                                                setRevealedLetters({});
                                            }}
                                            className={`cursor-pointer transition-all border shadow-xs hover:shadow-md ${
                                                isSelected
                                                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                                                    : 'hover:border-amber-500/40'
                                            }`}
                                        >
                                            <CardContent className="p-3.5 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                                                            {m.title}
                                                        </h3>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {m.subject} • {m.category}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="font-mono text-[10px] bg-background">
                                                            {m.acronym}
                                                        </Badge>
                                                        <button
                                                            onClick={(e) => toggleBookmark(m.id, e)}
                                                            className="text-muted-foreground hover:text-amber-500 p-1 rounded"
                                                        >
                                                            {m.isBookmarked ? (
                                                                <BookmarkCheck className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                                                            ) : (
                                                                <Bookmark className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-2 rounded-md bg-muted/60 text-xs italic text-foreground font-serif border border-border/50">
                                                    "{m.phrase}"
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Deep Dive & Interactive Breakdown (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        {!selectedMnemonic ? (
                            <Card className="border border-dashed p-12 text-center flex flex-col items-center justify-center min-h-[420px] bg-card/50">
                                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
                                    <BrainCircuit className="h-8 w-8" />
                                </div>
                                <h3 className="font-bold text-lg text-foreground mb-1">
                                    {courseIdParam ? `No Mnemonics for ${courseInfo?.title || "this Course"}` : "No Mnemonic Selected"}
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                                    {courseIdParam
                                        ? "This course curriculum does not currently include published mnemonics. You can generate a custom cognitive hook or return to course study modules."
                                        : "Select a mnemonic from the left catalog or generate a brand new memory acronym hook."}
                                </p>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    {courseIdParam && (
                                        <Link to={`/student/courses/${courseIdParam}/learn`}>
                                            <Button variant="default" size="sm" className="gap-1.5 text-xs font-semibold">
                                                <ChevronLeft className="h-4 w-4" /> Return to Course Player
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setGeneratorOpen(true)}
                                        className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" /> Generate Mnemonic
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <Card className="border shadow-md overflow-hidden border-amber-500/30">
                            {/* Card Header Banner */}
                            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5 sm:p-6 border-b border-amber-500/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className="bg-amber-500 text-white font-mono text-xs">
                                                {selectedMnemonic.acronym}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {selectedMnemonic.subject}
                                            </Badge>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground mt-2">
                                            {selectedMnemonic.title}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCopyMnemonic(selectedMnemonic)}
                                            className="h-8 text-xs gap-1"
                                        >
                                            <Copy className="h-3.5 w-3.5" /> Copy
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={testMode ? "default" : "outline"}
                                            onClick={() => {
                                                setTestMode(!testMode);
                                                setRevealedLetters({});
                                            }}
                                            className="h-8 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                        >
                                            <Zap className="h-3.5 w-3.5" />
                                            {testMode ? "Exit Recall Test" : "Test Recall ⚡"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Catchy Hook Box */}
                                <div className="mt-4 p-4 rounded-xl bg-background/90 border border-amber-500/30 shadow-xs flex items-start gap-3">
                                    <Quote className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                                            Memory Phrase Hook
                                        </span>
                                        <p className="text-base sm:text-lg font-bold font-serif italic text-foreground mt-0.5">
                                            "{selectedMnemonic.phrase}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-5 sm:p-6 space-y-5">
                                {/* Explanation */}
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    {selectedMnemonic.explanation}
                                </p>

                                {/* Letter-by-Letter Breakdown Ledger */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                            <BookOpen className="h-4 w-4 text-primary" /> Concept Breakdown
                                        </h3>
                                        {testMode && (
                                            <span className="text-[11px] text-amber-500 font-mono animate-pulse">
                                                Click any card to reveal its answer!
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {selectedMnemonic.breakdown.map((item, idx) => {
                                            const isRevealed = !testMode || revealedLetters[idx];
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => testMode && toggleLetterReveal(idx)}
                                                    className={`p-3.5 rounded-xl border transition-all ${
                                                        testMode ? 'cursor-pointer hover:border-amber-500' : ''
                                                    } ${
                                                        isRevealed
                                                            ? 'bg-card border-border/80'
                                                            : 'bg-muted/40 border-dashed border-amber-500/40 text-center py-5'
                                                    }`}
                                                >
                                                    {!isRevealed ? (
                                                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">
                                                            <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm font-bold">
                                                                {item.letter}
                                                            </div>
                                                            <span>Click to reveal word & explanation</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold font-mono text-sm shrink-0 shadow-xs">
                                                                {item.letter}
                                                            </div>
                                                            <div className="space-y-1 flex-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <h4 className="font-bold text-sm text-foreground">
                                                                        {item.word}
                                                                    </h4>
                                                                    {item.example && (
                                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                                            {item.example}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                                    {item.meaning}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Exam Tip Box */}
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-3 text-xs">
                                    <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-primary uppercase text-[10px] tracking-wider block">
                                            High-Yield Examination Strategy
                                        </span>
                                        <p className="text-foreground mt-0.5 leading-relaxed">
                                            {selectedMnemonic.examTip}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
