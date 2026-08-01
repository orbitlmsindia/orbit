const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // 1. Fetch courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, teacher_id');

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      return;
    }

    console.log(`Found ${courses.length} courses:`);
    for (const c of courses) {
      console.log(`- Course: ${c.title} (ID: ${c.id})`);
      
      // Fetch sections for this course
      const { data: sections, error: sectionsError } = await supabase
        .from('course_sections')
        .select('id, title, order_index')
        .eq('course_id', c.id);

      if (sectionsError) {
        console.error(`  Error fetching sections for ${c.title}:`, sectionsError);
      } else {
        console.log(`  Found ${sections.length} sections:`);
        for (const s of sections) {
          console.log(`    * [Section] ${s.title} (ID: ${s.id}, Order: ${s.order_index})`);
          
          // Fetch contents
          const { data: contents } = await supabase
            .from('section_contents')
            .select('id, title, type')
            .eq('section_id', s.id);
          
          if (contents) {
            console.log(`      Contents (${contents.length}):`, contents.map(ci => `${ci.title} (${ci.type})`));
          }
        }
      }
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
