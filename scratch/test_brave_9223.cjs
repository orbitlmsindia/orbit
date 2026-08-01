const { spawn, execSync } = require('child_process');
const http = require('http');

const bravePath = `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const userDataDir = `C:\\Users\\Lenovo\\AppData\\Local\\Temp\\brave_profile_port9223`;

console.log("Killing existing processes...");
try { execSync('taskkill /f /im msedge.exe 2>nul'); } catch(e){}
try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}

console.log("Launching Brave on port 9223...");
const braveProc = spawn(bravePath, [
  '--remote-debugging-port=9223',
  '--headless=new',
  '--no-first-run',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8080/'
], { detached: true });

setTimeout(() => {
  http.get('http://127.0.0.1:9223/json/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("Brave 9223 CDP Version response:\n", JSON.parse(data));
      try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
    });
  }).on('error', (err) => {
    console.error("Brave 9223 CDP error:", err.message);
    try { execSync('taskkill /f /im brave.exe 2>nul'); } catch(e){}
  });
}, 2500);
