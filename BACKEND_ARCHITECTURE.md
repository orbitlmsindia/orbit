# Supabase LMS Backend Architecture

This document describes the backend architecture for the Multi-Institute Learning Management System.

## 1. System Overview

The system is built on **Supabase**, leveraging PostgreSQL for the relational database, Supabase Auth for identity management, and RLS (Row Level Security) for robust data isolation.

### Key Tenets
1.  **Multi-Tenancy**: Every data row is scoped to an `institute_id`. Strict RLS policies ensure cross-institute data isolation.
2.  **Role-Based Access**: Three primary roles: `Admin`, `Teacher`, `Student`. Permissions are enforced at the database level.
3.  **Serverless**: High-compute tasks (bulk upload, auto-grading) are offloaded to Supabase Edge Functions.

## 2. Database Schema

The database is normalized to 3NF standards. The complete schema is available in `supabase/schema.sql`.

### Core Tables
*   **Institutes**: Root entity for multi-tenancy.
*   **Users**: Extension of `auth.users`, storing `role` and `institute_id`.
*   **Courses**: Owned by institutes, managed by teachers.
*   **Enrollments**: Link between Students and Courses.
*   **Content**: Hierarchical structure: Course -> Sections -> Contents (Video/PDF).

### Assignment & Quiz Models
*   **Assignments**: Can be `manual` (file upload) or `quiz`.
*   **Submission flow**:
    *   **Manual**: Student uploads file -> Teacher reviews -> Grade entered.
    *   **Quiz**: Student starts attempt -> Timer checked -> Answers submitted -> Auto-graded via Edge Function/RPC.

## 3. Security & RLS Policies

Row Level Security is the primary defense mechanism. 
*   **Helper Functions**: `get_my_institute_id()` allows us to encapsulate the tenant ID lookup.
*   **Common Pattern**: 
    ```sql
    USING (institute_id = get_my_institute_id())
    ```
*   **Role Logic**:
    *   *Admins*: `get_my_role() = 'admin'` -> Access everything in their institute.
    *   *Teachers*: Access courses where `teacher_id = auth.uid()`.
    *   *Students*: Access courses where `id IN (select course_id from enrollments where student_id = auth.uid())`.

## 4. Edge Functions

 Located in `supabase/functions/`.

1.  **`bulk-upload-users`**:
    *   **Input**: JSON array of users (email, role, name).
    *   **Process**: Verifies Admin role. Uses `supabase.auth.admin.createUser` to generate users without email verification (pre-verified). Generates random passwords.
    *   **Output**: JSON array including the *generated passwords* for distribution.

2.  **`export-credentials`**:
    *   **Process**: Generates a CSV dump of all users in the institute for Admin records.

3.  **`submit-quiz` (RPC Function)**:
    *   Located in SQL schema as `submit_quiz`.
    *   **Logic**: Accepts answers map. comparing against `correct_answer` in `assignment_questions` (which are hidden from students via RLS). Calculates score atomically.

## 5. Storage Strategy

Buckets required:
1.  **`course-content`**:
    *   *Public*: No (or restricted).
    *   *Policy*: Teachers can upload. Enrolled students can download.
2.  **`submissions`**:
    *   *Public*: No.
    *   *Policy*: Students upload to their own folder (`/assignment_id/student_id/`). Teachers can read all folders for their assignments.

## 6. Scalability & Edge Cases

*   **indexes**: Added on frequrntly queried columns (`institute_id`, `student_id`, `course_id`).
*   **Quiz Timer**: 
    *   *Edge Case*: User modifies client-side timer. 
    *   *Solution*: `quiz_attempts` table stores `start_time`. The submission RPC checks `NOW() - start_time > time_limit` before accepting answers.
*   **Isolation**: Even if a user alters the frontend to request another institute's data, RLS policies will return 0 rows.

## 7. Next Steps

1.  Run `supabase start` locally to verify schema.
2.  Apply `supabase/schema.sql` via Supabase Dashboard or CLI.
3.  Deploy Edge Functions using `supabase functions deploy`.
4.  Configure Storage Buckets with RLS policies mirroring the database logic.
