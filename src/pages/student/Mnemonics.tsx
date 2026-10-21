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
    ChevronLeft,
    FileText,
    Loader2
} from "lucide-react";
import { triggerConfetti } from "@/lib/confetti";
import { supabase } from "@/lib/supabase";
import { downloadJsonFile, copyJsonToClipboard, importMnemonicsFromJson } from "@/lib/courseJsonImporter";
import { downloadMnemonicsPdf } from "@/lib/pdfReportGenerator";

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
    },
    {
        id: "mne-cap",
        title: "CAP Theorem in Distributed Systems",
        acronym: "CAP",
        phrase: "Choose Any Pair: Consistency, Availability, Partition tolerance",
        subject: "Distributed Systems",
        category: "System Architecture",
        explanation: "States that a distributed data store can simultaneously provide at most two of the three guarantees in presence of network partitions.",
        breakdown: [
            { letter: "C", word: "Consistency", meaning: "Every read receives the most recent write or an error.", example: "Raft, Paxos consensus algorithms" },
            { letter: "A", word: "Availability", meaning: "Every non-failing node returns a non-error response for every request.", example: "DynamoDB, Cassandra" },
            { letter: "P", word: "Partition Tolerance", meaning: "The cluster continues to operate despite arbitrary message loss or delay between nodes.", example: "Required in all real-world WAN networks" }
        ],
        examTip: "In real-world networks where network partitions (P) are inevitable, you must choose between CP (Consistency) or AP (Availability)!"
    },
    {
        id: "mne-rest",
        title: "REST Architecture 6 Constraints",
        acronym: "CS-C-U-L-S-C",
        phrase: "Can Smart Coders Use Layered Server Code?",
        subject: "Web Development",
        category: "APIs & Web Services",
        explanation: "The six architectural constraints defined by Roy Fielding that make an API truly RESTful.",
        breakdown: [
            { letter: "C", word: "Client-Server", meaning: "Separation of concerns: user interface is separated from data storage.", example: "React client communicating with Go backend" },
            { letter: "S", word: "Stateless", meaning: "Each request from client must contain all information necessary to process it.", example: "JWT bearer authentication" },
            { letter: "C", word: "Cacheable", meaning: "Responses must explicitly define themselves as cacheable or non-cacheable.", example: "Cache-Control: max-age=3600" },
            { letter: "U", word: "Uniform Interface", meaning: "Consistent URI naming, resource manipulation via representations, and HATEOAS.", example: "GET /api/v1/students/123" },
            { letter: "L", word: "Layered System", meaning: "Client cannot ordinarily tell whether it is connected directly to end server or intermediary.", example: "Reverse proxies, load balancers, CDNs" },
            { letter: "C", word: "Code on Demand (Optional)", meaning: "Servers can temporarily extend client functionality by transferring executable code.", example: "Applets or client-side scripts" }
        ],
        examTip: "HATEOAS (Hypermedia As The Engine Of Application State) is the key requirement for level 3 of the Richardson Maturity Model!"
    },
    {
        id: "mne-cia",
        title: "CIA Triad in Information Security",
        acronym: "CIA",
        phrase: "Cyber Intelligence Armor",
        subject: "Cybersecurity",
        category: "Security Fundamentals",
        explanation: "The three foundational pillars guiding information security policies, threat modeling, and defensive architecture.",
        breakdown: [
            { letter: "C", word: "Confidentiality", meaning: "Protecting sensitive data against unauthorized inspection, surveillance, and exfiltration.", example: "AES-256 GCM encryption, RBAC, Least Privilege" },
            { letter: "I", word: "Integrity", meaning: "Guaranteeing information cannot be altered, forged, or tampered with without detection.", example: "Cryptographic SHA-256 hashes, HMAC, digital signatures" },
            { letter: "A", word: "Availability", meaning: "Ensuring critical systems, nodes, and networks remain reliably accessible to authorized users.", example: "Redundant clusters, multi-region failover, DDoS shielding" }
        ],
        examTip: "The Parkerian Hexad expands the CIA Triad by adding Authenticity, Possession, and Utility."
    },
    {
        id: "mne-base",
        title: "BASE Distributed Database Model",
        acronym: "BASE",
        phrase: "Big Apps Stay Elastic",
        subject: "Databases",
        category: "NoSQL Systems",
        explanation: "The distributed storage model chosen by NoSQL databases that prioritizes partition availability and elastic scaling over strict immediate consistency.",
        breakdown: [
            { letter: "BA", word: "Basically Available", meaning: "The cluster guarantees availability by responding to every request, even if degraded.", example: "Cassandra, DynamoDB, MongoDB clusters" },
            { letter: "S", word: "Soft State", meaning: "System state can change over time without explicit external writes due to node convergence.", example: "Gossip protocol propagation across nodes" },
            { letter: "E", word: "Eventual Consistency", meaning: "In the absence of new writes, all data replicas eventually converge to identical values.", example: "Read repair, hinted handoff, DNS propagation" }
        ],
        examTip: "Contrast BASE directly with ACID in distributed database exams: BASE embraces AP under CAP theorem."
    },
    {
        id: "mne-sched",
        title: "Process Lifecycle States (Operating Systems)",
        acronym: "NRWRT",
        phrase: "Never Run With Rotten Toys",
        subject: "Operating Systems",
        category: "Process Management",
        explanation: "The five core execution states traversed by every thread and process managed by the operating system kernel scheduler.",
        breakdown: [
            { letter: "N", word: "New", meaning: "Process is created via fork()/spawn and its Process Control Block (PCB) is allocated.", example: "PCB memory initialization" },
            { letter: "R", word: "Ready", meaning: "Process resides loaded in RAM waiting in queue for CPU timeslice assignment.", example: "Scheduler ready queue" },
            { letter: "R", word: "Running", meaning: "Process CPU instructions are actively executing on an assigned processor core.", example: "Instruction execution on CPU" },
            { letter: "W", word: "Waiting / Blocked", meaning: "Process voluntarily relinquishes CPU awaiting I/O disk, network packet, or mutex lock.", example: "epoll wait, disk read I/O" },
            { letter: "T", word: "Terminated", meaning: "Process finishes execution; kernel frees allocated pages and reclaims PID.", example: "Zombie reap via waitpid()" }
        ],
        examTip: "The short-term CPU dispatcher only governs transitions between the Ready and Running states!"
    },
    {
        id: "mne-dns",
        title: "DNS Common Resource Record Types",
        acronym: "AMCNST",
        phrase: "All Mail Can Name Servers Always",
        subject: "Computer Networks",
        category: "Domain Name System",
        explanation: "The essential DNS resource record types responsible for IP resolution, mail routing, authority delegation, and domain validation.",
        breakdown: [
            { letter: "A", word: "A / AAAA Record", meaning: "Address record mapping domain to IPv4 (A) or 128-bit IPv6 (AAAA).", example: "api.orbitlms.com -> 192.0.2.1" },
            { letter: "M", word: "MX Record", meaning: "Mail Exchange record pointing to destination email servers with preference weight.", example: "10 mail.orbitlms.com" },
            { letter: "C", word: "CNAME Record", meaning: "Canonical Name record creating an alias pointing one subdomain to another domain.", example: "www -> orbitlms.com" },
            { letter: "N", word: "NS Record", meaning: "Name Server record delegating authority of a DNS zone to specific nameservers.", example: "ns1.cloudflare.com" },
            { letter: "S", word: "SOA Record", meaning: "Start of Authority record containing administrative contact, zone serial, and TTLs.", example: "Primary NS & refresh timers" },
            { letter: "T", word: "TXT Record", meaning: "Text record carrying human or machine readable verification tokens.", example: "SPF, DKIM, Google Search Console" }
        ],
        examTip: "RFC 1912 forbids placing a CNAME record at the zone apex (@ root domain); use ALIAS or ANAME instead!"
    }
];

function normalizeMnemonic(m: any, defaultCourse?: string): MnemonicItem {
    return {
        id: m.id || `mne-${Math.random().toString(36).slice(2, 9)}`,
        courseId: m.courseId || null,
        course: m.course || m.subject || defaultCourse || "Core Curriculum",
        title: m.title || "Core Principle",
        acronym: m.acronym || "MNE",
        phrase: m.phrase || "",
        subject: m.subject || m.course || defaultCourse || "Computer Science",
        category: m.category || "General",
        explanation: m.explanation || `Core mnemonic hook for ${m.title || "active recall"}.`,
        breakdown: Array.isArray(m.breakdown) && m.breakdown.length > 0
            ? m.breakdown
            : (m.acronym || "MNE").split("").map((ch: string) => ({ letter: ch, word: ch, meaning: `Key element for ${m.title || "memory hook"}` })),
        examTip: m.examTip || m.exam_tip || "Master the sequence and acronym associations for high-scoring exam responses.",
        isBookmarked: Boolean(m.isBookmarked)
    };
}

function getInitialMnemonics(): MnemonicItem[] {
    try {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("orbit_mnemonics");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const normalized = parsed.map(m => normalizeMnemonic(m));
                    const existingIds = new Set(normalized.map(n => n.id));
                    const missingPresets = PRESET_MNEMONICS.filter(p => !existingIds.has(p.id));
                    return [...normalized, ...missingPresets];
                }
            }
        }
    } catch (e) {}
    return PRESET_MNEMONICS;
}

export default function StudentMnemonics() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const courseIdParam = searchParams.get("courseId");

    // Initialize synchronously with comprehensive preset list so page is NEVER blank
    const [mnemonics, setMnemonics] = useState<MnemonicItem[]>(getInitialMnemonics);
    const [selectedMnemonic, setSelectedMnemonic] = useState<MnemonicItem | null>(() => {
        const initial = getInitialMnemonics();
        return initial[0] || null;
    });

    const [courseInfo, setCourseInfo] = useState<{ id: string; title: string; domain?: string } | null>(null);
    const [enrolledCourses, setEnrolledCourses] = useState<{ id: string; title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdParam || "all");
    const [scopeFilter, setScopeFilter] = useState<"all" | "course" | "bookmarked">("all");
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [filterBookmarked, setFilterBookmarked] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [revealedLetters, setRevealedLetters] = useState<Record<number, boolean>>({});
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const [userRole, setUserRole] = useState<string>(() => {
        return (sessionStorage.getItem("userRole") || "student").toLowerCase();
    });

    const isMasterStaff = typeof window !== "undefined" && sessionStorage.getItem('isMasterStaff') === 'true';
    const canManageMnemonics = isMasterStaff || [
        "teacher",
        "faculty",
        "instructor",
        "admin",
        "super_admin",
        "master_admin",
        "master_staff"
    ].includes(userRole);

    // Sync selectedCourseId if courseIdParam changes
    useEffect(() => {
        if (courseIdParam) {
            setSelectedCourseId(courseIdParam);
        }
    }, [courseIdParam]);

    // Ensure selectedMnemonic is always pointing to an existing mnemonic
    useEffect(() => {
        if (mnemonics.length > 0) {
            if (!selectedMnemonic || !mnemonics.some(m => m.id === selectedMnemonic.id)) {
                setSelectedMnemonic(mnemonics[0]);
            }
        }
    }, [mnemonics, selectedMnemonic]);

    // Load Mnemonics & Course Context safely in background
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                let currentCourseTitle = "";
                let userEnrolledIds: string[] = [];
                let userEnrolledCoursesList: { id: string; title: string }[] = [];

                // 1. Resolve user role safely
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && isMounted) {
                        let role = (
                            user.app_metadata?.user_role ||
                            user.user_metadata?.role ||
                            sessionStorage.getItem("userRole") ||
                            "student"
                        ).toLowerCase();
                        try {
                            const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
                            if (dbUser?.role) role = dbUser.role.toLowerCase();
                        } catch (e) {}
                        setUserRole(role);
                    }
                } catch (authErr) {
                    console.warn("Could not resolve user session in mnemonics:", authErr);
                }

                // 2. Fetch course metadata safely if courseIdParam is present
                if (courseIdParam) {
                    try {
                        const { data: cData } = await supabase
                            .from("courses")
                            .select("id, title, domain")
                            .eq("id", courseIdParam)
                            .maybeSingle();
                        if (isMounted && cData) {
                            setCourseInfo(cData);
                            currentCourseTitle = cData.title;
                        }
                    } catch (cErr) {
                        console.warn("Could not fetch course metadata:", cErr);
                    }

                    // Check section_contents for embedded course mnemonics
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
                                                importMnemonicsFromJson(parsed, courseIdParam, currentCourseTitle);
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
                    // Fetch student's enrolled courses safely
                    try {
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
                    } catch (enrErr) {
                        console.warn("Could not fetch enrollments:", enrErr);
                    }
                }

                // 3. Load stored mnemonics from localStorage safely
                let allStoredMnemonics: MnemonicItem[] = [];
                try {
                    const stored = localStorage.getItem("orbit_mnemonics");
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            allStoredMnemonics = parsed.map(m => normalizeMnemonic(m, currentCourseTitle));
                        }
                    }
                } catch (err) {
                    console.error("Error reading stored mnemonics:", err);
                }

                // Ensure all PRESET_MNEMONICS exist in localStorage master cache
                const existingIds = new Set(allStoredMnemonics.map(m => m.id));
                const missingPresets = PRESET_MNEMONICS.filter(p => !existingIds.has(p.id));
                const masterPool = [...allStoredMnemonics, ...missingPresets];

                try {
                    localStorage.setItem("orbit_mnemonics", JSON.stringify(masterPool));
                } catch (e) {}

                // 4. Combine custom course mnemonics + curriculum core mnemonics
                let displayList: MnemonicItem[] = [];
                if (courseIdParam) {
                    const targetTitleNorm = (currentCourseTitle || "").trim().toLowerCase();
                    // Course-specific custom items
                    const courseCustom = masterPool.filter(m => {
                        if (m.courseId === courseIdParam) return true;
                        if (targetTitleNorm && m.course?.trim().toLowerCase() === targetTitleNorm) return true;
                        return false;
                    });

                    // Curriculum core items adapted for active course
                    const curriculumCore = PRESET_MNEMONICS.map(p => ({
                        ...p,
                        course: currentCourseTitle || "Curriculum Core"
                    }));

                    // Deduplicate by ID
                    const seenIds = new Set<string>();
                    for (const item of [...courseCustom, ...curriculumCore]) {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            displayList.push(item);
                        }
                    }
                } else {
                    displayList = masterPool.length > 0 ? masterPool : PRESET_MNEMONICS;
                }

                if (isMounted) {
                    setMnemonics(displayList);
                    if (displayList.length > 0) {
                        setSelectedMnemonic(prev => {
                            if (prev && displayList.some(m => m.id === prev.id)) {
                                return prev;
                            }
                            return displayList[0];
                        });
                    }
                }
            } catch (e) {
                console.error("Error in mnemonics pipeline:", e);
                if (isMounted) {
                    setMnemonics(PRESET_MNEMONICS);
                    setSelectedMnemonic(PRESET_MNEMONICS[0]);
                }
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

    const courseSpecificCount = mnemonics.filter(m => m.courseId === courseIdParam || (courseInfo?.title && m.course?.toLowerCase() === courseInfo.title.toLowerCase())).length;
    const bookmarkedCount = mnemonics.filter(m => m.isBookmarked).length;

    const filteredMnemonics = mnemonics.filter(m => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = !query ||
            m.title.toLowerCase().includes(query) ||
            m.phrase.toLowerCase().includes(query) ||
            m.acronym.toLowerCase().includes(query) ||
            m.subject.toLowerCase().includes(query) ||
            (m.breakdown && m.breakdown.some(b => b.word.toLowerCase().includes(query) || b.meaning.toLowerCase().includes(query)));
        const matchesCategory = selectedCategory === "all" || m.subject.toLowerCase() === selectedCategory.toLowerCase();
        const matchesBookmark = !filterBookmarked || m.isBookmarked;
        const matchesScope = scopeFilter === "all" ||
            (scopeFilter === "course" && (m.courseId === courseIdParam || (courseInfo?.title && m.course?.toLowerCase() === courseInfo.title.toLowerCase()))) ||
            (scopeFilter === "bookmarked" && m.isBookmarked);
        return matchesQuery && matchesCategory && matchesBookmark && matchesScope;
    });

    // Ensure selectedMnemonic is always pointing to an existing mnemonic in filteredMnemonics
    useEffect(() => {
        if (filteredMnemonics.length > 0) {
            if (!selectedMnemonic || !filteredMnemonics.some(m => m.id === selectedMnemonic.id)) {
                setSelectedMnemonic(filteredMnemonics[0]);
            }
        }
    }, [filteredMnemonics, selectedMnemonic]);

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

    const handleDownloadPdf = async () => {
        if (!mnemonics || mnemonics.length === 0) {
            toast({ variant: "destructive", title: "No Mnemonics", description: "There are no mnemonics to download." });
            return;
        }
        setIsDownloadingPdf(true);
        try {
            await downloadMnemonicsPdf({
                mnemonics,
                courseTitle: courseInfo?.title || (selectedCourseId !== "all" ? enrolledCourses.find(c => c.id === selectedCourseId)?.title : "Curriculum Mnemonics") || "Curriculum Mnemonics"
            });
            toast({
                title: "PDF Study Guide Downloaded! 📄",
                description: "Official mnemonics guide generated with institutional letterhead and water drop watermark."
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "PDF Generation Failed", description: e.message });
        } finally {
            setIsDownloadingPdf(false);
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
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf || mnemonics.length === 0}
                            className="h-9 text-xs gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
                        >
                            {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                            Download PDF
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

                        {/* Mnemonic Generator Dialog - Visible only to Teacher, Admin, and Master Admin */}
                        {canManageMnemonics && (
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
                        )}
                    </div>
                </div>

                {/* Main Content Layout: Sidebar List & Deep Dive Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Mnemonics Catalog (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Search and Filters */}
                        <div className="space-y-2.5">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search mnemonics, OSI, ACID, SOLID..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* Scope Tabs (All / Course Mapped / Bookmarked) */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={scopeFilter === "all" ? "default" : "outline"}
                                    onClick={() => setScopeFilter("all")}
                                    className="h-7 text-[11px] px-2.5 font-semibold"
                                >
                                    All ({mnemonics.length})
                                </Button>
                                {courseIdParam && (
                                    <Button
                                        size="sm"
                                        variant={scopeFilter === "course" ? "default" : "outline"}
                                        onClick={() => setScopeFilter("course")}
                                        className="h-7 text-[11px] px-2.5 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400"
                                    >
                                        Course Core ({courseSpecificCount})
                                    </Button>
                                )}
                                {bookmarkedCount > 0 && (
                                    <Button
                                        size="sm"
                                        variant={scopeFilter === "bookmarked" ? "default" : "outline"}
                                        onClick={() => setScopeFilter("bookmarked")}
                                        className="h-7 text-[11px] px-2.5 font-semibold"
                                    >
                                        Saved ({bookmarkedCount})
                                    </Button>
                                )}
                            </div>

                            {/* Subject Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                {categories.map(c => (
                                    <Button
                                        key={c}
                                        size="sm"
                                        variant={selectedCategory === c ? "default" : "ghost"}
                                        onClick={() => setSelectedCategory(c)}
                                        className="h-6 text-[10px] capitalize shrink-0 px-2 rounded-full border border-border/50"
                                    >
                                        {c === "all" ? "All Subjects" : c}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* List of Mnemonics */}
                        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                            {filteredMnemonics.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground text-xs space-y-3 bg-muted/20">
                                    <BrainCircuit className="h-8 w-8 mx-auto text-amber-500/60" />
                                    <p className="font-semibold text-foreground text-sm">No Mnemonics Match Filter</p>
                                    <p className="text-xs text-muted-foreground">
                                        {searchQuery
                                            ? `No memory hooks matched "${searchQuery}". Reset filters to view all ${mnemonics.length} cognitive aids.`
                                            : "No memory hooks found for this subject or filter."}
                                    </p>
                                    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSelectedCategory("all");
                                                setFilterBookmarked(false);
                                                setScopeFilter("all");
                                            }}
                                            className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5"
                                        >
                                            <RotateCw className="h-3.5 w-3.5" /> Show All {mnemonics.length} Mnemonics
                                        </Button>
                                        {courseIdParam && (
                                            <Link to={`/student/courses/${courseIdParam}/learn`}>
                                                <Button variant="outline" size="sm" className="text-xs">
                                                    Return to Course Player
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                filteredMnemonics.map(m => {
                                    const isSelected = selectedMnemonic?.id === m.id;
                                    const isCourseMapped = m.courseId === courseIdParam || (courseInfo?.title && m.course?.toLowerCase() === courseInfo.title.toLowerCase());
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
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {isCourseMapped ? (
                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-semibold py-0 px-1.5">
                                                                    Course Mapped
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[9px] text-muted-foreground py-0 px-1.5">
                                                                    Curriculum Core
                                                                </Badge>
                                                            )}
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {m.subject} • {m.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                                                            {m.title}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
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
                                    Select a Mnemonic
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                                    Select any mnemonic card from the left catalog to inspect the active recall breakdown, test yourself, or download printable cheat sheets.
                                </p>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedCategory("all");
                                            setFilterBookmarked(false);
                                            setScopeFilter("all");
                                            if (mnemonics.length > 0) setSelectedMnemonic(mnemonics[0]);
                                        }}
                                        className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" /> View Core Curriculum Mnemonics
                                    </Button>
                                    {courseIdParam && (
                                        <Link to={`/student/courses/${courseIdParam}/learn`}>
                                            <Button variant="outline" size="sm" className="text-xs">
                                                Return to Course Player
                                            </Button>
                                        </Link>
                                    )}
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
