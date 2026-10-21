import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
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
    Plus,
    Search,
    BookOpen,
    Copy,
    Share2,
    Sparkles,
    ExternalLink,
    Download,
    Upload,
    FileText,
    Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportAllMnemonicsToJson, downloadJsonFile, copyJsonToClipboard } from "@/lib/courseJsonImporter";
import { downloadMnemonicsPdf } from "@/lib/pdfReportGenerator";

interface TeacherMnemonicItem {
    id: string;
    courseId?: string | null;
    title: string;
    acronym: string;
    phrase: string;
    course: string;
    termsCount: number;
    verified: boolean;
}

export default function TeacherMnemonics() {
    const { toast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [acronym, setAcronym] = useState("");
    const [phrase, setPhrase] = useState("");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [customCourseName, setCustomCourseName] = useState("");
    const [terms, setTerms] = useState("");
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    const [mnemonics, setMnemonics] = useState<TeacherMnemonicItem[]>([]);

    // Smart Generator Modal State
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [genTopic, setGenTopic] = useState("");
    const [genSubject, setGenSubject] = useState("");
    const [genWords, setGenWords] = useState("");
    const [generating, setGenerating] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const { data } = await supabase.from("courses").select("id, title").order("title");
                if (data) {
                    setCourses(data);
                }
            } catch (err) {
                console.warn("Could not fetch courses:", err);
            }
        }
        fetchCourses();
    }, []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("orbit_mnemonics");
            let list: any[] = [];
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    list = parsed;
                }
            }
            if (list.length === 0) {
                list = [
                    {
                        id: "mne-osi",
                        title: "OSI 7 Layers (Bottom to Top)",
                        acronym: "PDNTSPA",
                        phrase: "Please Do Not Throw Sausage Pizza Away",
                        subject: "Computer Networks",
                        course: "Computer Networks",
                        category: "Network Architecture",
                        explanation: "Memorizes the standard 7 Open Systems Interconnection layers starting from Layer 1 (Physical) to Layer 7 (Application).",
                        breakdown: [
                            { letter: "P", word: "Physical (Layer 1)", meaning: "Transmits raw bitstream over physical media (cables, fiber, RF radio signals)." },
                            { letter: "D", word: "Data Link (Layer 2)", meaning: "Node-to-node data transfer, error framing, and physical MAC addressing." },
                            { letter: "N", word: "Network (Layer 3)", meaning: "Routing packets across networks and logical IP addressing." },
                            { letter: "T", word: "Transport (Layer 4)", meaning: "End-to-end delivery, flow control, segmentation, and reliability." },
                            { letter: "S", word: "Session (Layer 5)", meaning: "Establishes, manages, and terminates interactive dialogue sessions between applications." },
                            { letter: "P", word: "Presentation (Layer 6)", meaning: "Data translation, character encoding, compression, and cryptographic encryption." },
                            { letter: "A", word: "Application (Layer 7)", meaning: "End-user interface and application protocols." }
                        ],
                        examTip: "If the question asks from Top to Bottom (Layer 7 to 1), reverse it: 'All People Seem To Need Data Processing'!",
                        termsCount: 7,
                        verified: true
                    },
                    {
                        id: "mne-acid",
                        title: "ACID Database Transaction Properties",
                        acronym: "ACID",
                        phrase: "Atomic Code Is Durable",
                        subject: "Databases",
                        course: "Database Systems",
                        category: "Transaction Management",
                        explanation: "The four non-negotiable guarantees required for reliable database transaction processing.",
                        breakdown: [
                            { letter: "A", word: "Atomicity", meaning: "All-or-nothing execution. Modifications commit or roll back entirely." },
                            { letter: "C", word: "Consistency", meaning: "The database transitions from one valid state to another obeying all constraints." },
                            { letter: "I", word: "Isolation", meaning: "Concurrent transactions execute independently without partial reads or dirty data interference." },
                            { letter: "D", word: "Durability", meaning: "Once a transaction commits, changes survive crashes via Write-Ahead Logging (WAL)." }
                        ],
                        examTip: "Examiners love asking about Isolation Anomalies: Dirty Reads, Non-repeatable Reads, and Phantom Reads!",
                        termsCount: 4,
                        verified: true
                    },
                    {
                        id: "mne-solid",
                        title: "SOLID Principles of Object-Oriented Design",
                        acronym: "SOLID",
                        phrase: "Software Organizes Logical Interfaces Dependably",
                        subject: "Software Engineering",
                        course: "Software Engineering",
                        category: "Design Patterns",
                        explanation: "Five core design principles introduced by Uncle Bob to build maintainable, decoupled codebases.",
                        breakdown: [
                            { letter: "S", word: "Single Responsibility", meaning: "A class or module should have only one reason to change." },
                            { letter: "O", word: "Open / Closed", meaning: "Software entities should be open for extension, but closed for modification." },
                            { letter: "L", word: "Liskov Substitution", meaning: "Subclasses must be substitutable for base classes without breaking program correctness." },
                            { letter: "I", word: "Interface Segregation", meaning: "Clients should not be forced to depend on methods they do not use." },
                            { letter: "D", word: "Dependency Inversion", meaning: "High-level modules should depend on abstractions, not concrete implementations." }
                        ],
                        examTip: "Always tie Liskov Substitution Principle to behavioral subtyping in design exams.",
                        termsCount: 5,
                        verified: true
                    },
                    {
                        id: "mne-cap",
                        title: "CAP Theorem in Distributed Systems",
                        acronym: "CAP",
                        phrase: "Choose Any Pair: Consistency, Availability, Partition tolerance",
                        subject: "Distributed Systems",
                        course: "Cloud Architecture",
                        category: "System Architecture",
                        explanation: "States that a distributed data store can simultaneously provide at most two of the three guarantees in presence of network partitions.",
                        breakdown: [
                            { letter: "C", word: "Consistency", meaning: "Every read receives the most recent write or an error." },
                            { letter: "A", word: "Availability", meaning: "Every non-failing node returns a non-error response." },
                            { letter: "P", word: "Partition Tolerance", meaning: "The cluster operates despite arbitrary packet drops or network partitions." }
                        ],
                        examTip: "In real-world networks where partitions (P) are inevitable, you must choose between CP or AP!",
                        termsCount: 3,
                        verified: true
                    }
                ];
                localStorage.setItem("orbit_mnemonics", JSON.stringify(list));
            }
            const formatted = list.map((m: any) => ({
                id: m.id,
                courseId: m.courseId || null,
                title: m.title,
                acronym: m.acronym,
                phrase: m.phrase,
                course: m.course || m.subject || "Curriculum",
                termsCount: m.termsCount || (m.breakdown?.length || m.acronym?.length || 4),
                verified: true
            }));
            setMnemonics(formatted);
        } catch (e) {
            console.error("Error loading stored mnemonics:", e);
        }
    }, []);

    const handleCreateMnemonic = () => {
        if (!title.trim() || !acronym.trim() || !phrase.trim()) {
            toast({ variant: "destructive", title: "Incomplete", description: "Title, Acronym, and Phrase are required." });
            return;
        }

        const selectedCourse = courses.find(c => c.id === selectedCourseId);
        const resolvedCourseName = selectedCourse ? selectedCourse.title : (customCourseName.trim() || "Core Curriculum");
        const resolvedCourseId = selectedCourse ? selectedCourse.id : null;

        const newMne: TeacherMnemonicItem = {
            id: `tm-${Date.now()}`,
            courseId: resolvedCourseId,
            title,
            acronym: acronym.toUpperCase(),
            phrase,
            course: resolvedCourseName,
            termsCount: acronym.length,
            verified: true
        };

        const updated = [newMne, ...mnemonics];
        setMnemonics(updated);

        // Also persist to localStorage for students
        try {
            const stored = localStorage.getItem("orbit_mnemonics");
            const existing = stored ? JSON.parse(stored) : [];
            const studentMnemonic = {
                id: newMne.id,
                courseId: resolvedCourseId,
                course: resolvedCourseName,
                title,
                acronym: acronym.toUpperCase(),
                phrase,
                subject: resolvedCourseName,
                category: "Teaching Aid",
                explanation: `High-yield mnemonic hook for ${title}.`,
                breakdown: terms.split(',').map((t, idx) => ({
                    letter: acronym.charAt(idx) || t.charAt(0) || '',
                    word: t.trim(),
                    meaning: `Core item in ${title}.`
                })),
                examTip: `Remember: "${phrase}" during revision.`
            };
            localStorage.setItem("orbit_mnemonics", JSON.stringify([studentMnemonic, ...(Array.isArray(existing) ? existing : [])]));
        } catch (err) {
            console.warn("Could not save to localStorage:", err);
        }

        setCreateOpen(false);
        setTitle("");
        setAcronym("");
        setPhrase("");
        setSelectedCourseId("");
        setCustomCourseName("");
        setTerms("");

        toast({
            title: "Mnemonic Published! 💡",
            description: `Students enrolled in "${resolvedCourseName}" can now use this memory hook.`
        });
    };

    const handleGenerateMnemonic = () => {
        if (!genTopic.trim()) {
            toast({
                title: "Topic Required",
                description: "Please enter a topic title to craft a mnemonic.",
                variant: "destructive"
            });
            return;
        }

        setGenerating(true);

        setTimeout(() => {
            const rawWords = genWords.split(",").map(w => w.trim()).filter(Boolean);
            let finalAcronym = "";
            let finalBreakdown: { letter: string; word: string; meaning: string }[] = [];

            if (rawWords.length > 0) {
                finalAcronym = rawWords.map(w => w.charAt(0).toUpperCase()).join("");
                finalBreakdown = rawWords.map(w => ({
                    letter: w.charAt(0).toUpperCase(),
                    word: w,
                    meaning: `Core principle representing ${w} in ${genTopic}.`
                }));
            } else {
                finalAcronym = genTopic.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "ORBT";
                finalBreakdown = finalAcronym.split("").map((char, i) => ({
                    letter: char,
                    word: `Factor ${i + 1} (${char})`,
                    meaning: `Foundational dimension of ${genTopic}.`
                }));
            }

            const selectedCourse = courses.find(c => c.id === selectedCourseId);
            const resolvedCourseName = selectedCourse ? selectedCourse.title : (genSubject.trim() || customCourseName.trim() || "Core Curriculum");
            const resolvedCourseId = selectedCourse ? selectedCourse.id : null;

            const newMne: TeacherMnemonicItem = {
                id: `tm-gen-${Date.now()}`,
                courseId: resolvedCourseId,
                title: genTopic,
                acronym: finalAcronym,
                phrase: `"${finalAcronym.split("").map(c => c + "-factor").join(" ")}"`,
                course: resolvedCourseName,
                termsCount: finalAcronym.length,
                verified: true
            };

            setMnemonics([newMne, ...mnemonics]);

            try {
                const stored = localStorage.getItem("orbit_mnemonics");
                const existing = stored ? JSON.parse(stored) : [];
                const studentMnemonic = {
                    id: newMne.id,
                    courseId: resolvedCourseId,
                    course: resolvedCourseName,
                    title: genTopic,
                    acronym: finalAcronym,
                    phrase: newMne.phrase,
                    subject: resolvedCourseName,
                    category: "AI Crafted Memory Aid",
                    explanation: `High-yield memory acronym designed to encode ${genTopic} permanently into recall.`,
                    breakdown: finalBreakdown,
                    examTip: `Remember ${finalAcronym} when analyzing ${genTopic}.`
                };
                localStorage.setItem("orbit_mnemonics", JSON.stringify([studentMnemonic, ...(Array.isArray(existing) ? existing : [])]));
            } catch (err) {
                console.warn("Could not save to localStorage:", err);
            }

            setGenerating(false);
            setGeneratorOpen(false);
            setGenTopic("");
            setGenWords("");

            toast({
                title: "Mnemonic Generated & Published! ✨",
                description: `Created acronym "${finalAcronym}" for ${genTopic}.`
            });
        }, 500);
    };

    const handleExportMnemonics = async () => {
        try {
            const data = exportAllMnemonicsToJson();
            downloadJsonFile(data, "orbit_mnemonics.json");
            await copyJsonToClipboard(data);
            toast({
                title: "Mnemonics Exported! 📥",
                description: "Downloaded orbit_mnemonics.json & copied JSON to clipboard."
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Export Error", description: e.message });
        }
    };

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const stored = localStorage.getItem("orbit_mnemonics");
            const fullList = stored ? JSON.parse(stored) : [];
            const listToPrint = Array.isArray(fullList) && fullList.length > 0 ? fullList : mnemonics;
            await downloadMnemonicsPdf({
                mnemonics: listToPrint,
                courseTitle: "Faculty Curriculum Mnemonics Guide"
            });
            toast({
                title: "PDF Study Guide Downloaded! 📄",
                description: "Generated official faculty guide with institutional letterhead and watermark."
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "PDF Export Failed", description: e.message });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <TeacherLayout>
            <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                <BrainCircuit className="h-5 w-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                Course Mnemonics & Memory Aids
                            </h1>
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-mono">
                                Faculty Studio
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                            Author memorable acronyms, cognitive rhyme hooks, and visual mental models for your curriculum subjects.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportMnemonics}
                            className="gap-1.5 text-xs font-semibold h-9 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                        >
                            <Download className="h-3.5 w-3.5" /> Export JSON
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="gap-1.5 text-xs font-semibold h-9 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        >
                            {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                            Download PDF
                        </Button>

                        <Link to="/teacher/courses/json-builder?tab=mnemonics-import">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold h-9 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/5"
                            >
                                <Upload className="h-3.5 w-3.5" /> Import JSON
                            </Button>
                        </Link>

                        <Link to="/student/mnemonics" target="_blank">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold h-9">
                                <ExternalLink className="h-3.5 w-3.5" /> Student View
                            </Button>
                        </Link>

                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 text-xs font-semibold h-9 shadow-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                                    <Plus className="h-4 w-4" /> Author Mnemonic
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base">
                                        <Lightbulb className="h-4 w-4 text-amber-500" /> Author Curriculum Mnemonic
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2 text-xs">
                                    <div>
                                        <label className="font-semibold text-foreground">Concept Title</label>
                                        <Input
                                            placeholder="e.g. Distributed Consensus Raft States"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground">Acronym / Abbreviation</label>
                                        <Input
                                            placeholder="e.g. FCL (Follower, Candidate, Leader)"
                                            value={acronym}
                                            onChange={e => setAcronym(e.target.value)}
                                            className="font-mono uppercase h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground">Target Course</label>
                                        {courses.length > 0 ? (
                                            <div className="space-y-1.5">
                                                <select
                                                    value={selectedCourseId}
                                                    onChange={e => setSelectedCourseId(e.target.value)}
                                                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                                                >
                                                    <option value="">-- Select Course or Enter Custom Below --</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.title}</option>
                                                    ))}
                                                </select>
                                                {!selectedCourseId && (
                                                    <Input
                                                        placeholder="Or enter custom course title..."
                                                        value={customCourseName}
                                                        onChange={e => setCustomCourseName(e.target.value)}
                                                        className="text-xs h-8"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <Input
                                                placeholder="e.g. CS 402 - Distributed Systems"
                                                value={customCourseName}
                                                onChange={e => setCustomCourseName(e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Catchy Memory Phrase Hook</label>
                                        <Input
                                            placeholder="e.g. Fast Consensuses Win"
                                            value={phrase}
                                            onChange={e => setPhrase(e.target.value)}
                                            className="mt-1 font-serif italic"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Terms / Breakdown Notes</label>
                                        <Textarea
                                            placeholder="Enter breakdown details for each letter..."
                                            value={terms}
                                            onChange={e => setTerms(e.target.value)}
                                            className="mt-1 text-xs"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleCreateMnemonic}>Publish Mnemonic</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Smart AI Mnemonic Generator Dialog for Faculty & Admins */}
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
                                            placeholder="e.g. Raft Consensus States, OSI Layers"
                                            value={genTopic}
                                            onChange={e => setGenTopic(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground">Target Course</label>
                                        {courses.length > 0 ? (
                                            <select
                                                value={selectedCourseId}
                                                onChange={e => setSelectedCourseId(e.target.value)}
                                                className="w-full h-8 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                                            >
                                                <option value="">-- General / Core Curriculum --</option>
                                                {courses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                placeholder="e.g. Distributed Systems"
                                                value={genSubject}
                                                onChange={e => setGenSubject(e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Terms to Memorize (Comma Separated)</label>
                                        <Textarea
                                            placeholder="e.g. Follower, Candidate, Leader"
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

                {/* Mnemonics Grid or Empty State */}
                {mnemonics.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border bg-card/50 space-y-4">
                        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                            <BrainCircuit className="h-7 w-7" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                            <h3 className="text-lg font-bold text-foreground">
                                No Course Mnemonics Published Yet
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Create memorable cognitive hooks, acronyms, and formulas bound to your course syllabus.
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white">
                            <Plus className="h-4 w-4" /> Author First Mnemonic
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {mnemonics.map(m => (
                            <Card key={m.id} className="border shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
                                <CardHeader className="pb-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <Badge className="bg-amber-500 text-white font-mono text-xs">
                                            {m.acronym}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px]">
                                            {m.course}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base font-bold text-foreground">
                                        {m.title}
                                    </CardTitle>
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs italic font-serif text-foreground">
                                        "{m.phrase}"
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                                        <span>{m.termsCount} Sequence Items</span>
                                        <span className="text-emerald-500">Verified Teaching Aid</span>
                                    </div>

                                    <div className="pt-2 border-t">
                                        <Link
                                            to={m.courseId ? `/student/mnemonics?courseId=${m.courseId}` : `/student/mnemonics`}
                                            className="w-full"
                                        >
                                            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                                                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Open Interactive Studio
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
