import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const bravePath = `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\brave_test_${Date.now()}`;

const supabaseUrl = 'https://byfzhkceuzstttdshzgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5Znpoa2NldXpzdHR0ZHNoemdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTU0MTUsImV4cCI6MjA4NTU5MTQxNX0.-GG_uX-n8z9HTiR53wb9pL8PPtEq1cmsPGP-7VAPoSI';
const storageKey = 'sb-byfzhkceuzstttdshzgb-auth-token';

try { execSync('taskkill /f /im brave.exe 2>nul'); } catch (e) { }

const braveProc = spawn(bravePath, [
  '--remote-debugging-port=9227',
  '--headless=new',
  '--no-first-run',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1920,1080',
  'http://localhost:8080/'
], { detached: true });

async function getAuthSession(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function run() {
  await new Promise(r => setTimeout(r, 2500));
  const versionRes = await fetch('http://127.0.0.1:9227/json/version').then(r => r.json());
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

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('BROWSER CONSOLE:', msg.params.type, msg.params.args?.map(a => a.value));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('BROWSER EXCEPTION:', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
      }
    } catch(e){}
  });

  async function evaluateJS(script) {
    const res = await sendPageCommand('Runtime.evaluate', { expression: script, awaitPromise: true });
    return res.result?.value;
  }

  async function injectSession(sessionData) {
    await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/' });
    await new Promise(r => setTimeout(r, 1000));
    const jsonStr = JSON.stringify(sessionData).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    await evaluateJS(`
      (() => {
        localStorage.setItem('${storageKey}', '${jsonStr}');
      })()
    `);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\nTesting Admin Courses...");
  const adminSession = await getAuthSession('pragyagoyal1717@gmail.com', '987654321');
  await injectSession(adminSession);
  await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin/courses' });
  await new Promise(r => setTimeout(r, 4000));
  const adminCoursesUrl = await evaluateJS(`window.location.href`);
  console.log("Admin Courses Current URL:", adminCoursesUrl);

  console.log("\nTesting Student Notifications...");
  const studentSession = await getAuthSession('ceo@sintechnologies.in', 'Harsh123@');
  await injectSession(studentSession);
  await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/student/notifications' });
  await new Promise(r => setTimeout(r, 4000));
  const studentNotifUrl = await evaluateJS(`window.location.href`);
  console.log("Student Notifications Current URL:", studentNotifUrl);

  try { execSync('taskkill /f /im brave.exe 2>nul'); } catch (e) { }
  process.exit(0);
}

run();
