const { execSync } = require('child_process');
const fs = require('fs');

const edgePath = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"`;

console.log("Testing Edge screenshot command...");
try {
  const cmd = `${edgePath} --headless --disable-gpu --screenshot=d:\\Orbitlms\\screenshots\\real_test.png --window-size=1440,900 http://localhost:8081/`;
  execSync(cmd);
  console.log("Screenshot output created:", fs.existsSync("d:\\Orbitlms\\screenshots\\real_test.png"));
} catch (e) {
  console.error("Error executing Edge screenshot:", e.message);
}
