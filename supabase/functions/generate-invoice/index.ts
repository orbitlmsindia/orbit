import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb, StandardFonts } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts"

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

        // 1. Verify Master Admin Role
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData.role !== 'super_admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin Only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse Request Data
        const { collegeId, courseId, costPerStudent } = await req.json()
        if (!collegeId || costPerStudent === undefined) throw new Error('Missing require fields')

        // 3. Fetch Details
        const { data: college } = await supabaseAdmin.from('colleges').select('*').eq('id', collegeId).single()
        let studentCount = 0;
        let courseName = 'All Courses (Institution Wide)';

        if (courseId) {
            const { data: course } = await supabaseAdmin.from('courses').select('title').eq('id', courseId).single()
            if (course) courseName = course.title;
            const { count } = await supabaseAdmin.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId)
            studentCount = count || 0;
        } else {
            // Bill entire institution
            const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'student')
            studentCount = count || 0;
        }

        const totalAmount = studentCount * parseFloat(costPerStudent);
        const invoiceNumber = `INV-${new Date().getTime().toString().slice(-6)}-${college.name.substring(0,3).toUpperCase()}`

        // 4. Generate PDF
        const pdfDoc = await PDFDocument.create()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const page = pdfDoc.addPage([595, 842]) // A4
        const { width, height } = page.getSize()

        page.drawText('ORBIT LMS SAAS', { x: 50, y: height - 50, size: 24, font: fontBold, color: rgb(0.1, 0.1, 0.4) })
        page.drawText(`INVOICE: ${invoiceNumber}`, { x: 50, y: height - 80, size: 14, font: fontBold })
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: width - 150, y: height - 80, size: 12, font })

        page.drawText(`Billed To:`, { x: 50, y: height - 120, size: 12, font: fontBold })
        page.drawText(`${college.name}`, { x: 50, y: height - 140, size: 12, font })
        page.drawText(`${college.email || 'N/A'}`, { x: 50, y: height - 155, size: 10, font })
        page.drawText(`${college.contact_person || 'N/A'}`, { x: 50, y: height - 170, size: 10, font })

        page.drawText(`Summary`, { x: 50, y: height - 220, size: 14, font: fontBold })
        page.drawText(`Scope: ${courseName}`, { x: 50, y: height - 250, size: 12, font })
        page.drawText(`Student Enrolled Count: ${studentCount}`, { x: 50, y: height - 270, size: 12, font })
        page.drawText(`Rate per Student: $${parseFloat(costPerStudent).toFixed(2)}`, { x: 50, y: height - 290, size: 12, font })
        
        page.drawText(`TOTAL DUE: $${totalAmount.toFixed(2)}`, { x: 50, y: height - 340, size: 18, font: fontBold, color: rgb(0.8, 0.1, 0.1) })

        page.drawText(`Thank you for choosing Orbit.`, { x: 50, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) })

        const pdfBytes = await pdfDoc.save()

        // 5. Upload PDF
        const fileName = `${collegeId}/${invoiceNumber}.pdf`
        const { error: uploadError } = await supabaseAdmin.storage.from('invoices').upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
        })

        if (uploadError) throw new Error(`PDF Upload Failed: ${uploadError.message}`)

        const { data: publicUrlData } = supabaseAdmin.storage.from('invoices').getPublicUrl(fileName)

        // 6. DB Record
        const { data: invoiceRecord, error: dbError } = await supabaseAdmin.from('invoices').insert({
            college_id: collegeId,
            course_id: courseId || null,
            invoice_number: invoiceNumber,
            student_count: studentCount,
            cost_per_student: costPerStudent,
            total_amount: totalAmount,
            status: 'pending',
            pdf_url: publicUrlData.publicUrl
        }).select().single()

        if (dbError) throw new Error(`DB Insert Error: ${dbError.message}`)

        return new Response(JSON.stringify({ success: true, invoice: invoiceRecord }), {
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
