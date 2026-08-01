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
  const { data, error } = await supabase
    .from('course_sections')
    .select(`
        id, title,
        items:section_contents(id, title, type, content_url, content_text, order_index, created_at),
        assignments(id, title, type, points, description, order_index, created_at)
    `);
  
  if (error) {
    console.error("SELECT QUERY FAILED:", error);
  } else {
    console.log("SELECT QUERY SUCCESS:", data);
  }
}

run();
