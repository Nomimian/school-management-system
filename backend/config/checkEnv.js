// Fail-fast startup validation of required environment.
//
// Without this, a missing JWT_SECRET boots fine and only crashes at the first
// login, and a missing JWT_EXPIRE silently mints NON-EXPIRING tokens. We'd
// rather refuse to start than run mis-configured.

const PLACEHOLDER_SECRETS = new Set([
  'change-me-to-a-long-random-string',
  'your-secret-key',
  'secret',
  'changeme',
]);

module.exports = function checkEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const fatal = [];
  const warn  = [];

  // ── Hard requirements (any environment) ──────────────────────────────
  if (!process.env.MONGO_URI) fatal.push('MONGO_URI is not set.');

  if (!process.env.JWT_SECRET) {
    fatal.push('JWT_SECRET is not set.');
  } else if (PLACEHOLDER_SECRETS.has(process.env.JWT_SECRET.trim())) {
    (isProd ? fatal : warn).push('JWT_SECRET is still the placeholder value — set a long random secret.');
  } else if (process.env.JWT_SECRET.length < 16) {
    (isProd ? fatal : warn).push('JWT_SECRET is short (<16 chars) — use a longer random secret.');
  }

  // Never allow non-expiring tokens by omission.
  if (!process.env.JWT_EXPIRE) {
    process.env.JWT_EXPIRE = '7d';
    warn.push('JWT_EXPIRE was not set — defaulting to 7d.');
  }

  // ── SuperAdmin credentials ───────────────────────────────────────────
  // The portal is disabled at runtime when these are unset (see
  // superAdminController.login); in production we refuse to start so it's
  // never silently unreachable or, worse, running on a published default.
  if (!process.env.SA_EMAIL || !process.env.SA_PASSWORD) {
    (isProd ? fatal : warn).push('SA_EMAIL / SA_PASSWORD not set — SuperAdmin portal is disabled.');
  } else if (['SuperAdmin@123', 'superadmin@edumanage.pro'].includes(process.env.SA_PASSWORD)) {
    (isProd ? fatal : warn).push('SA_PASSWORD is a well-known default — change it.');
  }

  warn.forEach(m => console.warn(`⚠️  ENV: ${m}`));

  if (fatal.length) {
    console.error('\n❌ Refusing to start — invalid environment:');
    fatal.forEach(m => console.error(`   • ${m}`));
    console.error('   Set these in your .env (see .env.example) and restart.\n');
    process.exit(1);
  }
};
