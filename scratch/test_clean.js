import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\clean_orbit_profile_${Date.now()}`;
const screenshotsDir = `d:\\Orbitlms\\screenshots`;

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log("🧹 Launching clean Edge process...");

try { execSync('taskkill /f /im msedge.exe 2>nul'); } catch(e){}

const edgeProc = spawn(edgePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8080/'
], { detached: true });

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const versionRes = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
  console.log("Browser UA:", versionRes['User-Agent']);

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
    return await sendPageCommand('Runtime.evaluate', { expression: script, awaitPromise: true });
  }

  async function capture(fileName, delay = 2000) {
    await new Promise(r => setTimeout(r, delay));
    const result = await sendPageCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const filePath = path.join(screenshotsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`   📸 Captured ${fileName} (${buffer.length} bytes)`);
  }

  console.log("1. Navigating to http://localhost:8080/");
  await sendPageCommand('Page.navigate', { url: 'http://localhost:8080/' });
  await capture('test_clean_landing.png', 3000);

  ws.close();
  try { execSync('taskkill /f /im msedge.exe 2>nul'); } catch(e){}
}

run().catch(console.error);
