/**
 * Local verification harness (dev-only, not part of the deliverable runtime):
 * starts an ephemeral PostgreSQL, runs `prisma migrate deploy` + `prisma db seed`
 * against it, prints verification queries, then shuts everything down.
 *
 * Usage: node scripts/verify-db.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'node:child_process';

const PORT = 5433;
const DB = 'commitcheck';
const DATA_DIR = './.verify-pg-data';

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: false,
});

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:${PORT}/${DB}`,
  DIRECT_URL: `postgresql://postgres:postgres@localhost:${PORT}/${DB}`,
};

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { env, stdio: 'inherit' });
}

try {
  console.log('Starting ephemeral PostgreSQL…');
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);

  run('npx prisma migrate deploy');
  run('npm run db:seed');

  console.log('\n✅ Migration + seed verified against real PostgreSQL.');
} catch (err) {
  console.error('\n❌ Verification failed:', err.message);
  process.exitCode = 1;
} finally {
  try {
    await pg.stop();
    console.log('Ephemeral PostgreSQL stopped.');
  } catch {
    /* already stopped */
  }
}
