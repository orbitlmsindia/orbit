const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const userDataDir = `d:\\Orbitlms\\scratch\\edge_profile`;

console.log("Launching Edge with CDP port 9222...");

const edgeProc = spawn(edgePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'http://localhost:8081/'
], { detached: true });

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("CDP Version response:", data);
      execSync('taskkill /f /im msedge.exe');
    });
  }).on('error', (err) => {
    console.error("CDP connection error:", err.message);
    try { execSync('taskkill /f /im msedge.exe'); } catch(e){}
  });
}, 2000);
