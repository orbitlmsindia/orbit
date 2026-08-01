const { spawn, execSync } = require('child_process');
const http = require('http');

const bravePath = `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\brave_profile_clean_${Date.now()}`;

console.log("Testing Brave Browser CDP port 9222...");
try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}

const braveProc = spawn(bravePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  '--no-first-run',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8080/'
], { detached: true });

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("Brave CDP Version response:\n", JSON.parse(data));
      try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
    });
  }).on('error', (err) => {
    console.error("Brave CDP error:", err.message);
    try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
  });
}, 2500);
