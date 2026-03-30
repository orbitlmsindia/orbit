import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Verify Master Admin Role (Zero Trust)
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData.role !== 'super_admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: SaaS Master Admin Only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse Request Data
        const { collegeName, shortName, contactPerson, email } = await req.json()
        if (!collegeName || !shortName) throw new Error('Missing require fields')

        const collegeEmail = email || `contact@${shortName.toLowerCase()}.edu`
        const adminUsername = `admin_${shortName.toLowerCase()}`
        const adminEmail = `${adminUsername}@orbit-lms.internal` 
        // Supabase requires email format, the login UI maps usernames to this email structure invisibly or they login with it.

        // 3. Insert College Entry (Gets unique UUID automatically)
        const { data: newCollege, error: collegeError } = await supabaseAdmin
            .from('colleges')
            .insert({
                name: collegeName,
                email: collegeEmail,
                contact_person: contactPerson || 'College Administrator',
                phone: 'Pending',
                subscription_status: 'trial',
                activation_status: true
            })
            .select()
            .single()

        if (collegeError) throw new Error(`College Creation Failed: ${collegeError.message}`)

        // 4. Generate Strong Password
        const strongPassword = Math.random().toString(36).slice(-6) + "Xy9#"

        // 5. Create Auth Admin User mapped to College
        const { data: newAdminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: strongPassword,
            email_confirm: true,
            user_metadata: {
                full_name: `${collegeName} Admin`,
                role: 'admin',
                college_id: newCollege.id
            }
        })

        if (adminError) {
            // Rollback college creation securely (Soft Delete or Hard Delete)
            await supabaseAdmin.from('colleges').delete().eq('id', newCollege.id)
            throw new Error(`Admin Provisioning Failed: ${adminError.message}`)
        }

        // 6. Provide Audit Log Recording 
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: user.id,
            action: 'CREATE_COLLEGE',
            entity_type: 'colleges',
            entity_id: newCollege.id,
            details: { college_name: collegeName, admin_email: adminEmail }
        })

        // Return credentials 
        return new Response(JSON.stringify({ 
            success: true, 
            college: newCollege,
            credentials: {
                loginId: adminUsername, // They login with this ShortName map ideally
                email: adminEmail, 
                password: strongPassword
            }
        }), {
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
