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
    Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { exportAllFlashcardDecksToJson, downloadJsonFile, copyJsonToClipboard } from "@/lib/courseJsonImporter";

export default function TeacherFlashcards() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [createDeckOpen, setCreateDeckOpen] = useState(false);
    const [addCardOpen, setAddCardOpen] = useState(false);

    const [decks, setDecks] = useState([
        {
            id: "t-deck-1",
            title: "Operating Systems: Concurrency & Virtual Memory",
            course: "CS 301 - Operating Systems",
            cardCount: 18,
            activeStudents: 42,
            lastUpdated: "Yesterday"
        },
        {
            id: "t-deck-2",
            title: "Database Engineering: ACID & Indexing",
            course: "CS 304 - Database Systems",
            cardCount: 24,
            activeStudents: 56,
            lastUpdated: "3 days ago"
        },
        {
            id: "t-deck-3",
            title: "Data Structures: Graphs & Dynamic Programming",
            course: "CS 201 - Advanced DSA",
            cardCount: 30,
            activeStudents: 68,
            lastUpdated: "Oct 12, 2026"
        }
    ]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("orbit_flashcard_decks");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const formatted = parsed.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        course: d.course || d.subject || "Course Deck",
                        cardCount: d.cardCount || (d.cards?.length || 0),
                        activeStudents: d.activeStudents || 0,
                        lastUpdated: d.lastUpdated || "Recently Imported"
                    }));
                    setDecks(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const additions = formatted.filter((f: any) => !existingIds.has(f.id));
                        return [...additions, ...prev];
                    });
                }
            }
        } catch (e) {
            console.error("Error loading stored flashcard decks:", e);
        }
    }, []);

    const [newDeckTitle, setNewDeckTitle] = useState("");
    const [newDeckCourse, setNewDeckCourse] = useState("");
    const [newDeckDesc, setNewDeckDesc] = useState("");

    const handleCreateDeck = () => {
        if (!newDeckTitle.trim()) {
            toast({ variant: "destructive", title: "Missing title", description: "Provide a title for this deck." });
            return;
        }

        const newDeck = {
            id: `t-deck-${Date.now()}`,
            title: newDeckTitle,
            course: newDeckCourse || "General Engineering",
            cardCount: 5,
            activeStudents: 0,
            lastUpdated: "Just now"
        };

        setDecks([newDeck, ...decks]);
        setCreateDeckOpen(false);
        setNewDeckTitle("");
        setNewDeckCourse("");
        setNewDeckDesc("");

        toast({
            title: "Deck Created & Published! 🎉",
            description: `Enrolled students can now practice "${newDeck.title}" with active recall.`
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
                                        <Input
                                            placeholder="e.g. CS 401 - Compiler Construction"
                                            value={newDeckCourse}
                                            onChange={e => setNewDeckCourse(e.target.value)}
                                            className="mt-1"
                                        />
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

                {/* Decks Grid */}
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
                                    <Link to="/student/flashcards" className="w-full">
                                        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                                            <Brain className="h-3.5 w-3.5 text-primary" /> Practice & Review
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </TeacherLayout>
    );
}
