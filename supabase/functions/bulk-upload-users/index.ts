import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Check if user is Admin
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role, institute_id')
            .eq('id', user.id)
            .single()

        if (userError || userData.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Parse CSV Data from Request Body
        const { users } = await req.json() // Expecting JSON array of { email, full_name, role } for simplicity
        if (!users || !Array.isArray(users)) {
            throw new Error('Invalid body, expected "users" array')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const results = []

        // 3. Create Users
        for (const u of users) {
            const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!" // Generate secure random password

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: u.email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: u.full_name,
                    role: u.role, // 'teacher' or 'student'
                    institute_id: userData.institute_id
                }
            })

            if (createError) {
                results.push({ email: u.email, status: 'error', error: createError.message })
            } else {
                results.push({
                    email: u.email,
                    status: 'success',
                    id: newUser.user.id,
                    password: tempPassword // Return this ONCE for the admin to distribute
                })
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
