# Orbit Launchpad - Feature Implementation Plan

## Overview
This document outlines the implementation plan for 10 major feature enhancements to the Orbit Launchpad LMS.

## 1. Quiz Grading System Fix
**Status:** In Progress
**Priority:** High

### Issues:
- Quiz grades not updating in teacher/admin panel
- Quiz results not visible after submission
- Answer selection not working properly

### Solution:
- Fix QuizPlayer answer submission logic
- Update grade_quiz_attempt function to properly calculate and store scores
- Create QuizReview component for teachers
- Update CourseGrades to display quiz scores

### Files to Modify:
- `src/pages/student/QuizPlayer.tsx` - Fix answer submission
- `src/pages/teacher/AssignmentReview.tsx` - Add quiz review tab
- `supabase/migrations/update_quiz_and_assignments.sql` - Already created
- `src/pages/teacher/CourseGrades.tsx` - Display quiz scores

---

## 2. Notification System
**Status:** Not Started
**Priority:** High

### Requirements:
- Students receive notifications from admins, master admins, and enrolled course teachers
- Course-specific notifications (module updates, assignments, quizzes)
- Deadline reminders (2 days and 1 week before)
- Dashboard "Next Action" section showing upcoming deadlines

### Database Changes:
- Add `notification_type` enum: 'general', 'course', 'deadline'
- Add `course_id` to notifications table
- Add `priority` field (master_admin > admin > teacher)

### Files to Create/Modify:
- `supabase/migrations/notifications_system.sql`
- `src/pages/admin/Notifications.tsx` - Update to create course notifications
- `src/pages/teacher/Notifications.tsx` - Create for teacher notifications
- `src/components/NotificationCenter.tsx` - Shared component
- `src/pages/student/Dashboard.tsx` - Add deadline section

---

## 3. Dynamic Course Content Management
**Status:** Partially Complete
**Priority:** Medium

### Current State:
- Teachers can add quizzes via CourseDetail
- Need to add manual assignments

### Enhancement:
- Add "Assignment" option in AddContentDialog
- Support file upload requirements configuration

### Files to Modify:
- `src/pages/teacher/CourseDetail.tsx` - Already has quiz support, add assignment

---

## 4. File Upload Limits
**Status:** Database Ready
**Priority:** High (Security)

### Requirements:
- Teacher sets allowed file types per assignment
- Teacher sets max file size (MB)
- Validation on client and server

### Implementation:
- Database columns added in migration
- Update AssignmentCreate UI
- Add validation in submission upload

### Files to Modify:
- `src/pages/teacher/AssignmentCreate.tsx`
- `src/pages/student/AssignmentSubmit.tsx` (create if not exists)
- Add file validation utility

---

## 5. Review Section Split
**Status:** Not Started
**Priority:** High

### Requirements:
- Tab 1: Quiz Review - View all quiz attempts and scores
- Tab 2: Assignment Review - Grade manual submissions

### Files to Modify:
- `src/pages/teacher/AssignmentReview.tsx` - Add tabs, create quiz review section

---

## 6. Student Management Portal
**Status:** Not Started
**Priority:** Medium

### Requirements:
- Download student reports by date range
- Overall report card with assignments, attendance, grades
- Export as PDF/CSV

### Files to Create:
- `src/pages/teacher/StudentManagement.tsx`
- `src/utils/reportGenerator.ts`
- `src/components/ReportCard.tsx`

---

## 7. Report Card Branding
**Status:** Not Started
**Priority:** Low

### Requirements:
- Institute name: JIET College
- Platform: Orbit Launchpad
- Contact: ceo@sintechnologies.in

### Files to Modify:
- `src/components/ReportCard.tsx` - Add header/footer

---

## 8. Attendance Bulk Upload
**Status:** Not Started
**Priority:** Medium

### Requirements:
- CSV format: student_name, date, status, course_name
- Admin and teacher access
- Course selection dropdown

### Database Changes:
- Create `attendance` table

### Files to Create:
- `supabase/migrations/attendance_table.sql`
- `src/pages/admin/AttendanceUpload.tsx`
- `src/pages/teacher/AttendanceUpload.tsx`

---

## 9. Calendar System
**Status:** Not Started
**Priority:** Medium

### Requirements:
- Student view: Course-specific calendar + General calendar
- Teacher view: Admin updates + own course events
- Master admin: Add global events
- Admin: Add events with visibility control

### Database Changes:
- Create `calendar_events` table
- Fields: title, description, date, type, visibility, created_by, course_id

### Files to Create:
- `supabase/migrations/calendar_events.sql`
- `src/pages/student/Calendar.tsx`
- `src/pages/teacher/Calendar.tsx`
- `src/pages/admin/Calendar.tsx`

---

## 10. Settings & Theme System
**Status:** Not Started
**Priority:** Low

### Requirements:
- Theme toggle: "Uranus Island" (light) / "Cosmic Ring" (dark)
- Daily quote system with priority (master_admin > admin > teacher)
- Quote visible to all students

### Database Changes:
- Create `daily_quotes` table
- Add `theme_preference` to users table

### Files to Create/Modify:
- `supabase/migrations/settings_and_quotes.sql`
- `src/pages/student/Settings.tsx`
- `src/pages/teacher/Settings.tsx`
- `src/pages/admin/QuoteManagement.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/components/DailyQuote.tsx`

---

## Implementation Order

### Phase 1 (Critical - Start Now)
1. Fix Quiz Grading System
2. Split Review Section (Quiz + Assignment tabs)
3. File Upload Limits

### Phase 2 (High Priority)
4. Notification System
5. Student Management Portal

### Phase 3 (Medium Priority)
6. Attendance Bulk Upload
7. Calendar System

### Phase 4 (Enhancement)
8. Settings & Theme System
9. Report Card Branding
10. Dynamic Course Content (complete)

---

## Notes
- All features require proper RLS policies in Supabase
- Testing required after each phase
- UI/UX should maintain brand consistency
