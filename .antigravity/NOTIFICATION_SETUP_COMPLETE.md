# 🎯 COMPLETE NOTIFICATION SYSTEM SETUP GUIDE

## ✅ CURRENT STATUS

### What's Already Done:
1. ✅ **Migration File Fixed** - `notification_system.sql` ready to run
2. ✅ **Teacher Sidebar** - Notifications link added
3. ✅ **Admin Notifications** - Shows real data from database
4. ✅ **Student Dashboard** - Fetches and displays real notifications
5. ✅ **Teacher Notifications Page** - Complete implementation
6. ✅ **RPC Functions** - All 3 functions ready

---

## 🚀 STEP-BY-STEP SETUP

### Step 1: Run the Database Migration ⚠️ **MUST DO FIRST**

**This is the most important step!** Without this, notifications won't work at all.

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click **SQL Editor** in the left sidebar

2. **Create New Query**
   - Click **"New Query"** button

3. **Copy Migration File**
   - Open: `supabase/migrations/notification_system.sql`
   - Select ALL (Ctrl+A)
   - Copy (Ctrl+C)

4. **Paste and Run**
   - Paste into Supabase SQL Editor
   - Click **"Run"** or press Ctrl+Enter
   - Wait for "Success. No rows returned"

5. **Verify Success**
   Run this query to check:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'notifications';
   ```
   Should return 1 row.

---

### Step 2: Test the System

#### A. Test as Admin (Send Notification to Course)

1. **Login as Admin**
   - Go to `/admin/notifications`

2. **Create Notification**
   - Click "Create Notification" button
   - **Audience:** Select "Specific Courses"
   - **Select Course:** Check one or more courses
   - **Type:** Choose "Announcement"
   - **Title:** "Test Notification"
   - **Message:** "This is a test notification to verify the system works"
   - Click **"Send Notification"**

3. **Verify**
   - Should see success toast
   - Check "Notification History" tab
   - Should see the notification listed

#### B. Test as Teacher (Send Course Notification)

1. **Login as Teacher**
   - Check sidebar - "Notifications" link should be visible
   - Click "Notifications"

2. **Send Notification**
   - **Select Course:** Choose one of your courses
   - **Type:** Choose "Course Update"
   - **Title:** "Course Update Test"
   - **Message:** "Testing teacher notifications"
   - Click **"Send Notification"**

3. **Verify**
   - Should see success message with count
   - Check "Recent Notifications" section
   - Should see your notification

#### C. Test as Student (Receive Notifications)

1. **Login as Student**
   - Make sure you're enrolled in the course where notification was sent
   - Go to `/student` (dashboard)

2. **Check Notifications Card**
   - Look at right sidebar
   - Should see "Notifications" card
   - Should see the notification with:
     - Blue dot (unread indicator)
     - Title
     - Message
     - Date

3. **Check Next Actions**
   - Should see "Next Actions" card above notifications
   - Shows upcoming deadlines (if any)

---

## 🔍 TROUBLESHOOTING

### Issue 1: "No notifications showing for students"

**Possible Causes:**
1. Migration not run
2. Student not enrolled in the course
3. Notification sent to wrong course

**Solution:**
```sql
-- Check if notifications exist
SELECT * FROM notifications WHERE user_id = 'STUDENT_USER_ID';

-- Check if student is enrolled
SELECT * FROM enrollments WHERE student_id = 'STUDENT_USER_ID';
```

### Issue 2: "Error when sending notification"

**Possible Causes:**
1. RPC function not created
2. User not authenticated
3. Invalid course ID

**Solution:**
```sql
-- Check if RPC function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'notify_course_students';

-- Test RPC function manually
SELECT notify_course_students(
    'COURSE_ID'::uuid,
    'Test',
    'Test message',
    'course',
    'USER_ID'::uuid,
    'teacher',
    1
);
```

### Issue 3: "Notifications table doesn't exist"

**Solution:**
- Run the migration file again
- Make sure you're in the correct Supabase project

### Issue 4: "Permission denied"

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- If missing, run the migration again
```

---

## 📊 VERIFICATION CHECKLIST

After setup, verify these:

- [ ] **Database:**
  - [ ] `notifications` table exists
  - [ ] Table has all columns (id, user_id, title, message, notification_type, etc.)
  - [ ] 4 indexes created
  - [ ] 3 RPC functions exist
  - [ ] 3 RLS policies exist
  - [ ] `upcoming_deadlines` view exists

- [ ] **Frontend:**
  - [ ] Teacher sidebar shows "Notifications" link
  - [ ] Teacher notifications page loads at `/teacher/notifications`
  - [ ] Admin notifications page loads at `/admin/notifications`
  - [ ] Student dashboard shows notifications card

- [ ] **Functionality:**
  - [ ] Admin can send to "All Users"
  - [ ] Admin can send to "Specific Courses"
  - [ ] Teacher can send to their courses
  - [ ] Students receive notifications
  - [ ] Unread indicator (blue dot) shows
  - [ ] Notification history displays correctly

---

## 🎯 QUICK TEST SCRIPT

Run this in Supabase SQL Editor to test everything:

```sql
-- 1. Check table exists
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'notifications';

-- 2. Check columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 3. Check RPC functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('notify_course_students', 'send_deadline_reminders', 'mark_notification_read');

-- 4. Check RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'notifications';

-- 5. Check view
SELECT COUNT(*) as view_exists 
FROM information_schema.views 
WHERE table_name = 'upcoming_deadlines';

-- 6. Test notification creation (replace UUIDs with real ones)
INSERT INTO notifications (user_id, title, message, notification_type)
VALUES ('YOUR_USER_ID'::uuid, 'Test', 'Test message', 'general')
RETURNING *;
```

---

## 📝 EXPECTED RESULTS

### After Migration:
```
✅ notifications table created
✅ 4 indexes created
✅ 3 RPC functions created
✅ 3 RLS policies created
✅ 1 view created
```

### After Sending Notification:
```
✅ Success toast appears
✅ Notification count shown (e.g., "Sent to 5 students")
✅ Appears in notification history
✅ Students see it in their dashboard
```

### Student Dashboard:
```
✅ Notifications card shows unread notifications
✅ Blue dot appears for unread
✅ Title, message, and date displayed
✅ Next Actions shows upcoming deadlines
```

---

## 🆘 STILL NOT WORKING?

### Check These:

1. **Migration Status:**
   ```sql
   SELECT * FROM notifications LIMIT 1;
   ```
   If error: "relation notifications does not exist" → Run migration

2. **User Authentication:**
   - Make sure you're logged in
   - Check browser console for errors

3. **Course Enrollment:**
   ```sql
   SELECT e.*, c.title 
   FROM enrollments e 
   JOIN courses c ON e.course_id = c.id 
   WHERE e.student_id = 'YOUR_USER_ID';
   ```

4. **Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

---

## 📞 COMMON ERROR MESSAGES

| Error | Cause | Solution |
|-------|-------|----------|
| "relation notifications does not exist" | Migration not run | Run migration file |
| "column status does not exist" | Old migration file | Use updated migration (status removed) |
| "function notify_course_students does not exist" | RPC not created | Run migration file |
| "permission denied" | RLS policies missing | Run migration file |
| "No notifications showing" | Not enrolled or none sent | Check enrollment, send test notification |

---

## ✅ FINAL CHECKLIST

Before considering it "working":

1. [ ] Migration executed successfully
2. [ ] Admin can send notification to course
3. [ ] Teacher can send notification to their course
4. [ ] Student enrolled in course receives notification
5. [ ] Notification shows in student dashboard
6. [ ] Unread indicator (blue dot) appears
7. [ ] Notification history shows in admin/teacher pages
8. [ ] No console errors in browser

---

**Status:** Ready to test
**Next Step:** Run the migration in Supabase SQL Editor
**Documentation:** See `.antigravity/` folder for detailed guides

**Once migration is run, the entire system will work!** 🚀
