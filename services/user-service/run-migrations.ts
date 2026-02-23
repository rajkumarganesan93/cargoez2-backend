import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from service root (parent of dist) so migrate works when run from repo root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// When running from dist/run-migrations.js, migrations live in service root (parent of dist)
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function runMigrations(): Promise<void> {
  const { getPool } = await import('./src/infrastructure/db.js');
  const pool = getPool();
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, 'utf-8');
    console.log(`Running ${file}...`);
    await pool.query(sql);
    console.log(`Done ${file}`);
  }
  await pool.end();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
