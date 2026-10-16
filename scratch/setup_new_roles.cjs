const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const COLLEGE_ID = '00000000-0000-0000-0000-000000000001';

const accounts = [
  {
    role: 'super_admin',
    email: 'master@orbitlms.in',
    password: 'OrbitMaster@2026',
    full_name: 'Master SaaS Admin',
    college_id: null,
    department: 'SaaS Administration'
  },
  {
    role: 'admin',
    email: 'admin@orbitlms.in',
    password: 'OrbitAdmin@2026',
    full_name: 'Institute Administrator',
    college_id: COLLEGE_ID,
    department: 'Institute Administration'
  },
  {
    role: 'teacher',
    email: 'teacher@orbitlms.in',
    password: 'OrbitTeacher@2026',
    full_name: 'Prof. Vikram Sharma',
    college_id: COLLEGE_ID,
    department: 'Computer Science & AI'
  },
  {
    role: 'finance',
    email: 'finance@orbitlms.in',
    password: 'OrbitFinance@2026',
    full_name: 'Finance Controller',
    college_id: COLLEGE_ID,
    department: 'Accounts & Finance'
  },
  {
    role: 'student',
    email: 'student@orbitlms.in',
    password: 'OrbitStudent@2026',
    full_name: 'Aarav Mehta',
    college_id: COLLEGE_ID,
    department: 'Computer Science',
    aadhar_number: '893452109812',
    mobile_number: '+91 9876543210',
    address: 'Orbit Campus, Knowledge Park'
  }
];

async function createOrUpdateUser(acc) {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  console.log(`\n========================================`);
  console.log(`Processing: ${acc.email} (${acc.role})`);

  let userId = null;

  // 1. Try signUp
  const { data: signUpData, error: signUpErr } = await client.auth.signUp({
    email: acc.email,
    password: acc.password,
    options: {
      data: {
        full_name: acc.full_name,
        role: acc.role,
        department: acc.department
      }
    }
  });

  if (signUpErr) {
    console.log(`SignUp notice for ${acc.email}: ${signUpErr.message}`);
  } else if (signUpData?.user) {
    userId = signUpData.user.id;
    console.log(`SignUp succeeded. User ID: ${userId}`);
  }

  // 2. Sign in to obtain active authenticated session
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: acc.email,
    password: acc.password
  });

  if (loginErr) {
    console.error(`Login failed for ${acc.email}:`, loginErr.message);
    return null;
  }

  userId = loginData.user.id;
  console.log(`Authenticated as ${acc.email} (ID: ${userId})`);

  // 3. Upsert user in public.users using the authenticated client
  const updatePayload = {
    id: userId,
    email: acc.email,
    full_name: acc.full_name,
    role: acc.role,
    status: 'active',
    college_id: acc.college_id,
    department: acc.department || null,
    aadhar_number: acc.aadhar_number || null,
    mobile_number: acc.mobile_number || null,
    address: acc.address || null
  };

  const { data: upsertData, error: upsertErr } = await client
    .from('users')
    .upsert(updatePayload, { onConflict: 'id' })
    .select();

  if (upsertErr) {
    console.error(`Error updating public.users for ${acc.email}:`, upsertErr);
  } else {
    console.log(`Successfully updated public.users record for ${acc.email}!`, upsertData?.[0]?.role);
  }

  return { ...acc, userId, client };
}

async function main() {
  const createdAccounts = {};

  for (const acc of accounts) {
    const res = await createOrUpdateUser(acc);
    if (res) {
      createdAccounts[acc.role] = res;
    }
  }

  // 4. Link courses to new Teacher
  const teacher = createdAccounts['teacher'];
  if (teacher) {
    console.log(`\nLinking courses to new Teacher (ID: ${teacher.userId})...`);
    // Find courses
    const { data: courses, error: cErr } = await teacher.client
      .from('courses')
      .select('id, title, teacher_id');

    console.log(`Teacher can access ${courses?.length || 0} courses.`);
    
    // Update courses that had old teacher id or null to new teacher id
    if (courses && courses.length > 0) {
      for (const c of courses) {
        const { error: upErr } = await teacher.client
          .from('courses')
          .update({ teacher_id: teacher.userId, college_id: COLLEGE_ID })
          .eq('id', c.id);
        if (upErr) {
          console.warn(`Could not reassign course "${c.title}":`, upErr.message);
        } else {
          console.log(`Assigned course "${c.title}" to teacher.`);
        }
      }
    }
  }

  // 5. Enroll new Student into available courses
  const student = createdAccounts['student'];
  if (student) {
    console.log(`\nEnrolling new Student (ID: ${student.userId}) into courses...`);
    const { data: allCourses } = await student.client
      .from('courses')
      .select('id, title')
      .limit(3);

    if (allCourses && allCourses.length > 0) {
      for (const c of allCourses) {
        const { data: existing } = await student.client
          .from('enrollments')
          .select('id')
          .eq('student_id', student.userId)
          .eq('course_id', c.id);

        if (!existing || existing.length === 0) {
          const { error: enErr } = await student.client
            .from('enrollments')
            .insert({
              student_id: student.userId,
              course_id: c.id,
              status: 'approved',
              progress: 25,
              college_id: COLLEGE_ID
            });
          if (enErr) {
            console.warn(`Enrollment error for course "${c.title}":`, enErr.message);
          } else {
            console.log(`Enrolled student in course: "${c.title}"`);
          }
        }
      }
    }
  }

  console.log(`\n✅ All new credentials successfully created and configured!`);
}

main().catch(console.error);
