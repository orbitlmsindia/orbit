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

console.log("🧹 Launching clean Brave browser...");

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

  console.log("Navigating to login page...");
  await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/login' });
  await capture('02_login_page.png', 2000);

  console.log("Logging in as Admin via Supabase Auth JS...");
  const loginResult = await evaluateJS(`
    (async () => {
      const { supabase } = await import('/src/lib/supabase.ts');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'pragyagoyal1717@gmail.com',
        password: '987654321'
      });
      if (error) return 'ERROR: ' + error.message;
      return 'SUCCESS: ' + (data.user ? data.user.email : 'No user');
    })()
  `);
  console.log("Admin Login Result:", loginResult);

  console.log("Navigating to Admin Dashboard...");
  await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/admin' });
  await capture('03_admin_dashboard.png', 3000);

  ws.close();
  try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
}

run().catch(console.error);
