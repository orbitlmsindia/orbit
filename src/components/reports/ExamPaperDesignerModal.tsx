import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Printer,
  FileCode,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Clipboard,
  Award,
  CheckCircle,
  HelpCircle,
  Clock,
  BookOpen,
  FileText
} from "lucide-react";

export interface ExamQuestion {
  id: string;
  section: string;
  question_text: string;
  type: "mcq" | "short" | "long";
  options?: string[];
  correct_answer?: string;
  marks: number;
}

export interface ExamPaperPayload {
  exam_title: string;
  course_title: string;
  course_code?: string;
  duration_hours?: string;
  max_marks?: number;
  instructions?: string[];
  questions: ExamQuestion[];
}

export const SAMPLE_EXAM_PAPER_JSON: ExamPaperPayload = {
  exam_title: "Final Semester Examination 2026",
  course_title: "Advanced Software Engineering & Orbital Systems",
  course_code: "CS-8942",
  duration_hours: "3 Hours",
  max_marks: 100,
  instructions: [
    "1. All questions in Section A are compulsory.",
    "2. Answer any 4 questions from Section B.",
    "3. Answer any 2 detailed questions from Section C.",
    "4. Neat architectural diagrams carry extra credit."
  ],
  questions: [
    {
      id: "q1",
      section: "A",
      question_text: "What is the primary advantage of microservices over monolithic architecture?",
      type: "mcq",
      options: ["Independent Scalability & Deployment", "Lower RAM Usage", "Single Codebase", "Zero Network Latency"],
      correct_answer: "Independent Scalability & Deployment",
      marks: 2
    },
    {
      id: "q2",
      section: "A",
      question_text: "Which protocol is recommended for low-latency real-time satellite telemetry streaming?",
      type: "mcq",
      options: ["HTTP/1.1", "WebSockets / gRPC", "FTP", "SMTP"],
      correct_answer: "WebSockets / gRPC",
      marks: 2
    },
    {
      id: "q3",
      section: "B",
      question_text: "Explain the CAP Theorem (Consistency, Availability, Partition Tolerance) with real-world LMS database examples.",
      type: "short",
      marks: 10
    },
    {
      id: "q4",
      section: "B",
      question_text: "Describe the row-level security (RLS) enforcement mechanism in PostgreSQL and Supabase.",
      type: "short",
      marks: 10
    },
    {
      id: "q5",
      section: "C",
      question_text: "Design a fault-tolerant distributed orbital learning platform architecture capable of handling 500,000 concurrent students. Include database replication, caching layer, and media streaming CDN.",
      type: "long",
      marks: 20
    }
  ]
};

interface ExamPaperDesignerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle?: string;
  courseDomain?: string;
}

export function ExamPaperDesignerModal({
  open,
  onOpenChange,
  courseTitle = "Advanced Academic Course",
  courseDomain = "Engineering & Science"
}: ExamPaperDesignerModalProps) {
  const { toast } = useToast();

  // Branding & Institute Data
  const [institute, setInstitute] = useState<any>({
    name: "Orbit LMS Innovation Academy",
    logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
    registrationNo: "REG-ORBIT-2026/8942",
    tagline: "Official Academic Assessment Directorate",
    email: "examination@orbitlms.edu.in",
    phone: "+91 98765 43210",
    address: "Orbit Technology Campus, Tech City, India",
    headerBannerUrl: ""
  });

  // Exam Paper Config State
  const [examTitle, setExamTitle] = useState("Final Comprehensive Examination");
  const [courseCode, setCourseCode] = useState("ORB-2026");
  const [durationHours, setDurationHours] = useState("3 Hours");
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [instructionsText, setInstructionsText] = useState(
    "1. All questions in Section A are compulsory.\n2. Answer any 4 questions from Section B.\n3. Answer any 2 detailed questions from Section C."
  );

  // Active Tab State
  const [activeTab, setActiveTab] = useState("editor");

  // Questions List State
  const [questions, setQuestions] = useState<ExamQuestion[]>(SAMPLE_EXAM_PAPER_JSON.questions);

  // JSON Importer State
  const [jsonText, setJsonText] = useState("");
  const [copied, setCopied] = useState(false);

  // Question Form State
  const [selectedSection, setSelectedSection] = useState<string>("A");
  const [customSection, setCustomSection] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"mcq" | "short" | "long">("mcq");
  const [qMarks, setQMarks] = useState("2");
  const [qOptions, setQOptions] = useState("Option A, Option B, Option C, Option D");

  useEffect(() => {
    if (open) {
      loadBrandingSettings();
    }
  }, [open]);

  const loadBrandingSettings = () => {
    const savedInst = localStorage.getItem("orbit_institute_settings");
    const savedTeacher = localStorage.getItem("orbit_teacher_letterhead");
    let base = { ...institute };

    if (savedInst) {
      try {
        base = { ...base, ...JSON.parse(savedInst) };
      } catch (e) {}
    }
    if (savedTeacher) {
      try {
        const tObj = JSON.parse(savedTeacher);
        if (tObj.logoUrl) base.logoUrl = tObj.logoUrl;
        if (tObj.headerBannerUrl) base.headerBannerUrl = tObj.headerBannerUrl;
      } catch (e) {}
    }

    setInstitute(base);
  };

  const handleAddQuestion = () => {
    if (!qText.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Question text is required." });
      return;
    }

    const finalSection = isCustomMode
      ? (customSection.trim() || "A")
      : selectedSection;

    const newQ: ExamQuestion = {
      id: "q_" + Date.now(),
      section: finalSection.toUpperCase(),
      question_text: qText.trim(),
      type: qType,
      marks: parseInt(qMarks) || 2,
      options: qType === "mcq" ? qOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined
    };

    setQuestions([...questions, newQ]);
    setQText("");
    if (isCustomMode && customSection.trim()) {
      setSelectedSection(customSection.trim().toUpperCase());
      setIsCustomMode(false);
      setCustomSection("");
    }
    toast({ title: "Question Added! 📝", description: `Added to Section ${finalSection.toUpperCase()}` });
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        if (parsed.exam_title) setExamTitle(parsed.exam_title);
        if (parsed.duration_hours) setDurationHours(parsed.duration_hours);
        if (parsed.max_marks) setMaxMarks(parsed.max_marks);
        if (parsed.instructions && Array.isArray(parsed.instructions)) {
          setInstructionsText(parsed.instructions.join("\n"));
        }
        setQuestions(parsed.questions);
        toast({ title: "Exam Paper JSON Imported! 🚀", description: `Loaded ${parsed.questions.length} questions.` });
        setJsonText("");
      } else {
        toast({ variant: "destructive", title: "Invalid JSON", description: "JSON must contain a 'questions' array." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Syntax Error", description: e.message });
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_EXAM_PAPER_JSON, null, 2));
    setCopied(true);
    toast({ title: "Template Copied! 📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract unique section names dynamically
  const uniqueSections = Array.from(new Set([
    "A", "B", "C", "D",
    ...questions.map(q => q.section.toUpperCase())
  ])).sort();

  const buildPrintHTML = () => {
    const activeSectionKeys = Array.from(new Set(questions.map((q) => (q.section || "A").toUpperCase())));

    const sectionsHtml = activeSectionKeys
      .map((secKey) => {
        const secQuestions = questions.filter((q) => (q.section || "A").toUpperCase() === secKey);
        const secTotalMarks = secQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
        const sectionTitle = secKey.length <= 2 ? `SECTION ${secKey}` : secKey;

        return `
          <div style="margin-top: 20px;">
            <div style="border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; font-weight: 800; font-size: 12.5px; text-transform: uppercase;">
              <span>${sectionTitle}</span>
              <span>[${secTotalMarks} MARKS]</span>
            </div>
            <div>
              ${secQuestions
                .map((q, idx) => `
                <div style="margin-bottom: 14px; page-break-inside: avoid;">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 12px;">
                    <span>Q${idx + 1}. ${q.question_text}</span>
                    <span style="font-family: monospace; font-weight: 700; margin-left: 10px; color: #334155;">[${q.marks}M]</span>
                  </div>
                  ${
                    q.options && q.options.length > 0
                      ? `
                    <table style="width: 100%; margin-top: 6px; padding-left: 16px; font-family: monospace; font-size: 11px; color: #334155;">
                      <tr>
                        <td style="width: 50%; padding: 2px 4px;">(a) ${q.options[0] || ''}</td>
                        <td style="width: 50%; padding: 2px 4px;">(b) ${q.options[1] || ''}</td>
                      </tr>
                      ${
                        q.options.length > 2
                          ? `
                      <tr>
                        <td style="width: 50%; padding: 2px 4px;">(c) ${q.options[2] || ''}</td>
                        <td style="width: 50%; padding: 2px 4px;">(d) ${q.options[3] || ''}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  `
                      : ''
                  }
                </div>
              `).join('')}
            </div>
          </div>
        `;
      })
      .join('');

    const logoHtml = institute.logoUrl
      ? `<img src="${institute.logoUrl}" style="height: 55px; width: auto; object-fit: contain; padding: 2px; border: 1px solid #cbd5e1; border-radius: 4px;" />`
      : '';

    const headerHtml = institute.headerBannerUrl
      ? `<div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <img src="${institute.headerBannerUrl}" style="max-height: 85px; width: auto; max-width: 100%; object-fit: contain;" />
         </div>`
      : `<div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${logoHtml}
            <div>
              <h1 style="font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a;">${institute.name || 'INSTITUTION NAME'}</h1>
              <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">${institute.tagline || institute.address || ''}</p>
              ${institute.registrationNo ? `<p style="font-size: 10px; font-family: monospace; color: #64748b; margin: 2px 0 0 0;">Reg No: ${institute.registrationNo}</p>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0; border-bottom: 1px solid #64748b; padding-bottom: 2px;">${examTitle}</h2>
            <p style="font-size: 10px; font-family: monospace; color: #475569; margin: 4px 0 0 0;">Academic Year 2025 - 2026</p>
          </div>
         </div>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examTitle} - ${courseTitle}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm 12mm 15mm 12mm;
            }
            body {
              font-family: "Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 10px;
              font-size: 12px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${headerHtml}

          <!-- Metadata Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; border: 1.5px solid #0f172a;">
            <tr>
              <td style="width: 50%; border: 1px solid #334155; padding: 6px 10px; vertical-align: top;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Course Title</span>
                <span style="font-weight: 800; font-size: 13px;">${courseTitle}</span>
              </td>
              <td style="width: 50%; border: 1px solid #334155; padding: 6px 10px; vertical-align: top;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Course Code & Domain</span>
                <span style="font-weight: 700;">${courseCode} • ${courseDomain}</span>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; border: 1px solid #334155; padding: 6px 10px; vertical-align: top;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Time Duration</span>
                <span style="font-weight: 700;">${durationHours}</span>
              </td>
              <td style="width: 50%; border: 1px solid #334155; padding: 6px 10px; vertical-align: top;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Maximum Marks</span>
                <span style="font-weight: 700;">${maxMarks} Marks</span>
              </td>
            </tr>
          </table>

          <!-- General Instructions -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 16px;">
            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; color: #334155;">General Instructions:</div>
            <div style="font-family: monospace; font-size: 10.5px; color: #334155; white-space: pre-line; line-height: 1.4;">${instructionsText}</div>
          </div>

          <!-- Dynamic Question Sections -->
          ${sectionsHtml}

          <!-- End of Paper Footer -->
          <div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; font-family: monospace; letter-spacing: 1px; page-break-inside: avoid;">
            *** END OF QUESTION PAPER ***
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    setActiveTab("preview");

    setTimeout(() => {
      try {
        const existingIframe = document.getElementById("exam-paper-print-frame");
        if (existingIframe) existingIframe.remove();

        const iframe = document.createElement("iframe");
        iframe.id = "exam-paper-print-frame";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
          window.print();
          return;
        }

        doc.open();
        doc.write(buildPrintHTML());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.print();
          }
          setTimeout(() => iframe.remove(), 1000);
        }, 200);
      } catch (err) {
        window.print();
      }
    }, 100);
  };

  const calculatedTotalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const activeSectionKeys = Array.from(new Set(questions.map((q) => (q.section || "A").toUpperCase())));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Official Exam Paper Designer</DialogTitle>
          <DialogDescription>Design, preview, and print official institutional examination question papers.</DialogDescription>
        </DialogHeader>

        {/* Top Control Bar */}
        <div className="p-4 border-b bg-muted/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 bg-background z-20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Official Exam Paper Designer</h2>
              <p className="text-xs text-muted-foreground">Auto-fetches course details, logo, and layout branding from letterhead settings.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2 font-bold bg-primary text-primary-foreground shadow-md">
              <Printer className="h-4 w-4" /> Print / Export PDF Question Paper
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-3 border-b">
            <TabsList className="grid grid-cols-3 max-w-md">
              <TabsTrigger value="editor" className="font-bold text-xs">Paper Config & Qs</TabsTrigger>
              <TabsTrigger value="json" className="font-bold text-xs">JSON Importer</TabsTrigger>
              <TabsTrigger value="preview" className="font-bold text-xs">Printable Preview</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: QUESTION BUILDER & CONFIG */}
          <TabsContent value="editor" className="p-6 space-y-6">
            {/* Paper Header Metadata */}
            <div className="p-4 rounded-xl border bg-card/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Exam Title</Label>
                <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Course Code</Label>
                <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Duration Allowed</Label>
                <Input value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Maximum Marks Target</Label>
                <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(parseInt(e.target.value) || 100)} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold">General Examination Instructions</Label>
                <Textarea className="min-h-[60px] text-xs font-mono" value={instructionsText} onChange={(e) => setInstructionsText(e.target.value)} />
              </div>
            </div>

            {/* Add New Question Form */}
            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Question to Exam Paper
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Target Section</Label>
                  {!isCustomMode ? (
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCustomMode(true);
                        } else {
                          setSelectedSection(e.target.value);
                        }
                      }}
                      className="w-full h-9 px-2 rounded border bg-background text-xs"
                    >
                      {uniqueSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                      <option value="__NEW__">+ Add Custom Section / Title...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <Input
                        placeholder="e.g. D or Section D"
                        value={customSection}
                        onChange={(e) => setCustomSection(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button variant="ghost" size="sm" onClick={() => setIsCustomMode(false)} className="h-9 px-2 text-xs">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Question Type</Label>
                  <select
                    value={qType}
                    onChange={(e: any) => setQType(e.target.value)}
                    className="w-full h-9 px-2 rounded border bg-background text-xs"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="short">Short Answer</option>
                    <option value="long">Long Essay / Design</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Marks Assigned</Label>
                  <Input type="number" value={qMarks} onChange={(e) => setQMarks(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddQuestion} className="w-full gap-1.5 font-bold">
                    <Plus className="h-4 w-4" /> Insert Question
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Question Text</Label>
                <Textarea placeholder="Enter question statement..." value={qText} onChange={(e) => setQText(e.target.value)} className="min-h-[60px] text-xs" />
              </div>

              {qType === "mcq" && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold">MCQ Options (Comma Separated)</Label>
                  <Input value={qOptions} onChange={(e) => setQOptions(e.target.value)} className="text-xs font-mono" />
                </div>
              )}
            </div>

            {/* Questions Summary Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">Exam Questions Breakdown ({questions.length} Questions)</h4>
                <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Total Paper Marks: {calculatedTotalMarks} / {maxMarks} Marks
                </Badge>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-3 bg-muted/20 text-xs">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary uppercase">
                          Sec {q.section}
                        </Badge>
                        <span className="font-bold text-foreground">Q{idx + 1}. {q.question_text}</span>
                      </div>
                      {q.options && <p className="text-[11px] text-muted-foreground font-mono">Options: {q.options.join(" • ")}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold font-mono text-primary text-xs">{q.marks} Marks</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: JSON IMPORTER */}
          <TabsContent value="json" className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Import Exam Paper via JSON</h3>
                <p className="text-xs text-muted-foreground">Upload or paste complete exam paper JSON payload.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyTemplate} className="gap-1.5 text-xs font-semibold">
                <Clipboard className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy JSON Template"}
              </Button>
            </div>

            <Textarea
              placeholder="Paste exam paper JSON here..."
              className="min-h-[280px] font-mono text-xs leading-relaxed"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />

            <Button onClick={handleImportJson} disabled={!jsonText.trim()} className="gap-2 font-bold">
              <Sparkles className="h-4 w-4" /> Load & Apply Exam JSON
            </Button>
          </TabsContent>

          {/* TAB 3: PRINTABLE PREVIEW */}
          <TabsContent value="preview" className="p-6">
            {/* Printable Paper Canvas */}
            <div id="printable-exam-paper" className="p-8 space-y-6 bg-white text-slate-900 rounded-xl border shadow-lg font-sans">
              {/* Header Letterhead Banner */}
              {institute.headerBannerUrl ? (
                <img src={institute.headerBannerUrl} alt="Header Banner" className="w-full max-h-24 object-contain border-b pb-2" />
              ) : (
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {institute.logoUrl && <img src={institute.logoUrl} alt="Logo" className="h-14 w-14 object-contain p-1 border rounded" />}
                    <div>
                      <h1 className="text-xl font-bold font-display uppercase tracking-wide">{institute.name}</h1>
                      <p className="text-xs text-slate-600">{institute.tagline || institute.address}</p>
                      {institute.registrationNo && <p className="text-[10px] font-mono text-slate-500">Reg No: {institute.registrationNo}</p>}
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <span className="font-bold text-sm block border-b pb-1 uppercase">{examTitle}</span>
                    <p className="font-mono text-[11px]">Academic Year 2025 - 2026</p>
                  </div>
                </div>
              )}

              {/* Exam Course & Details Grid */}
              <div className="grid grid-cols-2 border border-slate-900 text-xs font-mono">
                <div className="p-2.5 border-r border-b">
                  <span className="font-bold block text-[10px] text-slate-500 uppercase">Course Title</span>
                  <span className="font-bold text-sm">{courseTitle}</span>
                </div>
                <div className="p-2.5 border-b">
                  <span className="font-bold block text-[10px] text-slate-500 uppercase">Course Code & Domain</span>
                  <span className="font-bold">{courseCode} • {courseDomain}</span>
                </div>
                <div className="p-2.5 border-r">
                  <span className="font-bold block text-[10px] text-slate-500 uppercase">Time Duration</span>
                  <span className="font-bold">{durationHours}</span>
                </div>
                <div className="p-2.5">
                  <span className="font-bold block text-[10px] text-slate-500 uppercase">Maximum Marks</span>
                  <span className="font-bold">{maxMarks} Marks</span>
                </div>
              </div>

              {/* General Instructions */}
              <div className="p-3 border border-slate-300 rounded bg-slate-50 text-xs space-y-1">
                <span className="font-bold uppercase tracking-wider block text-[11px]">General Instructions:</span>
                <p className="whitespace-pre-line text-slate-700 font-mono leading-relaxed text-[11px]">{instructionsText}</p>
              </div>

              {/* Dynamic Question Sections */}
              {activeSectionKeys.map((secKey) => {
                const secQuestions = questions.filter((q) => (q.section || "A").toUpperCase() === secKey);
                const secTotalMarks = secQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
                const secTitle = secKey.length <= 2 ? `SECTION ${secKey}` : secKey;

                return (
                  <div key={secKey} className="space-y-3 pt-2">
                    <div className="border-b border-slate-900 pb-1 flex justify-between font-bold text-sm uppercase">
                      <span>{secTitle}</span>
                      <span>[{secTotalMarks} MARKS]</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      {secQuestions.map((q, idx) => (
                        <div key={q.id} className="space-y-1">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold">Q{idx + 1}. {q.question_text}</p>
                            <span className="font-mono text-slate-600 font-bold ml-2">[{q.marks}M]</span>
                          </div>
                          {q.options && (
                            <div className="grid grid-cols-2 gap-2 pl-4 text-slate-700 font-mono text-[11px] pt-1">
                              {q.options.map((opt, oidx) => (
                                <span key={oidx}>({String.fromCharCode(97 + oidx)}) {opt}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* End of Question Paper Footer */}
              <div className="pt-8 border-t border-slate-300 text-center font-mono text-xs font-bold text-slate-500 tracking-wider">
                *** END OF QUESTION PAPER ***
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
