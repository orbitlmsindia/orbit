const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function list() {
  await supabase.auth.signInWithPassword({ email: 'admin@orbitlms.in', password: 'OrbitAdmin@2026' });
  const { data: courses } = await supabase.from('courses').select('id, title, is_published, credit_points, price, teacher_id');
  console.log('Courses count in DB:', courses.length);
  courses.forEach(c => console.log(`- [${c.id}] ${c.title} (published: ${c.is_published}, credits: ${c.credit_points}, price: ${c.price})`));

  const { data: certs } = await supabase.from('certificate_programs').select('*');
  console.log('\nCertificate Programs in DB:', certs.length);
  certs.forEach(cp => console.log(`- [${cp.id}] ${cp.title} (total_credits: ${cp.total_credits})`));
}
list().catch(console.error);
