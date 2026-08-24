import fs from 'node:fs';

const args = new Set(process.argv.slice(2));
const valueOf = (name, fallback) => {
  const prefix = `--${name}=`;
  const item = process.argv.find((entry) => entry.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestsPerMinute = Math.min(Math.max(Number(valueOf('rpm', '1000')), 1), 1000);
const durationSeconds = Math.min(Math.max(Number(valueOf('duration', '60')), 1), 3600);
const concurrency = Math.min(Math.max(Number(valueOf('concurrency', '25')), 1), 100);
const total = Math.min(Math.ceil((requestsPerMinute / 60) * durationSeconds), 1000);
const target = valueOf('target', 'https://sandbox.shati.net/api/v1/client/booking/flight/search');
const dryRun = args.has('--dry-run') || !args.has('--allow-external');

const readEnv = () => {
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    return Object.fromEntries(content.split(/\r?\n/).filter(Boolean).map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
  } catch {
    return {};
  }
};

const env = readEnv();
const token = env.VITE_SHATI_API_TOKEN || env.SHATI_API_TOKEN || '';
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const body = {
  trip_type: 'one_way',
  cabin_type: 'economy',
  passengers: { adult: 1, child: 0, infant: 0 },
  directions: [{ origin: 'THR', origin_type: 'city', destination: 'MHD', destination_type: 'city', date: tomorrow }],
};

console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'external', target, requestsPerMinute, durationSeconds, total, concurrency, body }, null, 2));

if (dryRun) {
  console.log('\nDry run only. To send real Sandbox search requests, rerun with --allow-external.');
  process.exit(0);
}
if (!token) throw new Error('No API token found in .env.local');
if (!target.includes('/booking/flight/search')) throw new Error('Safety check failed: only the flight search endpoint is allowed.');

const results = [];
const pending = new Set();
const intervalMs = 60000 / requestsPerMinute;
const startedAt = Date.now();

const request = async (index) => {
  const requestStarted = performance.now();
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    results.push({ index, status: response.status, ok: response.ok, latencyMs: Math.round(performance.now() - requestStarted), responseBytes: text.length });
  } catch (error) {
    results.push({ index, status: 0, ok: false, latencyMs: Math.round(performance.now() - requestStarted), error: error.message });
  }
};

for (let index = 0; index < total; index += 1) {
  const targetStart = index * intervalMs;
  const elapsed = Date.now() - startedAt;
  if (targetStart > elapsed) await sleep(targetStart - elapsed);
  while (pending.size >= concurrency) await Promise.race(pending);
  const promise = request(index).finally(() => pending.delete(promise));
  pending.add(promise);
}
await Promise.all(pending);

const latencies = results.map((item) => item.latencyMs).sort((a, b) => a - b);
const percentile = (ratio) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * ratio))] || 0;
const statusCounts = results.reduce((counts, item) => { const key = String(item.status); counts[key] = (counts[key] || 0) + 1; return counts; }, {});
console.log(JSON.stringify({ completed: results.length, statusCounts, latencyMs: { p50: percentile(.5), p95: percentile(.95), max: percentile(1) }, failures: results.filter((item) => !item.ok).slice(0, 10) }, null, 2));
