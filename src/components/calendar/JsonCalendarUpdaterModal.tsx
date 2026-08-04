import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Download, FileJson, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  SAMPLE_CALENDAR_JSON,
  validateCalendarJson,
  importCalendarEventsFromJson,
  JsonCalendarEvent
} from "@/lib/calendarJsonImporter";

interface JsonCalendarUpdaterModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function JsonCalendarUpdaterModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess
}: JsonCalendarUpdaterModalProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      externalOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [jsonText, setJsonText] = useState("");
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; events: JsonCalendarEvent[] }>({
    isValid: false,
    errors: [],
    events: []
  });
  const [isImporting, setIsImporting] = useState(false);

  // Global Keyboard Shortcut Listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Validate on text change
  const handleTextChange = (text: string) => {
    setJsonText(text);
    if (!text.trim()) {
      setValidation({ isValid: false, errors: [], events: [] });
      return;
    }
    const result = validateCalendarJson(text);
    setValidation(result);
  };

  // Download Sample JSON Template
  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_CALENDAR_JSON, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calendar_schedule_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Template Downloaded", description: "calendar_schedule_template.json saved." });
  };

  // Bulk Import Events
  const handleImport = async () => {
    if (!validation.isValid || validation.events.length === 0) return;

    try {
      setIsImporting(true);
      const result = await importCalendarEventsFromJson(validation.events);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Calendar Update Failed",
          description: result.errors[0] || "Could not save events to calendar."
        });
        return;
      }

      toast({
        title: "Calendar Schedule Updated!",
        description: `Successfully added ${result.importedCount} calendar event(s).`
      });

      setJsonText("");
      setValidation({ isValid: false, errors: [], events: [] });
      setOpen(false);
      onSuccess?.();

    } catch (err: any) {
      toast({ variant: "destructive", title: "Import Error", description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <Calendar className="h-5 w-5 text-primary" />
            JSON Calendar Schedule Updater
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </DialogTitle>
          <DialogDescription>
            Bulk update or add academic exams, live sessions, holidays, and assignment deadlines via JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileJson className="h-4 w-4 text-primary" />
              <span>Use standard JSON format or download our pre-formatted template.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
          </div>

          {/* JSON Text Input Area */}
          <div className="space-y-2">
            <Textarea
              placeholder={`Paste your JSON calendar schedule payload here...\n\nExample:\n[\n  {\n    "title": "Final Term Exam",\n    "event_date": "2025-11-20T10:00:00Z",\n    "type": "exam",\n    "visibility": "all"\n  }\n]`}
              className="font-mono text-xs min-h-[220px] bg-background"
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {/* Live Validation Feedback */}
          {jsonText.trim() !== "" && (
            <div>
              {validation.isValid ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Valid JSON Format ({validation.events.length} event(s) ready to import)</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    Ready
                  </Badge>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>JSON Validation Errors:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Event Preview Table */}
          {validation.isValid && validation.events.length > 0 && (
            <div className="border rounded-xl overflow-hidden text-xs">
              <div className="px-3 py-2 bg-muted/60 font-semibold border-b">
                Schedule Preview ({validation.events.length} Events)
              </div>
              <div className="max-h-40 overflow-y-auto divide-y">
                {validation.events.map((evt, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                    <div>
                      <p className="font-semibold text-foreground">{evt.title}</p>
                      <p className="text-[11px] text-muted-foreground">{evt.description || "No description"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {evt.type || "event"}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {new Date(evt.event_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validation.isValid || isImporting || validation.events.length === 0}
            className="gap-2"
          >
            {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isImporting ? "Updating Calendar..." : `Update Calendar (${validation.events.length} Events)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
