import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

declare global {
  var _gulfaroPgPool: Pool | undefined;
}

export type StorageBackendMode = 'postgres' | 'json';

export function getDatabaseConnectionString(): string {
  return (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
}

export function getStorageBackendMode(): StorageBackendMode {
  const explicit = (process.env.DB_BACKEND || '').trim().toLowerCase();
  if (explicit === 'json') {
    return 'json';
  }
  const connStr = getDatabaseConnectionString();
  if (explicit === 'postgres') {
    if (!connStr) {
      console.warn('[Gulfaro DB] DB_BACKEND=postgres set without DATABASE_URL; falling back to JSON store until DATABASE_URL is configured.');
      return 'json';
    }
    return 'postgres';
  }
  return connStr ? 'postgres' : 'json';
}

export function isPostgresEnabled(): boolean {
  return getStorageBackendMode() === 'postgres';
}

function shouldUseSsl(connectionString: string): boolean {
  if (process.env.PG_SSL === 'false') return false;
  if (/localhost|127\.0\.0\.1/i.test(connectionString) && process.env.PG_SSL !== 'true') {
    return false;
  }
  return true;
}

export function getPool(): Pool {
  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured for PostgreSQL connection.');
  }

  if (!global._gulfaroPgPool) {
    const useSsl = shouldUseSsl(connectionString);
    global._gulfaroPgPool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: useSsl
        ? {
            rejectUnauthorized: process.env.PG_SSL_STRICT === 'true'
          }
        : undefined
    });

    global._gulfaroPgPool.on('error', (err) => {
      console.error('[Gulfaro Postgres] Idle client error:', err?.message || err);
    });
  }

  return global._gulfaroPgPool;
}

export async function dbQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params);
  } catch (err: any) {
    console.error('[Gulfaro Postgres] Query failed:', err?.message || err);
    throw new Error('Database operation failed.', { cause: err });
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[Gulfaro Postgres] Rollback error:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function checkPostgresHealth(): Promise<{ connected: boolean; mode: StorageBackendMode }> {
  const mode = getStorageBackendMode();
  if (mode !== 'postgres') {
    return { connected: false, mode };
  }
  try {
    await getPool().query('SELECT 1');
    return { connected: true, mode };
  } catch {
    return { connected: false, mode };
  }
}
