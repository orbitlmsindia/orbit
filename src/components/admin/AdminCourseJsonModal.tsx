import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileCode,
  Upload,
  Sparkles,
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Layers,
  HelpCircle,
  Clock,
  User,
} from "lucide-react";
import {
  validateCourseJson,
  normalizeCourseJson,
  importCourseFromJson,
  computePreviewStats,
  SAMPLE_COURSE_JSON,
  JsonCoursePayload,
  ValidationError,
} from "@/lib/courseJsonImporter";

interface AdminCourseJsonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: any[];
  onSuccess: () => void;
}

const SAMPLE_FULLSTACK_COURSE: JsonCoursePayload = {
  title: "Modern Full-Stack Engineering (React, Node.js & PostgreSQL)",
  description: "Comprehensive industry syllabus covering scalable frontend architectures, REST/GraphQL APIs, relational database design, and CI/CD pipelines.",
  domain: "Web & Software Engineering",
  structuring_approach: "weekly",
  credit_points: 4,
  duration_hours: 48,
  price: 0,
  is_published: true,
  sections: [
    {
      title: "Module 1: Modern React & TypeScript Foundations",
      week_number: 1,
      allocated_hours: 12,
      topic_name: "Frontend Architecture",
      items: [
        {
          title: "Architecture Walkthrough & Component Lifecycle",
          type: "video",
          url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
          duration_minutes: 45,
        },
        {
          title: "Production State Management Best Practices",
          type: "pdf",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          duration_minutes: 30,
        },
        {
          title: "Module 1 Self-Assessment Quiz",
          type: "quiz",
          time_limit_minutes: 15,
          points: 30,
          questions: [
            {
              question_text: "Which hook should be used for subscribing to external state in modern React?",
              type: "mcq",
              options: ["useSyncExternalStore", "useEffect", "useMemo", "useRef"],
              correct_answer: "useSyncExternalStore",
              points: 10,
            },
            {
              question_text: "TypeScript provides runtime type-checking by default in production builds.",
              type: "boolean",
              options: ["True", "False"],
              correct_answer: "False",
              points: 10,
            },
          ],
        },
      ],
    },
    {
      title: "Module 2: High-Throughput Node.js & SQL Schema Design",
      week_number: 2,
      allocated_hours: 15,
      topic_name: "Backend Systems",
      items: [
        {
          title: "Designing Index-Optimized Relational Schemas",
          type: "video",
          url: "https://www.youtube.com/watch?v=qw--VYLpxG4",
          duration_minutes: 50,
        },
        {
          title: "Connection Pooling & Transaction Isolation Guide",
          type: "text",
          content_text: "Connection pooling maintains a cache of active database connections, allowing queries to be executed without renegotiating TLS handshakes.",
          duration_minutes: 20,
        },
      ],
    },
  ],
};

export function AdminCourseJsonModal({
  open,
  onOpenChange,
  teachers,
  onSuccess,
}: AdminCourseJsonModalProps) {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("admin_unassigned");
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<JsonCoursePayload | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);

  const handleValidateJson = (text: string) => {
    setJsonInput(text);
    if (!text.trim()) {
      setParsedData(null);
      setValidationErrors([]);
      setIsValid(null);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const normalized = normalizeCourseJson(parsed);
      const errors = validateCourseJson(normalized);

      setValidationErrors(errors);
      setIsValid(errors.length === 0);
      if (errors.length === 0) {
        setParsedData(normalized);
      } else {
        setParsedData(null);
      }
    } catch (err: any) {
      setIsValid(false);
      setValidationErrors([{ path: "json_syntax", message: `Syntax Error: ${err.message}` }]);
      setParsedData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleValidateJson(content);
      toast({ title: "Course JSON File Loaded 📂", description: `Loaded ${file.name}` });
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sample: JsonCoursePayload) => {
    const str = JSON.stringify(sample, null, 2);
    handleValidateJson(str);
    toast({ title: "Sample Syllabus Loaded 📋" });
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_FULLSTACK_COURSE, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `course_syllabus_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Template Downloaded! 📥" });
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_FULLSTACK_COURSE, null, 2));
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
    toast({ title: "Copied Sample JSON! 📋" });
  };

  const handleImportCourse = async () => {
    if (!parsedData || !isValid) {
      toast({ variant: "destructive", title: "Invalid JSON", description: "Please resolve validation errors first." });
      return;
    }

    setIsImporting(true);
    try {
      // Determine instructor UUID
      let teacherUuid = selectedTeacherId;
      if (teacherUuid === "admin_unassigned" || !teacherUuid) {
        // Fallback to first available teacher or admin's own ID
        teacherUuid = teachers[0]?.id || "unassigned";
      }

      const result = await importCourseFromJson(parsedData, teacherUuid);

      if (result.success) {
        toast({
          title: "Course Imported Successfully! 🎉",
          description: `Created "${parsedData.title}" with ${result.sectionsCreated} sections and ${result.contentsCreated} contents.`,
        });
        onSuccess();
        onOpenChange(false);
        setJsonInput("");
        setParsedData(null);
      } else {
        toast({
          variant: "destructive",
          title: "Import Error",
          description: result.errors.join(", ") || "Failed to import course structure.",
        });
      }
    } catch (err: any) {
      console.error("Course import error:", err);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: err.message || "An error occurred while importing.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const previewStats = parsedData ? computePreviewStats(parsedData) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileCode className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                Upload & Provision Course via JSON
              </DialogTitle>
              <DialogDescription className="text-xs">
                Import complete course curricula, syllabus modules, video lectures, and quizzes from structured JSON.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLoadSample(SAMPLE_FULLSTACK_COURSE)}
                className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Load Full-Stack Sample
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLoadSample(SAMPLE_COURSE_JSON)}
                className="h-7 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Load AI Masterclass Sample
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCopyTemplate}
                className="h-7 text-xs"
              >
                {copiedSample ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDownloadTemplate}
                className="h-7 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download Template
              </Button>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors">
              <Upload className="h-3.5 w-3.5 text-primary" />
              Upload JSON File
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Instructor Assignment Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Assign Course Instructor</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select faculty instructor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_unassigned">Institutional Course (Admin Assigned)</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} ({t.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end text-xs">
              {isValid === true && (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                  JSON Schema 100% Validated
                </div>
              )}
              {isValid === false && (
                <div className="flex items-center gap-1.5 text-destructive font-semibold bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.length} validation errors
                </div>
              )}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Course Specification JSON Payload</Label>
            <Textarea
              placeholder={`Paste course JSON here... Click "Load Full-Stack Sample" above for a pre-made template.`}
              value={jsonInput}
              onChange={(e) => handleValidateJson(e.target.value)}
              className="font-mono text-xs min-h-[220px] bg-muted/10 leading-relaxed"
            />
          </div>

          {/* Live Validation Errors List */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Please fix the following validation errors:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>
                    <code className="font-mono font-bold text-foreground">{err.path}</code>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Real-time Preview Statistics Card */}
          {parsedData && previewStats && (
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono mb-1">
                    {parsedData.domain || "General Academics"}
                  </Badge>
                  <h4 className="font-bold text-base text-foreground">{parsedData.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {parsedData.description}
                  </p>
                </div>

                <Badge className="bg-emerald-600 text-white font-mono text-xs shrink-0">
                  {parsedData.price ? `₹ ${parsedData.price}` : "Free Course"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs">
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Sections / Modules</p>
                  <p className="text-base font-bold font-mono text-foreground">{previewStats.sectionsCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Video / Text Lessons</p>
                  <p className="text-base font-bold font-mono text-foreground">{previewStats.contentItemsCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Examinations & Quizzes</p>
                  <p className="text-base font-bold font-mono text-foreground">{previewStats.quizzesCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Estimated Hours</p>
                  <p className="text-base font-bold font-mono text-foreground">{parsedData.duration_hours || 40}h</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImportCourse}
            disabled={!isValid || isImporting || !parsedData}
            className="bg-primary text-primary-foreground font-semibold"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Curriculum in Database...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Import & Publish Course
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
