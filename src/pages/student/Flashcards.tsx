import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Layers,
    RotateCw,
    Sparkles,
    CheckCircle2,
    XCircle,
    Brain,
    BookOpen,
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Volume2,
    Lightbulb,
    Flame,
    Trophy,
    ArrowRight,
    Filter,
    Clock,
    Zap,
    HelpCircle,
    Check,
    Download
} from "lucide-react";
import { triggerConfetti } from "@/lib/confetti";
import { supabase } from "@/lib/supabase";
import { downloadJsonFile, copyJsonToClipboard, importFlashcardsFromJson } from "@/lib/courseJsonImporter";

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    codeSnippet?: string;
    hint?: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    mastered?: boolean;
}

export interface FlashcardDeck {
    id: string;
    courseId?: string | null;
    course?: string;
    title: string;
    description: string;
    subject: string;
    icon: string;
    color: string;
    cards: Flashcard[];
}

const DEFAULT_DECKS: FlashcardDeck[] = [
    {
        id: "dsa-core",
        title: "Data Structures & Algorithms Core",
        description: "Master time complexities, tree traversals, dynamic programming, and search algorithms for technical evaluations.",
        subject: "Computer Science",
        icon: "⚡",
        color: "from-blue-600 to-indigo-700",
        cards: [
            {
                id: "dsa-1",
                front: "What is the average and worst-case time complexity of QuickSort?",
                back: "Average: O(N log N)\nWorst Case: O(N²) when the selected pivot is always the smallest or largest element (e.g., sorted array with naive pivot selection).",
                hint: "Think about balanced vs unbalanced partitioning trees.",
                category: "Sorting",
                difficulty: "medium"
            },
            {
                id: "dsa-2",
                front: "What are the four essential conditions for Dynamic Programming to apply?",
                back: "1. Optimal Substructure (optimal solution contains optimal solutions to subproblems)\n2. Overlapping Subproblems (same subproblems solved multiple times)\n3. State Transition Equation\n4. Base Cases.",
                hint: "Contrast with Divide & Conquer (which has non-overlapping subproblems).",
                category: "DP",
                difficulty: "hard"
            },
            {
                id: "dsa-3",
                front: "Explain the difference between BFS and DFS traversal and their primary data structures.",
                back: "• BFS (Breadth-First Search): Level-by-level exploration using a QUEUE (FIFO). Best for shortest path in unweighted graphs.\n• DFS (Depth-First Search): Explores as deep as possible before backtracking using a STACK (LIFO or recursion call stack). Best for cycle detection, topological sorting.",
                hint: "Queue vs Stack",
                category: "Graphs",
                difficulty: "easy"
            },
            {
                id: "dsa-4",
                front: "What is an AVL Tree and what is its balance factor formula?",
                back: "An AVL Tree is a self-balancing Binary Search Tree where the height difference between left and right subtrees (Balance Factor = Height(Left) - Height(Right)) is strictly between -1, 0, and +1.",
                hint: "Height of Left minus Height of Right.",
                category: "Trees",
                difficulty: "medium"
            },
            {
                id: "dsa-5",
                front: "What is the amortized time complexity of inserting into a Dynamic Array (e.g., std::vector or ArrayList)?",
                back: "O(1) amortized time. Even though resizing takes O(N) by copying elements into a 2x larger block, the doubling interval spreads the cost such that N insertions take ~3N operations, giving O(1) per insert.",
                hint: "Geometric doubling of capacity amortizes expensive resize passes.",
                category: "Arrays",
                difficulty: "medium"
            }
        ]
    },
    {
        id: "web-dev",
        title: "Web Engineering & React Architecture",
        description: "High-yield concepts covering the Virtual DOM, reconciliation, state management, closures, and modern web performance.",
        subject: "Web Development",
        icon: "⚛️",
        color: "from-cyan-600 to-blue-600",
        cards: [
            {
                id: "web-1",
                front: "How does React's Reconciliation and Fiber Architecture work?",
                back: "React Fiber breaks rendering into incremental units of work. It constructs an internal work-in-progress tree, computes virtual DOM diffs (render phase, interruptible), and flushes actual DOM mutations in a single synchronous commit phase.",
                hint: "Two distinct phases: interruptible render vs synchronous commit.",
                category: "React Core",
                difficulty: "hard"
            },
            {
                id: "web-2",
                front: "What is a JavaScript Closure and give a classic practical use-case?",
                back: "A closure is the combination of a function bundled together with references to its surrounding lexical environment. It allows an inner function to access variables from an outer function even after the outer function has returned. Common uses: data privacy/encapsulation, currying, and memoization.",
                hint: "Functions remember their lexical birthplace.",
                category: "JavaScript",
                difficulty: "medium"
            },
            {
                id: "web-3",
                front: "What is the difference between Server-Side Rendering (SSR) and Client-Side Rendering (CSR)?",
                back: "• SSR: HTML is generated on the server for every request, providing faster First Contentful Paint (FCP) and superior SEO.\n• CSR: Minimal HTML is sent, and client-side JavaScript builds the DOM, resulting in faster subsequent route transitions once downloaded.",
                hint: "Where is HTML generated: server vs browser?",
                category: "Architecture",
                difficulty: "easy"
            },
            {
                id: "web-4",
                front: "What are the rules of React Hooks and why do they exist?",
                back: "1. Only call hooks at the TOP LEVEL (never inside loops, conditions, or nested functions).\n2. Only call hooks from React function components or custom hooks.\nReason: React relies on the sequential order of hook calls between renders to preserve state across calls.",
                hint: "React tracks hooks using an internal linked list keyed by execution index.",
                category: "Hooks",
                difficulty: "easy"
            }
        ]
    },
    {
        id: "db-systems",
        title: "Database Engineering & SQL Transactions",
        description: "ACID properties, B+ Tree indexing, concurrency isolation levels, and relational normalization.",
        subject: "Databases",
        icon: "🗄️",
        color: "from-emerald-600 to-teal-700",
        cards: [
            {
                id: "db-1",
                front: "What does the ACID acronym stand for in Database Transactions?",
                back: "• Atomicity: All or nothing execution.\n• Consistency: Database remains in valid state per constraints.\n• Isolation: Concurrent transactions do not interfere with each other.\n• Durability: Once committed, state changes survive system crashes.",
                hint: "A-C-I-D mnemonic.",
                category: "Transactions",
                difficulty: "easy"
            },
            {
                id: "db-2",
                front: "Why do relational databases use B+ Trees instead of Binary Search Trees for on-disk indexing?",
                back: "1. High fan-out reduces tree height, minimizing expensive disk I/O seek operations.\n2. All actual records/data pointers reside in leaf nodes, which are linked together in a doubly linked list, enabling ultra-fast range queries.",
                hint: "Disk block reads and sequential range scans.",
                category: "Indexing",
                difficulty: "hard"
            },
            {
                id: "db-3",
                front: "Explain the difference between 2NF and 3NF Normalization.",
                back: "• 2NF (Second Normal Form): Must be in 1NF and have NO partial dependency (no non-prime attribute depends on part of a composite primary key).\n• 3NF (Third Normal Form): Must be in 2NF and have NO transitive dependency (non-prime attributes must depend ONLY on the primary key, X → Y → Z).",
                hint: "Partial key dependency (2NF) vs Transitive dependency (3NF).",
                category: "Normalization",
                difficulty: "medium"
            }
        ]
    },
    {
        id: "networks-security",
        title: "Computer Networks & Cyber Protocols",
        description: "OSI 7 Layers, TCP 3-way handshake, TLS encryption, DNS resolution, and HTTP status codes.",
        subject: "Networking",
        icon: "🌐",
        color: "from-purple-600 to-pink-600",
        cards: [
            {
                id: "net-1",
                front: "Name all 7 layers of the OSI model from Layer 1 to Layer 7.",
                back: "1. Physical (Bits / Cables)\n2. Data Link (Frames / MAC)\n3. Network (Packets / IP)\n4. Transport (Segments / TCP, UDP)\n5. Session (Sockets / RPC)\n6. Presentation (SSL, Formatting, JSON)\n7. Application (HTTP, DNS, SSH, SMTP)\nMnemonic: Please Do Not Throw Sausage Pizza Away!",
                hint: "Bottom to top: Physical -> Application",
                category: "OSI Model",
                difficulty: "easy"
            },
            {
                id: "net-2",
                front: "How does the TCP 3-Way Handshake establish a reliable connection?",
                back: "1. Client sends SYN (Synchronize sequence number)\n2. Server responds with SYN-ACK (Acknowledges client and sends server sequence number)\n3. Client sends ACK (Acknowledges server sequence number)\nConnection is now ESTABLISHED.",
                hint: "SYN → SYN-ACK → ACK",
                category: "Protocols",
                difficulty: "easy"
            },
            {
                id: "net-3",
                front: "What is the difference between Symmetric and Asymmetric Encryption?",
                back: "• Symmetric: Uses a single shared key for both encryption and decryption (e.g., AES-256). Very fast.\n• Asymmetric: Uses a mathematically linked keypair—a Public Key for encryption and a Private Key for decryption (e.g., RSA, ECC). Slower, used for key exchange & digital signatures.",
                hint: "One key vs Public/Private keypair.",
                category: "Cryptography",
                difficulty: "medium"
            }
        ]
    }
];

export default function StudentFlashcards() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const courseIdParam = searchParams.get("courseId");

    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
    const [courseInfo, setCourseInfo] = useState<{ id: string; title: string; domain?: string } | null>(null);
    const [enrolledCourses, setEnrolledCourses] = useState<{ id: string; title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdParam || "all");
    const [loading, setLoading] = useState(true);

    const [studyMode, setStudyMode] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("all");
    const [studyStreak, setStudyStreak] = useState(4);
    const [masteredCount, setMasteredCount] = useState(0);

    // Sync selectedCourseId if courseIdParam changes
    useEffect(() => {
        if (courseIdParam) {
            setSelectedCourseId(courseIdParam);
        }
    }, [courseIdParam]);

    // Load Decks & Course Context
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

                    // Check section_contents for this course for embedded flashcards
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
                                    if (c.content_text?.includes("<!-- ORBIT_FLASHCARDS_JSON:")) {
                                        const match = c.content_text.match(/<!-- ORBIT_FLASHCARDS_JSON:\s*(.+?)\s*-->/s);
                                        if (match && match[1]) {
                                            try {
                                                const parsed = JSON.parse(match[1]);
                                                importFlashcardsFromJson(parsed, courseIdParam, cData?.title);
                                            } catch (e) {
                                                console.warn("Error parsing embedded flashcards:", e);
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
                    // 2. No courseId in URL: fetch student's enrolled courses from Supabase
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

                // 3. Load stored decks from localStorage
                const stored = localStorage.getItem("orbit_flashcard_decks");
                let allStoredDecks: FlashcardDeck[] = [];
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            allStoredDecks = parsed.map((d: any) => ({
                                id: d.id,
                                courseId: d.courseId || null,
                                course: d.course || d.subject || "Course Deck",
                                title: d.title,
                                description: d.description || "",
                                subject: d.subject || d.course || "General",
                                icon: d.icon || "⚡",
                                color: d.color || "from-blue-600 to-indigo-700",
                                cards: Array.isArray(d.cards) ? d.cards : []
                            }));
                        }
                    } catch (err) {
                        console.error("Error parsing stored decks:", err);
                    }
                }

                // 4. Strict Scoping Filter: NEVER show un-enrolled / un-scoped mock cards
                let scopedDecks: FlashcardDeck[] = [];
                if (courseIdParam) {
                    const targetTitleNorm = (currentCourseTitle || "").trim().toLowerCase();
                    scopedDecks = allStoredDecks.filter(d => {
                        if (d.courseId === courseIdParam) return true;
                        if (targetTitleNorm && d.course?.trim().toLowerCase() === targetTitleNorm) return true;
                        if (targetTitleNorm && d.subject?.trim().toLowerCase() === targetTitleNorm) return true;
                        return false;
                    });
                } else {
                    // Filter by selectedCourseId or all enrolled courses
                    scopedDecks = allStoredDecks.filter(d => {
                        if (selectedCourseId !== "all") {
                            return d.courseId === selectedCourseId;
                        }
                        if (userEnrolledIds.length > 0) {
                            const enrolledIds = new Set(userEnrolledIds);
                            const enrolledTitles = new Set(userEnrolledCoursesList.map(c => c.title.trim().toLowerCase()));
                            if (d.courseId && enrolledIds.has(d.courseId)) return true;
                            if (d.course && enrolledTitles.has(d.course.trim().toLowerCase())) return true;
                            return false;
                        }
                        return false;
                    });
                }

                if (isMounted) {
                    setDecks(scopedDecks);
                    if (scopedDecks.length > 0) {
                        setSelectedDeck(scopedDecks[0]);
                    } else {
                        setSelectedDeck(null);
                    }
                }
            } catch (e) {
                console.error("Error loading flashcards:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [courseIdParam, selectedCourseId]);

    // New Deck Creation State
    const [createDeckOpen, setCreateDeckOpen] = useState(false);
    const [newDeckTitle, setNewDeckTitle] = useState("");
    const [newDeckDesc, setNewDeckDesc] = useState("");
    const [newDeckSubject, setNewDeckSubject] = useState("Computer Science");

    // Add Card Modal State
    const [addCardOpen, setAddCardOpen] = useState(false);
    const [newCardFront, setNewCardFront] = useState("");
    const [newCardBack, setNewCardBack] = useState("");
    const [newCardHint, setNewCardHint] = useState("");
    const [newCardCategory, setNewCardCategory] = useState("General");

    const currentCard = selectedDeck && selectedDeck.cards && selectedDeck.cards.length > 0
        ? (selectedDeck.cards[currentCardIndex] || selectedDeck.cards[0])
        : null;

    // Filtered Decks
    const filteredDecks = decks.filter(d => {
        const matchesQuery = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = selectedSubject === "all" || d.subject.toLowerCase() === selectedSubject.toLowerCase();
        return matchesQuery && matchesSubject;
    });

    const subjects = ["all", ...Array.from(new Set(decks.map(d => d.subject)))];

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleNextCard = () => {
        if (!selectedDeck || !selectedDeck.cards) return;
        if (currentCardIndex < selectedDeck.cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
            setShowHint(false);
        } else {
            // Deck Complete!
            triggerConfetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
            toast({
                title: "Deck Completed! 🏆 +50 Aura XP",
                description: `You reviewed all ${selectedDeck.cards.length} cards in ${selectedDeck.title}.`
            });
        }
    };

    const handlePrevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
            setShowHint(false);
        }
    };

    const handleRateDifficulty = (level: 'again' | 'hard' | 'good' | 'easy') => {
        if (level === 'easy' || level === 'good') {
            setMasteredCount(prev => prev + 1);
        }

        toast({
            title: level === 'easy' ? "Marked Easy ⚡" : level === 'good' ? "Good Progress 👍" : "Queued for Review ⏳",
            description: level === 'again' ? "Will repeat shortly in this session." : "Spaced repetition schedule updated."
        });

        handleNextCard();
    };

    const handleCreateDeck = () => {
        if (!newDeckTitle.trim()) {
            toast({ variant: "destructive", title: "Missing title", description: "Please enter a deck name." });
            return;
        }

        const effectiveCourseId = courseIdParam || (selectedCourseId !== "all" ? selectedCourseId : null);
        const effectiveCourseTitle = courseInfo?.title || 
            (effectiveCourseId ? enrolledCourses.find(c => c.id === effectiveCourseId)?.title : null) || 
            newDeckSubject;

        const newDeck: FlashcardDeck = {
            id: `deck-${Date.now()}`,
            courseId: effectiveCourseId,
            course: effectiveCourseTitle,
            title: newDeckTitle,
            description: newDeckDesc || "Custom course study flashcards deck.",
            subject: effectiveCourseTitle,
            icon: "🧠",
            color: "from-amber-500 to-orange-600",
            cards: [
                {
                    id: `card-${Date.now()}`,
                    front: `Key Concept: ${newDeckTitle}`,
                    back: "Enter your complete definition, formula, or exam answer here.",
                    hint: "Review module notes.",
                    category: "Core Concept",
                    difficulty: "medium"
                }
            ]
        };

        // Update localStorage
        try {
            const stored = localStorage.getItem("orbit_flashcard_decks");
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [newDeck, ...(Array.isArray(existing) ? existing : [])];
            localStorage.setItem("orbit_flashcard_decks", JSON.stringify(updated));
        } catch (e) {
            console.error("Error saving deck:", e);
        }

        setDecks([newDeck, ...decks]);
        setSelectedDeck(newDeck);
        setCreateDeckOpen(false);
        setNewDeckTitle("");
        setNewDeckDesc("");
        toast({
            title: "Deck Created Successfully! 🎉",
            description: `"${newDeck.title}" is ready for active recall practice.`
        });
    };

    const handleAddCardToDeck = () => {
        if (!selectedDeck) return;
        if (!newCardFront.trim() || !newCardBack.trim()) {
            toast({ variant: "destructive", title: "Incomplete Card", description: "Both front prompt and back answer are required." });
            return;
        }

        const newCard: Flashcard = {
            id: `card-${Date.now()}`,
            front: newCardFront,
            back: newCardBack,
            hint: newCardHint,
            category: newCardCategory,
            difficulty: "medium"
        };

        const updatedCards = [...(selectedDeck.cards || []), newCard];
        const updatedDeck = { ...selectedDeck, cards: updatedCards };

        setSelectedDeck(updatedDeck);
        const updatedDecks = decks.map(d => d.id === updatedDeck.id ? updatedDeck : d);
        setDecks(updatedDecks);

        // Update localStorage
        try {
            const stored = localStorage.getItem("orbit_flashcard_decks");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const saved = parsed.map((d: any) => d.id === updatedDeck.id ? updatedDeck : d);
                    localStorage.setItem("orbit_flashcard_decks", JSON.stringify(saved));
                }
            }
        } catch (e) {
            console.error("Error updating deck storage:", e);
        }

        setAddCardOpen(false);
        setNewCardFront("");
        setNewCardBack("");
        setNewCardHint("");

        toast({
            title: "Card Added to Deck 📝",
            description: `New flashcard saved to "${selectedDeck.title}".`
        });
    };

    const handleExportDecks = async () => {
        try {
            downloadJsonFile(decks, "my_flashcard_decks.json");
            await copyJsonToClipboard(decks);
            toast({
                title: "Flashcards Exported! 📥",
                description: "Downloaded my_flashcard_decks.json & copied JSON to clipboard."
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
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 -ml-2">
                                <ChevronLeft className="h-4 w-4" /> Back to Course Player
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Viewing Course:</span>
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
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
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">Filter by Enrolled Course:</span>
                        </div>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            aria-label="Filter by Enrolled Course"
                            className="h-8 text-xs rounded-lg border border-border bg-background px-3 py-1 text-foreground font-medium focus:ring-1 focus:ring-primary outline-none"
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
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <Layers className="h-5 w-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                {courseIdParam ? `${courseInfo?.title || "Course"} Flashcards` : "Active Recall Flashcards"}
                            </h1>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                                {courseIdParam ? "Course-Scoped" : "Spaced Repetition"}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                            {courseIdParam
                                ? `Active recall memory decks strictly author-published for ${courseInfo?.title || "this course"}.`
                                : "Master high-yield concepts, exam definitions, algorithms, and key terms through active recall intervals."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Streak & Mastery Stats */}
                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/60 border text-xs">
                            <span className="flex items-center gap-1 font-bold text-orange-500">
                                <Flame className="h-4 w-4" /> {studyStreak} Day Streak
                            </span>
                            <span className="text-muted-foreground">|</span>
                            <span className="flex items-center gap-1 font-mono text-emerald-500">
                                <Trophy className="h-3.5 w-3.5" /> {masteredCount} Mastered
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportDecks}
                            className="gap-1.5 text-xs font-semibold h-9 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                        >
                            <Download className="h-3.5 w-3.5" /> Export JSON
                        </Button>

                        {/* Create Custom Deck Dialog */}
                        <Dialog open={createDeckOpen} onOpenChange={setCreateDeckOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 text-xs font-semibold h-9 shadow-sm bg-primary hover:bg-primary/90">
                                    <Plus className="h-4 w-4" /> Create Deck
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base">
                                        <Plus className="h-4 w-4 text-primary" /> Create New Flashcard Deck
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2 text-xs">
                                    <div>
                                        <label className="font-semibold text-foreground">Deck Title</label>
                                        <Input
                                            placeholder="e.g. Operating Systems Kernel & Threads"
                                            value={newDeckTitle}
                                            onChange={e => setNewDeckTitle(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Academic Subject</label>
                                        <Input
                                            placeholder="e.g. Computer Science, Mathematics, Electronics"
                                            value={newDeckSubject}
                                            onChange={e => setNewDeckSubject(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Description / Exam Target</label>
                                        <Textarea
                                            placeholder="What syllabus or exam units does this deck target?"
                                            value={newDeckDesc}
                                            onChange={e => setNewDeckDesc(e.target.value)}
                                            className="mt-1 text-xs"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" size="sm" onClick={() => setCreateDeckOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleCreateDeck}>Create Deck</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* View Switch: Study Mode vs Deck Library */}
                {studyMode ? (
                    /* Interactive 3D Card Study Mode */
                    <div className="space-y-6 max-w-3xl mx-auto">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStudyMode(false)}
                                className="gap-1.5 text-xs font-semibold"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to Deck Library
                            </Button>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    Card {selectedDeck && selectedDeck.cards?.length ? currentCardIndex + 1 : 0} of {selectedDeck?.cards?.length || 0}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCardOpen(true)}
                                    className="h-7 text-xs gap-1 border-primary/30 text-primary"
                                >
                                    <Plus className="h-3 w-3" /> Add Card
                                </Button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                <span>Progress</span>
                                <span>{selectedDeck?.cards?.length ? Math.round(((currentCardIndex + 1) / selectedDeck.cards.length) * 100) : 0}%</span>
                            </div>
                            <Progress value={selectedDeck?.cards?.length ? ((currentCardIndex + 1) / selectedDeck.cards.length) * 100 : 0} className="h-2" />
                        </div>

                        {/* 3D Flip Card Container */}
                        {!currentCard ? (
                            <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-card space-y-3">
                                <p className="text-sm font-semibold text-muted-foreground">This deck does not have any cards yet.</p>
                                <Button size="sm" onClick={() => setAddCardOpen(true)} className="gap-1.5 text-xs">
                                    <Plus className="h-4 w-4" /> Add First Card
                                </Button>
                            </div>
                        ) : (
                            <div
                                onClick={handleFlip}
                                className="cursor-pointer perspective-[1000px] min-h-[340px] sm:min-h-[380px] w-full"
                            >
                                <div className={`relative w-full h-full min-h-[340px] sm:min-h-[380px] rounded-2xl border-2 transition-all duration-500 shadow-xl p-6 sm:p-8 flex flex-col justify-between ${
                                    isFlipped
                                        ? "bg-gradient-to-br from-indigo-950/40 via-card to-background border-indigo-500/50"
                                        : "bg-gradient-to-br from-card via-muted/20 to-background border-border hover:border-primary/50"
                                }`}>
                                    {/* Card Header Info */}
                                    <div className="flex items-center justify-between border-b pb-3">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                {currentCard?.category || selectedDeck?.subject || "Core"}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] uppercase font-mono ${
                                                    currentCard?.difficulty === 'hard'
                                                        ? 'border-red-500/40 text-red-500'
                                                        : currentCard?.difficulty === 'medium'
                                                            ? 'border-amber-500/40 text-amber-500'
                                                            : 'border-emerald-500/40 text-emerald-500'
                                                }`}
                                            >
                                                {currentCard?.difficulty || 'Core'}
                                            </Badge>
                                        </div>

                                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                            <RotateCw className="h-3.5 w-3.5 text-primary" />
                                            {isFlipped ? "Answer / Solution" : "Prompt / Question"}
                                        </span>
                                    </div>

                                    {/* Main Card Content */}
                                    <div className="py-6 sm:py-8 flex-1 flex flex-col items-center justify-center text-center">
                                        {!isFlipped ? (
                                            <div className="space-y-4">
                                                <p className="text-lg sm:text-2xl font-bold font-display text-foreground leading-snug max-w-xl">
                                                    {currentCard?.front}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Click anywhere or press Space to reveal answer
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 text-left w-full max-w-xl">
                                                <div className="p-4 rounded-xl bg-muted/60 border border-border/80 text-sm leading-relaxed text-foreground whitespace-pre-line font-sans">
                                                    {currentCard?.back}
                                                </div>

                                                {currentCard?.hint && (
                                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                                                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <span><strong>Memory Hook:</strong> {currentCard.hint}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer Hint & Flip Guide */}
                                    <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground" onClick={e => e.stopPropagation()}>
                                        <div>
                                            {!isFlipped && currentCard?.hint && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowHint(!showHint)}
                                                    className="h-7 text-xs gap-1 text-amber-500 hover:text-amber-600"
                                                >
                                                    <Lightbulb className="h-3.5 w-3.5" />
                                                    {showHint ? currentCard.hint : "Show Hint"}
                                                </Button>
                                            )}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleFlip}
                                            className="h-7 text-xs gap-1"
                                        >
                                            <RotateCw className="h-3 w-3" /> Flip Card
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Spaced Repetition Response Controls */}
                        {isFlipped ? (
                            <div className="space-y-2 p-4 rounded-xl bg-card border shadow-sm">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                                    How well did you recall this concept? (Spaced Interval)
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRateDifficulty('again')}
                                        className="border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 flex flex-col py-2 h-auto text-xs"
                                    >
                                        <span className="font-bold">Again</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">&lt; 1 min</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRateDifficulty('hard')}
                                        className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex flex-col py-2 h-auto text-xs"
                                    >
                                        <span className="font-bold">Hard</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">1 day</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRateDifficulty('good')}
                                        className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex flex-col py-2 h-auto text-xs"
                                    >
                                        <span className="font-bold">Good</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">3 days</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRateDifficulty('easy')}
                                        className="border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex flex-col py-2 h-auto text-xs"
                                    >
                                        <span className="font-bold">Easy</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">7 days</span>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrevCard}
                                    disabled={currentCardIndex === 0}
                                    className="gap-1 text-xs"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>

                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleNextCard}
                                    className="gap-1 text-xs font-semibold"
                                >
                                    Next Card <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Deck Catalog View */
                    <div className="space-y-6">
                        {/* Search & Subject Filters */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search flashcards, topics, algorithms..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                                {subjects.map(s => (
                                    <Button
                                        key={s}
                                        size="sm"
                                        variant={selectedSubject === s ? "default" : "outline"}
                                        onClick={() => setSelectedSubject(s)}
                                        className="h-8 text-xs capitalize shrink-0 font-medium"
                                    >
                                        {s === "all" ? "All Subjects" : s}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Decks Grid or Course Empty State */}
                        {filteredDecks.length === 0 ? (
                            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border bg-card/50 space-y-4">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
                                    <Layers className="h-7 w-7" />
                                </div>
                                <div className="max-w-md mx-auto space-y-1.5">
                                    <h3 className="text-lg font-bold text-foreground">
                                        {courseIdParam 
                                            ? `No Flashcards Found for ${courseInfo?.title || "this Course"}`
                                            : "No Course Flashcard Decks Available"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {courseIdParam
                                            ? "The instructor has not added flashcards to this course curriculum yet. You can create personal study cards for this course or return to the course player."
                                            : "Active recall flashcard decks are tied to your enrolled courses. Once course instructors publish flashcards, or when you create your own, they will appear here."}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                                    {courseIdParam ? (
                                        <Link to={`/student/courses/${courseIdParam}/learn`}>
                                            <Button variant="default" size="sm" className="gap-1.5 text-xs font-semibold">
                                                <ChevronLeft className="h-4 w-4" /> Return to Course Player
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link to="/student/courses">
                                            <Button variant="default" size="sm" className="gap-1.5 text-xs font-semibold">
                                                <BookOpen className="h-4 w-4" /> View My Courses
                                            </Button>
                                        </Link>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setCreateDeckOpen(true)} className="gap-1.5 text-xs font-semibold">
                                        <Plus className="h-4 w-4" /> Create Study Cards
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredDecks.map(deck => (
                                    <Card
                                        key={deck.id}
                                        className="border shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group overflow-hidden border-border hover:border-primary/40"
                                    >
                                        <div className={`h-2 bg-gradient-to-r ${deck.color}`} />
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-2xl p-2 rounded-xl bg-muted/80">{deck.icon}</span>
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {deck.cards?.length || 0} Cards
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors mt-2">
                                                {deck.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                                                {deck.description}
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="pt-0 space-y-3">
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                                <span className="capitalize">{deck.subject || deck.course}</span>
                                                <span>Active Recall Ready</span>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2 border-t">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedDeck(deck);
                                                        setCurrentCardIndex(0);
                                                        setIsFlipped(false);
                                                        setStudyMode(true);
                                                    }}
                                                    className="w-full gap-1.5 text-xs font-semibold h-8 shadow-xs"
                                                >
                                                    <Brain className="h-3.5 w-3.5" /> Study Deck
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Add Card Modal */}
                <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <Plus className="h-4 w-4 text-primary" /> Add Card to "{selectedDeck?.title || 'Course Deck'}"
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2 text-xs">
                            <div>
                                <label className="font-semibold text-foreground">Front Prompt / Question</label>
                                <Input
                                    placeholder="e.g. What is the CAP Theorem?"
                                    value={newCardFront}
                                    onChange={e => setNewCardFront(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-foreground">Back Answer / Complete Solution</label>
                                <Textarea
                                    placeholder="Provide the complete technical definition, formula, or steps..."
                                    value={newCardBack}
                                    onChange={e => setNewCardBack(e.target.value)}
                                    className="mt-1 text-xs"
                                    rows={4}
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-foreground">Memory Hint / Hook (Optional)</label>
                                <Input
                                    placeholder="e.g. Pick any two between C, A, and P"
                                    value={newCardHint}
                                    onChange={e => setNewCardHint(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-foreground">Topic Category</label>
                                <Input
                                    placeholder="e.g. System Design, Distributed Systems"
                                    value={newCardCategory}
                                    onChange={e => setNewCardCategory(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setAddCardOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleAddCardToDeck}>Add Card</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </StudentLayout>
    );
}
