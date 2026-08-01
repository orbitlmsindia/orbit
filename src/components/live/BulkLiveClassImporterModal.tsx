import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Video, Download, CheckCircle2, AlertTriangle, Loader2, UploadCloud, FileJson, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BulkLiveClassImporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle?: string;
  onSuccess: () => void;
}

export const SAMPLE_LIVE_CLASSES_JSON = [
  {
    title: "Module 1: Live Q&A & Architecture Walkthrough",
    meeting_link: "https://meet.google.com/abc-defg-hij",
    scheduled_at: "2025-08-15T15:00:00Z",
    duration_minutes: 60,
    description: "Interactive session discussing system architecture and live Q&A."
  },
  {
    title: "Module 2: Live Code Demonstration & Debugging",
    meeting_link: "https://meet.google.com/xyz-uvwx-rst",
    scheduled_at: "2025-08-22T15:00:00Z",
    duration_minutes: 90,
    description: "Step-by-step live coding demonstration."
  }
];

export function BulkLiveClassImporterModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess
}: BulkLiveClassImporterModalProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Download Sample JSON Template
  const handleDownloadJsonTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_LIVE_CLASSES_JSON, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "live_classes_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Template Downloaded", description: "live_classes_template.json downloaded." });
  };

  // Download Sample CSV Template
  const handleDownloadCsvTemplate = () => {
    const csvContent = "title,meeting_link,scheduled_at,duration_minutes,description\n" +
      "Module 1: Live Q&A,https://meet.google.com/abc-defg-hij,2025-08-15T15:00:00Z,60,Interactive session and Q&A.\n" +
      "Module 2: Live Demo,https://meet.google.com/xyz-uvwx-rst,2025-08-22T15:00:00Z,90,Live coding demo.";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "live_classes_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Template Downloaded", description: "live_classes_template.csv downloaded." });
  };

  // Parse Text (JSON or CSV)
  const parsePayload = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const rows: any[] = [];
    const trimmed = text.trim();

    // 1. Try Parsing as JSON
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed);
        const list = Array.isArray(json) ? json : [json];

        list.forEach((item, idx) => {
          const isValidDate = item.scheduled_at && !isNaN(new Date(item.scheduled_at).getTime());
          const isValidLink = item.meeting_link && typeof item.meeting_link === "string" && item.meeting_link.trim().length > 0;
          const isValidTitle = item.title && typeof item.title === "string" && item.title.trim().length > 0;

          rows.push({
            id: `json-${idx}`,
            title: item.title?.trim() || `Live Class #${idx + 1}`,
            meetingLink: item.meeting_link?.trim() || "",
            scheduledAt: isValidDate ? new Date(item.scheduled_at).toISOString() : null,
            duration: item.duration_minutes || 60,
            description: item.description || "",
            isValid: isValidTitle && isValidLink && isValidDate
          });
        });

        setParsedRows(rows);
        return;
      } catch (err) {
        // Fallthrough to CSV
      }
    }

    // 2. Try Parsing as CSV
    const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean);
    const startIndex = lines[0].toLowerCase().includes("meeting_link") || lines[0].toLowerCase().includes("title") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length < 2) continue;

      const title = parts[0];
      const meetingLink = parts[1];
      const scheduledAtStr = parts[2];
      const duration = parseInt(parts[3]) || 60;
      const description = parts.slice(4).join(", ").replace(/^"|"$/g, "");

      const isValidDate = scheduledAtStr && !isNaN(new Date(scheduledAtStr).getTime());
      const isValidLink = meetingLink && meetingLink.startsWith("http");
      const isValidTitle = title && title.length > 0;

      rows.push({
        id: `csv-${i}`,
        title,
        meetingLink,
        scheduledAt: isValidDate ? new Date(scheduledAtStr).toISOString() : null,
        duration,
        description,
        isValid: isValidTitle && isValidLink && isValidDate
      });
    }

    setParsedRows(rows);
  };

  // Handle File Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parsePayload(content);
      }
    };
    reader.readAsText(file);
  };

  // Execute Bulk Import to Database (live_classes & calendar_events)
  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    try {
      setIsImporting(true);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert into live_classes
      const liveClassesPayload = validRows.map(r => ({
        course_id: courseId,
        teacher_id: user?.id,
        title: r.title,
        meeting_link: r.meetingLink,
        scheduled_at: r.scheduledAt,
        duration_minutes: r.duration,
        description: r.description,
        status: "upcoming"
      }));

      const { error: liveError } = await supabase
        .from("live_classes")
        .insert(liveClassesPayload);

      if (liveError) throw liveError;

      // 2. Sync to calendar_events (visible to Teacher, Admin, and Students)
      const calendarPayload = validRows.map(r => ({
        title: `🔴 Live Class: ${r.title}`,
        description: `Meeting Link: ${r.meetingLink}${r.description ? " - " + r.description : ""}`,
        event_date: r.scheduledAt,
        type: "live_class",
        visibility: "all",
        course_id: courseId
      }));

      await supabase.from("calendar_events").insert(calendarPayload);

      toast({
        title: "Live Classes Imported & Calendars Synced! 🎉",
        description: `Successfully scheduled ${validRows.length} live class(es) for this course.`
      });

      setInputText("");
      setParsedRows([]);
      onOpenChange(false);
      onSuccess();

    } catch (err: any) {
      toast({ variant: "destructive", title: "Import Error", description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <Video className="h-5 w-5 text-red-500" />
            Bulk Import Live Classes & Sync Calendars (JSON / CSV)
          </DialogTitle>
          <DialogDescription>
            Import multiple live interactive sessions at once. Scheduled sessions will automatically sync to Admin, Teacher, and Student calendars.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileJson className="h-4 w-4 text-red-500 shrink-0" />
              <span>Format: <strong>title, meeting_link, scheduled_at, duration_minutes, description</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadJsonTemplate} className="gap-1.5 text-xs h-8">
                <FileJson className="h-3.5 w-3.5" /> JSON Template
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsvTemplate} className="gap-1.5 text-xs h-8">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Template
              </Button>
              <label htmlFor="bulk-live-file-input">
                <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer" onClick={() => document.getElementById('bulk-live-file-input')?.click()}>
                  <UploadCloud className="h-3.5 w-3.5" /> Upload File
                </Button>
              </label>
              <input id="bulk-live-file-input" type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-1.5">
            <Textarea
              placeholder={`Paste JSON array or CSV content here...\n\nExample JSON:\n[\n  {\n    "title": "Module 1 Live Q&A",\n    "meeting_link": "https://meet.google.com/abc-defg-hij",\n    "scheduled_at": "2025-08-15T15:00:00Z",\n    "duration_minutes": 60,\n    "description": "Live Q&A session."\n  }\n]`}
              className="font-mono text-xs min-h-[160px] bg-background"
              value={inputText}
              onChange={(e) => parsePayload(e.target.value)}
            />
          </div>

          {/* Interactive Pre-Import Preview */}
          {parsedRows.length > 0 && (
            <div className="border rounded-xl overflow-hidden text-xs">
              <div className="px-4 py-2.5 bg-muted/60 font-semibold border-b flex items-center justify-between">
                <span>Pre-Import Live Sessions Review ({parsedRows.length} Parsed)</span>
                <Badge variant={validCount > 0 ? "success" : "destructive"} className="font-mono">
                  {validCount} Valid & Ready
                </Badge>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y">
                {parsedRows.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{r.title}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono text-[11px] text-primary line-clamp-1">{r.meetingLink}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span>📅 {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "Invalid Date"}</span>
                        <span>⏱️ {r.duration} mins</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {r.isValid ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Ready & Synced
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> Missing Date/Link
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validCount === 0 || isImporting}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isImporting ? "Importing & Syncing..." : `Import Live Classes (${validCount} Sessions)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
