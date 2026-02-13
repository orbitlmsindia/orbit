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

        // 1. Auth Check (Admin)
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role, institute_id')
            .eq('id', user.id)
            .single()

        if (userError || userData.role !== 'admin') {
            throw new Error('Unauthorized: Admin only')
        }

        // 2. Fetch Users
        const { data: users, error: fetchError } = await supabaseClient
            .from('users')
            .select('id, full_name, email, role, created_at')
            .eq('institute_id', userData.institute_id)

        if (fetchError) throw fetchError

        // 3. Convert to CSV
        const csvHeader = "ID,Full Name,Email,Role,Created At\n"
        const csvRows = users.map(u =>
            `${u.id},"${u.full_name}",${u.email},${u.role},${u.created_at}`
        ).join("\n")

        return new Response(csvHeader + csvRows, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="institute_users.csv"'
            },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
