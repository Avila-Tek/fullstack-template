import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool, PoolClient } from 'pg';

export interface MigrationRunnerOptions {
  /** Caller-owned pg pool — runner never closes it. */
  pool: Pool;
  /** Absolute path to the drizzle output folder containing `meta/_journal.json`. */
  migrationsFolder: string;
  /** Short label used in log lines (e.g. `'api'`, `'auth'`). */
  label: string;
  /**
   * Postgres advisory lock key. All instances racing to migrate the same
   * database must use the same value. Defaults to a stable hash of `label`.
   */
  advisoryLockKey?: bigint;
  migrationsSchema?: string;
  migrationsTable?: string;
}

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

export class DrizzleMigrationError extends Error {
  constructor(
    message: string,
    readonly tag: string,
    readonly cause: unknown
  ) {
    super(message);
    this.name = 'DrizzleMigrationError';
  }
}

const DEFAULT_SCHEMA = 'drizzle';
const DEFAULT_TABLE = '__drizzle_migrations';

function defaultLockKey(label: string): bigint {
  const digest = createHash('sha256').update(`zoom:${label}`).digest();
  const lo = BigInt(digest.readUInt32BE(0));
  const hi = BigInt(digest.readInt32BE(4));
  return (hi << 32n) | lo;
}

function hashSql(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function ensureMigrationsTable(
  client: PoolClient,
  schema: string,
  table: string
): Promise<void> {
  const qSchema = quoteIdentifier(schema);
  const qTable = quoteIdentifier(table);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${qSchema}`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${qSchema}.${qTable} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`
  );
}

async function loadAppliedHashes(
  client: PoolClient,
  schema: string,
  table: string
): Promise<Set<string>> {
  const { rows } = await client.query<{ hash: string }>(
    `SELECT hash FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`
  );
  return new Set(rows.map((row) => row.hash));
}

async function applyMigrationFile(
  client: PoolClient,
  options: {
    entry: JournalEntry;
    migrationsFolder: string;
    schema: string;
    table: string;
  }
): Promise<void> {
  const { entry, migrationsFolder, schema, table } = options;
  const filePath = resolve(migrationsFolder, `${entry.tag}.sql`);
  const sql = readFileSync(filePath, 'utf-8');
  const hash = hashSql(sql);
  const statements = splitStatements(sql);

  console.log(`▶️  Applying ${entry.tag}`);

  await client.query('BEGIN');
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query(
      `INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(table)} ("hash", "created_at") VALUES ($1, $2)`,
      [hash, entry.when]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new DrizzleMigrationError(
      `Failed to apply migration ${entry.tag}`,
      entry.tag,
      err
    );
  }
}

/**
 * Apply pending Drizzle-generated migrations one file at a time, each in its
 * own transaction.
 *
 * Why not `drizzle-orm/.../migrator`'s built-in `migrate()`? It wraps every
 * pending migration in a single transaction, which breaks Postgres `ALTER TYPE
 * ... ADD VALUE` immediately followed by use of the new value in a subsequent
 * file (`code: 55P04`, "New enum values must be committed before they can be
 * used"). Per-file commits avoid that footgun.
 *
 * Compatibility: stores the same `(hash, created_at)` rows in
 * `drizzle.__drizzle_migrations` that drizzle's bundled migrator writes, so
 * databases already migrated by the bundled runner skip those rows.
 */
export async function runDrizzleMigrations(
  options: MigrationRunnerOptions
): Promise<void> {
  const {
    pool,
    migrationsFolder,
    label,
    advisoryLockKey = defaultLockKey(label),
    migrationsSchema = DEFAULT_SCHEMA,
    migrationsTable = DEFAULT_TABLE,
  } = options;

  const journalPath = resolve(migrationsFolder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as Journal;
  const ordered = [...journal.entries].sort((a, b) => a.idx - b.idx);

  console.log(`📦 Running ${label} migrations from ${migrationsFolder}`);

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [
      advisoryLockKey.toString(),
    ]);
    try {
      await ensureMigrationsTable(client, migrationsSchema, migrationsTable);
      const applied = await loadAppliedHashes(
        client,
        migrationsSchema,
        migrationsTable
      );

      let appliedCount = 0;
      for (const entry of ordered) {
        const filePath = resolve(migrationsFolder, `${entry.tag}.sql`);
        const sql = readFileSync(filePath, 'utf-8');
        if (applied.has(hashSql(sql))) continue;
        await applyMigrationFile(client, {
          entry,
          migrationsFolder,
          schema: migrationsSchema,
          table: migrationsTable,
        });
        appliedCount += 1;
      }

      if (appliedCount === 0) {
        console.log(`✨ No pending ${label} migrations.`);
      } else {
        console.log(
          `✅ ${label} migrations complete — applied ${appliedCount} migration(s).`
        );
      }
    } finally {
      await client
        .query('SELECT pg_advisory_unlock($1)', [advisoryLockKey.toString()])
        .catch(() => undefined);
    }
  } finally {
    client.release();
  }
}
