# 🚀 Quick Start - Notification System Setup

## ✅ MIGRATION FILE FIXED!

The `notification_system.sql` migration has been updated to:
1. **Create the notifications table** if it doesn't exist
2. **Add new columns** to support the enhanced notification system
3. **Create RPC functions** for automation
4. **Set up RLS policies** for security
5. **Create database views** for easy querying

---

## 📋 HOW TO RUN THE MIGRATION

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the entire contents of `supabase/migrations/notification_system.sql`
5. Paste into the SQL editor
6. Click **"Run"** or press `Ctrl+Enter`
7. ✅ You should see "Success. No rows returned"

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
cd "c:/Users/sb info/Desktop/learn-foundation-main/learn-foundation-main"
supabase db push
```

---

## ✅ WHAT THE MIGRATION DOES

### 1. Creates/Updates Notifications Table
- `id` - Unique identifier
- `user_id` - Who receives the notification
- `title` - Notification title
- `message` - Notification content
- `notification_type` - general, course, deadline, assignment, quiz, module
- `course_id` - Link to specific course (optional)
- `assignment_id` - Link to assignment/quiz (optional)
- `priority` - 1 (teacher), 2 (admin), 3 (master_admin)
- `sender_role` - Who sent it
- `visibility` - all, students, teachers, specific_course
- `is_read` - Read status
- `read_at` - When it was read
- `created_at` - When it was created
- `sender_id` - Who sent it

### 2. Creates 3 RPC Functions
- **`notify_course_students()`** - Send to all enrolled students
- **`send_deadline_reminders()`** - Automated deadline reminders
- **`mark_notification_read()`** - Mark as read

### 3. Creates Database View
- **`upcoming_deadlines`** - Shows deadlines within 14 days

### 4. Sets Up Security
- RLS policies ensure users only see their own notifications
- Teachers/admins can create notifications
- Users can update their own notifications

---

## 🧪 TEST THE MIGRATION

After running the migration, test it with these queries:

### 1. Check if table exists:
```sql
SELECT * FROM notifications LIMIT 5;
```

### 2. Check if columns were added:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications';
```

### 3. Test the RPC function:
```sql
-- Replace with actual IDs from your database
SELECT notify_course_students(
    'YOUR_COURSE_ID'::uuid,
    'Test Notification',
    'This is a test message',
    'course',
    'YOUR_USER_ID'::uuid,
    'teacher',
    1
);
```

### 4. Check the view:
```sql
SELECT * FROM upcoming_deadlines;
```

---

## 🎯 AFTER MIGRATION SUCCESS

Once the migration runs successfully:

1. ✅ **Admin Notifications** will work at `/admin/notifications`
2. ✅ **Teacher Notifications** will work at `/teacher/notifications`
3. ✅ **Student Dashboard** will show Next Actions and notifications
4. ✅ **Deadline reminders** can be automated with a cron job

---

## 🔧 OPTIONAL: Set Up Automated Reminders

After the migration, you can set up automated deadline reminders:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reminders at 8 AM
SELECT cron.schedule(
    'send-deadline-reminders',
    '0 8 * * *',
    $$SELECT send_deadline_reminders();$$
);

-- Check scheduled jobs
SELECT * FROM cron.job;
```

---

## ❌ TROUBLESHOOTING

### Error: "relation notifications already exists"
✅ **This is OK!** The migration uses `CREATE TABLE IF NOT EXISTS`, so it won't fail if the table exists.

### Error: "column already exists"
✅ **This is OK!** The migration uses `ADD COLUMN IF NOT EXISTS`, so it won't fail if columns exist.

### Error: "foreign key constraint"
❌ **Check that these tables exist:**
- `auth.users`
- `courses`
- `assignments`

### Error: "permission denied"
❌ **Make sure you're running as a superuser or have proper permissions**

---

## 📊 VERIFY EVERYTHING WORKS

### 1. Check Table Structure:
```sql
\d notifications
```

### 2. Check Indexes:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications';
```

### 3. Check Functions:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_name LIKE '%notif%';
```

### 4. Check Policies:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';
```

---

## ✨ YOU'RE DONE!

After running the migration successfully:
- 🎉 The notification system is fully set up
- 🎉 All RPC functions are ready
- 🎉 Security policies are in place
- 🎉 The frontend will work immediately

**Next:** Test the system by sending a notification from the admin or teacher dashboard!

---

**Migration File:** `supabase/migrations/notification_system.sql`
**Status:** ✅ Ready to run
**Last Updated:** February 11, 2026
