import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const bravePath = `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\brave_orbit_clean_${Date.now()}`;
const screenshotsDir = `d:\\Orbitlms\\screenshots`;

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log("🧹 Launching clean Brave browser for 10 role-wise screenshots...");

try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}

const braveProc = spawn(bravePath, [
  '--remote-debugging-port=9223',
  '--headless=new',
  '--no-first-run',
  '--disable-extensions',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8080/'
], { detached: true });

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const versionRes = await fetch('http://127.0.0.1:9223/json/version').then(r => r.json());
  const ws = new WebSocket(versionRes.webSocketDebuggerUrl);
  let idCounter = 1;
  const pendingPromises = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingPromises.has(msg.id)) {
      const { resolve, reject } = pendingPromises.get(msg.id);
      pendingPromises.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingPromises.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const targets = await sendCommand('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.type === 'page');
  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

  function sendPageCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingPromises.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendPageCommand('Page.enable');
  await sendPageCommand('DOM.enable');
  await sendPageCommand('Runtime.enable');

  async function evaluateJS(script) {
    const res = await sendPageCommand('Runtime.evaluate', { expression: script, awaitPromise: true });
    return res.result?.value;
  }

  async function capture(fileName, delay = 2500) {
    await new Promise(r => setTimeout(r, delay));
    const result = await sendPageCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const filePath = path.join(screenshotsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`   📸 Captured ${fileName} (${buffer.length} bytes)`);
  }

  async function loginAs(email, password) {
    console.log(`🔑 Logging in as ${email}...`);
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/login' });
    await new Promise(r => setTimeout(r, 1500));
    const res = await evaluateJS(`
      (async () => {
        const { supabase } = await import('/src/lib/supabase.ts');
        await supabase.auth.signOut();
        const { data, error } = await supabase.auth.signInWithPassword({ email: '${email}', password: '${password}' });
        if (error) return 'ERROR: ' + error.message;
        return 'SUCCESS: ' + (data.user ? data.user.email : 'LoggedIn');
      })()
    `);
    console.log(`   Result: ${res}`);
    await new Promise(r => setTimeout(r, 1000));
  }

  try {
    // 1. Landing Page
    console.log("--- 1. Landing Page ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/' });
    await capture('01_landing_page.png', 3000);

    // 2. Login Page
    console.log("--- 2. Login Page ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/login' });
    await capture('02_login_page.png', 2000);

    // --- ADMIN SECTION ---
    await loginAs('pragyagoyal1717@gmail.com', '987654321');

    console.log("--- 3. Admin Dashboard ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin' });
    await capture('03_admin_dashboard.png', 3000);

    console.log("--- 4. Admin User Management ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin/users' });
    await capture('04_admin_user_management.png', 3000);

    console.log("--- 5. Admin Settings & Branding ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin/settings' });
    await capture('05_admin_settings_branding.png', 3000);

    console.log("--- 6. Admin Monitoring ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin/monitoring' });
    await capture('06_admin_monitoring.png', 3000);

    // --- TEACHER SECTION ---
    await loginAs('harshvardhanpurohit2020@gmail.com', 'Harsh123@');

    console.log("--- 7. Teacher Courses ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/teacher/courses' });
    await capture('07_teacher_courses.png', 3000);

    console.log("--- 8. Teacher Certificate Programs ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/teacher/certificate-programs' });
    await capture('08_teacher_certificates.png', 3000);

    // --- STUDENT SECTION ---
    await loginAs('ceo@sintechnologies.in', 'Harsh123@');

    console.log("--- 9. Student Dashboard ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/student/dashboard' });
    await capture('09_student_dashboard.png', 3000);

    console.log("--- 10. Student Gamified Leaderboard ---");
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/leaderboard' });
    await capture('10_student_leaderboard.png', 3000);

    console.log("🎉 SUCCESS! All 10 CLEAN Real Screenshots captured into d:\\Orbitlms\\screenshots\\");
  } catch (err) {
    console.error("❌ Error during capture process:", err);
  } finally {
    ws.close();
    try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
    process.exit(0);
  }
}

run().catch(console.error);
