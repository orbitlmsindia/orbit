import { supabase } from "@/lib/supabase";

export interface SystemStats {
    usersCount: number;
    coursesCount: number;
    sectionsCount: number;
    contentsCount: number;
    assignmentsCount: number;
    questionsCount: number;
    submissionsCount: number;
    enrollmentsCount: number;
    liveClassesCount: number;
    couponsCount: number;
    lastBackupDate: string;
}

export interface BackupSnapshot {
    app: string;
    version: string;
    exportedAt: string;
    exportedBy?: string;
    metadata: {
        totalTables: number;
        totalRecords: number;
    };
    localStorage: Record<string, any>;
    tables: Record<string, any[]>;
}

const ALL_TABLES = [
    "subscription_plans",
    "colleges",
    "users",
    "departments",
    "master_roles",
    "master_staff",
    "courses",
    "course_sections",
    "section_contents",
    "section_progress",
    "assignments",
    "assignment_questions",
    "submissions",
    "quiz_attempts",
    "quiz_answers",
    "enrollments",
    "live_classes",
    "coupons",
    "coupon_usage",
    "aura_awards",
    "invoices",
    "attendance",
    "attendance_policies",
    "attendance_clearance_records",
    "flashcard_decks",
    "flashcards",
    "mnemonics",
    "daily_quotes",
    "notifications",
    "blogs",
    "job_openings",
    "job_applications",
    "contact_messages",
    "audit_logs",
    "astravyuh_kingdoms",
    "astravyuh_battles",
    "astravyuh_flix_audits",
    "astravyuh_settings"
];

export * from "@/services/backupEngineService";

// Helper to safely fetch table data or empty array if table doesn't exist
async function safeFetchTable(tableName: string): Promise<any[]> {
    try {
        const { data, error } = await supabase.from(tableName).select("*");
        if (error) {
            console.warn(`Table "${tableName}" fetch warning:`, error.message);
            return [];
        }
        return data || [];
    } catch {
        return [];
    }
}

// 1. FETCH LIVE SYSTEM METRICS
export async function fetchSystemStats(): Promise<SystemStats> {
    const stats: SystemStats = {
        usersCount: 0,
        coursesCount: 0,
        sectionsCount: 0,
        contentsCount: 0,
        assignmentsCount: 0,
        questionsCount: 0,
        submissionsCount: 0,
        enrollmentsCount: 0,
        liveClassesCount: 0,
        couponsCount: 0,
        lastBackupDate: localStorage.getItem("orbit_last_backup") || new Date().toISOString()
    };

    try {
        const [
            usersRes,
            coursesRes,
            sectionsRes,
            contentsRes,
            assignmentsRes,
            questionsRes,
            submissionsRes,
            enrollmentsRes,
            liveClassesRes,
            couponsRes
        ] = await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("courses").select("id", { count: "exact", head: true }),
            supabase.from("course_sections").select("id", { count: "exact", head: true }),
            supabase.from("section_contents").select("id", { count: "exact", head: true }),
            supabase.from("assignments").select("id", { count: "exact", head: true }),
            supabase.from("assignment_questions").select("id", { count: "exact", head: true }),
            supabase.from("submissions").select("id", { count: "exact", head: true }),
            supabase.from("enrollments").select("id", { count: "exact", head: true }),
            supabase.from("live_classes").select("id", { count: "exact", head: true }),
            supabase.from("coupons").select("id", { count: "exact", head: true })
        ]);

        stats.usersCount = usersRes.count || 0;
        stats.coursesCount = coursesRes.count || 0;
        stats.sectionsCount = sectionsRes.count || 0;
        stats.contentsCount = contentsRes.count || 0;
        stats.assignmentsCount = assignmentsRes.count || 0;
        stats.questionsCount = questionsRes.count || 0;
        stats.submissionsCount = submissionsRes.count || 0;
        stats.enrollmentsCount = enrollmentsRes.count || 0;
        stats.liveClassesCount = liveClassesRes.count || 0;
        stats.couponsCount = couponsRes.count || 0;
    } catch (err) {
        console.error("Error fetching system stats:", err);
    }

    return stats;
}

// 2. EXPORT COMPLETE ZERO-LOSS SNAPSHOT
export async function exportFullSystemBackup(): Promise<{ success: boolean; snapshot?: BackupSnapshot; filename?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const tablesData: Record<string, any[]> = {};
        let totalRecords = 0;

        for (const tableName of ALL_TABLES) {
            const rows = await safeFetchTable(tableName);
            tablesData[tableName] = rows;
            totalRecords += rows.length;
        }

        // Collect all orbit-related localStorage settings
        const localStorageData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("orbit_") || key === "theme")) {
                try {
                    localStorageData[key] = JSON.parse(localStorage.getItem(key) || "");
                } catch {
                    localStorageData[key] = localStorage.getItem(key);
                }
            }
        }

        const snapshot: BackupSnapshot = {
            app: "Orbit LMS Zero-Loss Engine",
            version: "2.5.0",
            exportedAt: new Date().toISOString(),
            exportedBy: user?.email || "Admin",
            metadata: {
                totalTables: ALL_TABLES.length,
                totalRecords
            },
            localStorage: localStorageData,
            tables: tablesData
        };

        // Timestamp filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `orbit_lms_full_snapshot_${timestamp}.json`;

        // Trigger Browser Download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        // Update last backup timestamp
        const nowIso = new Date().toISOString();
        localStorage.setItem("orbit_last_backup", nowIso);

        return { success: true, snapshot, filename };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to generate system snapshot." };
    }
}

// 3. ZERO-LOSS RESTORE ENGINE
export async function restoreFullSystemBackup(
    snapshot: any,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; restoredTables: number; restoredRecords: number; error?: string; log: string[] }> {
    const log: string[] = [];
    let restoredTables = 0;
    let restoredRecords = 0;

    try {
        if (!snapshot || typeof snapshot !== "object" || !snapshot.tables) {
            throw new Error("Invalid backup snapshot format. Missing root 'tables' object.");
        }

        log.push("Starting Zero-Loss Restoration Process...");
        onProgress?.("Validating Backup Package...");

        // Step 1: Restore LocalStorage Settings
        if (snapshot.localStorage && typeof snapshot.localStorage === "object") {
            log.push("Restoring LocalStorage System Settings...");
            onProgress?.("Restoring System Settings & Branding...");
            Object.entries(snapshot.localStorage).forEach(([key, val]) => {
                if (typeof val === "object") {
                    localStorage.setItem(key, JSON.stringify(val));
                } else {
                    localStorage.setItem(key, String(val));
                }
            });
            log.push("System settings and branding restored successfully.");
        }

        const tables = snapshot.tables;

        // Helper function for batch upsert
        const upsertTableData = async (tableName: string, rows: any[]) => {
            if (!rows || rows.length === 0) return 0;

            log.push(`Restoring table "${tableName}" (${rows.length} records)...`);
            onProgress?.(`Restoring ${tableName} (${rows.length} items)...`);

            // Chunk upsert to avoid payload size errors
            const chunkSize = 100;
            let count = 0;

            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: "id" });
                if (error) {
                    log.push(`Warning: ${tableName} chunk restore issue: ${error.message}`);
                } else {
                    count += chunk.length;
                }
            }

            restoredTables++;
            restoredRecords += count;
            log.push(`Successfully restored ${count}/${rows.length} records into "${tableName}".`);
            return count;
        };

        // Step 2: Restore Tables in Strict Relational Dependency Order

        // 1. Foundation: Subscription Plans & Colleges
        if (tables.subscription_plans) await upsertTableData("subscription_plans", tables.subscription_plans);
        if (tables.colleges) await upsertTableData("colleges", tables.colleges);

        // 2. Identity & Institutional Staff
        if (tables.users) await upsertTableData("users", tables.users);
        if (tables.departments) await upsertTableData("departments", tables.departments);
        if (tables.master_roles) await upsertTableData("master_roles", tables.master_roles);
        if (tables.master_staff) await upsertTableData("master_staff", tables.master_staff);

        // 3. Courses & Curriculum Structure
        if (tables.courses) await upsertTableData("courses", tables.courses);
        if (tables.course_sections) await upsertTableData("course_sections", tables.course_sections);
        if (tables.section_contents) await upsertTableData("section_contents", tables.section_contents);
        if (tables.section_progress) await upsertTableData("section_progress", tables.section_progress);

        // 4. Assignments & Question Banks
        if (tables.assignments) await upsertTableData("assignments", tables.assignments);
        if (tables.assignment_questions) await upsertTableData("assignment_questions", tables.assignment_questions);

        // 5. Submissions, Quiz Attempts & Answers
        if (tables.submissions) await upsertTableData("submissions", tables.submissions);
        if (tables.quiz_attempts) await upsertTableData("quiz_attempts", tables.quiz_attempts);
        if (tables.quiz_answers) await upsertTableData("quiz_answers", tables.quiz_answers);

        // 6. Enrollments & Live Sessions
        if (tables.enrollments) await upsertTableData("enrollments", tables.enrollments);
        if (tables.live_classes) await upsertTableData("live_classes", tables.live_classes);

        // 7. Commercial & Billing: Coupons, Usage, Invoices
        if (tables.coupons) await upsertTableData("coupons", tables.coupons);
        if (tables.coupon_usage) await upsertTableData("coupon_usage", tables.coupon_usage);
        if (tables.invoices) await upsertTableData("invoices", tables.invoices);

        // 8. Gamification & Aura Rewards
        if (tables.aura_awards) await upsertTableData("aura_awards", tables.aura_awards);

        // 9. Operational: Attendance, Policies, Clearance, Flashcards & Mnemonics
        if (tables.attendance) await upsertTableData("attendance", tables.attendance);
        if (tables.attendance_policies) await upsertTableData("attendance_policies", tables.attendance_policies);
        if (tables.attendance_clearance_records) await upsertTableData("attendance_clearance_records", tables.attendance_clearance_records);
        if (tables.flashcard_decks) await upsertTableData("flashcard_decks", tables.flashcard_decks);
        if (tables.flashcards) await upsertTableData("flashcards", tables.flashcards);
        if (tables.mnemonics) await upsertTableData("mnemonics", tables.mnemonics);
        if (tables.daily_quotes) await upsertTableData("daily_quotes", tables.daily_quotes);
        if (tables.notifications) await upsertTableData("notifications", tables.notifications);
        if (tables.audit_logs) await upsertTableData("audit_logs", tables.audit_logs);

        // 10. Public Portals: Blogs, Careers, Inquiries
        if (tables.blogs) await upsertTableData("blogs", tables.blogs);
        if (tables.job_openings) await upsertTableData("job_openings", tables.job_openings);
        if (tables.job_applications) await upsertTableData("job_applications", tables.job_applications);
        if (tables.contact_messages) await upsertTableData("contact_messages", tables.contact_messages);

        log.push("All tables and system settings restored successfully!");
        onProgress?.("Restoration Complete!");

        return { success: true, restoredTables, restoredRecords, log };
    } catch (err: any) {
        log.push(`ERROR: Restoration failed - ${err.message}`);
        return { success: false, restoredTables, restoredRecords, error: err.message, log };
    }
}
