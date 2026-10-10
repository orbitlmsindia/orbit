
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Supabase features will not work.');
}

// Create a dummy client or a real one depending on config
export const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder",
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Bypass navigator.locks to prevent "signal is aborted without reason" AbortError in browsers
            lock: async (_name, _acquireTimeout, fn) => {
                return await fn();
            },
        },
    }
);
