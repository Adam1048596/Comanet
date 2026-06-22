// test-fetch.js
// Run with: node test-fetch.js

// Load .env.local manually (Node doesn't read it by default)
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('No .env.local file found!');
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=').replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value.trim();
    }
  }
}

loadEnv();

async function testStore(id) {
  const platform = process.env[`STORE${id}_PLATFORM`];
  const baseUrl = process.env[`STORE${id}_BASE_URL`];
  const consumerKey = process.env[`STORE${id}_CONSUMER_KEY`];
  const consumerSecret = process.env[`STORE${id}_CONSUMER_SECRET`];
  const token = process.env[`STORE${id}_ACCESS_TOKEN`];

  console.log(`\nTesting Store ${id}:`);
  console.log(`  Platform: ${platform || 'NOT SET'}`);
  console.log(`  Base URL: ${baseUrl || 'NOT SET'}`);
  console.log(`  Consumer Key: ${consumerKey ? 'YES' : 'NO'}`);
  console.log(`  Consumer Secret: ${consumerSecret ? 'YES' : 'NO'}`);
  console.log(`  Token: ${token ? 'YES' : 'NO'}`);

  if (!platform || !baseUrl) {
    console.log('  -> SKIPPED (missing platform or URL)');
    return;
  }

  let url, headers = {};
  if (platform === 'woocommerce') {
    if (!consumerKey || !consumerSecret) {
      console.log('  -> SKIPPED (missing WooCommerce keys)');
      return;
    }
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
    url = `${baseUrl}/wp-json/wc/v3/orders?per_page=5`;
  } else if (platform === 'shopify') {
    if (!token) {
      console.log('  -> SKIPPED (missing Shopify token)');
      return;
    }
    headers['X-Shopify-Access-Token'] = token;
    url = `https://${baseUrl}/admin/api/2024-07/orders.json?limit=5&status=any`;
  } else {
    console.log('  -> Unknown platform');
    return;
  }

  try {
    const res = await fetch(url, { headers });
    console.log(`  HTTP Status: ${res.status}`);
    const data = await res.json();
    const orders = Array.isArray(data) ? data : (data.orders || []);
    console.log(`  Orders returned: ${orders.length}`);
    if (orders.length > 0) {
      console.log(`  First order number: ${orders[0].number || orders[0].name}`);
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

(async () => {
  for (let i = 1; i <= 6; i++) {
    await testStore(i);
  }
  console.log('\nDone. Check the output above.');
})();