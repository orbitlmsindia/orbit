const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const accounts = [
  { role: 'super_admin', email: 'master@orbitlms.in', password: 'OrbitMaster@2026', expectedRoute: '/master' },
  { role: 'admin', email: 'admin@orbitlms.in', password: 'OrbitAdmin@2026', expectedRoute: '/admin' },
  { role: 'teacher', email: 'teacher@orbitlms.in', password: 'OrbitTeacher@2026', expectedRoute: '/teacher' },
  { role: 'finance', email: 'finance@orbitlms.in', password: 'OrbitFinance@2026', expectedRoute: '/finance' },
  { role: 'student', email: 'student@orbitlms.in', password: 'OrbitStudent@2026', expectedRoute: '/student' },
];

async function verify() {
  console.log("=== VERIFYING ALL 5 CREDENTIALS ===");
  for (const acc of accounts) {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });

    if (error) {
      console.error(`❌ FAILED login for ${acc.email}:`, error.message);
      continue;
    }

    const { data: userData, error: uErr } = await supabase
      .from('users')
      .select('role, status, college_id, full_name')
      .eq('id', data.user.id)
      .single();

    if (uErr) {
      console.error(`❌ FAILED fetching profile for ${acc.email}:`, uErr.message);
      continue;
    }

    console.log(`✅ [${acc.role.toUpperCase()}] Login OK:`);
    console.log(`   Email: ${acc.email}`);
    console.log(`   Full Name: ${userData.full_name}`);
    console.log(`   Database Role: ${userData.role}`);
    console.log(`   Status: ${userData.status}`);
    console.log(`   College ID: ${userData.college_id}`);
    console.log(`   Expected Route: ${acc.expectedRoute}`);
  }
}

verify();
