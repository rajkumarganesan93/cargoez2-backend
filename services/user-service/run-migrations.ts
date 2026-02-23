import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrationsDir = path.join(__dirname, '..', 'migrations');

async function runMigrations(): Promise<void> {
  const { getKnex } = await import('./src/infrastructure/db.js');
  const knex = getKnex();
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, 'utf-8');
    console.log(`Running ${file}...`);
    await knex.raw(sql);
    console.log(`Done ${file}`);
  }
  await knex.destroy();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
