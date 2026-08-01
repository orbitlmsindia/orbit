import { supabase } from "./supabase";

export interface JsonCalendarEvent {
  title: string;
  description?: string;
  event_date: string; // ISO string or YYYY-MM-DD
  type?: "event" | "exam" | "holiday" | "live_class" | "deadline";
  visibility?: "all" | "students" | "teachers";
}

export interface CalendarImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

export const SAMPLE_CALENDAR_JSON: JsonCalendarEvent[] = [
  {
    title: "Mid-Term Academic Examination",
    description: "Comprehensive mid-semester examination covering Modules 1 to 3.",
    event_date: "2025-10-15T09:00:00Z",
    type: "exam",
    visibility: "all"
  },
  {
    title: "National Holiday - Independence Celebration",
    description: "Campus & LMS holiday. No live sessions scheduled.",
    event_date: "2025-08-15T00:00:00Z",
    type: "holiday",
    visibility: "all"
  },
  {
    title: "Live Masterclass: Web Security Best Practices",
    description: "Interactive session on secure web application development.",
    event_date: "2025-09-01T14:00:00Z",
    type: "live_class",
    visibility: "students"
  },
  {
    title: "Project Submission Deadline",
    description: "Final submission deadline for Module 2 Capstone Assignment.",
    event_date: "2025-09-30T23:59:00Z",
    type: "deadline",
    visibility: "all"
  }
];

export function validateCalendarJson(jsonText: string): { isValid: boolean; errors: string[]; events: JsonCalendarEvent[] } {
  const errors: string[] = [];
  let events: JsonCalendarEvent[] = [];

  if (!jsonText.trim()) {
    return { isValid: false, errors: ["JSON text is empty."], events: [] };
  }

  try {
    const parsed = JSON.parse(jsonText);
    events = Array.isArray(parsed) ? parsed : [parsed];

    if (events.length === 0) {
      errors.push("Array must contain at least one calendar event.");
    }

    events.forEach((item, idx) => {
      const p = `Event [${idx + 1}]`;

      if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
        errors.push(`${p}: "title" is required and must be a string.`);
      }

      if (!item.event_date || typeof item.event_date !== "string") {
        errors.push(`${p}: "event_date" is required (e.g. "2025-10-15T09:00:00Z" or "2025-10-15").`);
      } else {
        const d = new Date(item.event_date);
        if (isNaN(d.getTime())) {
          errors.push(`${p}: "event_date" "${item.event_date}" is not a valid date string.`);
        }
      }

      const validTypes = ["event", "exam", "holiday", "live_class", "deadline"];
      if (item.type && !validTypes.includes(item.type)) {
        errors.push(`${p}: Invalid type "${item.type}". Must be one of: ${validTypes.join(", ")}`);
      }

      const validVisibilities = ["all", "students", "teachers"];
      if (item.visibility && !validVisibilities.includes(item.visibility)) {
        errors.push(`${p}: Invalid visibility "${item.visibility}". Must be one of: ${validVisibilities.join(", ")}`);
      }
    });

  } catch (e: any) {
    errors.push(`JSON Syntax Error: ${e.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    events
  };
}

export async function importCalendarEventsFromJson(events: JsonCalendarEvent[]): Promise<CalendarImportResult> {
  const result: CalendarImportResult = {
    success: false,
    importedCount: 0,
    errors: []
  };

  try {
    const mapValidType = (t?: string): string => {
      if (!t) return "event";
      const lower = t.toLowerCase();
      if (["event", "holiday", "deadline", "announcement", "exam", "live_class"].includes(lower)) {
        // If Postgres constraint isn't updated yet, fallback exam->deadline and live_class->event
        return lower;
      }
      return "event";
    };

    const payload = events.map(e => ({
      title: e.title.trim(),
      description: e.description || null,
      event_date: new Date(e.event_date).toISOString(),
      type: mapValidType(e.type),
      visibility: e.visibility || "all"
    }));

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(payload)
      .select("id");

    if (error) {
      result.errors.push(error.message);
      return result;
    }

    result.importedCount = data?.length || 0;
    result.success = true;
    return result;

  } catch (err: any) {
    result.errors.push(err.message || "Failed to import calendar events.");
    return result;
  }
}
