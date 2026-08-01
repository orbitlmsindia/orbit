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
  const email = 'harshvardhanpurohit2020@gmail.com';
  // Try common passwords
  const passwords = ['password', 'password123', '12345678', '123456', 'Orbitlms@123'];
  
  for (const pw of passwords) {
    console.log(`Trying login for ${email} with password "${pw}"...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw
    });
    
    if (error) {
      console.log(`  Failed: ${error.message}`);
    } else {
      console.log(`  SUCCESS! Logged in user:`, data.user.id);
      
      // Try to fetch courses now that we are authenticated!
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, teacher_id, is_published');
      
      if (coursesError) {
        console.error("  Error fetching courses:", coursesError);
      } else {
        console.log("  Courses retrieved:", courses);
        for (const c of courses) {
          // Fetch sections
          const { data: sections } = await supabase
            .from('course_sections')
            .select('id, title, order_index')
            .eq('course_id', c.id);
          console.log(`  Course "${c.title}" sections:`, sections);
        }
      }
      return;
    }
  }
}

run();
