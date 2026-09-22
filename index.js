// Free Supabase projects are paused after seven days without activity, and a
// paused project is a dead product until somebody notices. This runs once a
// day from GitHub Actions and touches everything that must not fall asleep.
//
// Two kinds of check, because they fail for different reasons:
//
//   http   a plain GET. Proves the whole path works: DNS, the Supabase
//          gateway, and whatever answers behind it.
//   pg     a direct Postgres connection. The one that still gets through
//          when the gateway answers 402 on every path in the project, which
//          is what an exceeded organisation quota looks like from outside.
//          Learned on FaxGo, 2026-09-10, which then had to move to a new
//          project because a restriction like that has no expiry you can
//          wait out on a free plan.
//
// Supabase watches the database, not the gateway, so an http target only
// counts against the pause timer if whatever answers it reads the database.
// The /health and /keep-alive functions below do. A marketing page does not;
// those entries are here to keep a site warm, which is a different job.

const HTTP_TARGETS = [
  'https://prompt.softery.io',
  'https://recipe.softery.io',
  'https://vkusnyashki.poznyaks.com',
  'https://evgeniy.poznyaks.com',
  'https://gdfuyaubwqvmdqdlwajv.supabase.co/functions/v1/health',      // Jobbi
  'https://hqjwcvszyxdtkoiqtzza.supabase.co/functions/v1/keep-alive',  // softery.io
  'https://jwakvospfjkujqmwawcc.supabase.co/functions/v1/health',      // FaxGo
  'https://bolucugxixbarmlqqojd.supabase.co/functions/v1/keep-alive',  // Muse
];

// Dropped 2026-09-10: oydwzeanlzbmsfzyogia was the first Supabase project
// behind evgeniy.poznyaks.com. Its hostname is NXDOMAIN now, the project is
// gone, and the site ships with USE_SUPABASE = false, so nothing waits on it.

// Postgres targets live in environment variables so no connection string ever
// lands in this repository. In CI they come from GitHub Actions secrets.
const PG_TARGETS = [
  { name: 'FaxGo', env: 'FAXGO_DB_URL' },
];

const HTTP_TIMEOUT_MS = 20_000;
const PG_TIMEOUT_MS = 15_000;

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

async function pingHttp(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: { 'user-agent': 'supabase-keep-alive (github actions)' },
    });

    if (response.ok) {
      console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
      return;
    }

    // The body is where a Supabase gateway explains itself, and that
    // explanation is the difference between "our code said no" and "the
    // project is restricted and the request never reached it".
    const detail = (await response.text().catch(() => '')).trim().slice(0, 200);
    fail(`${url}: ${response.status} ${response.statusText}${detail ? ` | ${detail}` : ''}`);
  } catch (error) {
    fail(`${url}: ${error.message}`);
  }
}

async function pingPostgres({ name, env }) {
  const connectionString = process.env[env];

  if (!connectionString) {
    // Missing on a laptop is fine. Missing in CI means the check quietly is
    // not running, which is the exact failure this script exists to catch.
    if (process.env.CI) {
      fail(`${name} postgres: ${env} is not set in CI`);
    } else {
      console.log(`⏭️  ${name} postgres: skipped, ${env} not set`);
    }
    return;
  }

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    fail(`${name} postgres: the pg package is missing, run npm install`);
    return;
  }

  const client = new Client({
    connectionString,
    // The pooler presents a certificate Node does not carry a root for. The
    // connection is still encrypted; there is no secret in `select 1` either
    // way, and the point of the call is that it happened at all.
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: PG_TIMEOUT_MS,
    statement_timeout: PG_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.query('select 1');
    console.log(`✅ ${name} postgres: reachable`);
  } catch (error) {
    fail(`${name} postgres: ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function keepAlive() {
  console.log('🚀 Starting keep-alive pings...');

  for (const url of HTTP_TARGETS) await pingHttp(url);
  for (const target of PG_TARGETS) await pingPostgres(target);

  const total = HTTP_TARGETS.length + PG_TARGETS.length;

  if (failures.length === 0) {
    console.log(`🏁 All ${total} targets answered.`);
    return;
  }

  console.log(`\n🔥 ${failures.length} of ${total} targets failed:`);
  for (const failure of failures) console.log(`   ${failure}`);

  // Exiting non-zero is the whole alerting system: GitHub mails the owner
  // when a scheduled workflow fails. A console line nobody reads is how a
  // restricted FaxGo went unnoticed until Supabase sent a pause warning.
  process.exitCode = 1;
}

keepAlive();
