import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\edge_profile_orbit_captures`;
const screenshotsDir = `d:\\Orbitlms\\screenshots`;

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log("🚀 Starting Edge browser with CDP remote debugging on port 9222...");

try {
  execSync('taskkill /f /im msedge.exe 2>nul');
} catch(e){}

const edgeProc = spawn(edgePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8080/'
], { detached: true });

async function run() {
  await new Promise(r => setTimeout(r, 2500));

  const versionRes = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
  const wsUrl = versionRes.webSocketDebuggerUrl;
  console.log("🔌 Connected to CDP WebSocket:", wsUrl);

  const ws = new WebSocket(wsUrl);
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

  // Get targets and attach to page
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

  async function navigateAndCapture(url, fileName, delayMs = 2000) {
    console.log(`📸 Navigating to ${url} -> ${fileName}...`);
    await sendPageCommand('Page.navigate', { url });
    await new Promise(r => setTimeout(r, delayMs));
    const result = await sendPageCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const filePath = path.join(screenshotsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`   ✅ Saved real screenshot (${buffer.length} bytes): ${filePath}`);
  }

  async function evaluateJS(script) {
    return await sendPageCommand('Runtime.evaluate', { expression: script, awaitPromise: true });
  }

  try {
    // 1. Landing Page
    await navigateAndCapture('http://localhost:8080/', '01_landing_page.png', 2500);

    // 2. Login Page
    await navigateAndCapture('http://localhost:8080/login', '02_login_page.png', 2000);

    // 3. Login as Admin
    console.log("🔑 Logging in as Administrator (pragyagoyal1717@gmail.com)...");
    await evaluateJS(`
      (async () => {
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const passInput = document.querySelector('input[type="password"], input[name="password"]');
        if (emailInput && passInput) {
          emailInput.value = 'pragyagoyal1717@gmail.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.value = '987654321';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In') || b.textContent.includes('Login'));
          if (btn) btn.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    // 3. Admin Dashboard
    await navigateAndCapture('http://localhost:8080/admin', '03_admin_dashboard.png', 2500);

    // 4. Admin User Management
    await navigateAndCapture('http://localhost:8080/admin/users', '04_admin_user_management.png', 2500);

    // 5. Admin Settings & Branding
    await navigateAndCapture('http://localhost:8080/admin/settings', '05_admin_settings_branding.png', 2500);

    // 6. Admin Monitoring
    await navigateAndCapture('http://localhost:8080/admin/monitoring', '06_admin_monitoring.png', 2500);

    // 7. Log out & Login as Teacher
    console.log("🔑 Logging in as Teacher (harshvardhanpurohit2020@gmail.com)...");
    await evaluateJS(`
      (async () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    await evaluateJS(`
      (async () => {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        if (emailInput && passInput) {
          emailInput.value = 'harshvardhanpurohit2020@gmail.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.value = 'Harsh123@';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In') || b.textContent.includes('Login'));
          if (btn) btn.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    // 7. Teacher Dashboard / Courses
    await navigateAndCapture('http://localhost:8080/teacher/courses', '07_teacher_courses.png', 2500);

    // 8. Teacher Certificate Programs
    await navigateAndCapture('http://localhost:8080/teacher/certificate-programs', '08_teacher_certificates.png', 2500);

    // 9. Log out & Login as Student
    console.log("🔑 Logging in as Student (ceo@sintechnologies.com)...");
    await evaluateJS(`
      (async () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    await evaluateJS(`
      (async () => {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        if (emailInput && passInput) {
          emailInput.value = 'ceo@sintechnologies.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.value = 'Harsh123@';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In') || b.textContent.includes('Login'));
          if (btn) btn.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    // 9. Student Dashboard
    await navigateAndCapture('http://localhost:8080/student/dashboard', '09_student_dashboard.png', 2500);

    // 10. Student Gamified Leaderboard
    await navigateAndCapture('http://localhost:8080/leaderboard', '10_student_leaderboard.png', 2500);

    console.log("🎉 SUCCESS! 10 Real Screenshots captured into d:\\Orbitlms\\screenshots\\");
  } catch (err) {
    console.error("❌ Error during screenshot capture:", err);
  } finally {
    ws.close();
    try { execSync('taskkill /f /im msedge.exe 2>nul'); } catch(e){}
    process.exit(0);
  }
}

run().catch(console.error);
