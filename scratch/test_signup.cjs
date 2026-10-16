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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const testEmail = `test_account_${Date.now()}@orbitlms.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Password123@!',
    options: {
      data: {
        role: 'student',
        full_name: 'Test Student'
      }
    }
  });

  console.log('SignUp result:', { user: data?.user?.id, session: !!data?.session, error });
}

test();
