import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    process.exit(1);
}

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
