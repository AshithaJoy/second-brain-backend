const pty = require('child_process');

process.stdout.isTTY = true;
process.stdin.isTTY = true;

const { execSync } = require('child_process');

try {
  console.log("Running interactive migrate...");
  // Use powershell to echo y into the process
  execSync('powershell -Command "echo y | npx prisma migrate dev --name add_post_scheduling"', { stdio: 'inherit' });
} catch (e) {
  console.error("Migrate failed", e);
}
