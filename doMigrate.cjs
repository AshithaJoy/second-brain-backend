const { execSync } = require('child_process');
const fs = require('fs');

try {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const migName = timestamp + '_add_post_scheduling';
  fs.mkdirSync('prisma/migrations/' + migName, { recursive: true });
  
  execSync('npx prisma migrate diff --from-url "postgresql://postgres:Database@localhost:5432/secondbrain?schema=public" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/' + migName + '/migration.sql', { stdio: 'inherit' });
  
  console.log("Migration generated: " + migName);
  
  // Apply it
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  // If deploy fails because of drift, we resolve it
  execSync('npx prisma migrate resolve --applied ' + migName, { stdio: 'inherit' });
  
} catch (e) {
  console.error("Migrate error (expected if already applied):", e.message);
  try {
     // fallback to just run db push to ensure types
     execSync('npx prisma db push', { stdio: 'inherit' });
  } catch (err) {}
}
