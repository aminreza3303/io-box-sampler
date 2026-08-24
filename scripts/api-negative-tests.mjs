import fs from 'node:fs';

const args = new Set(process.argv.slice(2));
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
const baseUrl = env.VITE_SHATI_API_URL || 'https://sandbox.shati.net/api/v1/client';
const token = env.VITE_SHATI_API_TOKEN || '';
const live = args.has('--live');
const testOrderId = env.SHATI_TEST_ORDER_ID || '';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const endpoint = (path) => `${baseUrl}${path}`;

const cases = [
  { name: 'search: missing directions', path: '/booking/flight/search', body: { trip_type: 'one_way', cabin_type: 'economy', passengers: { adult: 1, child: 0, infant: 0 } }, expected: [422] },
  { name: 'search: invalid IATA codes', path: '/booking/flight/search', body: { trip_type: 'one_way', cabin_type: 'economy', passengers: { adult: 1, child: 0, infant: 0 }, directions: [{ origin: 'TEHRAN', origin_type: 'city', destination: 'MHD', destination_type: 'city', date: tomorrow }] }, expected: [422] },
  { name: 'search: invalid passenger counts', path: '/booking/flight/search', body: { trip_type: 'one_way', cabin_type: 'economy', passengers: { adult: 0, child: 0, infant: 1 }, directions: [{ origin: 'THR', origin_type: 'city', destination: 'MHD', destination_type: 'city', date: tomorrow }] }, expected: [422] },
  { name: 'min-price: invalid date range', path: '/booking/flight/min-price', body: { trip_type: 'one_way', cabin_type: 'economy', origin: 'THR', origin_type: 'city', destination: 'MHD', destination_type: 'city', from_date: 'not-a-date', until_date: 'not-a-date' }, expected: [422] },
  { name: 'pre-reserve: invalid ticket id', path: '/booking/flight/pre-reserve', body: { flight_ticket_id: 'invalid-test-ticket', total_price: '1', currency_code: 'IRR', changes_accepted: false }, expected: [404, 422] },
  { name: 'passenger-details: missing order id', path: '/booking/flight/passenger-details', body: { contact_info: {}, passengers: [] }, expected: [404, 422] },
  { name: 'reserve: missing order id', path: '/booking/flight/reserve', body: { changes_accepted: false }, expected: [404, 422] },
  { name: 'info: invalid order id', path: '/booking/flight/info', body: { order_id: 'invalid-test-order' }, expected: [404, 422] },
  { name: 'auth: missing bearer token', path: '/booking/flight/search', body: {}, expected: [401], omitAuth: true },
];

async function runCase(testCase) {
  if (!live) return { name: testCase.name, mode: 'dry-run', expected: testCase.expected };
  try {
    const response = await fetch(endpoint(testCase.path), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(testCase.omitAuth ? {} : { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(testCase.body),
    });
    const responseBody = await response.json().catch(() => ({}));
    const passed = testCase.expected.includes(response.status);
    return { name: testCase.name, status: response.status, passed, expected: testCase.expected, message: responseBody?.message || responseBody?.errors || '' };
  } catch (error) {
    return { name: testCase.name, status: 0, passed: false, expected: testCase.expected, error: error.message };
  }
}

console.log(JSON.stringify({ mode: live ? 'live-negative-tests' : 'dry-run', baseUrl, cases: cases.length, duplicateReserve: testOrderId ? 'available-but-not-run' : 'requires SHATI_TEST_ORDER_ID' }, null, 2));
const results = [];
for (const testCase of cases) results.push(await runCase(testCase));
console.log(JSON.stringify({ results, passed: results.filter((item) => item.passed !== false).length, failed: results.filter((item) => item.passed === false).length }, null, 2));
