/**
 * JSON Course Importer Utility
 * 
 * Validates, parses, and imports a complete course structure from JSON
 * into Supabase tables: courses, course_sections, section_contents,
 * assignments (quiz/manual), assignment_questions.
 */

import { supabase } from "@/lib/supabase";
import { isGoogleDriveUrl, getGoogleDriveEmbedUrl } from "@/lib/googleDriveUtils";

// ─── Type Definitions ────────────────────────────────────────────────

export interface JsonQuizQuestion {
  question_text: string;
  type: "mcq" | "short" | "long" | "boolean";
  options?: string[];
  correct_answer?: string;
  points?: number;
}

export interface JsonQuiz {
  title: string;
  description?: string;
  type: "quiz";
  is_graded?: boolean;
  due_date?: string;
  time_limit_minutes?: number;
  points?: number;
  questions?: JsonQuizQuestion[];
}

export interface JsonAssignment {
  title: string;
  description?: string;
  type: "assignment";
  due_date?: string;
  points?: number;
}

export interface JsonContentItem {
  title: string;
  type: "video" | "pdf" | "text" | "live" | "live_class" | "presentation" | "document" | "reference";
  url?: string;           // for video / pdf / presentation / document / live link
  content_text?: string;  // for text type
  duration_minutes?: number; // duration in minutes
  scheduled_at?: string; // scheduled time for live class
}

export type JsonSectionItem = JsonContentItem | JsonQuiz | JsonAssignment;

export interface JsonSection {
  title: string;
  week_number?: number;
  allocated_hours?: number;
  topic_name?: string;
  aura_points?: number;
  items?: JsonSectionItem[];
}

export interface JsonCoursePayload {
  title: string;
  description?: string;
  domain?: string;
  structuring_approach?: "section" | "weekly";
  credit_points?: number;
  duration_hours?: number;
  objectives?: string;
  instructions?: string;
  instructor_intro?: string;
  exam_policy?: string;
  instructor_video_url?: string;
  instructor_qualifications?: string;
  instructor_socials?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  price?: number;
  original_price?: number;
  currency?: string;
  organization_name?: string;
  organization_logo_url?: string;
  is_published?: boolean;
  thumbnail_url?: string;
  sections?: JsonSection[];
}

// ─── Validation ──────────────────────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
}

// ─── Normalizer ────────────────────────────────────────────────────────
export function normalizeCourseJson(data: any): any {
  if (!data || typeof data !== "object") return data;

  const normalized = { ...data };

  // If title/description are wrapped under `course` property (e.g. exported backup JSON format)
  if (data.course && typeof data.course === "object") {
    normalized.title = normalized.title || data.course.title;
    normalized.description = normalized.description || data.course.description;
    normalized.domain = normalized.domain || data.course.domain;
    normalized.credit_points = normalized.credit_points || data.course.credit_points;
    normalized.objectives = normalized.objectives || data.course.objectives;
    normalized.instructions = normalized.instructions || data.course.instructions;
    normalized.instructor_intro = normalized.instructor_intro || data.course.instructor_intro;
    normalized.exam_policy = normalized.exam_policy || data.course.exam_policy;
    normalized.price = normalized.price || data.course.price;
    normalized.original_price = normalized.original_price || data.course.original_price;
    normalized.organization_name = normalized.organization_name || data.course.organization_name;
    normalized.organization_logo_url = normalized.organization_logo_url || data.course.organization_logo_url;
  }

  // Normalize sections & items
  if (Array.isArray(normalized.sections)) {
    normalized.sections = normalized.sections.map((section: any) => {
      const normSec = { ...section };
      normSec.title = normSec.title || "Untitled Module";

      if (Array.isArray(normSec.items)) {
        normSec.items = normSec.items.map((item: any) => {
          const normItem = { ...item };

          // Determine item type
          if (normItem.itemType === "assignment") {
            normItem.type = normItem.type || "assignment";
          }
          normItem.type = normItem.type || "video";
          normItem.title = normItem.title || "Untitled Content";

          // Normalize URL across url, video_url, pdf_url, content_url
          const foundUrl = normItem.url || normItem.video_url || normItem.pdf_url || normItem.content_url || "";
          normItem.url = foundUrl;
          normItem.video_url = normItem.video_url || foundUrl;
          normItem.pdf_url = normItem.pdf_url || foundUrl;

          // Normalize Quiz questions
          if (Array.isArray(normItem.questions)) {
            normItem.questions = normItem.questions.map((q: any) => {
              const normQ = { ...q };
              normQ.question_text = normQ.question_text || normQ.question || normQ.title || "Question";
              normQ.type = normQ.type || "mcq";
              if (normQ.type === "mcq" && (!normQ.options || !Array.isArray(normQ.options))) {
                normQ.options = ["Option 1", "Option 2"];
              }
              return normQ;
            });
          }

          return normItem;
        });
      }
      return normSec;
    });
  }

  return normalized;
}

export function validateCourseJson(rawData: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!rawData || typeof rawData !== "object") {
    errors.push({ path: "root", message: "JSON must be a valid object." });
    return { valid: false, errors };
  }

  const data = normalizeCourseJson(rawData);

  // Course-level
  if (!data.title || typeof data.title !== "string" || data.title.trim() === "") {
    errors.push({ path: "title", message: "Course title is required and must be a non-empty string." });
  }

  if (data.description !== undefined && typeof data.description !== "string") {
    errors.push({ path: "description", message: "Course description must be a string." });
  }

  if (data.is_published !== undefined && typeof data.is_published !== "boolean") {
    errors.push({ path: "is_published", message: "is_published must be a boolean (true/false)." });
  }

  // Sections
  if (data.sections !== undefined) {
    if (!Array.isArray(data.sections)) {
      errors.push({ path: "sections", message: "sections must be an array." });
    } else {
      data.sections.forEach((section: any, si: number) => {
        const sp = `sections[${si}]`;

        if (!section.title || typeof section.title !== "string") {
          errors.push({ path: `${sp}.title`, message: "Section title is required and must be a string." });
        }

        if (section.items !== undefined) {
          if (!Array.isArray(section.items)) {
            errors.push({ path: `${sp}.items`, message: "items must be an array." });
          } else {
            section.items.forEach((item: any, ii: number) => {
              const ip = `${sp}.items[${ii}]`;

              if (!item.title || typeof item.title !== "string") {
                errors.push({ path: `${ip}.title`, message: "Item title is required." });
              }

              if (!item.type || typeof item.type !== "string") {
                errors.push({ path: `${ip}.type`, message: "Item type is required." });
              }

              const validTypes = ["video", "pdf", "text", "quiz", "assignment"];
              if (item.type && !validTypes.includes(item.type)) {
                errors.push({ path: `${ip}.type`, message: `Invalid type "${item.type}". Must be one of: ${validTypes.join(", ")}` });
              }

              // Video / PDF need URL
              const itemUrl = item.url || item.video_url || item.pdf_url || item.content_url;
              if ((item.type === "video" || item.type === "pdf") && !itemUrl) {
                errors.push({ path: `${ip}.url`, message: `URL is required for ${item.type} content.` });
              }

              // Quiz questions validation
              if (item.type === "quiz" && item.questions) {
                if (!Array.isArray(item.questions)) {
                  errors.push({ path: `${ip}.questions`, message: "questions must be an array." });
                } else {
                  item.questions.forEach((q: any, qi: number) => {
                    const qp = `${ip}.questions[${qi}]`;

                    const qText = q.question_text || q.question || q.title;
                    if (!qText || typeof qText !== "string") {
                      errors.push({ path: `${qp}.question_text`, message: "Question text is required." });
                    }

                    const validQTypes = ["mcq", "short", "long", "boolean"];
                    if (!q.type || !validQTypes.includes(q.type)) {
                      errors.push({ path: `${qp}.type`, message: `Question type must be one of: ${validQTypes.join(", ")}` });
                    }

                    if (q.type === "mcq" && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
                      errors.push({ path: `${qp}.options`, message: "MCQ must have at least 2 options." });
                    }
                  });
                }
              }
            });
          }
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Import (write to Supabase) ─────────────────────────────────────

export interface ImportResult {
  success: boolean;
  courseId?: string;
  courseName?: string;
  sectionsCreated: number;
  contentsCreated: number;
  quizzesCreated: number;
  questionsCreated: number;
  assignmentsCreated: number;
  errors: string[];
}

export async function importCourseFromJson(rawPayload: JsonCoursePayload): Promise<ImportResult> {
  const payload = normalizeCourseJson(rawPayload);
  const result: ImportResult = {
    success: false,
    sectionsCreated: 0,
    contentsCreated: 0,
    quizzesCreated: 0,
    questionsCreated: 0,
    assignmentsCreated: 0,
    errors: [],
  };

  try {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push("User not authenticated.");
      return result;
    }

    // 2. Create the course
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert([{
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        domain: payload.domain || "Software Engineering",
        credit_points: payload.credit_points || 3,
        is_published: payload.is_published ?? false,
        thumbnail_url: payload.thumbnail_url || null,
        price: payload.price || 0,
        original_price: payload.original_price || 0,
        organization_name: payload.organization_name || null,
        organization_logo_url: payload.organization_logo_url || null,
        teacher_id: user.id,
      }])
      .select("id")
      .single();

    if (courseError) {
      result.errors.push(`Failed to create course: ${courseError.message}`);
      return result;
    }

    result.courseId = courseData.id;
    result.courseName = payload.title.trim();

    // 3. Create sections + items
    if (payload.sections && payload.sections.length > 0) {
      for (let si = 0; si < payload.sections.length; si++) {
        const section = payload.sections[si];

        // Insert section
        const { data: sectionData, error: sectionError } = await supabase
          .from("course_sections")
          .insert([{
            course_id: courseData.id,
            title: section.title.trim(),
            aura_points: section.aura_points !== undefined ? section.aura_points : 10,
            order_index: si,
          }])
          .select("id")
          .single();

        if (sectionError) {
          result.errors.push(`Section "${section.title}": ${sectionError.message}`);
          continue;
        }

        result.sectionsCreated++;

        // Insert section items
        if (section.items && section.items.length > 0) {
          for (let ii = 0; ii < section.items.length; ii++) {
            const item = section.items[ii];

            if (item.type === "quiz") {
              // Create quiz assignment
              const quizItem = item as JsonQuiz;
              const { data: quizData, error: quizError } = await supabase
                .from("assignments")
                .insert([{
                  course_id: courseData.id,
                  section_id: sectionData.id,
                  title: quizItem.title.trim(),
                  description: quizItem.description || null,
                  type: "quiz",
                  due_date: quizItem.due_date || null,
                  points: quizItem.points || 100,
                  time_limit_minutes: quizItem.time_limit_minutes || null,
                }])
                .select("id")
                .single();

              if (quizError) {
                result.errors.push(`Quiz "${quizItem.title}": ${quizError.message}`);
                continue;
              }

              result.quizzesCreated++;

              // Insert questions
              if (quizItem.questions && quizItem.questions.length > 0) {
                const questionsPayload = quizItem.questions.map((q, qi) => ({
                  assignment_id: quizData.id,
                  question_text: q.question_text.trim(),
                  type: q.type,
                  options: q.type === "mcq" ? q.options : null,
                  correct_answer: q.correct_answer || null,
                  points: q.points || 1,
                  order_index: qi,
                }));

                const { error: qError, data: qData } = await supabase
                  .from("assignment_questions")
                  .insert(questionsPayload)
                  .select("id");

                if (qError) {
                  result.errors.push(`Quiz "${quizItem.title}" questions: ${qError.message}`);
                } else {
                  result.questionsCreated += qData?.length || 0;
                }
              }
            } else if (item.type === "assignment") {
              // Create manual assignment
              const assignItem = item as JsonAssignment;
              const { error: assignError } = await supabase
                .from("assignments")
                .insert([{
                  course_id: courseData.id,
                  section_id: sectionData.id,
                  title: assignItem.title.trim(),
                  description: assignItem.description || null,
                  type: "manual",
                  due_date: assignItem.due_date || null,
                  points: assignItem.points || 100,
                }]);

              if (assignError) {
                result.errors.push(`Assignment "${assignItem.title}": ${assignError.message}`);
              } else {
                result.assignmentsCreated++;
              }
            } else {
              // Regular content (video / pdf / text)
              const contentItem = item as JsonContentItem;
              const contentPayload: any = {
                section_id: sectionData.id,
                title: contentItem.title.trim(),
                type: contentItem.type,
                order_index: ii,
              };

              if (contentItem.type === "text") {
                contentPayload.content_text = contentItem.content_text || "";
              } else if (contentItem.type === "video" && contentItem.url) {
                const url = isGoogleDriveUrl(contentItem.url)
                  ? getGoogleDriveEmbedUrl(contentItem.url)
                  : contentItem.url;
                contentPayload.content_url = url;
                contentPayload.video_url = url;
              } else if ((contentItem.type === "pdf" || contentItem.type === "presentation" || contentItem.type === "document" || contentItem.type === "reference") && contentItem.url) {
                contentPayload.content_url = contentItem.url;
                contentPayload.pdf_url = contentItem.url;
              }

              const { error: contentError } = await supabase
                .from("section_contents")
                .insert([contentPayload]);

              if (contentError) {
                result.errors.push(`Content "${contentItem.title}": ${contentError.message}`);
              } else {
                result.contentsCreated++;
              }
            }
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    return result;
  }
}

export async function importSectionsToExistingCourse(courseId: string, sections: JsonSection[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    sectionsCreated: 0,
    contentsCreated: 0,
    quizzesCreated: 0,
    questionsCreated: 0,
    assignmentsCreated: 0,
    errors: [],
  };

  try {
    const { data: courseExists, error: courseCheckError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseCheckError || !courseExists) {
      result.errors.push("Target course not found.");
      return result;
    }

    const { data: existingSections } = await supabase
      .from("course_sections")
      .select("order_index")
      .eq("course_id", courseId);

    const orderOffset = existingSections ? existingSections.length : 0;

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];

      const { data: sectionData, error: sectionError } = await supabase
        .from("course_sections")
        .insert([{
          course_id: courseId,
          title: section.title.trim(),
          order_index: orderOffset + si,
        }])
        .select("id")
        .single();

      if (sectionError) {
        result.errors.push(`Section "${section.title}": ${sectionError.message}`);
        continue;
      }

      result.sectionsCreated++;

      if (section.items && section.items.length > 0) {
        for (let ii = 0; ii < section.items.length; ii++) {
          const item = section.items[ii];

          if (item.type === "quiz") {
            const quizItem = item as JsonQuiz;
            const { data: quizData, error: quizError } = await supabase
              .from("assignments")
              .insert([{
                course_id: courseId,
                section_id: sectionData.id,
                title: quizItem.title.trim(),
                description: quizItem.description || null,
                type: "quiz",
                is_graded: quizItem.is_graded !== undefined ? quizItem.is_graded : true,
                due_date: quizItem.due_date || null,
                points: quizItem.points || 100,
                time_limit_minutes: quizItem.time_limit_minutes || null,
              }])
              .select("id")
              .single();

            if (quizError) {
              result.errors.push(`Quiz "${quizItem.title}": ${quizError.message}`);
              continue;
            }

            result.quizzesCreated++;

            if (quizItem.questions && quizItem.questions.length > 0) {
              const questionsPayload = quizItem.questions.map((q, qi) => ({
                assignment_id: quizData.id,
                question_text: q.question_text.trim(),
                type: q.type,
                options: (q.type === "mcq" || q.type === "boolean")
                  ? (q.options && q.options.length > 0 ? q.options : (q.type === "boolean" ? ["True", "False"] : ["Option A", "Option B", "Option C", "Option D"]))
                  : null,
                correct_answer: q.correct_answer || null,
                points: q.points || 1,
                order_index: qi,
              }));

              const { error: qError, data: qData } = await supabase
                .from("assignment_questions")
                .insert(questionsPayload)
                .select("id");

              if (qError) {
                result.errors.push(`Quiz "${quizItem.title}" questions: ${qError.message}`);
              } else {
                result.questionsCreated += qData?.length || 0;
              }
            }
          } else if (item.type === "assignment") {
            const assignItem = item as JsonAssignment;
            const { error: assignError } = await supabase
              .from("assignments")
              .insert([{
                course_id: courseId,
                section_id: sectionData.id,
                title: assignItem.title.trim(),
                description: assignItem.description || null,
                type: "manual",
                due_date: assignItem.due_date || null,
                points: assignItem.points || 100,
              }]);

            if (assignError) {
              result.errors.push(`Assignment "${assignItem.title}": ${assignError.message}`);
            } else {
              result.assignmentsCreated++;
            }
          } else {
            const contentItem = item as JsonContentItem;
            const contentPayload: any = {
              section_id: sectionData.id,
              title: contentItem.title.trim(),
              type: contentItem.type === "live" || contentItem.type === "live_class" ? "video" : contentItem.type,
              duration_minutes: contentItem.duration_minutes || 30,
              order_index: ii,
            };

            if (contentItem.type === "live" || contentItem.type === "live_class") {
              const meetingUrl = contentItem.url || "https://meet.google.com/orbit-live-session";
              const { data: liveData } = await supabase
                .from("live_classes")
                .insert([{
                  course_id: courseId,
                  section_id: sectionData.id,
                  teacher_id: (await supabase.auth.getUser()).data.user?.id,
                  title: contentItem.title.trim(),
                  meeting_link: meetingUrl,
                  scheduled_at: contentItem.scheduled_at || new Date(Date.now() + 86400000).toISOString(),
                  duration_minutes: contentItem.duration_minutes || 60,
                  status: "upcoming"
                }])
                .select("id")
                .single();

              contentPayload.content_url = meetingUrl;
              contentPayload.video_url = meetingUrl;
              if (liveData) contentPayload.live_class_id = liveData.id;
            } else if (contentItem.type === "text") {
              contentPayload.content_text = contentItem.content_text || "";
            } else if (contentItem.type === "video" && contentItem.url) {
              const url = isGoogleDriveUrl(contentItem.url)
                ? getGoogleDriveEmbedUrl(contentItem.url)
                : contentItem.url;
              contentPayload.content_url = url;
              contentPayload.video_url = url;
            } else if (contentItem.type === "pdf" && contentItem.url) {
              contentPayload.content_url = contentItem.url;
            }

            const { error: contentError } = await supabase
              .from("section_contents")
              .insert([contentPayload]);

            if (contentError) {
              result.errors.push(`Content "${contentItem.title}": ${contentError.message}`);
            } else {
              result.contentsCreated++;
            }
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    return result;
  }
}

// ─── Compute stats for preview ──────────────────────────────────────

export interface CoursePreviewStats {
  sectionCount: number;
  videoCount: number;
  pdfCount: number;
  textCount: number;
  liveClassCount: number;
  quizCount: number;
  assignmentCount: number;
  questionCount: number;
  totalDurationMinutes: number;
  totalDurationHours: number;
}

export function computePreviewStats(payload: JsonCoursePayload): CoursePreviewStats {
  const stats: CoursePreviewStats = {
    sectionCount: 0,
    videoCount: 0,
    pdfCount: 0,
    textCount: 0,
    liveClassCount: 0,
    quizCount: 0,
    assignmentCount: 0,
    questionCount: 0,
    totalDurationMinutes: 0,
    totalDurationHours: 0,
  };

  if (!payload.sections) return stats;

  stats.sectionCount = payload.sections.length;

  for (const section of payload.sections) {
    let sectionMins = 0;
    if (section.items) {
      for (const item of section.items) {
        switch (item.type) {
          case "video":
            stats.videoCount++;
            sectionMins += (item as JsonContentItem).duration_minutes || 30;
            break;
          case "pdf":
            stats.pdfCount++;
            sectionMins += (item as JsonContentItem).duration_minutes || 20;
            break;
          case "text":
            stats.textCount++;
            sectionMins += (item as JsonContentItem).duration_minutes || 15;
            break;
          case "live":
          case "live_class":
            stats.liveClassCount++;
            sectionMins += (item as JsonContentItem).duration_minutes || 60;
            break;
          case "quiz":
            stats.quizCount++;
            stats.questionCount += (item as JsonQuiz).questions?.length || 0;
            sectionMins += (item as JsonQuiz).time_limit_minutes || 15;
            break;
          case "assignment":
            stats.assignmentCount++;
            sectionMins += 45;
            break;
        }
      }
    }
    const allocatedMins = (section.allocated_hours || 0) * 60;
    stats.totalDurationMinutes += Math.max(sectionMins, allocatedMins);
  }

  stats.totalDurationHours = Number((stats.totalDurationMinutes / 60).toFixed(1));
  return stats;
}

// ─── Sample Template JSON ───────────────────────────────────────────

export const SAMPLE_COURSE_JSON: JsonCoursePayload = {
  title: "Complete Web Development Masterclass",
  description: "Learn HTML, CSS, JavaScript, and React from scratch with hands-on projects.",
  domain: "Software Engineering",
  credit_points: 4,
  price: 1499,
  original_price: 2499,
  organization_name: "Orbit Tech Academy",
  organization_logo_url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
  is_published: true,
  sections: [
    {
      title: "Module 1: HTML5 Foundations & Presentations",
      aura_points: 15,
      items: [
        {
          title: "Welcome & Course Overview Video",
          type: "video",
          url: "https://www.youtube.com/watch?v=example1",
          duration_minutes: 20
        },
        {
          title: "HTML5 Architecture Presentation Deck",
          type: "presentation",
          url: "https://docs.google.com/presentation/d/1A2b3C4dExAmPlE/embed",
          duration_minutes: 30
        },
        {
          title: "HTML Elements & Tags Reference",
          type: "text",
          content_text: "# HTML Elements\n\nHTML (HyperText Markup Language) is the standard language for web page structure."
        },
        {
          title: "Official Developer Documentation & Reference Guide",
          type: "document",
          url: "https://drive.google.com/file/d/1A2b3C4dExAmPlE/view",
          duration_minutes: 25
        },
        {
          title: "HTML Cheat Sheet",
          type: "pdf",
          url: "https://example.com/html-cheatsheet.pdf"
        },
        {
          title: "🔴 Live Interactive HTML5 Q&A Workshop",
          type: "live",
          url: "https://meet.google.com/orbit-live-html5",
          scheduled_at: "2026-08-05T18:00:00Z",
          duration_minutes: 60
        },
        {
          title: "HTML Practice Self-Assessment",
          type: "quiz",
          is_graded: false,
          description: "Ungraded practice quiz for self-assessment.",
          time_limit_minutes: 10,
          questions: [
            {
              question_text: "Which HTML tag creates a bulleted list?",
              type: "mcq",
              options: ["<ol>", "<ul>", "<li>", "<list>"],
              correct_answer: "<ul>"
            },
            {
              question_text: "Does HTML5 require lowercase tags?",
              type: "boolean",
              correct_answer: "false"
            }
          ]
        },
        {
          title: "HTML Basics Graded Exam",
          type: "quiz",
          is_graded: true,
          points: 50,
          time_limit_minutes: 15,
          questions: [
            {
              question_text: "What does HTML stand for?",
              type: "mcq",
              options: [
                "Hyper Text Markup Language",
                "High Tech Modern Language",
                "Hyper Transfer Markup Language",
                "Home Tool Markup Language"
              ],
              correct_answer: "Hyper Text Markup Language",
              points: 10
            },
            {
              question_text: "Which tag is used for the largest heading?",
              type: "mcq",
              options: ["<h6>", "<h1>", "<heading>", "<head>"],
              correct_answer: "<h1>",
              points: 10
            },
            {
              question_text: "Is the <br> tag a self-closing tag?",
              type: "boolean",
              correct_answer: "true",
              points: 10
            },
            {
              question_text: "Explain the difference between <div> and <span>.",
              type: "short",
              points: 10
            },
            {
              question_text: "Write a short essay on the importance of semantic HTML for accessibility.",
              type: "long",
              points: 10
            }
          ]
        }
      ]
    },
    {
      title: "Module 2: CSS Styling",
      items: [
        {
          title: "CSS Box Model Explained",
          type: "video",
          url: "https://drive.google.com/file/d/1A2b3C4dExAmPlE/view"
        },
        {
          title: "Flexbox & Grid Layout Guide",
          type: "text",
          content_text: "# CSS Layout Systems\n\n## Flexbox\nFlexbox is designed for one-dimensional layouts.\n```css\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n```\n\n## Grid\nCSS Grid is for two-dimensional layouts.\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}\n```"
        },
        {
          title: "CSS Styling Assignment",
          type: "assignment",
          description: "Recreate a provided webpage design using only HTML and CSS. Submit your code as a .zip file.",
          points: 100,
          due_date: "2025-12-31T23:59:00"
        }
      ]
    },
    {
      title: "Module 3: JavaScript Essentials",
      items: [
        {
          title: "Variables, Data Types & Operators",
          type: "video",
          url: "https://www.youtube.com/watch?v=example3"
        },
        {
          title: "JavaScript Quiz",
          type: "quiz",
          points: 40,
          time_limit_minutes: 20,
          questions: [
            {
              question_text: "Which keyword is used to declare a constant in JavaScript?",
              type: "mcq",
              options: ["var", "let", "const", "static"],
              correct_answer: "const",
              points: 10
            },
            {
              question_text: "What is the result of typeof null?",
              type: "mcq",
              options: ["null", "undefined", "object", "boolean"],
              correct_answer: "object",
              points: 10
            },
            {
              question_text: "JavaScript is a statically typed language.",
              type: "boolean",
              correct_answer: "false",
              points: 10
            },
            {
              question_text: "Explain closures in JavaScript with an example.",
              type: "long",
              points: 10
            }
          ]
        }
      ]
    }
  ]
};

// ─── Module Time Budget Validation ─────────────────────────────────

export function validateModuleTimeBudget(section: JsonSection): {
  valid: boolean;
  allocatedMinutes: number;
  itemsMinutes: number;
  message?: string;
} {
  const allocatedHours = section.allocated_hours || 0;
  const allocatedMinutes = allocatedHours * 60;
  let itemsMinutes = 0;

  if (section.items) {
    for (const item of section.items) {
      if ((item as any).duration_minutes) {
        itemsMinutes += Number((item as any).duration_minutes);
      } else if (item.type === "quiz" && (item as JsonQuiz).time_limit_minutes) {
        itemsMinutes += Number((item as JsonQuiz).time_limit_minutes);
      }
    }
  }

  if (allocatedMinutes > 0 && itemsMinutes > allocatedMinutes) {
    return {
      valid: false,
      allocatedMinutes,
      itemsMinutes,
      message: `Content duration (${itemsMinutes} min) exceeds allocated module duration (${allocatedMinutes} min / ${allocatedHours} hrs).`
    };
  }

  return { valid: true, allocatedMinutes, itemsMinutes };
}

// ─── Standalone Quiz Importer ───────────────────────────────────────

export async function importQuizFromJson(
  courseId: string,
  sectionId: string,
  quizPayload: JsonQuiz
): Promise<{ success: boolean; quizId?: string; questionsCount?: number; error?: string }> {
  try {
    const { data: quizData, error: quizError } = await supabase
      .from("assignments")
      .insert([{
        course_id: courseId,
        section_id: sectionId,
        title: quizPayload.title.trim(),
        description: quizPayload.description || null,
        type: "quiz",
        is_graded: quizPayload.is_graded !== false,
        time_limit_minutes: quizPayload.time_limit_minutes || 15,
        points: quizPayload.points || 50,
      }])
      .select("id")
      .single();

    if (quizError || !quizData) {
      return { success: false, error: quizError?.message || "Failed to create quiz assignment." };
    }

    let questionsCount = 0;
    if (quizPayload.questions && quizPayload.questions.length > 0) {
      const questionsPayload = quizPayload.questions.map((q, qi) => ({
        assignment_id: quizData.id,
        question_text: q.question_text.trim(),
        type: q.type,
        options: (q.type === "mcq" || q.type === "boolean")
          ? (q.options && q.options.length > 0 ? q.options : (q.type === "boolean" ? ["True", "False"] : ["Option A", "Option B", "Option C", "Option D"]))
          : null,
        correct_answer: q.correct_answer || null,
        points: q.points || 1,
        order_index: qi,
      }));

      const { data: qData, error: qError } = await supabase
        .from("assignment_questions")
        .insert(questionsPayload)
        .select("id");

      if (qError) {
        return { success: false, quizId: quizData.id, error: `Quiz created, but questions failed: ${qError.message}` };
      }
      questionsCount = qData?.length || 0;
    }

    return { success: true, quizId: quizData.id, questionsCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Standalone Section / Weekly Module Importer ─────────────────────

export async function importSectionFromJson(
  courseId: string,
  sectionPayload: JsonSection
): Promise<{ success: boolean; sectionId?: string; error?: string }> {
  try {
    const { data: secData, error: secError } = await supabase
      .from("course_sections")
      .insert([{
        course_id: courseId,
        title: sectionPayload.title.trim(),
        aura_points: sectionPayload.aura_points || 10
      }])
      .select("id")
      .single();

    if (secError || !secData) {
      return { success: false, error: secError?.message || "Failed to create section." };
    }

    if (sectionPayload.items && sectionPayload.items.length > 0) {
      for (let ii = 0; ii < sectionPayload.items.length; ii++) {
        const item = sectionPayload.items[ii];
        if (item.type === "quiz") {
          await importQuizFromJson(courseId, secData.id, item as JsonQuiz);
        } else if (item.type === "assignment") {
          const assignItem = item as JsonAssignment;
          await supabase.from("assignments").insert([{
            course_id: courseId,
            section_id: secData.id,
            title: assignItem.title.trim(),
            description: assignItem.description || null,
            type: "manual",
            due_date: assignItem.due_date || null,
            points: assignItem.points || 100,
          }]);
        } else {
          const contentItem = item as JsonContentItem;
          await supabase.from("section_contents").insert([{
            section_id: secData.id,
            title: contentItem.title.trim(),
            type: contentItem.type,
            content_text: contentItem.type === "text" ? (contentItem.content_text || "") : undefined,
            content_url: contentItem.url || undefined,
            video_url: contentItem.type === "video" ? contentItem.url : undefined,
            order_index: ii,
          }]);
        }
      }
    }

    return { success: true, sectionId: secData.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Sample Weekly Module & Quiz JSON Templates ──────────────────────

export const SAMPLE_WEEKLY_MODULE_JSON: JsonSection = {
  title: "Week 1: Orbit Flight Preparations & Launch Systems",
  week_number: 1,
  allocated_hours: 4.0,
  topic_name: "Spacecraft Electronics & Propulsion Fundamentals",
  aura_points: 25,
  items: [
    {
      title: "Introduction to Orbital Propulsion Systems",
      type: "video",
      url: "https://www.youtube.com/watch?v=example_space",
      duration_minutes: 45
    },
    {
      title: "Rocket Engine & Guidance Notes",
      type: "text",
      content_text: "# Rocket Propulsion Basics\n\nPropulsion Systems derive thrust by accelerating mass backward according to Newton's third law.",
      duration_minutes: 30
    },
    {
      title: "Orbital Mechanics Week 1 Assessment Quiz",
      type: "quiz",
      is_graded: true,
      time_limit_minutes: 20,
      points: 50,
      questions: [
        {
          question_text: "What is the escape velocity from Earth's orbit?",
          type: "mcq",
          options: ["7.9 km/s", "11.2 km/s", "15.0 km/s", "3.0 km/s"],
          correct_answer: "11.2 km/s",
          points: 10
        }
      ]
    }
  ]
};

export const SAMPLE_QUIZ_JSON: JsonQuiz = {
  title: "Orbit Velocity & Trajectory Assessment Quiz",
  description: "Test your understanding of orbital velocity vectors and trajectory maneuvers.",
  type: "quiz",
  is_graded: true,
  time_limit_minutes: 15,
  points: 40,
  questions: [
    {
      question_text: "Which orbit requires the lowest energy delta-V transition?",
      type: "mcq",
      options: ["Hohmann Transfer Orbit", "Bi-elliptic Transfer", "Direct Hyperbolic Escape", "Polar Circular Orbit"],
      correct_answer: "Hohmann Transfer Orbit",
      points: 10
    },
    {
      question_text: "Does atmospheric drag affect satellites in Low Earth Orbit (LEO)?",
      type: "boolean",
      correct_answer: "true",
      points: 10
    },
    {
      question_text: "Define Kepler's Third Law of Planetary Motion.",
      type: "long",
      points: 20
    }
  ]
};
