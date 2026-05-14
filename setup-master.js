import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://byfzhkceuzstttdshzgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5Znpoa2NldXpzdHR0ZHNoemdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTU0MTUsImV4cCI6MjA4NTU5MTQxNX0.-GG_uX-n8z9HTiR53wb9pL8PPtEq1cmsPGP-7VAPoSI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupMaster() {
    console.log("Creating Master Admin via standard Auth Flow to prevent schema corruption...");

    const { data, error } = await supabase.auth.signUp({
        email: 'orbitadmin@orbit.com',
        password: 'orbit@123',
        options: {
            data: {
                full_name: 'Master Admin',
                role: 'super_admin',
            }
        }
    });

    if (error) {
        if (error.message.includes("already registered")) {
            console.log("User already registered natively. Executing login test...");
            const login = await supabase.auth.signInWithPassword({
                email: 'orbitadmin@orbit.com',
                password: 'orbit@123'
            });
            if (login.error) {
                console.error("Login test failed against existing user:", login.error.message);
            } else {
                console.log("Login test successful!");
            }
        } else {
            console.error("Signup Error:", error.message);
        }
    } else {
        console.log("Signup Successful!", data.user?.id);
    }
}

setupMaster();
