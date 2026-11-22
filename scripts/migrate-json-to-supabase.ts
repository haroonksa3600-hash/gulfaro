import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import {
  readAdminResetTokens as readAdminResetTokensJson,
  readAdminSessions as readAdminSessionsJson,
  readAdmins as readAdminsJson,
  readApplications as readApplicationsJson,
  readAuditLogs as readAuditLogsJson,
  readAuthHistory as readAuthHistoryJson,
  readEmailLogs as readEmailLogsJson,
  readMarketplaceConfig as readMarketplaceConfigJson,
  readMonetization as readMonetizationJson,
  readReports as readReportsJson,
  readSiteSettings as readSiteSettingsJson,
  readSystemErrors as readSystemErrorsJson,
  readTrash as readTrashJson
} from '../server/superAdminStore';
import {
  readJobsJson,
  readResetTokensJson,
  readUsersJson,
  readVerificationCodesJson,
  upsertJobPg,
  upsertUserPg
} from '../server/repository';

dotenv.config();

const args = new Set(process.argv.slice(2));
const backupOnly = args.has('--backup-only');
const applySchema = args.has('--apply-schema');

function toIsoOrNull(val?: number | string | null): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return new Date(val).toISOString();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function createPreMigrationBackupSnapshot() {
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const snapshot = {
    createdAt: new Date().toISOString(),
    source: 'data/*.json',
    counts: {} as Record<string, number>,
    datasets: {
      users: readUsersJson(),
      jobs: readJobsJson(),
      admins: readAdminsJson(),
      adminSessions: readAdminSessionsJson(),
      adminResetTokens: readAdminResetTokensJson(),
      verificationCodes: readVerificationCodesJson(),
      resetTokens: readResetTokensJson(),
      reports: readReportsJson(),
      auditLogs: readAuditLogsJson(),
      authHistory: readAuthHistoryJson(),
      emailLogs: readEmailLogsJson(),
      systemErrors: readSystemErrorsJson(),
      trash: readTrashJson(),
      siteSettings: readSiteSettingsJson(),
      marketplaceConfig: readMarketplaceConfigJson(),
      monetization: readMonetizationJson(),
      applications: readApplicationsJson()
    }
  };

  snapshot.counts = {
    users: snapshot.datasets.users.length,
    jobs: snapshot.datasets.jobs.length,
    admins: snapshot.datasets.admins.length,
    adminSessions: snapshot.datasets.adminSessions.length,
    adminResetTokens: snapshot.datasets.adminResetTokens.length,
    verificationCodes: snapshot.datasets.verificationCodes.length,
    resetTokens: snapshot.datasets.resetTokens.length,
    reports: snapshot.datasets.reports.length,
    auditLogs: snapshot.datasets.auditLogs.length,
    authHistory: snapshot.datasets.authHistory.length,
    emailLogs: snapshot.datasets.emailLogs.length,
    systemErrors: snapshot.datasets.systemErrors.length,
    trash: snapshot.datasets.trash.length,
    applications: snapshot.datasets.applications.length
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotPath = path.join(backupsDir, `pre-supabase-snapshot-${stamp}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return { snapshot, snapshotPath };
}

async function main() {
  console.log('=== Gulfaro JSON -> Supabase PostgreSQL Migration Tool ===');
  const { snapshot, snapshotPath } = createPreMigrationBackupSnapshot();
  console.log(`[Backup] Pre-migration snapshot saved cleanly to: ${path.relative(process.cwd(), snapshotPath)}`);
  console.log('[Backup] Dataset counts:', snapshot.counts);

  if (backupOnly) {
    console.log('[Backup] --backup-only flag set; skipping PostgreSQL write. Existing /data/*.json untouched.');
    return;
  }

  const connectionString = (
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();

  if (!connectionString) {
    console.error('[Error] Neither DIRECT_DATABASE_URL, DATABASE_URL, nor SUPABASE_DB_URL is set.');
    console.error('Set DIRECT_DATABASE_URL or DATABASE_URL in your environment, or run with --backup-only.');
    process.exit(1);
  }

  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 15000,
    ssl: isLocal ? undefined : { rejectUnauthorized: process.env.PG_SSL_STRICT === 'true' }
  });

  const client = await pool.connect();
  try {
    if (applySchema) {
      const schemaPath = path.resolve(process.cwd(), 'supabase/migrations/001_initial_gulfaro_schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      console.log('[Schema] Applying supabase/migrations/001_initial_gulfaro_schema.sql ...');
      await client.query(schemaSql);
      console.log('[Schema] Schema applied successfully.');
    }

    await client.query('BEGIN');

    // 1. Users & normalized profiles
    for (const u of snapshot.datasets.users) {
      await upsertUserPg(client, u);
    }

    // 2. Jobs
    for (const j of snapshot.datasets.jobs) {
      await upsertJobPg(client, j);
    }

    // 3. Admins
    const validAdminIds = new Set<string>();
    for (const a of snapshot.datasets.admins) {
      validAdminIds.add(a.id);
      await client.query(
        `INSERT INTO public.admins (
          id, username, email, full_name, password_hash, role, permissions,
          is_owner, status, two_factor_enabled, two_factor_method, two_factor_secret,
          failed_attempts, lockout_until, last_login_at, last_login_ip, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          status = EXCLUDED.status,
          two_factor_enabled = EXCLUDED.two_factor_enabled,
          two_factor_method = EXCLUDED.two_factor_method,
          two_factor_secret = EXCLUDED.two_factor_secret,
          updated_at = EXCLUDED.updated_at`,
        [
          a.id,
          a.username,
          a.email.toLowerCase(),
          a.fullName,
          a.passwordHash,
          a.role,
          JSON.stringify(a.permissions || []),
          Boolean(a.isOwner),
          a.status || 'active',
          Boolean(a.twoFactorEnabled),
          a.twoFactorMethod || 'totp',
          a.twoFactorSecret || null,
          Number(a.failedAttempts || 0),
          toIsoOrNull(a.lockoutUntil),
          toIsoOrNull(a.lastLoginAt),
          a.lastLoginIp || null,
          toIsoOrNull(a.createdAt) || new Date().toISOString(),
          toIsoOrNull(a.updatedAt) || new Date().toISOString()
        ]
      );
    }

    // 4. Admin sessions
    for (const s of snapshot.datasets.adminSessions) {
      if (!validAdminIds.has(s.adminId)) continue;
      await client.query(
        `INSERT INTO public.admin_sessions (
          id, token_hash, admin_id, remember_me, created_at, last_activity_at, expires_at, ip, user_agent, revoked
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.tokenHash,
          s.adminId,
          Boolean(s.rememberMe),
          toIsoOrNull(s.createdAt) || new Date().toISOString(),
          toIsoOrNull(s.lastActivityAt) || new Date().toISOString(),
          toIsoOrNull(s.expiresAt) || new Date().toISOString(),
          s.ip || 'unknown',
          s.userAgent || '',
          Boolean(s.revoked)
        ]
      );
    }

    // 5. Admin reset tokens
    for (const t of snapshot.datasets.adminResetTokens) {
      if (!validAdminIds.has(t.adminId)) continue;
      await client.query(
        `INSERT INTO public.admin_reset_tokens (token_hash, admin_id, email, expires_at, used, used_at, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (token_hash) DO NOTHING`,
        [
          t.tokenHash,
          t.adminId,
          t.email,
          toIsoOrNull(t.expiresAt) || new Date().toISOString(),
          Boolean(t.used),
          toIsoOrNull(t.usedAt),
          t.ip || 'unknown',
          toIsoOrNull(t.createdAt) || new Date().toISOString()
        ]
      );
    }

    // 6. Verification codes (insert only if table currently empty to remain idempotent)
    const vcExisting = await client.query('SELECT COUNT(*)::int AS cnt FROM public.verification_codes');
    if ((vcExisting.rows[0]?.cnt || 0) === 0) {
      for (const v of snapshot.datasets.verificationCodes) {
        await client.query(
          `INSERT INTO public.verification_codes (email, code, token, expires_at, used, used_at, ip, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            v.email.toLowerCase(),
            v.code,
            v.token || null,
            toIsoOrNull(v.expiresAt) || new Date().toISOString(),
            Boolean(v.used),
            toIsoOrNull(v.usedAt),
            v.ip || null,
            toIsoOrNull(v.createdAt) || new Date().toISOString()
          ]
        );
      }
    }

    // 7. Password reset tokens
    for (const t of snapshot.datasets.resetTokens) {
      await client.query(
        `INSERT INTO public.password_reset_tokens (token_hash, user_id, email, expires_at, used, used_at, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (token_hash) DO NOTHING`,
        [
          t.tokenHash,
          t.userId || null,
          t.email.toLowerCase(),
          toIsoOrNull(t.expiresAt) || new Date().toISOString(),
          Boolean(t.used),
          toIsoOrNull(t.usedAt),
          t.ip || null,
          toIsoOrNull(t.createdAt) || new Date().toISOString()
        ]
      );
    }

    // 8. Reports
    for (const r of snapshot.datasets.reports) {
      await client.query(
        `INSERT INTO public.reports (
          id, target_type, target_id, target_title, target_owner_id, reason, category,
          details, reporter_name, reporter_email, reporter_ip, status, action_taken,
          resolved_by, resolved_at, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.targetType,
          r.targetId,
          r.targetTitle,
          r.targetOwnerId || null,
          r.reason,
          r.category || 'other',
          r.details || '',
          r.reporterName || 'Anonymous Visitor',
          r.reporterEmail || '',
          r.reporterIp || 'unknown',
          r.status || 'open',
          r.actionTaken || null,
          r.resolvedBy || null,
          toIsoOrNull(r.resolvedAt),
          toIsoOrNull(r.createdAt) || new Date().toISOString()
        ]
      );
    }

    // 9. Audit logs, Auth history, Email logs, System errors, Trash
    for (const l of snapshot.datasets.auditLogs) {
      await client.query(
        `INSERT INTO public.audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.adminId, l.adminUsername, l.action, l.targetType, l.targetId || null, l.details || '', l.ip || 'unknown', toIsoOrNull(l.createdAt) || new Date().toISOString()]
      );
    }

    for (const h of snapshot.datasets.authHistory) {
      await client.query(
        `INSERT INTO public.auth_history (id, actor_type, actor_id, email_or_username, event, success, ip, user_agent, reason, suspicious, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [h.id, h.actorType, h.actorId || null, h.emailOrUsername, h.event, Boolean(h.success), h.ip || 'unknown', h.userAgent || '', h.reason || null, Boolean(h.suspicious), toIsoOrNull(h.createdAt) || new Date().toISOString()]
      );
    }

    for (const e of snapshot.datasets.emailLogs) {
      await client.query(
        `INSERT INTO public.email_logs (id, recipient, subject, category, provider, status, message_id, error, triggered_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [e.id, e.recipient, e.subject, e.category, e.provider, e.status, e.messageId || null, e.error || null, e.triggeredBy || null, toIsoOrNull(e.createdAt) || new Date().toISOString()]
      );
    }

    for (const errRec of snapshot.datasets.systemErrors) {
      await client.query(
        `INSERT INTO public.system_errors (id, level, source, message, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [errRec.id, errRec.level, errRec.source, errRec.message, errRec.details || null, toIsoOrNull(errRec.createdAt) || new Date().toISOString()]
      );
    }

    for (const t of snapshot.datasets.trash) {
      await client.query(
        `INSERT INTO public.trash_items (trash_id, item_type, original_id, label, deleted_by, deleted_at, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         ON CONFLICT (trash_id) DO NOTHING`,
        [t.trashId, t.itemType, t.originalId, t.label, t.deletedBy, toIsoOrNull(t.deletedAt) || new Date().toISOString(), JSON.stringify(t.payload)]
      );
    }

    // 10. Platform settings (site_settings, marketplace_config, monetization)
    const settingsEntries: Array<[string, any]> = [
      ['site_settings', snapshot.datasets.siteSettings],
      ['marketplace_config', snapshot.datasets.marketplaceConfig],
      ['monetization', snapshot.datasets.monetization]
    ];
    for (const [key, val] of settingsEntries) {
      await client.query(
        `INSERT INTO public.platform_settings (key, value, updated_at)
         VALUES ($1,$2::jsonb,NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(val)]
      );
    }

    // 11. Legacy applications archive
    for (const a of snapshot.datasets.applications) {
      await client.query(
        `INSERT INTO public.legacy_applications (
          id, job_id, job_title, company_name, applicant_user_id, applicant_name,
          applicant_email, applicant_phone, applicant_whatsapp, current_country,
          current_city, iqama_status, years_experience, cover_note, resume_file_name,
          applied_at, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
          a.jobId,
          a.jobTitle,
          a.companyName,
          a.applicantUserId || null,
          a.applicantName,
          a.applicantEmail,
          a.applicantPhone || '',
          a.applicantWhatsapp || '',
          a.currentCountry || 'saudi-arabia',
          a.currentCity || 'Riyadh',
          a.iqamaStatus || 'any',
          a.yearsExperience || '',
          a.coverNote || '',
          a.resumeFileName || null,
          toIsoOrNull(a.appliedAt) || new Date().toISOString(),
          a.status || 'new'
        ]
      );
    }

    await client.query('COMMIT');

    // Parity verification query
    const countsRes = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.users) AS users,
        (SELECT COUNT(*)::int FROM public.jobs) AS jobs,
        (SELECT COUNT(*)::int FROM public.admins) AS admins,
        (SELECT COUNT(*)::int FROM public.admin_sessions) AS admin_sessions,
        (SELECT COUNT(*)::int FROM public.reports) AS reports,
        (SELECT COUNT(*)::int FROM public.audit_logs) AS audit_logs,
        (SELECT COUNT(*)::int FROM public.auth_history) AS auth_history,
        (SELECT COUNT(*)::int FROM public.email_logs) AS email_logs,
        (SELECT COUNT(*)::int FROM public.system_errors) AS system_errors,
        (SELECT COUNT(*)::int FROM public.trash_items) AS trash_items,
        (SELECT COUNT(*)::int FROM public.platform_settings) AS platform_settings,
        (SELECT COUNT(*)::int FROM public.legacy_applications) AS legacy_applications
    `);

    console.log('\n=== Migration Complete — PostgreSQL Row Counts ===');
    console.table(countsRes.rows[0]);
    console.log('Existing /data/*.json files remain preserved intact as backup.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    console.error('[Migration Failed]:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
