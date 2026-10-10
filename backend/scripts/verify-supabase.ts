/**
 * Verifies the Supabase database state after `prisma migrate deploy` + seed:
 * tables, enums, indexes, foreign keys, and row counts of the demo data.
 *
 * Usage (after .env has real Supabase URLs):
 *   npx ts-node --transpile-only scripts/verify-supabase.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_TABLES = [
  'projects',
  'scope_requirements',
  'meetings',
  'meeting_attachments',
  'commitments',
  'commitment_evidence',
  'change_requests',
  'documents',
  'activities',
];

const EXPECTED_ENUMS = [
  'ProjectStatus',
  'Priority',
  'RiskLevel',
  'ApprovalStatus',
  'MeetingAnalysisStatus',
  'ChangeRequestStatus',
  'DocumentType',
  'EvidenceSource',
  'ActivityAction',
  'ActivityEntityType',
];

async function main() {
  console.log('🔍 Verifying Supabase database…\n');

  // ——— tables ———
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  const tableNames = tables.map((t) => t.table_name);
  const missingTables = EXPECTED_TABLES.filter((t) => !tableNames.includes(t));
  console.log(`Tables: ${tableNames.length} found`, missingTables.length ? `❌ missing: ${missingTables.join(', ')}` : '✅ all 9 present');

  // ——— enums ———
  const enums = await prisma.$queryRaw<{ enum_name: string; values: string[] }[]>`
    SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    GROUP BY t.typname ORDER BY t.typname`;
  const enumMap = new Map(enums.map((e) => [e.enum_name, e.values]));
  const missingEnums = EXPECTED_ENUMS.filter((e) => !enumMap.has(e));
  console.log(`Enums: ${enums.length} found`, missingEnums.length ? `❌ missing: ${missingEnums.join(', ')}` : '✅ all 10 present');
  const actionValues = enumMap.get('ActivityAction') ?? [];
  const newValues = ['MEETING_UPDATED', 'MEETING_DELETED', 'MEETING_ATTACHMENT_CREATED', 'MEETING_ATTACHMENT_UPDATED', 'MEETING_ATTACHMENT_DELETED', 'COMMITMENT_CREATED', 'COMMITMENT_UPDATED', 'COMMITMENT_DELETED'];
  const missingEnumValues = newValues.filter((v) => !actionValues.includes(v));
  console.log(`ActivityAction values: ${actionValues.length}`, missingEnumValues.length ? `❌ missing: ${missingEnumValues.join(', ')}` : '✅ includes all phase additions');

  // ——— foreign keys ———
  const fks = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'`;
  const fkCount = Number(fks[0].count);
  console.log(`Foreign keys: ${fkCount} ${fkCount === 10 ? '✅' : `❌ expected 10`}`);

  // ——— cascades ———
  const cascades = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public' AND delete_rule = 'CASCADE'`;
  console.log(`Cascade rules: ${Number(cascades[0].count)} ${Number(cascades[0].count) === 10 ? '✅' : '(expected 10)'}`);

  // ——— indexes (non-unique, non-pkey — the 15 declared @@index entries) ———
  const indexes = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(DISTINCT indexname) AS count FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE '%_idx'`;
  console.log(`Declared indexes: ${Number(indexes[0].count)} ${Number(indexes[0].count) === 15 ? '✅' : '(expected 15 *_idx)'}`);

  // ——— seed data ———
  const seedCounts = await prisma.$queryRaw<{ commitments: bigint; evidence: bigint }[]>`
    SELECT
      (SELECT count(*) FROM "commitments") AS commitments,
      (SELECT count(*) FROM "commitment_evidence") AS evidence`;
  console.log(`Seed rows: commitments=${Number(seedCounts[0].commitments)} (expect 6) ${Number(seedCounts[0].commitments) === 6 ? '✅' : '⚠️'} · evidence=${Number(seedCounts[0].evidence)} (expect 7) ${Number(seedCounts[0].evidence) === 7 ? '✅' : '⚠️'}`);

  const projects = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM "projects"`;
  console.log(`Seed rows: projects=${Number(projects[0].count)} (expect 2) ${Number(projects[0].count) === 2 ? '✅' : '⚠️'}`);

  // ——— migration history ———
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name`;
  console.log(`Applied migrations: ${migrations.length} ${migrations.length >= 6 ? '✅' : '❌'}`);
  migrations.forEach((m) => console.log(`  · ${m.migration_name}`));

  console.log('\n✅ Verification complete.');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
