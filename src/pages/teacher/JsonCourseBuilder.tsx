import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  FileCode,
  Upload,
  Play,
  CheckCircle,
  XCircle,
  FileText,
  Video,
  ListTodo,
  HelpCircle,
  Sparkles,
  Clipboard,
  AlertTriangle,
  BookOpen,
  Info,
  Clock,
  Calendar,
  Download,
  Layers,
  Award,
  Bot,
  Wand2,
  Check,
  RotateCcw
} from "lucide-react";
import {
  validateCourseJson,
  normalizeCourseJson,
  importCourseFromJson,
  importFromJson,
  computePreviewStats,
  SAMPLE_COURSE_JSON,
  SAMPLE_WEEKLY_MODULE_JSON,
  SAMPLE_QUIZ_JSON,
  validateModuleTimeBudget,
  importQuizFromJson,
  importSectionFromJson,
  JsonCoursePayload,
  JsonSection,
  JsonQuiz,
  ValidationError
} from "@/lib/courseJsonImporter";

export default function JsonCourseBuilder() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Active Main Builder Mode: 'full-course' | 'ai-generator' | 'module-import' | 'quiz-import'
  const [builderMode, setBuilderMode] = useState<"full-course" | "ai-generator" | "module-import" | "quiz-import">("full-course");

  // Structural Approach: 'weekly' | 'section'
  const [structuringApproach, setStructuringApproach] = useState<"weekly" | "section">("weekly");

  // Full Course Importer State
  const [jsonText, setJsonText] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [parsedData, setParsedData] = useState<JsonCoursePayload | null>(null);

  // AI Prompt Builder State
  const [aiTopic, setAiTopic] = useState("Agentic AI & LLM Engineering Masterclass");
  const [aiDomain, setAiDomain] = useState("Data Science & AI");
  const [aiModuleCount, setAiModuleCount] = useState("4");
  const [aiLevel, setAiLevel] = useState("Intermediate to Advanced");
  const [aiIncludeQuizzes, setAiIncludeQuizzes] = useState(true);
  const [aiIncludeAssignments, setAiIncludeAssignments] = useState(true);
  const [aiIncludeLive, setAiIncludeLive] = useState(true);

  // Available Courses for Specific Importers
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courseSections, setCourseSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Quiz Importer Specific State
  const [quizJsonText, setQuizJsonText] = useState("");
  const [parsedQuiz, setParsedQuiz] = useState<JsonQuiz | null>(null);
  const [quizValid, setQuizValid] = useState<boolean | null>(null);
  const [isImportingQuiz, setIsImportingQuiz] = useState(false);

  // Module Importer Specific State
  const [moduleJsonText, setModuleJsonText] = useState("");
  const [parsedModule, setParsedModule] = useState<JsonSection | null>(null);
  const [moduleValid, setModuleValid] = useState<boolean | null>(null);
  const [isImportingModule, setIsImportingModule] = useState(false);

  // Template Copy Statuses
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseSections(selectedCourseId);
    } else {
      setCourseSections([]);
      setSelectedSectionId("");
    }
  }, [selectedCourseId]);

  const fetchTeacherCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("courses")
        .select("id, title, credit_points")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      setTeacherCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourseSections = async (courseId: string) => {
    try {
      const { data } = await supabase
        .from("course_sections")
        .select("id, title, aura_points")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });
      setCourseSections(data || []);
      if (data && data.length > 0) {
        setSelectedSectionId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyTemplate = (payload: any, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedTemplate(label);
    toast({ title: `${label} Copied! 📋`, description: "JSON template copied to clipboard." });
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleCopyAiPrompt = () => {
    const prompt = generateAiPromptText();
    navigator.clipboard.writeText(prompt);
    setCopiedTemplate("AI Prompt");
    toast({
      title: "Master AI Prompt Copied! 🤖📋",
      description: "Paste this into ChatGPT, Claude, or Gemini to generate a complete course with quizzes."
    });
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const generateAiPromptText = () => {
    return `You are an expert curriculum architect for Orbit LMS. Generate a complete, ready-to-import JSON course payload strictly formatted as a valid JSON object (no markdown backticks around the json, or pure json output only).

COURSE SPECIFICATIONS:
- Topic: ${aiTopic}
- Domain / Category: ${aiDomain}
- Number of ${structuringApproach === "weekly" ? "Weekly Mission Modules" : "Sections"}: ${aiModuleCount}
- Target Audience Level: ${aiLevel}
- Structure Approach: "${structuringApproach}"
- Credit Points: 4
- Duration: 16-24 Hours

REQUIREMENTS:
1. Each ${structuringApproach === "weekly" ? "week module" : "section module"} MUST include:
   - title: e.g. "Week 1: Foundations of ..." or "Module 1: Introduction to ..."
   ${structuringApproach === "weekly" ? '- week_number (number), allocated_hours: 4.0, topic_name: "Topic Summary"' : ""}
   - items array containing:
     a) 2-3 Video Lectures (type: "video", url: "https://www.youtube.com/watch?v=...", duration_minutes: 30)
     b) 1 Slide Presentation or PDF Reference (type: "presentation" or "pdf", url: "https://docs.google.com/presentation/d/.../embed", duration_minutes: 25)
     c) 1 Rich Markdown Reading (type: "text", content_text: "# Title\\n\\nComprehensive explanation...")
     ${aiIncludeLive ? 'd) 1 Live Interactive Class (type: "live", url: "https://meet.google.com/orbit-live-session", scheduled_at: "2026-09-01T18:00:00Z", duration_minutes: 60)' : ""}
     ${aiIncludeQuizzes ? `e) 1 Comprehensive Graded Quiz (type: "quiz", title: "Module Assessment Quiz", is_graded: true, points: 50, time_limit_minutes: 20, questions: [
         {
           "question_text": "What is ...?",
           "type": "mcq",
           "options": ["Option A", "Option B", "Option C", "Option D"],
           "correct_answer": "Option A",
           "points": 15
         },
         {
           "question_text": "Is this statement true?",
           "type": "boolean",
           "options": ["True", "False"],
           "correct_answer": "True",
           "points": 10
         },
         {
           "question_text": "Explain the core mechanism of ...",
           "type": "short",
           "points": 15
         },
         {
           "question_text": "Discuss the architectural trade-offs of ...",
           "type": "long",
           "points": 10
         }
       ])` : ""}
     ${aiIncludeAssignments ? 'f) 1 Practical Assignment (type: "assignment", title: "Practical Implementation Task", description: "Build a project...", points: 100)' : ""}

JSON SCHEMA EXAMPLE TO FOLLOW:
{
  "title": "${aiTopic}",
  "description": "Comprehensive course description...",
  "domain": "${aiDomain}",
  "credit_points": 4,
  "structuring_approach": "${structuringApproach}",
  "price": 1999,
  "original_price": 3499,
  "organization_name": "Orbit Tech Academy",
  "is_published": true,
  "sections": [
    {
      "title": "${structuringApproach === "weekly" ? "Week 1" : "Module 1"}: Foundations",
      ${structuringApproach === "weekly" ? '"week_number": 1, "allocated_hours": 4.0, "topic_name": "Core Principles",' : ""}
      "aura_points": 20,
      "items": [
        {
          "title": "Introduction Lecture",
          "type": "video",
          "url": "https://www.youtube.com/watch?v=example1",
          "duration_minutes": 30
        },
        {
          "title": "Weekly Assessment Quiz",
          "type": "quiz",
          "is_graded": true,
          "points": 50,
          "time_limit_minutes": 20,
          "questions": [
            {
              "question_text": "Sample MCQ Question?",
              "type": "mcq",
              "options": ["Correct Choice", "Choice 2", "Choice 3", "Choice 4"],
              "correct_answer": "Correct Choice",
              "points": 15
            },
            {
              "question_text": "Sample True/False Question?",
              "type": "boolean",
              "options": ["True", "False"],
              "correct_answer": "True",
              "points": 10
            }
          ]
        }
      ]
    }
  ]
}

Ensure all JSON keys and formatting are 100% syntactically valid JSON. Return ONLY the raw JSON object.`;
  };

  const handleAutoFormatAndValidate = () => {
    if (!jsonText.trim()) return;

    try {
      // Clean possible markdown code fence backticks
      let cleanText = jsonText.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanText);
      const normalized = normalizeCourseJson(parsed);
      const formatted = JSON.stringify(normalized, null, 2);

      setJsonText(formatted);
      validateJson(formatted);

      toast({
        title: "AI JSON Normalized & Formatted! 🪄",
        description: `Successfully structured ${normalized.sections?.length || 0} modules and validated quizzes.`
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Format Error",
        description: `Could not parse JSON: ${e.message}`
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetMode: "full" | "module" | "quiz") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        if (targetMode === "full") {
          setJsonText(result);
          validateJson(result);
        } else if (targetMode === "module") {
          setModuleJsonText(result);
          validateModuleJson(result);
        } else if (targetMode === "quiz") {
          setQuizJsonText(result);
          validateQuizJson(result);
        }
      }
    };
    reader.readAsText(file);
  };

  const validateJson = (text: string) => {
    if (!text.trim()) {
      setIsValid(null);
      setValidationErrors([]);
      setParsedData(null);
      return;
    }

    setIsValidating(true);
    try {
      // Clean possible markdown code fences
      let clean = text.trim();
      if (clean.startsWith("```json")) clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      else if (clean.startsWith("```")) clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");

      const parsed = JSON.parse(clean);
      parsed.structuring_approach = structuringApproach;
      const normalized = normalizeCourseJson(parsed);
      const { valid, errors } = validateCourseJson(normalized);

      setIsValid(valid);
      setValidationErrors(errors);
      if (valid) {
        setParsedData(normalized as JsonCoursePayload);
      } else {
        setParsedData(null);
      }
    } catch (err: any) {
      setIsValid(false);
      setValidationErrors([{ path: "parsing", message: `Invalid JSON syntax: ${err.message}` }]);
      setParsedData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const validateQuizJson = (text: string) => {
    if (!text.trim()) {
      setQuizValid(null);
      setParsedQuiz(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed.title && (Array.isArray(parsed.questions) || parsed.questions)) {
        setQuizValid(true);
        setParsedQuiz(parsed as JsonQuiz);
      } else {
        setQuizValid(false);
        setParsedQuiz(null);
      }
    } catch (e) {
      setQuizValid(false);
      setParsedQuiz(null);
    }
  };

  const validateModuleJson = (text: string) => {
    if (!text.trim()) {
      setModuleValid(null);
      setParsedModule(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed.title && (Array.isArray(parsed.items) || Array.isArray(parsed.lessons))) {
        setModuleValid(true);
        setParsedModule(parsed as JsonSection);
      } else {
        setModuleValid(false);
        setParsedModule(null);
      }
    } catch (e) {
      setModuleValid(false);
      setParsedModule(null);
    }
  };

  const handleImport = async () => {
    if (!isValid || !parsedData) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Please fix JSON validation errors before importing."
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await importCourseFromJson(parsedData);
      if (result.success && result.courseId) {
        toast({
          title: "Course Imported Successfully! 🚀",
          description: `Course "${result.courseName}" created with ${result.sectionsCreated} modules, ${result.contentsCreated} lessons, and ${result.quizzesCreated} quizzes (${result.questionsCreated} questions).`,
        });
        navigate(`/teacher/courses/${result.courseId}`);
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: result.errors[0] || "Failed to create course structure."
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred during import."
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportQuiz = async () => {
    if (!selectedCourseId || !selectedSectionId || !parsedQuiz) {
      toast({ variant: "destructive", title: "Error", description: "Please select course, section/week, and provide a valid quiz JSON." });
      return;
    }
    setIsImportingQuiz(true);
    try {
      const res = await importQuizFromJson(selectedCourseId, selectedSectionId, parsedQuiz);
      if (res.success) {
        toast({
          title: "Quiz Imported! 🎯",
          description: `Imported "${parsedQuiz.title}" with ${res.questionsCount} questions.`
        });
        setQuizJsonText("");
        setParsedQuiz(null);
        setQuizValid(null);
      } else {
        toast({ variant: "destructive", title: "Import Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsImportingQuiz(false);
    }
  };

  const handleImportModule = async () => {
    if (!selectedCourseId || !parsedModule) {
      toast({ variant: "destructive", title: "Error", description: "Please select target course and provide valid module JSON." });
      return;
    }
    setIsImportingModule(true);
    try {
      const res = await importSectionFromJson(selectedCourseId, parsedModule);
      if (res.success) {
        toast({
          title: "Module / Week Imported! 📚",
          description: `Imported "${parsedModule.title}" with learning items and quizzes into course.`
        });
        setModuleJsonText("");
        setParsedModule(null);
        setModuleValid(null);
      } else {
        toast({ variant: "destructive", title: "Import Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsImportingModule(false);
    }
  };

  const stats = parsedData ? computePreviewStats(parsedData) : null;

  return (
    <TeacherLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Orbit Course & Curriculum JSON Importer</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Build complete courses, weekly mission modules, or generate with AI using structured JSON templates.
            </p>
          </div>
        </div>

        {/* Structural Approach Toggle */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl border bg-muted/30">
          <span className="text-xs font-bold text-muted-foreground px-2">Structure:</span>
          <Button
            size="sm"
            variant={structuringApproach === "weekly" ? "default" : "ghost"}
            className="h-8 text-xs gap-1.5 font-bold"
            onClick={() => setStructuringApproach("weekly")}
          >
            <Calendar className="h-3.5 w-3.5" /> Weekly Approach
          </Button>
          <Button
            size="sm"
            variant={structuringApproach === "section" ? "default" : "ghost"}
            className="h-8 text-xs gap-1.5 font-bold"
            onClick={() => setStructuringApproach("section")}
          >
            <Layers className="h-3.5 w-3.5" /> Section Approach
          </Button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <Tabs defaultValue="full-course" className="space-y-6" onValueChange={(val: any) => setBuilderMode(val)}>
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex min-w-max h-auto p-1 bg-muted rounded-lg border gap-1">
            <TabsTrigger value="full-course" className="gap-2 font-bold text-xs px-3 py-1.5">
              <BookOpen className="h-4 w-4" /> Complete Course Importer
            </TabsTrigger>
            <TabsTrigger value="ai-generator" className="gap-2 font-bold text-xs px-3 py-1.5 text-primary">
              <Bot className="h-4 w-4 text-primary" /> 🤖 AI Master Prompt Generator
            </TabsTrigger>
            <TabsTrigger value="module-import" className="gap-2 font-bold text-xs px-3 py-1.5">
              <Layers className="h-4 w-4" /> {structuringApproach === "weekly" ? "Weekly Module Importer" : "Section Importer"}
            </TabsTrigger>
            <TabsTrigger value="quiz-import" className="gap-2 font-bold text-xs px-3 py-1.5">
              <HelpCircle className="h-4 w-4" /> Specific Quiz Importer
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── 1. COMPLETE COURSE IMPORTER TAB ───────────────────────── */}
        <TabsContent value="full-course">
          <div className="grid gap-6 lg:grid-cols-5 items-start">
            {/* Left Column: Code Editor & Upload */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="border border-border bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Course JSON Editor</CardTitle>
                    <CardDescription>Upload or paste course structure JSON according to your selected {structuringApproach} approach</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleAutoFormatAndValidate} className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10">
                      <Wand2 className="h-3.5 w-3.5" /> Auto-Format & Fix AI JSON
                    </Button>
                    <Button variant="outline" size="sm" className="relative cursor-pointer text-xs">
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileUpload(e, "full")}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setJsonText("")} className="text-xs">
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative font-mono">
                    <Textarea
                      placeholder={`Paste your ${structuringApproach} course JSON structure here (or output from ChatGPT/Claude)...`}
                      className="min-h-[440px] font-mono text-sm leading-relaxed bg-background/50 border-muted-foreground/20"
                      value={jsonText}
                      onChange={(e) => {
                        setJsonText(e.target.value);
                        validateJson(e.target.value);
                      }}
                    />
                  </div>

                  {/* Live Validation & Time Budget Warnings */}
                  {jsonText && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                      isValid
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/5 border-destructive/20 text-destructive dark:text-red-400"
                    }`}>
                      {isValid ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm">
                          {isValid ? "Course JSON Validated & Ready" : "Validation Errors Found"}
                        </p>
                        {validationErrors.length > 0 && (
                          <ul className="text-xs list-disc list-inside space-y-1 mt-2 font-mono">
                            {validationErrors.map((error, idx) => (
                              <li key={idx}>
                                <span className="font-bold bg-muted px-1 py-0.5 rounded mr-1">
                                  {error.path}
                                </span>
                                {error.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Preview & Template */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Course Preview</TabsTrigger>
                  <TabsTrigger value="template">JSON Template</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <Card className="border border-border bg-card/60 backdrop-blur-md shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Curriculum Structure Preview</CardTitle>
                      <CardDescription>Inspect modules, duration hours, and academic credits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {parsedData ? (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                            <h3 className="font-bold text-base text-primary">{parsedData.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {parsedData.description || "No description provided."}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 text-[11px]">
                                <Award className="h-3 w-3" /> {parsedData.credit_points || 4} Academic Credits
                              </Badge>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px] font-mono font-bold">
                                <Clock className="h-3 w-3" /> Duration: {stats?.totalDurationHours || 0} Hours
                              </Badge>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-[11px]">
                                Approach: {structuringApproach === "weekly" ? "Weekly Mission" : "Standard Section"}
                              </Badge>
                            </div>
                          </div>

                          {stats && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-3 border rounded-xl bg-background/50 flex items-center gap-2.5">
                                <BookOpen className="h-4 w-4 text-indigo-500" />
                                <div>
                                  <p className="text-[10px] text-muted-foreground">{structuringApproach === "weekly" ? "Weeks / Modules" : "Sections"}</p>
                                  <p className="text-base font-bold">{stats.sectionCount}</p>
                                </div>
                              </div>
                              <div className="p-3 border rounded-xl bg-background/50 flex items-center gap-2.5">
                                <Video className="h-4 w-4 text-amber-500" />
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium">Lectures & Media</p>
                                  <p className="text-base font-bold">{stats.videoCount}</p>
                                </div>
                              </div>
                              <div className="p-3 border rounded-xl bg-background/50 flex items-center gap-2.5">
                                <FileText className="h-4 w-4 text-emerald-500" />
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium">Readings & PDFs</p>
                                  <p className="text-base font-bold">{stats.pdfCount + stats.textCount}</p>
                                </div>
                              </div>
                              <div className="p-3 border rounded-xl bg-background/50 flex items-center gap-2.5">
                                <div className="flex items-center gap-1 text-rose-500">
                                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                  <HelpCircle className="h-4 w-4 text-rose-500" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium">Live & Quizzes</p>
                                  <p className="text-base font-bold">{stats.liveClassCount} Live / {stats.quizCount} Quiz ({stats.questionCount} Qs)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Curriculum Outline */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Breakdown</p>
                            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-3 bg-background/30 text-xs">
                              {parsedData.sections?.map((section, sidx) => {
                                const budget = validateModuleTimeBudget(section);
                                return (
                                  <div key={sidx} className="p-2.5 rounded-lg border bg-card/40 space-y-1.5">
                                    <div className="flex items-center justify-between font-semibold text-foreground">
                                      <span className="flex items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground font-mono">{sidx + 1}.</span> {section.title}
                                      </span>
                                      {section.allocated_hours && (
                                        <Badge variant="outline" className={`text-[10px] ${!budget.valid ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-blue-500/10 text-blue-600'}`}>
                                          {budget.itemsMinutes}m / {budget.allocatedMinutes}m ({section.allocated_hours}h)
                                        </Badge>
                                      )}
                                    </div>
                                    {!budget.valid && (
                                      <p className="text-[10px] text-red-500 flex items-center gap-1 font-mono">
                                        <AlertTriangle className="h-3 w-3" /> {budget.message}
                                      </p>
                                    )}
                                    <div className="pl-3 border-l space-y-1">
                                      {section.items?.map((item, iidx) => (
                                        <p key={iidx} className="text-[11px] text-muted-foreground flex items-center justify-between">
                                          <span className="flex items-center gap-1.5">
                                            {item.type === "video" && <Video className="h-3 w-3 text-amber-500" />}
                                            {item.type === "pdf" && <FileText className="h-3 w-3 text-emerald-500" />}
                                            {item.type === "text" && <FileText className="h-3 w-3 text-blue-500" />}
                                            {item.type === "quiz" && <HelpCircle className="h-3 w-3 text-rose-500" />}
                                            {item.type === "assignment" && <ListTodo className="h-3 w-3 text-violet-500" />}
                                            {item.title}
                                          </span>
                                          {item.type === "quiz" ? (
                                            <span className="font-mono text-[10px] text-rose-500 font-bold">
                                              {(item as any).questions?.length || 0} Qs • {(item as any).points || 50} pts
                                            </span>
                                          ) : (
                                            (item as any).duration_minutes && (
                                              <span className="font-mono text-[10px]">{(item as any).duration_minutes}m</span>
                                            )
                                          )}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <Button
                            className="w-full gap-2 font-bold"
                            size="lg"
                            disabled={!isValid || isImporting}
                            onClick={handleImport}
                          >
                            {isImporting ? "Deploying Orbit Course..." : (
                              <>
                                <Play className="h-4 w-4" /> Import & Create Course Structure
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl text-muted-foreground space-y-3">
                          <FileCode className="h-10 w-10 opacity-40" />
                          <p className="text-xs">Paste or upload course JSON code to inspect live curriculum breakdown.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="template" className="mt-4">
                  <Card className="border border-border bg-card/60 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <div>
                        <CardTitle className="text-base font-semibold">Course Import Schema</CardTitle>
                        <CardDescription>Standard JSON payload format with quizzes</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleCopyTemplate(SAMPLE_COURSE_JSON, "Course Template")} className="gap-1.5 text-xs font-semibold">
                        <Clipboard className="h-3.5 w-3.5" />
                        {copiedTemplate === "Course Template" ? "Copied!" : "Copy Template"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <pre className="max-h-[350px] overflow-y-auto text-xs font-mono p-3 bg-background/50 border rounded-xl leading-relaxed text-muted-foreground">
                        {JSON.stringify(SAMPLE_COURSE_JSON, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>

        {/* ─── 2. AI MASTER PROMPT GENERATOR TAB ───────────────────────── */}
        <TabsContent value="ai-generator">
          <div className="grid gap-6 lg:grid-cols-5 items-start">
            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border border-primary/20 bg-card/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" /> AI Course Prompt Configurator
                  </CardTitle>
                  <CardDescription>
                    Configure course parameters and generate a bulletproof prompt for ChatGPT, Claude, or Gemini.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Course Title / Subject</Label>
                    <Input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Full Stack AI Engineering with LangChain"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Domain / Category</Label>
                    <Input
                      value={aiDomain}
                      onChange={(e) => setAiDomain(e.target.value)}
                      placeholder="e.g. Data Science & AI, Software Engineering"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Module Count</Label>
                      <Select value={aiModuleCount} onValueChange={setAiModuleCount}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Modules / Weeks</SelectItem>
                          <SelectItem value="4">4 Modules / Weeks</SelectItem>
                          <SelectItem value="6">6 Modules / Weeks</SelectItem>
                          <SelectItem value="8">8 Modules / Weeks</SelectItem>
                          <SelectItem value="12">12 Modules / Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Target Level</Label>
                      <Select value={aiLevel} onValueChange={setAiLevel}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Intermediate to Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer">Include Graded Quizzes (MCQ, True/False, Short/Long)</Label>
                      <Switch checked={aiIncludeQuizzes} onCheckedChange={setAiIncludeQuizzes} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer">Include Practical Project Assignments</Label>
                      <Switch checked={aiIncludeAssignments} onCheckedChange={setAiIncludeAssignments} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer">Include Live Interactive Class Sessions</Label>
                      <Switch checked={aiIncludeLive} onCheckedChange={setAiIncludeLive} />
                    </div>
                  </div>

                  <Button onClick={handleCopyAiPrompt} className="w-full gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <Clipboard className="h-4 w-4" />
                    {copiedTemplate === "AI Prompt" ? "Prompt Copied! 🚀" : "Copy Master AI Prompt 📋"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Generated Prompt Preview */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="border border-border bg-card/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Live AI Prompt Preview</CardTitle>
                    <CardDescription>Copy this prompt and paste it into any LLM model</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyAiPrompt} className="gap-1.5 text-xs font-semibold">
                    <Clipboard className="h-3.5 w-3.5" />
                    {copiedTemplate === "AI Prompt" ? "Copied!" : "Copy Prompt"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="max-h-[420px] overflow-y-auto text-xs font-mono p-4 bg-background/80 border rounded-xl leading-relaxed text-foreground whitespace-pre-wrap">
                    {generateAiPromptText()}
                  </pre>
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
                    <p className="text-xs text-foreground/80">
                      💡 <strong>Next Step:</strong> Paste the prompt into ChatGPT/Claude. Copy the returned JSON and paste it into the <strong>Complete Course Importer</strong> tab to deploy in 1 click.
                    </p>
                    <Button size="sm" onClick={() => setBuilderMode("full-course")} className="gap-1.5 text-xs font-bold shrink-0">
                      Open Importer ↗
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── 3. MODULE / SECTION IMPORTER TAB ─────────────────────── */}
        <TabsContent value="module-import">
          <Card className="border border-border bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" /> Import Single {structuringApproach === "weekly" ? "Weekly Mission Module" : "Course Section"} JSON
              </CardTitle>
              <CardDescription>
                Select an existing course and import a single {structuringApproach === "weekly" ? "weekly module with topic name, quizzes, and allocated hours" : "section module with quizzes"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Target Course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select target course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.title} ({c.credit_points || 3} Credits)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleCopyTemplate(SAMPLE_WEEKLY_MODULE_JSON, "Module Template")} className="gap-1.5 text-xs font-semibold">
                    <Clipboard className="h-3.5 w-3.5" />
                    {copiedTemplate === "Module Template" ? "Copied!" : "Copy Module JSON Template"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">{structuringApproach === "weekly" ? "Weekly Module JSON Code" : "Section JSON Code"}</Label>
                <Textarea
                  placeholder={`Paste ${structuringApproach} module JSON payload here...`}
                  className="min-h-[220px] font-mono text-xs leading-relaxed"
                  value={moduleJsonText}
                  onChange={(e) => {
                    setModuleJsonText(e.target.value);
                    validateModuleJson(e.target.value);
                  }}
                />
              </div>

              {parsedModule && (
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" /> Module Title: {parsedModule.title}
                  </h4>
                  {parsedModule.topic_name && <p className="text-muted-foreground">Topic Focus: {parsedModule.topic_name}</p>}
                  {parsedModule.allocated_hours && <p className="text-muted-foreground">Allocated Duration: {parsedModule.allocated_hours} Hours</p>}
                  <p className="font-mono text-[11px] text-muted-foreground">Contains {parsedModule.items?.length || 0} learning items</p>
                </div>
              )}

              <Button onClick={handleImportModule} disabled={!moduleValid || isImportingModule || !selectedCourseId} className="gap-2 font-bold">
                <Play className="h-4 w-4" /> {isImportingModule ? "Importing Module..." : "Import Module into Course"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 4. SPECIFIC QUIZ IMPORTER TAB ─────────────────────────── */}
        <TabsContent value="quiz-import">
          <Card className="border border-border bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" /> Specific Quiz Importer
              </CardTitle>
              <CardDescription>
                Select target course and week/module section, then import quiz questions directly from JSON into the quiz engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">1. Target Course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">2. Target Week / Module Section</Label>
                  <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedCourseId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select week or section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courseSections.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleCopyTemplate(SAMPLE_QUIZ_JSON, "Quiz Template")} className="gap-1.5 text-xs font-semibold">
                    <Clipboard className="h-3.5 w-3.5" />
                    {copiedTemplate === "Quiz Template" ? "Copied!" : "Copy Quiz JSON Template"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Quiz JSON Code</Label>
                <Textarea
                  placeholder="Paste Quiz JSON payload with questions array here..."
                  className="min-h-[220px] font-mono text-xs leading-relaxed"
                  value={quizJsonText}
                  onChange={(e) => {
                    setQuizJsonText(e.target.value);
                    validateQuizJson(e.target.value);
                  }}
                />
              </div>

              {parsedQuiz && (
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" /> Quiz Title: {parsedQuiz.title}
                    </h4>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                      {parsedQuiz.questions?.length || 0} Questions
                    </Badge>
                  </div>
                  {parsedQuiz.description && <p className="text-muted-foreground">{parsedQuiz.description}</p>}
                  <div className="max-h-40 overflow-y-auto space-y-2 pt-2 border-t font-mono text-[11px]">
                    {parsedQuiz.questions?.map((q, idx) => (
                      <div key={idx} className="p-2 rounded border bg-card/50 flex items-start justify-between gap-2">
                        <span>{idx + 1}. {q.question_text} ({q.type.toUpperCase()})</span>
                        <span className="font-bold text-primary">{q.points || 10} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleImportQuiz} disabled={!quizValid || isImportingQuiz || !selectedSectionId} className="gap-2 font-bold">
                <Play className="h-4 w-4" /> {isImportingQuiz ? "Importing Quiz..." : "Import Quiz into Module"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TeacherLayout>
  );
}
