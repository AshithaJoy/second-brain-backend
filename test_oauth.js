const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = 'second-brain-creator-jwt-secret-key-change-me';
const USER_ID = '43c6840f-70d2-44f2-8182-ba824d28fe66';

async function main() {
  // 1. Mint JWT
  const token = jwt.sign({ id: USER_ID }, JWT_SECRET, { expiresIn: '1h' });
  console.log('1. Generated JWT Token');

  // 2. Call OAuth Start
  console.log('2. Requesting OAuth Start...');
  const startRes = await fetch('http://localhost:5000/api/instagram/oauth/start?state=test_state_123', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const startData = await startRes.json();
  const state = 'test_state_123';
  console.log(`   OAuth State: ${state}`);
  console.log(`   OAuth URL: ${startData.url}`);

  // 3. Call OAuth Callback
  console.log('3. Triggering OAuth Callback with Mock Code...');
  const callbackUrl = `http://localhost:5000/api/instagram/oauth/callback?code=mock-token-test&state=${state}`;
  const cbRes = await fetch(callbackUrl, { redirect: 'manual' });
  console.log(`   Callback Status: ${cbRes.status} ${cbRes.statusText}`);
  const redirectLoc = cbRes.headers.get('location');
  console.log(`   Redirect Location: ${redirectLoc}`);

  // 4. Verify DB
  console.log('4. Verifying DB State...');
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  console.log(`   instagramUserId: ${user.instagramUserId}`);
  console.log(`   instagramUsername: ${user.instagramUsername}`);
  console.log(`   instagramConnectedAt: ${user.instagramConnectedAt}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
