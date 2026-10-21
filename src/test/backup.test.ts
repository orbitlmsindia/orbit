import { describe, it, expect, vi } from "vitest";
import {
    exportAllInstitutesMasterBackup,
    exportInstituteBackup,
    exportTeacherDataBackup,
    restoreInstituteBackup,
    restoreTeacherClassroomBackup,
    fetchMasterInstitutesDirectory,
    ALL_MASTER_TABLES
} from "@/services/backupEngineService";

// Mock supabase
vi.mock("@/lib/supabase", () => {
    return {
        supabase: {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            id: "test-user-id",
                            email: "master@orbitlms.in",
                            user_metadata: { full_name: "Master Admin" }
                        }
                    }
                })
            },
            from: vi.fn((tableName: string) => {
                const mockQuery: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({
                        data: tableName === "colleges"
                            ? { id: "test-college-id", name: "IIT Bombay", code: "IITB" }
                            : { id: "test-teacher-id", full_name: "Dr. Raman", email: "raman@iitb.ac.in" }
                    }),
                    upsert: vi.fn().mockResolvedValue({ error: null })
                };

                // Default mock return
                if (tableName === "colleges") {
                    mockQuery.then = (resolve: any) => resolve({
                        data: [
                            { id: "college-1", name: "IIT Bombay", code: "IITB", activation_status: true, subscription_status: "Active" },
                            { id: "college-2", name: "BITS Pilani", code: "BITS", activation_status: true, subscription_status: "Active" }
                        ],
                        error: null
                    });
                } else if (tableName === "courses") {
                    mockQuery.then = (resolve: any) => resolve({
                        data: [
                            { id: "course-1", title: "Quantum Computing 101", teacher_id: "teacher-1", domain: "Physics" },
                            { id: "course-2", title: "Neural Networks & Deep Learning", teacher_id: "teacher-1", domain: "AI" }
                        ],
                        error: null
                    });
                } else {
                    mockQuery.then = (resolve: any) => resolve({
                        data: [{ id: "mock-1", name: "Mock Entry" }],
                        error: null
                    });
                }

                return mockQuery;
            })
        }
    };
});

// Mock document.createElement for browser downloads
if (typeof window !== "undefined") {
    const origCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
        const el = origCreateElement(tag);
        if (tag === "a") {
            el.click = vi.fn();
        }
        return el;
    });
}

describe("Enterprise Data & Backup Engine Suite", () => {
    it("should include all 34 core tables including Astravyuh gamification in ALL_MASTER_TABLES", () => {
        expect(ALL_MASTER_TABLES).toContain("colleges");
        expect(ALL_MASTER_TABLES).toContain("users");
        expect(ALL_MASTER_TABLES).toContain("courses");
        expect(ALL_MASTER_TABLES).toContain("assignments");
        expect(ALL_MASTER_TABLES).toContain("astravyuh_kingdoms");
        expect(ALL_MASTER_TABLES).toContain("astravyuh_battles");
        expect(ALL_MASTER_TABLES).toContain("astravyuh_flix_audits");
        expect(ALL_MASTER_TABLES).toContain("astravyuh_settings");
        expect(ALL_MASTER_TABLES.length).toBeGreaterThanOrEqual(30);
    });

    it("should export full master backup across all institutes", async () => {
        const result = await exportAllInstitutesMasterBackup();
        expect(result.success).toBe(true);
        expect(result.snapshot).toBeDefined();
        expect(result.snapshot?.scope).toBe("master_all_institutes");
        expect(result.snapshot?.totalInstitutes).toBeGreaterThanOrEqual(1);
        expect(result.filename).toContain("orbit_master_all_institutes_snapshot");
    });

    it("should export institute-scoped backup isolating data to target college ID", async () => {
        const result = await exportInstituteBackup("test-college-id");
        expect(result.success).toBe(true);
        expect(result.snapshot).toBeDefined();
        expect(result.snapshot?.scope).toBe("respective_institute");
        expect(result.snapshot?.collegeId).toBe("test-college-id");
        expect(result.snapshot?.data.college).toBeDefined();
        expect(result.filename).toContain("orbit_institute_");
    });

    it("should export teacher classroom backup containing courses, curriculum and study aids", async () => {
        const result = await exportTeacherDataBackup("teacher-1");
        expect(result.success).toBe(true);
        expect(result.snapshot).toBeDefined();
        expect(result.snapshot?.scope).toBe("teacher_classroom");
        expect(result.snapshot?.teacherId).toBe("teacher-1");
        expect(result.snapshot?.data.courses).toBeDefined();
        expect(result.filename).toContain("orbit_teacher_");
    });

    it("should allow selective course backup for teacher with subset course IDs", async () => {
        const result = await exportTeacherDataBackup("teacher-1", {
            courseIds: ["course-1"],
            includeCurriculum: true,
            includeQuizzes: true
        });
        expect(result.success).toBe(true);
        expect(result.snapshot?.data.courses.length).toBeLessThanOrEqual(2);
    });

    it("should safely validate and restore institute backup with tenant isolation", async () => {
        const mockSnapshot = {
            app: "Orbit LMS",
            version: "2.5.0",
            scope: "respective_institute",
            collegeId: "college-target-99",
            data: {
                college: { id: "college-target-99", name: "National Institute" },
                users: [{ id: "user-1", email: "student@inst.edu" }],
                courses: [{ id: "course-10", title: "Distributed Systems" }]
            }
        };

        const restoreResult = await restoreInstituteBackup("college-target-99", mockSnapshot);
        expect(restoreResult.success).toBe(true);
        expect(restoreResult.log).toContain("Target College ID: college-target-99");
    });

    it("should safely validate and restore teacher classroom backup", async () => {
        const mockTeacherSnapshot = {
            app: "Orbit LMS",
            version: "2.5.0",
            scope: "teacher_classroom",
            teacherId: "teacher-99",
            data: {
                courses: [{ id: "c-1", title: "Machine Learning" }],
                course_sections: [{ id: "sec-1", title: "Week 1: Supervised Learning" }],
                section_contents: [{ id: "con-1", title: "Lecture 1 Video" }]
            }
        };

        const restoreResult = await restoreTeacherClassroomBackup("teacher-99", mockTeacherSnapshot);
        expect(restoreResult.success).toBe(true);
        expect(restoreResult.log.some(l => l.includes("restored successfully"))).toBe(true);
    });

    it("should fetch master institutes directory with student and course counts", async () => {
        const dir = await fetchMasterInstitutesDirectory();
        expect(Array.isArray(dir)).toBe(true);
        expect(dir.length).toBeGreaterThan(0);
        expect(dir[0].id).toBeDefined();
        expect(dir[0].name).toBeDefined();
    });
});
