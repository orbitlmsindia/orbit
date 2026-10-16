const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@orbitlms.in',
    password: 'OrbitAdmin@2026'
  });
  if (authErr) {
    console.error('Failed to login:', authErr);
    return;
  }
  console.log('Admin logged in:', auth.user.id);

  // 1. Fetch Students
  const { data: students } = await supabase.from('users').select('id, full_name, email').eq('role', 'student');
  console.log('Students count:', students.length);

  // 2. Fetch Published Courses
  const { data: courses } = await supabase.from('courses').select('id, title').eq('is_published', true);
  console.log('Published courses:', courses.length);

  const mainStudent = students.find(s => s.email === 'student@orbitlms.in');
  console.log('Main student (student@orbitlms.in):', mainStudent?.id, mainStudent?.full_name);

  // We want dates in the last 14 days up to today (October 16, 2026)
  // E.g., Oct 03 to Oct 16, 2026
  const dates = [
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-12',
    '2026-10-13',
    '2026-10-14',
    '2026-10-15',
    '2026-10-16'
  ];

  // Primary courses for main student
  const studentCourseIds = [
    '3efc7761-42bc-42f7-820b-f9604da70246', // cpp
    '1a08b4fd-af09-4583-8d4d-07cba0ff2cb0', // Mern
    '751855ed-c7a5-47a0-a428-e2d3e7e7bda6', // dsa
    '51988ca9-4d5e-48e6-a4cc-ba968c1985cf'  // Advance Engineering
  ];

  // Specific planned attendance for student@orbitlms.in
  // 10 sessions: 8 present, 1 late, 1 absent -> 85%
  const studentRecords = [
    { course_id: studentCourseIds[0], date: '2026-10-05', status: 'present' },
    { course_id: studentCourseIds[0], date: '2026-10-07', status: 'present' },
    { course_id: studentCourseIds[0], date: '2026-10-09', status: 'late' },
    { course_id: studentCourseIds[0], date: '2026-10-12', status: 'present' },
    { course_id: studentCourseIds[0], date: '2026-10-14', status: 'absent' },
    { course_id: studentCourseIds[1], date: '2026-10-06', status: 'present' },
    { course_id: studentCourseIds[1], date: '2026-10-08', status: 'present' },
    { course_id: studentCourseIds[1], date: '2026-10-13', status: 'present' },
    { course_id: studentCourseIds[1], date: '2026-10-15', status: 'present' },
    { course_id: studentCourseIds[2], date: '2026-10-16', status: 'present' }
  ].map(r => ({
    student_id: mainStudent.id,
    course_id: r.course_id,
    date: r.date,
    status: r.status,
    college_id: '00000000-0000-0000-0000-000000000001'
  }));

  // Clean existing attendance for student to ensure deterministic state
  await supabase.from('attendance').delete().eq('student_id', mainStudent.id);

  const { error: insStudentErr } = await supabase.from('attendance').insert(studentRecords);
  if (insStudentErr) {
    console.error('Error inserting student records:', insStudentErr);
  } else {
    console.log(`Successfully seeded ${studentRecords.length} attendance records for ${mainStudent.email}`);
  }

  // Also seed attendance records for 5 other active students across recent dates
  const otherStudents = students.filter(s => s.id !== mainStudent.id).slice(0, 5);
  const otherRecords = [];

  const statusesPattern = [
    ['present', 'present', 'present', 'absent', 'present', 'present', 'late'], // ~80%
    ['present', 'absent', 'present', 'present', 'absent', 'present', 'present'], // ~71%
    ['present', 'present', 'present', 'present', 'present', 'late', 'present'], // ~93%
    ['absent', 'present', 'present', 'present', 'present', 'absent', 'present'], // ~71%
    ['present', 'present', 'late', 'present', 'present', 'present', 'present']   // ~93%
  ];

  otherStudents.forEach((st, idx) => {
    const pattern = statusesPattern[idx % statusesPattern.length];
    dates.slice(-7).forEach((d, dIdx) => {
      otherRecords.push({
        student_id: st.id,
        course_id: studentCourseIds[dIdx % studentCourseIds.length],
        date: d,
        status: pattern[dIdx % pattern.length],
        college_id: '00000000-0000-0000-0000-000000000001'
      });
    });
  });

  // Clean old other records for these dates to avoid duplicates
  for (const st of otherStudents) {
    await supabase.from('attendance').delete().eq('student_id', st.id).in('date', dates);
  }

  const { error: insOtherErr } = await supabase.from('attendance').insert(otherRecords);
  if (insOtherErr) {
    console.error('Error inserting other students attendance:', insOtherErr);
  } else {
    console.log(`Successfully seeded ${otherRecords.length} records for other students across recent dates`);
  }

  // 3. Ensure Certificate Program mapping exists
  const { data: existingCerts } = await supabase.from('certificate_programs').select('id, title');
  console.log('Existing certificate programs:', existingCerts);

  if (existingCerts && existingCerts.length < 2) {
    const { data: newProg, error: progErr } = await supabase.from('certificate_programs').insert([{
      teacher_id: '7fe35516-3def-4386-87ef-187f7062eaa6',
      title: 'Professional Certificate in Full-Stack Cloud & AI Engineering',
      description: 'Comprehensive specialization covering MERN architecture, DSA fundamentals, and C++ performance computing.',
      total_credits: 9
    }]).select();

    if (progErr) {
      console.error('Error creating certificate program:', progErr);
    } else {
      console.log('Created new certificate program:', newProg);
      // Map courses
      if (newProg && newProg[0]) {
        await supabase.from('program_courses').insert([
          { program_id: newProg[0].id, course_id: studentCourseIds[0] },
          { program_id: newProg[0].id, course_id: studentCourseIds[1] },
          { program_id: newProg[0].id, course_id: studentCourseIds[2] }
        ]);
        console.log('Mapped courses to certificate program');
      }
    }
  }

  console.log('Seeding completed successfully!');
}

seed().catch(console.error);
