import { supabase } from '../src/lib/supabase.ts';

async function check() {
  const { data: users } = await supabase.from('users').select('id, email, role, full_name');
  console.log("All registered users:", users);
}

check();
