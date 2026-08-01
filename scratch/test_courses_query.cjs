const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing courses query...");
    const res1 = await supabase.from('courses').select('id, title, is_published');
    console.log("Query 1 (simple):", res1.error ? res1.error.message : res1.data.length + " courses found.");

    const res2 = await supabase.from('courses').select('id, title, duration_weeks');
    console.log("Query 2 (duration_weeks):", res2.error ? res2.error.message : res2.data.length + " courses found.");

    const res3 = await supabase.from('courses').select('id, title, domain, credit_points');
    console.log("Query 3 (credit_points):", res3.error ? res3.error.message : res3.data.length + " courses found.");

    const res4 = await supabase.from('certificate_programs').select('*');
    console.log("Query 4 (certificate_programs):", res4.error ? res4.error.message : res4.data.length + " certs found.");
}

test();
