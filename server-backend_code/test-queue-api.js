// Automated test suite for Queue & Token Status Manager API
const http = require('http');

function makeRequest(path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTOMATED BACKEND API & SECURITY TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName, condition, details) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (details) console.error(`   Details:`, details);
      failed++;
    }
  }

  try {
    // Test 1: Fetch valid token for matching center (CTR-01)
    const t1 = await makeRequest('/api/queue/TKN-1042', 'GET', { 'x-center-code': 'CTR-01' });
    assert(
      'GET /api/queue/TKN-1042 returns 200 for matching center CTR-01',
      t1.status === 200 && t1.body.success === true && t1.body.data.tokenId === 'TKN-1042',
      t1
    );

    // Test 2: Multi-tenant security check (CTR-01 admin querying CTR-02 token)
    const t2 = await makeRequest('/api/queue/TKN-9999', 'GET', { 'x-center-code': 'CTR-01' });
    assert(
      'GET /api/queue/TKN-9999 returns 403 Forbidden for mismatched center (CTR-01 admin accessing CTR-02)',
      t2.status === 403 && t2.body.success === false && t2.body.error.includes('Access Denied'),
      t2
    );

    // Test 3: Query non-existent token
    const t3 = await makeRequest('/api/queue/NON-EXISTENT-XYZ', 'GET', { 'x-center-code': 'CTR-01' });
    assert(
      'GET /api/queue/NON-EXISTENT-XYZ returns 404 Not Found',
      t3.status === 404 && t3.body.success === false,
      t3
    );

    // Test 4: Advance valid token status
    const currentStatus = t1.body.data.statusIndex;
    const t4 = await makeRequest('/api/queue/TKN-1042/advance', 'PUT', { 'x-center-code': 'CTR-01' });
    assert(
      `PUT /api/queue/TKN-1042/advance increments statusIndex by +1 (from ${currentStatus} to ${currentStatus + 1})`,
      t4.status === 200 && t4.body.data.statusIndex === currentStatus + 1,
      t4
    );

    // Test 5: Prevent advancing token belonging to another center
    const t5 = await makeRequest('/api/queue/TKN-9999/advance', 'PUT', { 'x-center-code': 'CTR-01' });
    assert(
      'PUT /api/queue/TKN-9999/advance returns 403 Forbidden when unauthorized center attempts write',
      t5.status === 403 && t5.body.success === false,
      t5
    );

    // Test 6: Advance to final step 7 and test boundary capping
    // Let's seed a token already at step 7
    await makeRequest('/api/queue/create', 'POST', {}, {
      tokenId: 'TKN-FINAL-7',
      farmerName: 'Kavitha R.',
      centerCode: 'CTR-01',
      statusIndex: 7,
    });

    const t6 = await makeRequest('/api/queue/TKN-FINAL-7/advance', 'PUT', { 'x-center-code': 'CTR-01' });
    assert(
      'PUT /api/queue/TKN-FINAL-7/advance returns 400 Bad Request when token is already at final step 7',
      t6.status === 400 && t6.body.success === false && t6.body.error.includes('already reached the final step'),
      t6
    );

    // Test 7: List all tokens for center
    const t7 = await makeRequest('/api/queue', 'GET', { 'x-center-code': 'CTR-01' });
    assert(
      'GET /api/queue returns list of tokens strictly filtered by center CTR-01',
      t7.status === 200 && Array.isArray(t7.body.data) && t7.body.data.every((t) => t.centerCode === 'CTR-01'),
      t7
    );

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
