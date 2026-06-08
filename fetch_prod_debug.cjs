const https = require('https');

https.get("https://second-brain-backend-production-43b4.up.railway.app/api/railway-audit?postId=2ecf5768-8788-48e8-9566-2416d8d24061", (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("DATABASE_URL:", json.DATABASE_URL);
      console.log("DATABASE_URL_UNMASKED:", json.DATABASE_URL_UNMASKED);
    } catch (err) {
      console.error("Parse failed:", err);
    }
  });
}).on('error', (err) => {
  console.error("Fetch failed:", err);
});
