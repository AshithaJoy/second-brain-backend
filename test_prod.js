const jwt = require('jsonwebtoken');

const JWT_SECRET = 'second-brain-creator-jwt-secret-key-change-me';
const USER_ID = '94e06c54-e888-4c5b-999c-178c5eb268ed';
const PROD_URL = 'https://second-brain-backend-production-43b4.up.railway.app';

async function main() {
  // 1. Register a new user
  console.log('Registering new user...');
  const regRes = await fetch(`${PROD_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_prod_123@example.com', password: 'password123', name: 'Test User' })
  });
  console.log(`Register Status: ${regRes.status}`);
  const regData = await regRes.json();
  console.log(regData);

  console.log('Logging in...');
  const loginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_prod_123@example.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Access token retrieved:', !!token);

  if (token) {
    console.log('Getting OAuth state...');
    const startRes = await fetch(`${PROD_URL}/api/instagram/oauth/start?state=teststate123`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Start status:', startRes.status);
    
    console.log('Triggering callback...');
    const callbackRes = await fetch(`${PROD_URL}/api/instagram/oauth/callback?code=mock_code_123&state=teststate123`, { redirect: 'manual' });
    console.log(`Callback Status: ${callbackRes.status}`);
    console.log(`Redirect Location: ${callbackRes.headers.get('location')}`);
  }
}

main();
