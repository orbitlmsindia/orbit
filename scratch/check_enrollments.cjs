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
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      student_id,
      status,
      transaction_id,
      courses(title),
      users!student_id(full_name, email)
    `);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("All Enrollments:");
    for (const e of enrollments) {
      console.log(`- Student: ${e.users?.full_name} (${e.users?.email})`);
      console.log(`  Course: ${e.courses?.title} (ID: ${e.course_id})`);
      console.log(`  Status: ${e.status}, Txn ID: ${e.transaction_id}`);
    }
  }
}

run();
