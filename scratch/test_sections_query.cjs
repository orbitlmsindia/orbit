const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing courses with sections and contents query...");
    const res = await supabase
        .from('courses')
        .select(`
            id,
            title,
            credit_points,
            course_sections(
                id,
                title,
                section_contents(id)
            )
        `);

    if (res.error) {
        console.error("Error:", res.error.message);
    } else {
        console.log("Courses fetched:", res.data.length);
        res.data.forEach(c => {
            console.log(`Course: ${c.title}, Sections: ${c.course_sections?.length || 0}`);
        });
    }
}

test();
