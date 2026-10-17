/**
 * JSON Course Importer Utility
 * 
 * Validates, parses, and imports a complete course structure from JSON
 * into Supabase tables: courses, course_sections, section_contents,
 * assignments (quiz/manual), assignment_questions.
 * 
 * Features extreme resilience for AI-generated outputs (ChatGPT, Claude, Gemini).
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

// ─── Flashcards & Active Recall Schema ───
export interface JsonFlashcard {
  front: string;
  back: string;
  hint?: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  codeSnippet?: string;
}

export interface JsonFlashcardDeck {
  title: string;
  description?: string;
  subject?: string;
  icon?: string;
  color?: string;
  cards: JsonFlashcard[];
}

// ─── Mnemonics & Cognitive Memory Aids Schema ───
export interface JsonMnemonicBreakdown {
  letter: string;
  word: string;
  meaning: string;
  example?: string;
}

export interface JsonMnemonic {
  title: string;
  acronym: string;
  phrase: string;
  subject?: string;
  category?: string;
  explanation: string;
  breakdown: JsonMnemonicBreakdown[];
  examTip?: string;
}

// ─── Examination & Attendance Policy Schema ───
export interface JsonAttendancePolicy {
  mandatory_percentage?: number; // e.g. 75
  exam_clearance_required?: boolean;
  total_planned_sessions?: number;
  condonation_rules?: string;
}

export interface JsonContentItem {
  title: string;
  type: "video" | "pdf" | "text" | "live" | "live_class" | "presentation" | "document" | "reference" | "flashcards" | "flashcard_deck" | "mnemonic" | "mnemonics";
  url?: string;           // for video / pdf / presentation / document / live link
  content_text?: string;  // for text type
  duration_minutes?: number; // duration in minutes
  scheduled_at?: string; // scheduled time for live class
  flashcards?: JsonFlashcard[]; // embedded flashcard deck
  mnemonics?: JsonMnemonic[];   // embedded mnemonics
}

export type JsonSectionItem = JsonContentItem | JsonQuiz | JsonAssignment;

export interface JsonSection {
  title: string;
  week_number?: number;
  allocated_hours?: number;
  topic_name?: string;
  aura_points?: number;
  items?: JsonSectionItem[];
  flashcards?: JsonFlashcard[];
  mnemonics?: JsonMnemonic[];
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
  attendance_policy?: JsonAttendancePolicy;
  flashcard_decks?: JsonFlashcardDeck[];
  flashcards?: JsonFlashcard[];
  mnemonics?: JsonMnemonic[];
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

export interface ValidationError {
  path: string;
  message: string;
}

// ─── Normalizer (Resilient to AI variations) ─────────────────────────
export function normalizeCourseJson(data: any): any {
  if (!data || typeof data !== "object") return data;

  const normalized = { ...data };

  // 1. Root Level Normalization
  if (data.course && typeof data.course === "object") {
    Object.assign(normalized, data.course);
  } else if (data.data && typeof data.data === "object") {
    Object.assign(normalized, data.data);
  }

  normalized.title = normalized.title || normalized.name || normalized.course_title || normalized.courseName || "Untitled Course";
  normalized.description = normalized.description || normalized.summary || normalized.overview || normalized.course_description || "";
  normalized.domain = normalized.domain || normalized.category || normalized.field || normalized.tag || "Software Engineering";
  normalized.credit_points = normalized.credit_points || normalized.credits || normalized.credit || 3;
  normalized.instructor_intro = normalized.instructor_intro || normalized.instructor_bio || normalized.instructor || "";
  normalized.exam_policy = normalized.exam_policy || normalized.grading_policy || normalized.assessment_policy || "";

  // 2. Sections / Modules Normalization (Supports: sections, modules, chapters, weeks, units, syllabus)
  let rawSections = normalized.sections || normalized.modules || normalized.chapters || normalized.weeks || normalized.units || normalized.syllabus || [];
  
  if (!Array.isArray(rawSections) && typeof rawSections === "object") {
    rawSections = Object.values(rawSections);
  }

  if (Array.isArray(rawSections)) {
    normalized.sections = rawSections.map((section: any, sIdx: number) => {
      const normSec = typeof section === "object" ? { ...section } : { title: String(section) };
      normSec.title = normSec.title || normSec.section_title || normSec.module_title || normSec.name || normSec.week_title || `Module ${sIdx + 1}`;
      normSec.week_number = normSec.week_number || sIdx + 1;
      normSec.allocated_hours = normSec.allocated_hours || normSec.hours || normSec.duration_hours || 4.0;
      normSec.aura_points = normSec.aura_points !== undefined ? normSec.aura_points : 15;

      // Collect items from items, lessons, contents, materials, resources, topics
      let rawItems = normSec.items || normSec.lessons || normSec.contents || normSec.materials || normSec.resources || normSec.topics || [];
      if (!Array.isArray(rawItems) && typeof rawItems === "object") {
        rawItems = Object.values(rawItems);
      }
      if (!Array.isArray(rawItems)) rawItems = [];

      // If AI placed separate quiz or quizzes property on the section, merge them into rawItems!
      const rawQuizzes = normSec.quizzes || (normSec.quiz ? [normSec.quiz] : []) || (normSec.assessments || (normSec.assessment ? [normSec.assessment] : [])) || [];
      if (Array.isArray(rawQuizzes)) {
        rawQuizzes.forEach((qz: any) => {
          if (qz && typeof qz === "object") {
            rawItems.push({
              ...qz,
              type: "quiz",
              title: qz.title || qz.name || `${normSec.title} Assessment Quiz`
            });
          }
        });
      }

      // If AI placed separate assignments property on section, merge them
      const rawAssignments = normSec.assignments || (normSec.assignment ? [normSec.assignment] : []) || [];
      if (Array.isArray(rawAssignments)) {
        rawAssignments.forEach((asg: any) => {
          if (asg && typeof asg === "object") {
            rawItems.push({
              ...asg,
              type: "assignment",
              title: asg.title || asg.name || `${normSec.title} Practical Task`
            });
          }
        });
      }

      normSec.items = rawItems.map((item: any, iIdx: number) => {
        const normItem = typeof item === "object" ? { ...item } : { title: String(item), type: "video" };

        normItem.title = normItem.title || normItem.name || normItem.lesson_title || normItem.topic || `Lesson ${iIdx + 1}`;
        normItem.duration_minutes = normItem.duration_minutes || normItem.duration || normItem.duration_min || normItem.time_minutes || 30;

        // Detect & normalize type
        const rawType = (normItem.type || normItem.content_type || normItem.itemType || "").toLowerCase().trim();

        if (rawType === "quiz" || Array.isArray(normItem.questions) || Array.isArray(normItem.quiz_questions) || normItem.questions) {
          normItem.type = "quiz";
          normItem.is_graded = normItem.is_graded !== false;
          normItem.points = normItem.points || normItem.total_points || normItem.marks || 50;
          normItem.time_limit_minutes = normItem.time_limit_minutes || normItem.time_limit || 15;

          // Normalize Quiz Questions
          let rawQuestions = normItem.questions || normItem.quiz_questions || normItem.test_questions || normItem.items || [];
          if (!Array.isArray(rawQuestions) && typeof rawQuestions === "object") {
            rawQuestions = Object.values(rawQuestions);
          }
          if (!Array.isArray(rawQuestions)) rawQuestions = [];

          normItem.questions = rawQuestions.map((q: any, qIdx: number) => {
            const normQ = typeof q === "object" ? { ...q } : { question_text: String(q) };
            normQ.question_text = normQ.question_text || normQ.question || normQ.prompt || normQ.title || normQ.text || `Question ${qIdx + 1}`;

            // Normalize question type
            let qType = (normQ.type || normQ.question_type || "").toLowerCase().trim();
            if (["multiple_choice", "choice", "single_choice", "mcq", "option"].includes(qType)) qType = "mcq";
            else if (["true_false", "tf", "boolean", "bool"].includes(qType)) qType = "boolean";
            else if (["short_answer", "short"].includes(qType)) qType = "short";
            else if (["essay", "long_answer", "long", "descriptive"].includes(qType)) qType = "long";
            else {
              qType = (normQ.options || normQ.choices || normQ.answers) ? "mcq" : "boolean";
            }
            normQ.type = qType;

            // Normalize options
            let rawOptions = normQ.options || normQ.choices || normQ.answers || normQ.options_list || [];
            if (!Array.isArray(rawOptions) && typeof rawOptions === "object") {
              rawOptions = Object.values(rawOptions);
            }
            if (Array.isArray(rawOptions)) {
              normQ.options = rawOptions.map((opt: any) => typeof opt === "object" ? (opt.text || opt.title || opt.value || JSON.stringify(opt)) : String(opt));
            } else {
              normQ.options = [];
            }

            if (normQ.type === "boolean" && (!normQ.options || normQ.options.length === 0)) {
              normQ.options = ["True", "False"];
            } else if (normQ.type === "mcq" && (!normQ.options || normQ.options.length === 0)) {
              normQ.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
            }

            // Normalize correct answer
            let rawAns = normQ.correct_answer !== undefined ? normQ.correct_answer : (normQ.correct !== undefined ? normQ.correct : (normQ.answer !== undefined ? normQ.answer : (normQ.correctAnswer !== undefined ? normQ.correctAnswer : normQ.key)));
            
            // If answer is an index (e.g. 0, 1, 2)
            if (typeof rawAns === "number" && normQ.options && normQ.options[rawAns]) {
              normQ.correct_answer = normQ.options[rawAns];
            } else if (typeof rawAns === "string") {
              const upper = rawAns.trim().toUpperCase();
              if (["A", "B", "C", "D", "E"].includes(upper) && normQ.options) {
                const charIdx = upper.charCodeAt(0) - 65;
                if (normQ.options[charIdx]) {
                  normQ.correct_answer = normQ.options[charIdx];
                } else {
                  normQ.correct_answer = rawAns.trim();
                }
              } else {
                normQ.correct_answer = rawAns.trim();
              }
            } else {
              normQ.correct_answer = normQ.options?.[0] || "True";
            }

            normQ.points = normQ.points !== undefined ? Number(normQ.points) : 10;
            return normQ;
          });

        } else if (rawType === "assignment" || normItem.itemType === "assignment") {
          normItem.type = "assignment";
          normItem.points = normItem.points || 100;
          normItem.description = normItem.description || "Submit your practical assignment according to the lesson guidelines.";
        } else if (["live", "live_class", "live_session", "webinar"].includes(rawType)) {
          normItem.type = "live";
          normItem.url = normItem.url || normItem.meeting_link || normItem.meeting_url || "https://meet.google.com/orbit-live-session";
          normItem.scheduled_at = normItem.scheduled_at || new Date(Date.now() + 86400000).toISOString();
        } else {
          normItem.type = ["video", "pdf", "text", "presentation", "document", "reference"].includes(rawType) ? rawType : "video";
          const foundUrl = normItem.url || normItem.video_url || normItem.pdf_url || normItem.content_url || normItem.link || "";
          normItem.url = foundUrl;
          normItem.video_url = foundUrl;
          normItem.pdf_url = foundUrl;
          if (normItem.type === "text") {
            normItem.content_text = normItem.content_text || normItem.text || normItem.content || normItem.body || `# ${normItem.title}\n\nLesson content material.`;
          }
        }

        return normItem;
      });

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

              const validTypes = ["video", "pdf", "text", "quiz", "assignment", "presentation", "document", "reference", "live", "live_class"];
              if (item.type && !validTypes.includes(item.type)) {
                errors.push({ path: `${ip}.type`, message: `Invalid type "${item.type}". Must be one of: ${validTypes.join(", ")}` });
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
  flashcardsCreated?: number;
  mnemonicsCreated?: number;
  errors: string[];
}

export async function importCourseFromJson(rawPayload: JsonCoursePayload, overrideTeacherId?: string): Promise<ImportResult> {
  const payload = normalizeCourseJson(rawPayload);
  const result: ImportResult = {
    success: false,
    sectionsCreated: 0,
    contentsCreated: 0,
    quizzesCreated: 0,
    questionsCreated: 0,
    assignmentsCreated: 0,
    flashcardsCreated: 0,
    mnemonicsCreated: 0,
    errors: [],
  };

  try {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push("User not authenticated.");
      return result;
    }

    const assignedTeacherId = (overrideTeacherId && overrideTeacherId !== "admin_unassigned" && overrideTeacherId !== "unassigned") 
      ? overrideTeacherId 
      : user.id;

    // 2. Create the course
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert([{
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        domain: payload.domain || "Software Engineering",
        credit_points: payload.credit_points || 3,
        instructor_intro: payload.instructor_intro || null,
        instructor_video_url: payload.instructor_video_url || null,
        instructor_qualifications: payload.instructor_qualifications || null,
        exam_policy: payload.exam_policy || null,
        is_published: payload.is_published ?? true,
        thumbnail_url: payload.thumbnail_url || null,
        price: payload.price || 0,
        original_price: payload.original_price || 0,
        organization_name: payload.organization_name || null,
        organization_logo_url: payload.organization_logo_url || null,
        teacher_id: assignedTeacherId,
      }])
      .select("id")
      .single();

    if (courseError) {
      result.errors.push(`Failed to create course: ${courseError.message}`);
      return result;
    }

    result.courseId = courseData.id;
    result.courseName = payload.title.trim();

    // 2.5 Persist Course Attendance Policy if defined
    if (payload.attendance_policy) {
      try {
        localStorage.setItem(`orbit_attendance_policy_${courseData.id}`, JSON.stringify(payload.attendance_policy));
        const allPoliciesRaw = localStorage.getItem("orbit_attendance_policies");
        const allPolicies = allPoliciesRaw ? JSON.parse(allPoliciesRaw) : {};
        allPolicies[courseData.id] = payload.attendance_policy;
        localStorage.setItem("orbit_attendance_policies", JSON.stringify(allPolicies));
      } catch (policyErr) {
        console.warn("Could not cache attendance policy:", policyErr);
      }
    }

    // 2.6 Persist Course-Level Flashcard Decks if defined
    if (payload.flashcard_decks || payload.flashcards) {
      const fcTarget = payload.flashcard_decks || payload.flashcards;
      if (Array.isArray(fcTarget)) {
        fcTarget.forEach(item => {
          const res = importFlashcardsFromJson(item, courseData.id, payload.title);
          if (res.success) {
            result.flashcardsCreated = (result.flashcardsCreated || 0) + res.cardsCount;
          }
        });
      } else {
        const res = importFlashcardsFromJson(fcTarget, courseData.id, payload.title);
        if (res.success) {
          result.flashcardsCreated = (result.flashcardsCreated || 0) + res.cardsCount;
        }
      }
    }

    // 2.7 Persist Course-Level Mnemonics if defined
    if (payload.mnemonics) {
      const mneRes = importMnemonicsFromJson(payload.mnemonics, courseData.id, payload.title);
      if (mneRes.success) {
        result.mnemonicsCreated = (result.mnemonicsCreated || 0) + mneRes.mnemonicsCount;
      }
    }

    // 3. Create sections + items + quizzes
    if (payload.sections && payload.sections.length > 0) {
      const sectionRes = await importSectionsToExistingCourse(courseData.id, payload.sections);
      result.sectionsCreated = sectionRes.sectionsCreated;
      result.contentsCreated = sectionRes.contentsCreated;
      result.quizzesCreated = sectionRes.quizzesCreated;
      result.questionsCreated = sectionRes.questionsCreated;
      result.assignmentsCreated = sectionRes.assignmentsCreated;
      if (sectionRes.flashcardsCreated) {
        result.flashcardsCreated = (result.flashcardsCreated || 0) + sectionRes.flashcardsCreated;
      }
      if (sectionRes.mnemonicsCreated) {
        result.mnemonicsCreated = (result.mnemonicsCreated || 0) + sectionRes.mnemonicsCreated;
      }
      if (sectionRes.errors && sectionRes.errors.length > 0) {
        result.errors.push(...sectionRes.errors);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    return result;
  }
}

// ─── Import Sections to Existing Course (with Full Quiz & Question Support) ──

export async function importSectionsToExistingCourse(courseId: string, rawSections: JsonSection[]): Promise<ImportResult> {
  const normalizedData = normalizeCourseJson({ sections: rawSections });
  const sections = normalizedData.sections || [];

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
    const { data: { user } } = await supabase.auth.getUser();

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];

      const secPayload: any = {
        course_id: courseId,
        title: section.title.trim(),
        order_index: orderOffset + si,
        aura_points: section.aura_points !== undefined ? section.aura_points : 15
      };
      if (section.week_number !== undefined) secPayload.week_number = section.week_number;
      if (section.allocated_hours !== undefined) secPayload.allocated_hours = section.allocated_hours;
      if (section.topic_name) secPayload.topic_name = section.topic_name;

      const { data: sectionData, error: sectionError } = await supabase
        .from("course_sections")
        .insert([secPayload])
        .select("id")
        .single();

      if (sectionError || !sectionData) {
        result.errors.push(`Section "${section.title}": ${sectionError?.message || 'Failed to create'}`);
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
                description: quizItem.description || "Self-assessment examination quiz.",
                type: "quiz",
                is_graded: quizItem.is_graded !== false,
                due_date: quizItem.due_date || null,
                points: quizItem.points || 50,
                time_limit_minutes: quizItem.time_limit_minutes || 15,
              }])
              .select("id")
              .single();

            if (quizError || !quizData) {
              result.errors.push(`Quiz "${quizItem.title}": ${quizError?.message || 'Failed to create'}`);
              continue;
            }

            result.quizzesCreated++;

            // Insert Quiz Questions into assignment_questions
            if (quizItem.questions && quizItem.questions.length > 0) {
              const questionsPayload = quizItem.questions.map((q: any, qi: number) => {
                const qType = (q.type || (q.options ? "mcq" : "boolean")).toLowerCase();
                let opts = q.options;
                if (qType === "boolean" && (!opts || opts.length === 0)) {
                  opts = ["True", "False"];
                } else if (qType === "mcq" && (!opts || opts.length === 0)) {
                  opts = ["Option 1", "Option 2", "Option 3", "Option 4"];
                }

                return {
                  assignment_id: quizData.id,
                  question_text: (q.question_text || q.question || q.title || `Question ${qi + 1}`).trim(),
                  type: qType,
                  options: (qType === "mcq" || qType === "boolean") ? opts : null,
                  correct_answer: q.correct_answer !== undefined && q.correct_answer !== null ? String(q.correct_answer).trim() : (opts?.[0] || "True"),
                  points: q.points !== undefined ? Number(q.points) : 10,
                  order_index: qi,
                };
              });

              const { data: qData, error: qError } = await supabase
                .from("assignment_questions")
                .insert(questionsPayload)
                .select("id");

              if (qError) {
                console.warn(`Quiz "${quizItem.title}" questions error:`, qError);
                result.errors.push(`Quiz "${quizItem.title}" questions: ${qError.message}`);
              } else {
                result.questionsCreated += qData?.length || questionsPayload.length;
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
                description: assignItem.description || "Practical assignment submission task.",
                type: "manual",
                due_date: assignItem.due_date || null,
                points: assignItem.points || 100,
              }]);

            if (assignError) {
              result.errors.push(`Assignment "${assignItem.title}": ${assignError.message}`);
            } else {
              result.assignmentsCreated++;
            }
          } else if (item.type === "flashcards") {
            const fcItem = item as any;
            const res = importFlashcardsFromJson(fcItem.cards || fcItem, courseId);
            if (res.success) {
              result.flashcardsCreated = (result.flashcardsCreated || 0) + res.cardsCount;
            }
            const markdownSummary = `# 🗂️ Flashcard Deck: ${fcItem.title || 'Module Revision Flashcards'}\n\n` +
              `**Subject**: ${fcItem.subject || 'Course Topic'}\n\n` +
              `${fcItem.description || 'Practice high-yield concepts using active recall and spaced repetition.'}\n\n` +
              `This interactive deck contains **${res.cardsCount || (fcItem.cards?.length || 0)} cards**. Open the **Flashcards Studio** from the navigation menu to review these cards in 3D flip study mode!`;

            const { error: contentError } = await supabase
              .from("section_contents")
              .insert([{
                section_id: sectionData.id,
                title: fcItem.title || "Interactive Flashcards Hub",
                type: "text",
                content_text: markdownSummary,
                duration_minutes: fcItem.duration_minutes || 20,
                order_index: ii,
              }]);

            if (contentError) {
              result.errors.push(`Flashcards Content "${fcItem.title}": ${contentError.message}`);
            } else {
              result.contentsCreated++;
            }
          } else if (item.type === "mnemonics") {
            const mneItem = item as any;
            const res = importMnemonicsFromJson(mneItem.mnemonics || mneItem, courseId);
            if (res.success) {
              result.mnemonicsCreated = (result.mnemonicsCreated || 0) + res.mnemonicsCount;
            }
            const markdownSummary = `# 🧠 Mnemonics & Memory Studio: ${mneItem.title || 'Cognitive Recall Anchors'}\n\n` +
              `${mneItem.description || 'Accelerate retention using phonetic and acronym memory hooks.'}\n\n` +
              `Open the **Mnemonics Hub** from the student portal to test your active recall and acronym breakdowns!`;

            const { error: contentError } = await supabase
              .from("section_contents")
              .insert([{
                section_id: sectionData.id,
                title: mneItem.title || "Cognitive Mnemonics Hub",
                type: "text",
                content_text: markdownSummary,
                duration_minutes: mneItem.duration_minutes || 15,
                order_index: ii,
              }]);

            if (contentError) {
              result.errors.push(`Mnemonics Content "${mneItem.title}": ${contentError.message}`);
            } else {
              result.contentsCreated++;
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
              try {
                const { data: liveData } = await supabase
                  .from("live_classes")
                  .insert([{
                    course_id: courseId,
                    section_id: sectionData.id,
                    teacher_id: user?.id,
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
              } catch (liveErr) {
                console.warn("Live class create error:", liveErr);
              }
            } else if (contentItem.type === "text") {
              contentPayload.content_text = contentItem.content_text || `# ${contentItem.title}\n\nLesson lecture notes.`;
            } else if (contentItem.type === "video" && contentItem.url) {
              const url = isGoogleDriveUrl(contentItem.url)
                ? getGoogleDriveEmbedUrl(contentItem.url)
                : contentItem.url;
              contentPayload.content_url = url;
              contentPayload.video_url = url;
            } else if (contentItem.url) {
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

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    return result;
  }
}

// ─── Aliases for backwards compatibility ────────────────────────────
export const importFromJson = importCourseFromJson;

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
  flashcardCount: number;
  mnemonicCount: number;
  hasAttendancePolicy: boolean;
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
    flashcardCount: 0,
    mnemonicCount: 0,
    hasAttendancePolicy: !!payload.attendance_policy,
    totalDurationMinutes: 0,
    totalDurationHours: 0,
  };

  // Top-level flashcards
  if (payload.flashcard_decks) {
    for (const d of payload.flashcard_decks) {
      stats.flashcardCount += d.cards?.length || 0;
    }
  }
  if (payload.flashcards) {
    stats.flashcardCount += payload.flashcards.length;
  }

  // Top-level mnemonics
  if (payload.mnemonics) {
    stats.mnemonicCount += payload.mnemonics.length;
  }

  if (!payload.sections) return stats;

  stats.sectionCount = payload.sections.length;

  for (const section of payload.sections) {
    if (section.flashcards) stats.flashcardCount += section.flashcards.length;
    if (section.mnemonics) stats.mnemonicCount += section.mnemonics.length;

    let sectionMins = 0;
    if (section.items) {
      for (const item of section.items) {
        switch (item.type) {
          case "video":
            stats.videoCount++;
            sectionMins += (item as JsonContentItem).duration_minutes || 30;
            break;
          case "pdf":
          case "presentation":
          case "document":
          case "reference":
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
          case "flashcards":
          case "flashcard_deck":
            stats.flashcardCount += (item as any).flashcards?.length || (item as any).cards?.length || 5;
            sectionMins += 20;
            break;
          case "mnemonic":
          case "mnemonics":
            stats.mnemonicCount += (item as any).mnemonics?.length || 1;
            sectionMins += 15;
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
      const questionsPayload = quizPayload.questions.map((q, qi) => {
        const qType = (q.type || (q.options ? "mcq" : "boolean")).toLowerCase();
        let opts = q.options;
        if (qType === "boolean" && (!opts || opts.length === 0)) {
          opts = ["True", "False"];
        }
        return {
          assignment_id: quizData.id,
          question_text: (q.question_text || q.question || q.title || "Question").trim(),
          type: qType,
          options: (qType === "mcq" || qType === "boolean") ? (opts && opts.length > 0 ? opts : (qType === "boolean" ? ["True", "False"] : ["Option 1", "Option 2", "Option 3", "Option 4"])) : null,
          correct_answer: q.correct_answer !== undefined && q.correct_answer !== null ? String(q.correct_answer).trim() : null,
          points: q.points !== undefined ? Number(q.points) : 10,
          order_index: qi,
        };
      });

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
    const res = await importSectionsToExistingCourse(courseId, [sectionPayload]);
    if (res.success && res.sectionsCreated > 0) {
      return { success: true };
    }
    return { success: false, error: res.errors[0] || "Failed to import section." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Sample Template JSON (Comprehensive with Quizzes & Variations) ──

export const SAMPLE_COURSE_JSON: JsonCoursePayload = {
  title: "Complete Artificial Intelligence & Agentic Engineering Masterclass",
  description: "Master AI workflows, LangChain, autonomous agents, and model fine-tuning with hands-on projects, graded quizzes, and live classes.",
  domain: "Data Science & AI",
  credit_points: 4,
  price: 1999,
  original_price: 3499,
  organization_name: "Orbit AI Academy",
  organization_logo_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  is_published: true,
  attendance_policy: {
    mandatory_percentage: 75,
    exam_clearance_required: true,
    total_planned_sessions: 40,
    condonation_rules: "Students with attendance between 65%-74% require Dean condonation clearance to sit for examinations."
  },
  flashcard_decks: [
    {
      title: "Agentic AI & LLM High-Yield Flashcards",
      subject: "Artificial Intelligence",
      description: "Active recall deck covering attention mechanisms, prompting strategies, and tool calling.",
      icon: "⚡",
      color: "from-blue-600 to-indigo-700",
      cards: [
        {
          front: "What is the primary difference between Zero-Shot and Few-Shot Prompting?",
          back: "Zero-Shot asks the model to execute a task without exemplars. Few-Shot provides 2 to 5 demonstration exemplars inside the prompt context.",
          hint: "Exemplars vs no exemplars.",
          category: "Prompt Engineering",
          difficulty: "easy"
        },
        {
          front: "What is the computational complexity of standard Self-Attention with respect to sequence length N?",
          back: "O(N²) quadratic time and memory complexity, because each token attends to all other tokens via Q·K^T dot-product matrix.",
          hint: "Pairwise dot-product matrix.",
          category: "Transformers",
          difficulty: "hard"
        }
      ]
    }
  ],
  mnemonics: [
    {
      title: "RAG Pipeline Phases (Retrieval-Augmented Generation)",
      acronym: "C-I-R-G",
      phrase: "Clean Indexing Retrieves Genius",
      subject: "AI Engineering",
      category: "Architectures",
      explanation: "The four core stages of building an end-to-end production RAG system.",
      breakdown: [
        { letter: "C", word: "Chunking", meaning: "Splitting raw source documents into semantic text units." },
        { letter: "I", word: "Indexing", meaning: "Generating vector embeddings and inserting into vector database index." },
        { letter: "R", word: "Retrieval", meaning: "Approximate nearest neighbor vector search based on user prompt query." },
        { letter: "G", word: "Generation", meaning: "Passing retrieved documents into LLM context window to synthesize answer." }
      ],
      examTip: "Always mention chunk overlap (e.g. 10-20%) when discussing Chunking in RAG pipelines!"
    }
  ],
  sections: [
    {
      title: "Module 1: AI & LLM Foundations",
      week_number: 1,
      allocated_hours: 4.0,
      topic_name: "Transformers, Attention Mechanisms & Prompt Engineering",
      aura_points: 20,
      items: [
        {
          title: "Introduction to Agentic Architecture & LLMs",
          type: "video",
          url: "https://www.youtube.com/watch?v=example1",
          duration_minutes: 35
        },
        {
          title: "Transformers & Attention Mechanism Architecture Slide Deck",
          type: "presentation",
          url: "https://docs.google.com/presentation/d/1A2b3C4dExAmPlE/embed",
          duration_minutes: 30
        },
        {
          title: "Prompt Engineering Principles & Frameworks",
          type: "text",
          content_text: "# Prompt Engineering Fundamentals\n\nPrompt engineering is the practice of structuring text that can be interpreted and understood by a generative AI model.\n\n## Key Patterns:\n1. **Chain of Thought (CoT)**: Step-by-step reasoning.\n2. **Few-shot Prompting**: Providing exemplar input-output pairs.\n3. **ReAct Pattern**: Synergizing reasoning and acting."
        },
        {
          title: "Official LLM Guidelines & Prompt Reference PDF",
          type: "pdf",
          url: "https://example.com/llm-prompt-guide.pdf",
          duration_minutes: 25
        },
        {
          title: "🔴 Live Interactive Workshop: Building Your First Agent",
          type: "live",
          url: "https://meet.google.com/orbit-live-ai-agent",
          scheduled_at: "2026-08-25T18:00:00Z",
          duration_minutes: 60
        },
        {
          title: "Module 1 Practice Quiz (Self-Assessment)",
          type: "quiz",
          is_graded: false,
          time_limit_minutes: 10,
          points: 20,
          questions: [
            {
              question_text: "What does 'temperature' in an LLM API control?",
              type: "mcq",
              options: [
                "The randomness and creativity of the generated tokens",
                "The physical CPU temperature of the GPU cluster",
                "The context window size in tokens",
                "The network latency speed"
              ],
              correct_answer: "The randomness and creativity of the generated tokens",
              points: 10
            },
            {
              question_text: "Does increasing temperature make the model output more deterministic?",
              type: "boolean",
              options: ["True", "False"],
              correct_answer: "False",
              points: 10
            }
          ]
        },
        {
          title: "Module 1 Graded Examination Quiz",
          type: "quiz",
          is_graded: true,
          points: 50,
          time_limit_minutes: 20,
          questions: [
            {
              question_text: "Which architectural component enables Transformers to process all tokens in parallel?",
              type: "mcq",
              options: [
                "Self-Attention Mechanism",
                "Recurrent Hidden State",
                "Convolutional Kernel",
                "Gradient Accumulation"
              ],
              correct_answer: "Self-Attention Mechanism",
              points: 15
            },
            {
              question_text: "In the ReAct prompting framework, the agent alternates between Reasoning and Acting.",
              type: "boolean",
              options: ["True", "False"],
              correct_answer: "True",
              points: 10
            },
            {
              question_text: "Explain the difference between Zero-Shot and Few-Shot prompting.",
              type: "short",
              points: 15
            },
            {
              question_text: "Describe how Hallucination mitigation can be achieved using Retrieval-Augmented Generation (RAG).",
              type: "long",
              points: 10
            }
          ]
        }
      ]
    },
    {
      title: "Module 2: LangChain & Vector Databases",
      week_number: 2,
      allocated_hours: 4.0,
      topic_name: "Vector Embeddings, FAISS & Retrieval-Augmented Generation",
      aura_points: 20,
      items: [
        {
          title: "Vector Embeddings & Semantic Search Explained",
          type: "video",
          url: "https://drive.google.com/file/d/1A2b3C4dExAmPlE/view",
          duration_minutes: 40
        },
        {
          title: "LangChain Chains & Agents Documentation",
          type: "text",
          content_text: "# LangChain Agent Architecture\n\nLangChain simplifies the creation of applications using LLMs through modular abstractions."
        },
        {
          title: "LangChain Multi-Agent Practical Project",
          type: "assignment",
          description: "Build a Python script using LangChain that retrieves research papers from arXiv and summarizes key findings. Submit GitHub repo URL or .zip file.",
          points: 100,
          due_date: "2026-09-15T23:59:00Z"
        },
        {
          title: "Module 2 Vector DB Quiz",
          type: "quiz",
          is_graded: true,
          points: 30,
          time_limit_minutes: 15,
          questions: [
            {
              question_text: "Which distance metric is most commonly used for high-dimensional cosine similarity in vector search?",
              type: "mcq",
              options: ["Cosine Distance / Dot Product", "Manhattan Distance", "Hamming Distance", "Jaccard Index"],
              correct_answer: "Cosine Distance / Dot Product",
              points: 10
            },
            {
              question_text: "Vector databases store dense numeric vector embeddings of text or multimedia.",
              type: "boolean",
              options: ["True", "False"],
              correct_answer: "True",
              points: 10
            },
            {
              question_text: "Describe the chunking trade-offs in RAG systems.",
              type: "long",
              points: 10
            }
          ]
        }
      ]
    }
  ]
};

export const SAMPLE_WEEKLY_MODULE_JSON: JsonSection = {
  title: "Week 1: Autonomous Agent Design & Tool Calling",
  week_number: 1,
  allocated_hours: 4.0,
  topic_name: "Function Calling, Planning & State Machines",
  aura_points: 25,
  items: [
    {
      title: "Function Calling & Tool Execution in AI Agents",
      type: "video",
      url: "https://www.youtube.com/watch?v=example_space",
      duration_minutes: 45
    },
    {
      title: "Agent Tooling & State Persistence Reference Notes",
      type: "text",
      content_text: "# Tool Calling in Autonomous Agents\n\nAgents use JSON schemas to declare executable tools and receive structured tool call arguments from the LLM.",
      duration_minutes: 30
    },
    {
      title: "Agentic Tool Calling Assessment Quiz",
      type: "quiz",
      is_graded: true,
      time_limit_minutes: 20,
      points: 50,
      questions: [
        {
          question_text: "How does an LLM execute a tool call?",
          type: "mcq",
          options: [
            "It outputs structured JSON arguments which the client application executes",
            "The model runs binary code inside its neural network weights",
            "The model opens a TCP socket directly from GPU memory",
            "Tools are executed by the training loss function"
          ],
          correct_answer: "It outputs structured JSON arguments which the client application executes",
          points: 20
        },
        {
          question_text: "Can an agent execute multiple tool calls in a single turn?",
          type: "boolean",
          options: ["True", "False"],
          correct_answer: "True",
          points: 10
        },
        {
          question_text: "Explain the purpose of state persistence (memory) in multi-turn agent conversations.",
          type: "long",
          points: 20
        }
      ]
    }
  ]
};

export const SAMPLE_QUIZ_JSON: JsonQuiz = {
  title: "Agentic AI & Neural Systems Assessment Quiz",
  description: "Comprehensive test evaluating your understanding of LLM reasoning, tools, and evaluation metrics.",
  type: "quiz",
  is_graded: true,
  time_limit_minutes: 15,
  points: 50,
  questions: [
    {
      question_text: "Which prompting technique forces the model to generate intermediate reasoning steps before the final answer?",
      type: "mcq",
      options: [
        "Chain of Thought (CoT)",
        "Zero-shot Direct Output",
        "Greedy Token Decoding",
        "Top-P Truncation"
      ],
      correct_answer: "Chain of Thought (CoT)",
      points: 15
    },
    {
      question_text: "Embedding vectors for semantically similar sentences are close to each other in vector space.",
      type: "boolean",
      options: ["True", "False"],
      correct_answer: "True",
      points: 10
    },
    {
      question_text: "Explain how RAG helps prevent model hallucinations.",
      type: "short",
      points: 15
    },
    {
      question_text: "Discuss the security considerations of executing arbitrary code tools generated by an LLM agent.",
      type: "long",
      points: 10
    }
  ]
};

// ─── Standalone Flashcards Template JSON ───
export const SAMPLE_FLASHCARDS_JSON: JsonFlashcardDeck = {
  title: "Computer Science & Engineering High-Yield Flashcards",
  description: "Active recall deck covering core algorithms, operating systems, and web architecture.",
  subject: "Computer Science",
  icon: "⚡",
  color: "from-blue-600 to-indigo-700",
  cards: [
    {
      front: "What is the average and worst-case time complexity of QuickSort?",
      back: "Average: O(N log N)\nWorst-Case: O(N²) when naive pivot selection divides into 1 and N-1 elements repeatedly.",
      hint: "Balanced vs unbalanced recursion tree.",
      category: "Algorithms",
      difficulty: "medium"
    },
    {
      front: "What are the four ACID properties in Database Transactions?",
      back: "• Atomicity: All or nothing execution.\n• Consistency: Valid state transitions obeying constraints.\n• Isolation: Concurrent transactions do not cross-contaminate.\n• Durability: Committed updates survive system crashes.",
      hint: "A-C-I-D acronym.",
      category: "Databases",
      difficulty: "easy"
    },
    {
      front: "What is a JavaScript Closure?",
      back: "A closure is a function bundled together with references to its surrounding lexical environment, allowing it to remember outer variables even after the outer function has returned.",
      hint: "Lexical scoping retention.",
      category: "Web Development",
      difficulty: "medium"
    }
  ]
};

// ─── Standalone Mnemonics Template JSON ───
export const SAMPLE_MNEMONICS_JSON: JsonMnemonic[] = [
  {
    title: "OSI 7 Layers Protocol Stack",
    acronym: "PDNTSPA",
    phrase: "Please Do Not Throw Sausage Pizza Away",
    subject: "Computer Networks",
    category: "Network Architecture",
    explanation: "Memorizes the 7 Open Systems Interconnection layers from Layer 1 (Physical) to Layer 7 (Application).",
    breakdown: [
      { letter: "P", word: "Physical (Layer 1)", meaning: "Transmits raw bitstream over physical cables/radio.", example: "Ethernet, RJ45" },
      { letter: "D", word: "Data Link (Layer 2)", meaning: "Node-to-node framing and MAC addressing.", example: "Switches, MAC" },
      { letter: "N", word: "Network (Layer 3)", meaning: "Routing packets across networks via IP.", example: "IPv4/IPv6, Routers" },
      { letter: "T", word: "Transport (Layer 4)", meaning: "End-to-end delivery and reliability.", example: "TCP, UDP" },
      { letter: "S", word: "Session (Layer 5)", meaning: "Manages dialogues and connections.", example: "Sockets, RPC" },
      { letter: "P", word: "Presentation (Layer 6)", meaning: "Data translation, compression, and encryption.", example: "SSL/TLS, JSON" },
      { letter: "A", word: "Application (Layer 7)", meaning: "User interface protocols.", example: "HTTP, DNS, SSH" }
    ],
    examTip: "Top-to-bottom mnemonic: 'All People Seem To Need Data Processing'!"
  },
  {
    title: "SOLID Object-Oriented Principles",
    acronym: "SOLID",
    phrase: "Software Organizes Logical Interfaces Dependably",
    subject: "Software Engineering",
    category: "Design Patterns",
    explanation: "Five fundamental design principles for maintainable object-oriented software.",
    breakdown: [
      { letter: "S", word: "Single Responsibility", meaning: "A class should have one, and only one, reason to change." },
      { letter: "O", word: "Open / Closed", meaning: "Open for extension, closed for modification." },
      { letter: "L", word: "Liskov Substitution", meaning: "Subtypes must be substitutable for their base types." },
      { letter: "I", word: "Interface Segregation", meaning: "Do not force clients to depend on interfaces they do not use." },
      { letter: "D", word: "Dependency Inversion", meaning: "Depend on abstractions, not on concrete implementations." }
    ],
    examTip: "Always connect Liskov substitution to behavioral subtyping in examinations."
  }
];

// ─── Standalone Flashcards Deck JSON Importer ────────────────────────
export interface FlashcardImportResult {
  success: boolean;
  deckId?: string;
  deckTitle?: string;
  cardsCount: number;
  error?: string;
}

export function importFlashcardsFromJson(payload: any, courseId?: string, courseTitle?: string): FlashcardImportResult {
  try {
    let deckTitle = "Course Flashcard Deck";
    let deckSubject = "Computer Science & Engineering";
    let deckDescription = "Active recall spaced repetition deck.";
    let rawCards: any[] = [];
    let icon = "⚡";
    let color = "from-blue-600 to-indigo-700";

    if (Array.isArray(payload)) {
      rawCards = payload;
    } else if (payload && typeof payload === "object") {
      deckTitle = payload.title || payload.deck_title || deckTitle;
      deckSubject = payload.subject || payload.category || deckSubject;
      deckDescription = payload.description || deckDescription;
      icon = payload.icon || icon;
      color = payload.color || color;
      rawCards = Array.isArray(payload.cards) ? payload.cards : (Array.isArray(payload.flashcards) ? payload.flashcards : []);
    }

    if (!rawCards || rawCards.length === 0) {
      return { success: false, cardsCount: 0, error: "No valid flashcards found in payload." };
    }

    const cards = rawCards.map((c, idx) => ({
      id: c.id || `card-${Date.now()}-${idx}`,
      front: c.front || c.question || c.term || `Concept ${idx + 1}`,
      back: c.back || c.answer || c.definition || "Answer not provided.",
      hint: c.hint || c.tip || "",
      category: c.category || c.topic || "Core",
      difficulty: (c.difficulty === "easy" || c.difficulty === "medium" || c.difficulty === "hard") ? c.difficulty : "medium",
      mastered: Boolean(c.mastered)
    }));

    const deckId = `deck-${Date.now()}`;
    const newDeck = {
      id: deckId,
      courseId: courseId || null,
      course: courseTitle || deckSubject,
      title: deckTitle,
      description: deckDescription,
      subject: deckSubject,
      icon,
      color,
      cards,
      cardCount: cards.length,
      activeStudents: 1,
      lastUpdated: "Just now"
    };

    // Store in localStorage
    const stored = localStorage.getItem("orbit_flashcard_decks");
    let existingDecks: any[] = [];
    try {
      if (stored) existingDecks = JSON.parse(stored);
      if (!Array.isArray(existingDecks)) existingDecks = [];
    } catch {
      existingDecks = [];
    }

    const updatedDecks = [newDeck, ...existingDecks.filter((d: any) => d.id !== deckId)];
    localStorage.setItem("orbit_flashcard_decks", JSON.stringify(updatedDecks));

    return {
      success: true,
      deckId,
      deckTitle,
      cardsCount: cards.length
    };
  } catch (err: any) {
    return { success: false, cardsCount: 0, error: err.message };
  }
}

// ─── Standalone Mnemonics JSON Importer ──────────────────────────────
export interface MnemonicImportResult {
  success: boolean;
  mnemonicsCount: number;
  error?: string;
}

export function importMnemonicsFromJson(payload: any, courseId?: string, courseTitle?: string): MnemonicImportResult {
  try {
    let rawList: any[] = [];
    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (payload && typeof payload === "object") {
      rawList = Array.isArray(payload.mnemonics) ? payload.mnemonics : (Array.isArray(payload.items) ? payload.items : [payload]);
    }

    if (!rawList || rawList.length === 0) {
      return { success: false, mnemonicsCount: 0, error: "No valid mnemonics found in payload." };
    }

    const formattedMnemonics = rawList.map((m, idx) => ({
      id: m.id || `mne-${Date.now()}-${idx}`,
      courseId: courseId || null,
      title: m.title || m.concept || `Mnemonic Concept ${idx + 1}`,
      acronym: m.acronym || m.keyword || "MNE",
      phrase: m.phrase || m.sentence || m.hook || "",
      subject: m.subject || courseTitle || "Engineering & Science",
      category: m.category || "General",
      explanation: m.explanation || m.description || "",
      breakdown: Array.isArray(m.breakdown) ? m.breakdown : [],
      examTip: m.examTip || m.exam_tip || m.tip || "",
      termsCount: Array.isArray(m.breakdown) ? m.breakdown.length : (m.acronym?.length || 4),
      verified: true
    }));

    const stored = localStorage.getItem("orbit_mnemonics");
    let existingMnemonics: any[] = [];
    try {
      if (stored) existingMnemonics = JSON.parse(stored);
      if (!Array.isArray(existingMnemonics)) existingMnemonics = [];
    } catch {
      existingMnemonics = [];
    }

    const updated = [...formattedMnemonics, ...existingMnemonics];
    localStorage.setItem("orbit_mnemonics", JSON.stringify(updated));

    return {
      success: true,
      mnemonicsCount: formattedMnemonics.length
    };
  } catch (err: any) {
    return { success: false, mnemonicsCount: 0, error: err.message };
  }
}

// ─── Universal JSON Download & Clipboard Utilities ──────────────────

export function downloadJsonFile(data: any, defaultFilename: string = "orbit_course_export.json") {
  try {
    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", defaultFilename.endsWith(".json") ? defaultFilename : `${defaultFilename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("Failed to download JSON file:", err);
    return false;
  }
}

export async function copyJsonToClipboard(data: any): Promise<boolean> {
  try {
    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (err) {
    console.error("Failed to copy JSON to clipboard:", err);
    return false;
  }
}

// ─── Course to JSON Exporter ────────────────────────────────────────

export async function exportCourseToJson(courseId: string): Promise<JsonCoursePayload> {
  // 1. Fetch Course Core Metadata
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (cErr || !course) {
    throw new Error(`Failed to load course for JSON export: ${cErr?.message || "Course not found"}`);
  }

  // 2. Fetch Course Sections / Weekly Modules
  const { data: sections, error: sErr } = await supabase
    .from("course_sections")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (sErr) throw sErr;

  const sectionIds = (sections || []).map(s => s.id);

  // 3. Fetch Section Contents (videos, pdfs, texts, live sessions)
  let allContents: any[] = [];
  if (sectionIds.length > 0) {
    const { data: contents } = await supabase
      .from("section_contents")
      .select("*")
      .in("section_id", sectionIds)
      .order("order_index", { ascending: true });
    allContents = contents || [];
  }

  // 4. Fetch Assignments & Quizzes for this Course
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId);

  const quizIds = (assignments || []).filter(a => a.type === "quiz").map(a => a.id);

  // 5. Fetch Quiz Questions
  let allQuestions: any[] = [];
  if (quizIds.length > 0) {
    const { data: questions } = await supabase
      .from("assignment_questions")
      .select("*")
      .in("assignment_id", quizIds)
      .order("order_index", { ascending: true });
    allQuestions = questions || [];
  }

  // 6. Check for Cached Attendance Policy
  let attendancePolicy: JsonAttendancePolicy | undefined = undefined;
  try {
    const rawPolicy = localStorage.getItem(`orbit_attendance_policy_${courseId}`);
    if (rawPolicy) {
      attendancePolicy = JSON.parse(rawPolicy);
    } else {
      const allPoliciesRaw = localStorage.getItem("orbit_attendance_policies");
      if (allPoliciesRaw) {
        const allPolicies = JSON.parse(allPoliciesRaw);
        if (allPolicies[courseId]) attendancePolicy = allPolicies[courseId];
      }
    }
  } catch (e) {
    console.warn("Could not retrieve attendance policy for export:", e);
  }

  if (!attendancePolicy) {
    attendancePolicy = {
      minimum_attendance_percentage: 75,
      hall_ticket_clearance_required: true,
      attendance_weightage_percentage: 10,
      policy_rules: [
        "Minimum 75% verified biometric/session attendance is mandatory for semester end examination clearance.",
        "Students below 75% must obtain written Dean clearance.",
        "Institutional examination clearance slip must be printed with verified QR code."
      ]
    };
  }

  // 7. Check for Course-Associated Flashcard Decks
  let flashcardDecks: JsonFlashcardDeck[] | undefined = undefined;
  try {
    const storedDecks = localStorage.getItem("orbit_flashcard_decks");
    if (storedDecks) {
      const parsedDecks = JSON.parse(storedDecks);
      if (Array.isArray(parsedDecks)) {
        const matched = parsedDecks.filter((d: any) => d.courseId === courseId || d.course === course.title);
        if (matched.length > 0) {
          flashcardDecks = matched.map((d: any) => ({
            title: d.title,
            description: d.description || "Active recall deck.",
            subject: d.subject || course.domain || "Engineering",
            icon: d.icon || "⚡",
            color: d.color || "from-blue-600 to-indigo-700",
            cards: Array.isArray(d.cards) ? d.cards.map((c: any) => ({
              front: c.front,
              back: c.back,
              hint: c.hint,
              category: c.category,
              difficulty: c.difficulty || "medium"
            })) : []
          }));
        }
      }
    }
  } catch (e) {
    console.warn("Could not retrieve flashcard decks for export:", e);
  }

  // 8. Check for Course-Associated Mnemonics
  let mnemonics: JsonMnemonic[] | undefined = undefined;
  try {
    const storedMnemonics = localStorage.getItem("orbit_mnemonics");
    if (storedMnemonics) {
      const parsedMne = JSON.parse(storedMnemonics);
      if (Array.isArray(parsedMne)) {
        const matched = parsedMne.filter((m: any) => m.courseId === courseId || m.course === course.title || m.subject === course.domain);
        if (matched.length > 0) {
          mnemonics = matched.map((m: any) => ({
            title: m.title,
            acronym: m.acronym,
            phrase: m.phrase,
            subject: m.subject || course.domain || "Computer Science",
            category: m.category || "General",
            explanation: m.explanation || "",
            breakdown: m.breakdown || [],
            examTip: m.examTip || m.exam_tip || ""
          }));
        }
      }
    }
  } catch (e) {
    console.warn("Could not retrieve mnemonics for export:", e);
  }

  // 9. Map and Reconstruct Structured Sections
  const exportSections: JsonSection[] = (sections || []).map((sec, secIdx) => {
    const sectionContents = allContents.filter(c => c.section_id === sec.id);
    const sectionAssignments = (assignments || []).filter(a => a.section_id === sec.id);

    const items: (JsonContentItem | JsonQuiz | JsonAssignment)[] = [];

    // Map Section Content Items
    sectionContents.forEach(c => {
      let itemType: any = c.type || "text";
      if (itemType === "video" && (c.live_class_id || c.title?.includes("🔴"))) {
        itemType = "live";
      }

      const itemPayload: any = {
        title: c.title,
        type: itemType,
        duration_minutes: c.duration_minutes || 30
      };

      if (c.content_url || c.video_url || c.pdf_url) {
        itemPayload.url = c.content_url || c.video_url || c.pdf_url;
      }
      if (c.content_text) {
        itemPayload.content_text = c.content_text;
      }

      items.push(itemPayload);
    });

    // Map Section Assignments & Quizzes
    sectionAssignments.forEach(a => {
      if (a.type === "quiz") {
        const quizQuestions = allQuestions.filter(q => q.assignment_id === a.id);
        const quizItem: JsonQuiz = {
          title: a.title,
          description: a.description || "Module quiz assessment.",
          type: "quiz",
          is_graded: a.is_graded !== false,
          time_limit_minutes: a.time_limit_minutes || 20,
          points: a.points || 50,
          questions: quizQuestions.map(q => ({
            question_text: q.question_text,
            type: q.type || "mcq",
            options: q.options || ["Option 1", "Option 2"],
            correct_answer: q.correct_answer,
            points: q.points || 10
          }))
        };
        items.push(quizItem);
      } else {
        const assignItem: JsonAssignment = {
          title: a.title,
          description: a.description || "Practical assignment task.",
          type: "assignment",
          points: a.points || 100,
          due_date: a.due_date || undefined
        };
        items.push(assignItem);
      }
    });

    const isWeekly = Boolean(sec.week_number || sec.allocated_hours || sec.title?.toLowerCase().includes("week"));

    return {
      title: sec.title,
      week_number: sec.week_number || (isWeekly ? secIdx + 1 : undefined),
      allocated_hours: sec.allocated_hours ? String(sec.allocated_hours) : undefined,
      topic_name: sec.topic_name || undefined,
      aura_points: sec.aura_points || 15,
      items
    };
  });

  // 10. Assemble Master JSON Payload
  const fullPayload: JsonCoursePayload = {
    title: course.title,
    description: course.description || "Course curriculum and modules.",
    domain: course.domain || "Software Engineering",
    credit_points: course.credit_points || 4,
    instructor_intro: course.instructor_intro || undefined,
    instructor_video_url: course.instructor_video_url || undefined,
    instructor_qualifications: course.instructor_qualifications || undefined,
    exam_policy: course.exam_policy || undefined,
    price: course.price || 0,
    original_price: course.original_price || undefined,
    organization_name: course.organization_name || undefined,
    organization_logo_url: course.organization_logo_url || undefined,
    thumbnail_url: course.thumbnail_url || undefined,
    is_published: course.is_published ?? true,
    structuring_approach: exportSections.some(s => s.week_number !== undefined) ? "weekly" : "section",
    attendance_policy: attendancePolicy,
    flashcard_decks: flashcardDecks,
    mnemonics: mnemonics,
    sections: exportSections
  };

  return fullPayload;
}

// ─── Single Section / Weekly Module to JSON Exporter ────────────────

export async function exportSectionToJson(sectionId: string): Promise<JsonSection> {
  const { data: section, error: sErr } = await supabase
    .from("course_sections")
    .select("*")
    .eq("id", sectionId)
    .single();

  if (sErr || !section) throw new Error("Section not found");

  const { data: contents } = await supabase
    .from("section_contents")
    .select("*")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true });

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("section_id", sectionId);

  const quizIds = (assignments || []).filter(a => a.type === "quiz").map(a => a.id);
  let questions: any[] = [];
  if (quizIds.length > 0) {
    const { data: qData } = await supabase
      .from("assignment_questions")
      .select("*")
      .in("assignment_id", quizIds)
      .order("order_index", { ascending: true });
    questions = qData || [];
  }

  const items: (JsonContentItem | JsonQuiz | JsonAssignment)[] = [];

  (contents || []).forEach(c => {
    let itemType: any = c.type || "text";
    if (itemType === "video" && (c.live_class_id || c.title?.includes("🔴"))) itemType = "live";
    const item: any = {
      title: c.title,
      type: itemType,
      duration_minutes: c.duration_minutes || 30
    };
    if (c.content_url || c.video_url || c.pdf_url) item.url = c.content_url || c.video_url || c.pdf_url;
    if (c.content_text) item.content_text = c.content_text;
    items.push(item);
  });

  (assignments || []).forEach(a => {
    if (a.type === "quiz") {
      const qList = questions.filter(q => q.assignment_id === a.id);
      items.push({
        title: a.title,
        description: a.description || "Section quiz assessment.",
        type: "quiz",
        is_graded: a.is_graded !== false,
        time_limit_minutes: a.time_limit_minutes || 20,
        points: a.points || 50,
        questions: qList.map(q => ({
          question_text: q.question_text,
          type: q.type || "mcq",
          options: q.options || ["Option 1", "Option 2"],
          correct_answer: q.correct_answer,
          points: q.points || 10
        }))
      });
    } else {
      items.push({
        title: a.title,
        description: a.description || "Practical task.",
        type: "assignment",
        points: a.points || 100,
        due_date: a.due_date || undefined
      });
    }
  });

  return {
    title: section.title,
    week_number: section.week_number || undefined,
    allocated_hours: section.allocated_hours ? String(section.allocated_hours) : undefined,
    topic_name: section.topic_name || undefined,
    aura_points: section.aura_points || 15,
    items
  };
}

// ─── Flashcards Decks Export Utility ────────────────────────────────

export function exportAllFlashcardDecksToJson(): JsonFlashcardDeck[] {
  try {
    const stored = localStorage.getItem("orbit_flashcard_decks");
    if (!stored) return [SAMPLE_FLASHCARDS_JSON];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SAMPLE_FLASHCARDS_JSON];
  } catch {
    return [SAMPLE_FLASHCARDS_JSON];
  }
}

// ─── Mnemonics Hub Export Utility ───────────────────────────────────

export function exportAllMnemonicsToJson(): JsonMnemonic[] {
  try {
    const stored = localStorage.getItem("orbit_mnemonics");
    if (!stored) return SAMPLE_MNEMONICS_JSON;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_MNEMONICS_JSON;
  } catch {
    return SAMPLE_MNEMONICS_JSON;
  }
}


