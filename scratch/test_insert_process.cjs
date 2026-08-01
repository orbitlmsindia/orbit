const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Mock implementation of isGoogleDriveUrl and getGoogleDriveEmbedUrl to match courseJsonImporter.ts
function isGoogleDriveUrl(url) {
  return url && url.includes('drive.google.com');
}
function getGoogleDriveEmbedUrl(url) {
  return url;
}

async function run() {
  try {
    const email = `test_teacher_${Date.now()}@gmail.com`;
    const password = 'password123';
    console.log(`Creating test user: ${email}...`);

    // 1. Sign up user in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Test Teacher',
          role: 'teacher'
        }
      }
    });

    if (authError) {
      console.error("Auth SignUp Error:", authError);
      return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created successfully! ID: ${userId}`);

    // Wait a brief moment for the trigger public.handle_new_user to create the public user profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ensure user has role 'teacher' in public.users (in case triggers didn't run or role defaults to student)
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (profileErr) {
      console.log(`Public profile check error: ${profileErr.message}. Attempting to insert...`);
      const { error: insErr } = await supabase
        .from('users')
        .insert([{ id: userId, email, full_name: 'Test Teacher', role: 'teacher' }]);
      if (insErr) {
        console.error("Failed to insert public user:", insErr);
        return;
      }
    } else {
      console.log(`Public profile exists:`, profile);
      if (profile.role !== 'teacher') {
        console.log(`Role is ${profile.role}, updating to teacher...`);
        await supabase.from('users').update({ role: 'teacher' }).eq('id', userId);
      }
    }

    // Now sign in to establish session
    console.log("Signing in with credentials...");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      console.error("Login Error:", loginError);
      return;
    }

    // 2. Try creating a course
    console.log("Creating test course...");
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert([{
        title: "Test Course via Script",
        description: "Verify RLS and inserts",
        is_published: false,
        teacher_id: userId
      }])
      .select("id")
      .single();

    if (courseError) {
      console.error("Course insertion error:", courseError);
      return;
    }

    const courseId = courseData.id;
    console.log(`Course created successfully! ID: ${courseId}`);

    // 3. Try creating a section
    console.log("Inserting section...");
    const { data: sectionData, error: sectionError } = await supabase
      .from("course_sections")
      .insert([{
        course_id: courseId,
        title: "Test Section",
        order_index: 0
      }])
      .select("id")
      .single();

    if (sectionError) {
      console.error("Section insertion error:", sectionError);
      return;
    }

    const sectionId = sectionData.id;
    console.log(`Section created successfully! ID: ${sectionId}`);

    // 4. Try creating a section content item
    console.log("Inserting section content item...");
    const { data: contentData, error: contentError } = await supabase
      .from("section_contents")
      .insert([{
        section_id: sectionId,
        title: "Test Video Lesson",
        type: "video",
        content_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        order_index: 0
      }])
      .select("id")
      .single();

    if (contentError) {
      console.error("Content insertion error:", contentError);
    } else {
      console.log(`Content created successfully! ID: ${contentData.id}`);
    }

    // Clean up
    console.log("Cleaning up test data...");
    await supabase.from("courses").delete().eq("id", courseId);
    console.log("Done!");

  } catch (err) {
    console.error("Script error:", err);
  }
}

run();
