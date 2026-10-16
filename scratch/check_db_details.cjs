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
  const { data: colleges, error: cErr } = await supabase.from('colleges').select('*');
  console.log("Colleges:", colleges, cErr);

  const { data: users, error: uErr } = await supabase.from('users').select('*').limit(10);
  console.log("Users (first 10):", users, uErr);
}

run();
