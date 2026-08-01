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

async function run() {
  // Query all courses (without session since we don't have RLS on select if we use a specific query, wait - select on courses list has:
  // (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
  // Let's see if we get any courses back.
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, teacher_id, is_published');
  
  if (error) {
    console.error("Courses Fetch Error:", error);
  } else {
    console.log("All courses retrieved:", courses);
  }
}

run();
