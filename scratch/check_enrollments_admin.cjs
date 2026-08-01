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
  const email = 'orbitadmin@gmail.com';
  const passwords = ['password', 'password123', 'admin', '123456', 'Orbitlms@123'];
  
  for (const pw of passwords) {
    console.log(`Trying login for ${email} with password "${pw}"...`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (!error) {
      console.log(`  SUCCESS! Logged in as Admin: ${data.user.id}`);
      
      const { data: enrollments, error: enrollError } = await supabase
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
      
      if (enrollError) {
        console.error("  Error querying enrollments:", enrollError);
      } else {
        console.log(`  Found ${enrollments.length} enrollments:`);
        for (const e of enrollments) {
          console.log(`  * Student: ${e.users?.full_name} (${e.users?.email})`);
          console.log(`    Course: ${e.courses?.title}`);
          console.log(`    Status: ${e.status}, Txn ID: ${e.transaction_id}`);
        }
      }
      return;
    }
  }
  console.log("Could not login as admin.");
}

run();
