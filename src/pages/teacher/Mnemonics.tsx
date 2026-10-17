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
    Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { exportAllMnemonicsToJson, downloadJsonFile, copyJsonToClipboard } from "@/lib/courseJsonImporter";

export default function TeacherMnemonics() {
    const { toast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [acronym, setAcronym] = useState("");
    const [phrase, setPhrase] = useState("");
    const [course, setCourse] = useState("");
    const [terms, setTerms] = useState("");

    const [mnemonics, setMnemonics] = useState([
        {
            id: "tm-1",
            title: "OSI 7 Layers Protocol Stack",
            acronym: "PDNTSPA",
            phrase: "Please Do Not Throw Sausage Pizza Away",
            course: "CS 302 - Computer Networks",
            termsCount: 7,
            verified: true
        },
        {
            id: "tm-2",
            title: "ACID Database Transaction Properties",
            acronym: "ACID",
            phrase: "Atomic Code Is Durable",
            course: "CS 304 - Database Systems",
            termsCount: 4,
            verified: true
        },
        {
            id: "tm-3",
            title: "SOLID Principles of Object-Oriented Architecture",
            acronym: "SOLID",
            phrase: "Software Organizes Logical Interfaces Dependably",
            course: "CS 202 - Object Oriented Design",
            termsCount: 5,
            verified: true
        }
    ]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("orbit_mnemonics");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const formatted = parsed.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        acronym: m.acronym,
                        phrase: m.phrase,
                        course: m.course || m.subject || "Curriculum",
                        termsCount: m.termsCount || (m.breakdown?.length || m.acronym?.length || 4),
                        verified: true
                    }));
                    setMnemonics(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const additions = formatted.filter((f: any) => !existingIds.has(f.id));
                        return [...additions, ...prev];
                    });
                }
            }
        } catch (e) {
            console.error("Error loading stored mnemonics:", e);
        }
    }, []);

    const handleCreateMnemonic = () => {
        if (!title.trim() || !acronym.trim() || !phrase.trim()) {
            toast({ variant: "destructive", title: "Incomplete", description: "Title, Acronym, and Phrase are required." });
            return;
        }

        const newMne = {
            id: `tm-${Date.now()}`,
            title,
            acronym: acronym.toUpperCase(),
            phrase,
            course: course || "Core Curriculum",
            termsCount: acronym.length,
            verified: true
        };

        const updated = [newMne, ...mnemonics];
        setMnemonics(updated);

        // Also persist to localStorage for students
        try {
            const stored = localStorage.getItem("orbit_mnemonics");
            const existing = stored ? JSON.parse(stored) : [];
            localStorage.setItem("orbit_mnemonics", JSON.stringify([newMne, ...existing]));
        } catch (err) {
            console.warn("Could not save to localStorage:", err);
        }

        setCreateOpen(false);
        setTitle("");
        setAcronym("");
        setPhrase("");
        setCourse("");
        setTerms("");

        toast({
            title: "Mnemonic Published! 💡",
            description: `Students enrolled in "${newMne.course}" can now use this memory hook.`
        });
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
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="font-semibold text-foreground">Acronym / Abbreviation</label>
                                            <Input
                                                placeholder="e.g. FCL (Follower, Candidate, Leader)"
                                                value={acronym}
                                                onChange={e => setAcronym(e.target.value)}
                                                className="mt-1 font-mono uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-foreground">Target Course</label>
                                            <Input
                                                placeholder="e.g. CS 402 - Distributed Systems"
                                                value={course}
                                                onChange={e => setCourse(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
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
                    </div>
                </div>

                {/* Mnemonics Grid */}
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
                                    <Link to="/student/mnemonics" className="w-full">
                                        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Open Interactive Studio
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
