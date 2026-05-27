/**
 * apply-migrations.ts
 * Applies pending SQL migration files directly over the Neon WebSocket
 * connection (port 443), bypassing the blocked port 5432.
 *
 * Usage: npx ts-node apply-migrations.ts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

neonConfig.webSocketConstructor = ws;

const MIGRATIONS_DIR = path.join(__dirname, 'prisma', 'migrations');

async function run() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({ connectionString });

    // Ensure the migration history table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
            id              VARCHAR(36) PRIMARY KEY,
            checksum        VARCHAR(64) NOT NULL,
            finished_at     TIMESTAMPTZ,
            migration_name  VARCHAR(255) NOT NULL,
            logs            TEXT,
            rolled_back_at  TIMESTAMPTZ,
            started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            applied_steps_count INTEGER NOT NULL DEFAULT 0
        )
    `);

    // Get already-applied migrations
    const { rows } = await pool.query<{ migration_name: string }>(
        `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
    );
    const applied = new Set(rows.map(r => r.migration_name));

    // Read all migration directories sorted
    const dirs = fs.readdirSync(MIGRATIONS_DIR)
        .filter(d => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
        .sort();

    let pendingCount = 0;
    for (const dir of dirs) {
        if (applied.has(dir)) {
            console.log(`  ✓ Already applied: ${dir}`);
            continue;
        }

        const sqlFile = path.join(MIGRATIONS_DIR, dir, 'migration.sql');
        if (!fs.existsSync(sqlFile)) {
            console.log(`  ⚠ No migration.sql in ${dir}, skipping`);
            continue;
        }

        const sql = fs.readFileSync(sqlFile, 'utf-8');
        console.log(`  → Applying: ${dir}`);

        try {
            await pool.query('BEGIN');
            await pool.query(sql);

            // Record as applied
            await pool.query(
                `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
                 VALUES ($1, $2, NOW(), $3, 1)
                 ON CONFLICT (id) DO NOTHING`,
                [randomUUID(), Buffer.from(sql).toString('base64').slice(0, 64), dir]
            );

            await pool.query('COMMIT');
            console.log(`  ✅ Applied: ${dir}`);
            pendingCount++;
        } catch (err: any) {
            await pool.query('ROLLBACK');
            // If the error is "already exists", record it as applied and continue
            if (err.message?.includes('already exists') || err.code === '42P07' || err.code === '42701') {
                console.log(`  ℹ  Already exists (skipping): ${dir} — ${err.message?.split('\n')[0]}`);
                await pool.query(
                    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
                     VALUES ($1, $2, NOW(), $3, 1)
                     ON CONFLICT (id) DO NOTHING`,
                    [randomUUID(), Buffer.from(sql).toString('base64').slice(0, 64), dir]
                );
            } else {
                console.error(`  ✗ Failed: ${dir}\n    ${err.message}`);
                process.exit(1);
            }
        }
    }

    await pool.end();

    if (pendingCount === 0) {
        console.log('\n✅ Database is already up to date — no pending migrations.');
    } else {
        console.log(`\n✅ Done — applied ${pendingCount} migration(s).`);
    }
}

run().catch(err => {
    console.error('Migration runner failed:', err);
    process.exit(1);
});
