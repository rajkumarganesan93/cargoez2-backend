import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './src/infrastructure/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations(): Promise<void> {
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
