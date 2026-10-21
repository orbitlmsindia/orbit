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
    Layers,
    Plus,
    Search,
    BookOpen,
    Sparkles,
    Trash2,
    Edit3,
    Brain,
    Share2,
    Users,
    CheckCircle2,
    Lightbulb,
    ExternalLink,
    Download,
    Upload,
    FileText,
    Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportAllFlashcardDecksToJson, downloadJsonFile, copyJsonToClipboard } from "@/lib/courseJsonImporter";
import { downloadFlashcardsPdf } from "@/lib/pdfReportGenerator";

interface TeacherDeckItem {
    id: string;
    courseId?: string | null;
    title: string;
    course: string;
    cardCount: number;
    activeStudents: number;
    lastUpdated: string;
}

export default function TeacherFlashcards() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [createDeckOpen, setCreateDeckOpen] = useState(false);
    const [addCardOpen, setAddCardOpen] = useState(false);
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    const [decks, setDecks] = useState<TeacherDeckItem[]>([]);
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
            const stored = localStorage.getItem("orbit_flashcard_decks");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const formatted = parsed.map((d: any) => ({
                        id: d.id,
                        courseId: d.courseId || null,
                        title: d.title,
                        course: d.course || d.subject || "Course Deck",
                        cardCount: d.cardCount || (d.cards?.length || 0),
                        activeStudents: d.activeStudents || 0,
                        lastUpdated: d.lastUpdated || "Recently Updated"
                    }));
                    setDecks(formatted);
                }
            }
        } catch (e) {
            console.error("Error loading stored flashcard decks:", e);
        }
    }, []);

    const [newDeckTitle, setNewDeckTitle] = useState("");
    const [newDeckCourseId, setNewDeckCourseId] = useState("");
    const [newDeckCourseCustom, setNewDeckCourseCustom] = useState("");
    const [newDeckDesc, setNewDeckDesc] = useState("");

    const handleCreateDeck = () => {
        if (!newDeckTitle.trim()) {
            toast({ variant: "destructive", title: "Missing title", description: "Provide a title for this deck." });
            return;
        }

        const selectedCourse = courses.find(c => c.id === newDeckCourseId);
        const resolvedCourseName = selectedCourse ? selectedCourse.title : (newDeckCourseCustom.trim() || "General Engineering");
        const resolvedCourseId = selectedCourse ? selectedCourse.id : null;

        const newDeck: TeacherDeckItem = {
            id: `t-deck-${Date.now()}`,
            courseId: resolvedCourseId,
            title: newDeckTitle,
            course: resolvedCourseName,
            cardCount: 0,
            activeStudents: 0,
            lastUpdated: "Just now"
        };

        const updated = [newDeck, ...decks];
        setDecks(updated);

        // Persist to localStorage for students
        try {
            const stored = localStorage.getItem("orbit_flashcard_decks");
            const existing = stored ? JSON.parse(stored) : [];
            const newFullDeck = {
                id: newDeck.id,
                courseId: resolvedCourseId,
                course: resolvedCourseName,
                title: newDeckTitle,
                description: newDeckDesc,
                subject: resolvedCourseName,
                icon: "⚡",
                color: "from-blue-600 to-indigo-700",
                cards: []
            };
            localStorage.setItem("orbit_flashcard_decks", JSON.stringify([newFullDeck, ...(Array.isArray(existing) ? existing : [])]));
        } catch (e) {
            console.error("Error updating localStorage:", e);
        }

        setCreateDeckOpen(false);
        setNewDeckTitle("");
        setNewDeckCourseId("");
        setNewDeckCourseCustom("");
        setNewDeckDesc("");

        toast({
            title: "Deck Created & Published! 🎉",
            description: `Enrolled students in "${resolvedCourseName}" can now practice this deck.`
        });
    };

    const handleExportDecks = async () => {
        try {
            const data = exportAllFlashcardDecksToJson();
            downloadJsonFile(data, "orbit_flashcard_decks.json");
            await copyJsonToClipboard(data);
            toast({
                title: "Flashcard Decks Exported! 📥",
                description: "Downloaded orbit_flashcard_decks.json & copied JSON to clipboard."
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Export Error", description: e.message });
        }
    };

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const stored = localStorage.getItem("orbit_flashcard_decks");
            const fullDecks = stored ? JSON.parse(stored) : [];
            const allCards = Array.isArray(fullDecks) ? fullDecks.flatMap((d: any) => d.cards || []) : [];

            if (allCards.length === 0) {
                toast({ variant: "destructive", title: "No Cards Found", description: "No flashcards found to export into PDF." });
                return;
            }

            await downloadFlashcardsPdf({
                flashcards: allCards.map((c: any) => ({
                    id: c.id,
                    front: c.front,
                    back: c.back,
                    category: c.category,
                    difficulty: c.difficulty,
                    notes: c.hint
                })),
                deckTitle: "Faculty Curriculum Flashcard Bank"
            });
            toast({
                title: "Flashcards PDF Downloaded! 📄",
                description: "Official faculty flashcard edition generated with institutional letterhead and watermark."
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
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <Layers className="h-5 w-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                Course Flashcard Decks
                            </h1>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                                Faculty Studio
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                            Author high-yield memory decks, formulas, and definitions to accelerate student exam preparedness.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportDecks}
                            className="gap-1.5 text-xs font-semibold h-9 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                        >
                            <Download className="h-3.5 w-3.5" /> Export JSON
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="gap-1.5 text-xs font-semibold h-9 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                        >
                            {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                            Download PDF
                        </Button>

                        <Link to="/teacher/courses/json-builder?tab=flashcards-import">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold h-9 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/5"
                            >
                                <Upload className="h-3.5 w-3.5" /> Import JSON
                            </Button>
                        </Link>

                        <Link to="/student/flashcards" target="_blank">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold h-9">
                                <ExternalLink className="h-3.5 w-3.5" /> Student View
                            </Button>
                        </Link>

                        <Dialog open={createDeckOpen} onOpenChange={setCreateDeckOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 text-xs font-semibold h-9 shadow-sm">
                                    <Plus className="h-4 w-4" /> Create Deck
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base">
                                        <Plus className="h-4 w-4 text-primary" /> Author Course Flashcard Deck
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2 text-xs">
                                    <div>
                                        <label className="font-semibold text-foreground">Deck Title</label>
                                        <Input
                                            placeholder="e.g. Compiler Design: Lexical & Syntax Analysis"
                                            value={newDeckTitle}
                                            onChange={e => setNewDeckTitle(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Mapped Course</label>
                                        {courses.length > 0 ? (
                                            <div className="space-y-1.5 mt-1">
                                                <select
                                                    value={newDeckCourseId}
                                                    onChange={e => setNewDeckCourseId(e.target.value)}
                                                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-3 py-1 text-foreground font-medium focus:ring-1 focus:ring-primary outline-none"
                                                >
                                                    <option value="">-- Select a Course or Enter Custom Below --</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.title}</option>
                                                    ))}
                                                </select>
                                                {!newDeckCourseId && (
                                                    <Input
                                                        placeholder="Or enter custom course title..."
                                                        value={newDeckCourseCustom}
                                                        onChange={e => setNewDeckCourseCustom(e.target.value)}
                                                        className="text-xs h-8"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <Input
                                                placeholder="e.g. CS 401 - Compiler Construction"
                                                value={newDeckCourseCustom}
                                                onChange={e => setNewDeckCourseCustom(e.target.value)}
                                                className="mt-1"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="font-semibold text-foreground">Syllabus Coverage / Notes</label>
                                        <Textarea
                                            placeholder="Specify modules, textbook chapters, or unit goals..."
                                            value={newDeckDesc}
                                            onChange={e => setNewDeckDesc(e.target.value)}
                                            className="mt-1 text-xs"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" size="sm" onClick={() => setCreateDeckOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleCreateDeck}>Publish Deck</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Decks Grid or Empty State */}
                {decks.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border bg-card/50 space-y-4">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
                            <Layers className="h-7 w-7" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                            <h3 className="text-lg font-bold text-foreground">
                                No Course Flashcard Decks Yet
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Author dedicated flashcard decks for your courses or import syllabus question banks via JSON.
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setCreateDeckOpen(true)} className="gap-1.5 text-xs font-semibold">
                            <Plus className="h-4 w-4" /> Author First Deck
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {decks.map(deck => (
                            <Card key={deck.id} className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                            {deck.course}
                                        </Badge>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                            Published
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base font-bold text-foreground mt-2">
                                        {deck.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Updated {deck.lastUpdated}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="pt-0 space-y-3">
                                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Cards</span>
                                            <p className="font-mono font-bold text-foreground">{deck.cardCount} Cards</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Active Learners</span>
                                            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{deck.activeStudents} Students</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Link
                                            to={deck.courseId ? `/student/flashcards?courseId=${deck.courseId}` : `/student/flashcards`}
                                            className="w-full"
                                        >
                                            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                                                <Brain className="h-3.5 w-3.5 text-primary" /> Practice & Review
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
