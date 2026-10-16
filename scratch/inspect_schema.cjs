const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/', {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log('Top keys:', Object.keys(data));
  if (data.definitions) {
    console.log('Definitions:', Object.keys(data.definitions).filter(k => 
      ['courses', 'attendance', 'enrollments', 'certificate_programs'].includes(k)
    ));
    for (const k of ['courses', 'attendance', 'enrollments', 'certificate_programs']) {
      if (data.definitions[k]) {
        console.log(`\nTable ${k}:`, Object.keys(data.definitions[k].properties));
      }
    }
  }
}
inspect().catch(console.error);
