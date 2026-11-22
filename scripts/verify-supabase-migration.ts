import assert from 'assert';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const BASE_URL = (process.env.APP_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const SA_USERNAME = 'Haroon555';
const SA_PASSWORD = process.env.SUPER_ADMIN_INITIAL_PASSWORD || '@Haroon15607';

async function apiJson(pathUrl: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${pathUrl}`, options);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function verifyDatabaseSchemaAndRls() {
  const connStr = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
  if (!connStr) {
    console.log('[DB Verify] No DATABASE_URL configured; skipping live PostgreSQL table/RLS checks.');
    return;
  }

  console.log('[DB Verify] Checking PostgreSQL tables and Row Level Security...');
  const isLocal = /localhost|127\.0\.0\.1/i.test(connStr);
  const pool = new Pool({
    connectionString: connStr,
    max: 3,
    connectionTimeoutMillis: 15000,
    ssl: isLocal ? undefined : { rejectUnauthorized: process.env.PG_SSL_STRICT === 'true' }
  });

  const expectedTables = [
    'users',
    'employer_profiles',
    'job_seeker_profiles',
    'jobs',
    'verification_codes',
    'email_verification_tokens',
    'password_reset_tokens',
    'auth_rate_limits',
    'admins',
    'admin_sessions',
    'admin_reset_tokens',
    'reports',
    'audit_logs',
    'auth_history',
    'email_logs',
    'system_errors',
    'trash_items',
    'platform_settings',
    'legacy_applications'
  ];

  try {
    const res = await pool.query(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [expectedTables]
    );
    const byName = new Map(res.rows.map((r: any) => [r.tablename, Boolean(r.rowsecurity)]));
    for (const tbl of expectedTables) {
      assert.strictEqual(byName.has(tbl), true, `Missing PostgreSQL table: public.${tbl}`);
      assert.strictEqual(byName.get(tbl), true, `RLS is NOT enabled on public.${tbl}`);
    }

    const legacyCols = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = ANY($1::text[])`,
      [['access_key_hash', 'failed_attempts', 'lockout_until']]
    );
    assert.strictEqual(
      legacyCols.rows.length,
      0,
      `Deprecated Access Key columns still exist on public.users: ${legacyCols.rows.map((r: any) => r.column_name).join(', ')}`
    );
    console.log(`[DB Verify] All ${expectedTables.length} PostgreSQL tables exist with RLS enabled and Access Key columns removed.`);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log(`=== Gulfaro End-to-End Verification (${BASE_URL}) ===`);

  // 1. Health & Public Config
  const health = await apiJson('/api/health');
  assert.strictEqual(health.status, 200, `Health check failed: ${JSON.stringify(health.body)}`);
  assert.strictEqual(health.body?.status, 'ok');
  console.log('[Pass] /api/health:', health.body);

  const publicCfg = await apiJson('/api/public/config');
  assert.strictEqual(publicCfg.status, 200);
  assert.ok(Array.isArray(publicCfg.body?.countries), 'countries missing from /api/public/config');
  console.log('[Pass] /api/public/config loaded cleanly.');

  // 2. Jobs listing & Direct Email/Phone-Only rule
  const jobsRes = await apiJson('/api/jobs');
  assert.strictEqual(jobsRes.status, 200);
  assert.ok(Array.isArray(jobsRes.body));
  for (const j of jobsRes.body) {
    assert.strictEqual(j.howToApply || 'email', 'email', `Job ${j.id} does not conform to email/phone direct policy`);
  }
  console.log(`[Pass] /api/jobs returned ${jobsRes.body.length} jobs (all conforming to direct email/phone policy).`);

  // 3. Disabled online application route returns 410 Gone
  const legacyAppRes = await apiJson('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: 'GF-101' })
  });
  assert.strictEqual(legacyAppRes.status, 410, 'Online application endpoint must return 410 Gone');
  console.log('[Pass] POST /api/applications returns 410 Gone as required.');

  // 4. Custom Authentication E2E (Register unverified -> 403 Unverified Block -> Access Key Routes 404 -> Forgot Password -> Login)
  const testStamp = Date.now();
  const testEmail = `verify.emp.${testStamp}@gulfaro-test.example.com`;
  const testPhone = `+966 55 ${String(testStamp).slice(-7)}`;
  const initialPass = 'TestPass123';

  const legacyAkVerify = await apiJson('/api/auth/verify-access-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, accessKey: '12345' })
  });
  assert.strictEqual(legacyAkVerify.status, 404, 'Legacy /api/auth/verify-access-key must return 404');

  const legacyAkReset = await apiJson('/api/auth/reset-password-access-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken: 'invalid', newPassword: 'TestPass123' })
  });
  assert.strictEqual(legacyAkReset.status, 404, 'Legacy /api/auth/reset-password-access-key must return 404');
  console.log('[Pass] Legacy Access Key endpoints removed (404).');

  const regRes = await apiJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'employer',
      name: 'Muhammad Haroon',
      email: testEmail,
      phone: testPhone,
      country: 'saudi-arabia',
      city: 'Riyadh',
      companyName: 'VerifyTest Contracting Co.',
      hiringOrgName: 'VerifyTest Contracting Co.',
      password: initialPass,
      confirmPassword: initialPass
    })
  });
  assert.strictEqual(regRes.status, 201, `Employer registration failed: ${JSON.stringify(regRes.body)}`);
  assert.strictEqual(regRes.body?.requiresVerification, true, 'Registration must require email verification');
  assert.strictEqual(regRes.body?.user?.emailVerified, false, 'Newly registered user must start unverified');
  assert.ok(!regRes.body?.token, 'Unverified registration must not issue a session token');
  assert.ok(!regRes.body.user.password && !regRes.body.user.passwordHash, 'Sensitive hashes leaked in registration response!');
  const createdUserId = regRes.body.user.id;
  console.log('[Pass] Custom Employer Registration created unverified sanitized record without Access Key:', createdUserId);

  const dupRes = await apiJson('/api/auth/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  assert.strictEqual(dupRes.body?.exists, true);
  console.log('[Pass] Duplicate email check works cleanly.');

  const blockedLoginRes = await apiJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: initialPass })
  });
  assert.strictEqual(blockedLoginRes.status, 403, 'Unverified login must be blocked with HTTP 403');
  assert.strictEqual(blockedLoginRes.body?.code, 'EMAIL_NOT_VERIFIED');
  console.log('[Pass] Unverified account login blocked cleanly with HTTP 403.');

  const forgotRes = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent.verify@gulfaro-test.example.com' })
  });
  assert.strictEqual(forgotRes.status, 200);
  console.log('[Pass] Forgot password endpoint responds with anti-enumeration HTTP 200.');

  // 5. Isolated Super Admin Authentication + Session + Activate & Cleanup verification user
  const saLoginRes = await apiJson('/api/super-admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: SA_USERNAME, password: SA_PASSWORD })
  });
  assert.strictEqual(saLoginRes.status, 200, `Super Admin login failed: ${JSON.stringify(saLoginRes.body)}`);
  if (!saLoginRes.body.requiresTwoFactor) {
    const saToken = saLoginRes.body.token;
    assert.ok(saToken, 'Missing Super Admin session token');

    // Verify user via Super Admin to test authenticated job posting & deletion
    const verifyPatch = await apiJson(`/api/super-admin/users/${createdUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`
      },
      body: JSON.stringify({ emailVerified: true })
    });
    assert.strictEqual(verifyPatch.status, 200);

    const loginRes = await apiJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPass })
    });
    assert.strictEqual(loginRes.status, 200, `Verified login failed: ${JSON.stringify(loginRes.body)}`);
    assert.ok(loginRes.body?.token, 'Verified login did not return JWT token');
    assert.ok(!loginRes.body.user.passwordHash, 'Sensitive passwordHash leaked in login response!');

    // Job publish + No External Links + Delete
    const badLinkJobRes = await apiJson('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.body.token}`
      },
      body: JSON.stringify({
        userId: createdUserId,
        title: 'Site Engineer',
        company: 'VerifyTest Contracting Co.',
        country: 'saudi-arabia',
        city: 'Riyadh',
        category: 'engineering-construction',
        employmentType: 'full-time',
        workMode: 'on-site',
        contactPerson: 'Muhammad Haroon',
        contactEmail: testEmail,
        contactPhone: testPhone,
        description: 'Apply at https://external-careers.example.com today.'
      })
    });
    assert.strictEqual(badLinkJobRes.status, 400, 'No-external-links policy must block URLs in description');

    const createJobRes = await apiJson('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.body.token}`
      },
      body: JSON.stringify({
        userId: createdUserId,
        title: 'Electrical Site Supervisor',
        company: 'VerifyTest Contracting Co.',
        country: 'saudi-arabia',
        city: 'Riyadh',
        category: 'engineering-construction',
        employmentType: 'full-time',
        workMode: 'on-site',
        vacanciesCount: 2,
        salaryDisplay: '8,500 SAR / month',
        currency: 'SAR',
        contactPerson: 'Muhammad Haroon',
        contactEmail: testEmail,
        contactPhone: testPhone,
        description: 'Supervising industrial electrical installations across Riyadh commercial sites. Direct email or phone inquiries.'
      })
    });
    assert.strictEqual(createJobRes.status, 201, `Job creation failed: ${JSON.stringify(createJobRes.body)}`);
    const createdJobId = createJobRes.body.id;

    const delJobRes = await apiJson(`/api/jobs/${createdJobId}?userId=${encodeURIComponent(createdUserId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${loginRes.body.token}`,
        'x-gulfaro-user-id': createdUserId
      }
    });
    assert.strictEqual(delJobRes.status, 200, `Job deletion failed: ${JSON.stringify(delJobRes.body)}`);
    console.log('[Pass] Verified login + job publish + external-link blocking + ownership delete verified.');

    const sessionCheck = await apiJson('/api/super-admin/auth/session', {
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert.strictEqual(sessionCheck.status, 200);
    assert.strictEqual(sessionCheck.body?.authenticated, true);

    const backupRes = await apiJson('/api/super-admin/backup/download', {
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert.strictEqual(backupRes.status, 200);
    assert.ok(Array.isArray(backupRes.body?.data?.users), 'Backup payload missing users dataset');

    const cleanupRes = await apiJson(`/api/super-admin/users/${createdUserId}?permanent=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert.strictEqual(cleanupRes.status, 200, 'Failed to clean up verification user');

    await apiJson('/api/super-admin/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    console.log('[Pass] Super Admin login + session + backup export + test cleanup verified.');
  } else {
    console.log('[Info] Super Admin account has 2FA enabled; login challenge issued cleanly.');
  }

  // 7. PostgreSQL table & RLS verification (if DATABASE_URL is configured)
  await verifyDatabaseSchemaAndRls();

  console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
}

main().catch(err => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
