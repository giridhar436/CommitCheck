/**
 * End-to-end Scope & Document Intelligence tests (Phase 13): ephemeral
 * PostgreSQL + compiled Nest app + deterministic development AI provider.
 * Covers the real project-documents API (metadata CRUD under
 * /projects/:projectId/documents), the deterministic text-extraction
 * lifecycle (PENDING → COMPLETED/FAILED, idempotent reprocessing, empty
 * input failure, unsupported "no content" input → 400), scope-requirement
 * → source-document traceability (nullable, same-project enforced, SET NULL
 * on document deletion), and that Phases 10/11 deterministic verification
 * and the change-request workflow still work. PDF/OCR/pgvector are NOT
 * implemented — the suite asserts honest failures instead of fake extracts.
 * The real Fireworks API is never called.
 * Usage: node scripts/test-documents-api.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawn, execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const PG_PORT = 5433;
const API_PORT = 3100;
const BASE = `http://localhost:${API_PORT}/api`;
const DB = 'commitcheck';

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  DIRECT_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  PORT: String(API_PORT),
  MEETING_ANALYSIS_PROVIDER: 'development',
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/projects`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('API never became ready');
}

let api;
let prisma = null;
const pg = new EmbeddedPostgres({
  databaseDir: './.verify-pg-data',
  user: 'postgres',
  password: 'postgres',
  port: PG_PORT,
  persistent: false,
});

try {
  console.log('Starting ephemeral PostgreSQL + API…');
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npm run db:seed', { env, stdio: 'inherit' });

  api = spawn('node', ['dist/main.js'], { env, stdio: 'pipe' });
  api.stderr.on('data', (d) => process.stderr.write(d));
  await waitReady();

  prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  // ——— fixtures (all created through the real API, verified like a user) ———
  console.log('\n—— Fixtures ——');
  const projA = (await req('POST', '/projects', {
    name: 'Phase 13 Documents Project',
    clientName: 'DocCorp',
  })).json.data;
  const projB = (await req('POST', '/projects', {
    name: 'Phase 13 Other Project',
    clientName: 'OtherCorp',
  })).json.data;

  const docPath = (name) => `projects/${projA.id}/docs/${name}`;

  // ——— A. Document CRUD ——
  console.log('\n—— A. Document CRUD ——');
  const created = await req('POST', `/projects/${projA.id}/documents`, {
    title: 'NovaBank SOW v3 (signed)',
    type: 'SOW',
    storagePath: docPath('sow-v3.txt'),
    fileSize: 482_133,
  });
  const doc = created.json.data;
  check('A: create document succeeds with PENDING lifecycle', created.status === 201 && doc.processingStatus === 'PENDING' && doc.processedAt === null && doc.processingError === null, JSON.stringify(created.json.data));
  check('A: create response is metadata-only (no extractedText/sourceRequirements)', !('extractedText' in doc) && !('sourceRequirements' in doc));
  check('A: create logged DOCUMENT_UPLOADED with entity id', doc.latestActivity?.action === 'DOCUMENT_UPLOADED' && doc.latestActivity?.entityId === doc.id, JSON.stringify(doc.latestActivity));

  const doc2 = (await req('POST', `/projects/${projA.id}/documents`, {
    title: 'Technical Requirements Spec',
    type: 'REQUIREMENTS',
    storagePath: docPath('tech-spec.txt'),
    fileSize: 267_912,
  })).json.data;
  const docB = (await req('POST', `/projects/${projB.id}/documents`, {
    title: 'Other Project SOW',
    type: 'SOW',
    storagePath: `projects/${projB.id}/docs/other-sow.txt`,
  })).json.data;

  const list = await req('GET', `/projects/${projA.id}/documents`);
  check('A: list is paginated and scoped to the project', list.status === 200 && list.json.data.items.length === 2 && list.json.data.totalItems === 2 && list.json.data.items.every((d) => d.projectId === projA.id));
  check('A: list items never expose extracted text', list.json.data.items.every((d) => !('extractedText' in d) && !('content' in d)));

  const detail = await req('GET', `/projects/${projA.id}/documents/${doc.id}`);
  check('A: detail returns lifecycle + empty traceability', detail.status === 200 && detail.json.data.processingStatus === 'PENDING' && detail.json.data.extractedText === null && Array.isArray(detail.json.data.sourceRequirements) && detail.json.data.sourceRequirements.length === 0);

  const patched = await req('PATCH', `/projects/${projA.id}/documents/${doc.id}`, { title: 'NovaBank SOW v3.1 (signed)' });
  check('A: update metadata works and stays PENDING', patched.status === 200 && patched.json.data.title === 'NovaBank SOW v3.1 (signed)' && patched.json.data.processingStatus === 'PENDING' && patched.json.data.latestActivity?.action === 'DOCUMENT_UPDATED');

  const typed = await req('GET', `/projects/${projA.id}/documents?type=REQUIREMENTS`);
  check('A: type filter works', typed.status === 200 && typed.json.data.items.length === 1 && typed.json.data.items[0].id === doc2.id);
  const searched = await req('GET', `/projects/${projA.id}/documents?search=sow`);
  check('A: title search works (case-insensitive)', searched.status === 200 && searched.json.data.items.length === 1 && searched.json.data.items[0].id === doc.id);

  check('A: missing title → 400', (await req('POST', `/projects/${projA.id}/documents`, { type: 'SOW', storagePath: docPath('x.txt') })).status === 400);
  check('A: storagePath outside projects/ → 400', (await req('POST', `/projects/${projA.id}/documents`, { title: 'Bad', type: 'SOW', storagePath: 'sow.pdf' })).status === 400);
  check('A: unknown document type → 400', (await req('POST', `/projects/${projA.id}/documents`, { title: 'Bad', type: 'NOT_A_TYPE', storagePath: docPath('x.txt') })).status === 400);
  check('A: unknown project list → 404', (await req('GET', '/projects/11111111-1111-4111-8111-111111111111/documents')).status === 404);
  check('A: unknown document detail → 404', (await req('GET', `/projects/${projA.id}/documents/22222222-2222-4222-8222-222222222222`)).status === 404);

  // ——— B. Isolation (before anything else can confuse the picture) ——
  console.log('\n—— B. Isolation ——');
  check('B: project B cannot read project A document', (await req('GET', `/projects/${projB.id}/documents/${doc.id}`)).status === 404);
  check('B: project B cannot update project A document', (await req('PATCH', `/projects/${projB.id}/documents/${doc.id}`, { title: 'Hacked' })).status === 404);
  check('B: project B cannot delete project A document', (await req('DELETE', `/projects/${projB.id}/documents/${doc.id}`)).status === 404);
  check('B: project B cannot process project A document', (await req('POST', `/projects/${projB.id}/documents/${doc.id}/process`, { textContent: 'sneaky' })).status === 404);
  const listB = await req('GET', `/projects/${projB.id}/documents`);
  check('B: project B list contains no project A documents', listB.status === 200 && listB.json.data.items.length === 1 && listB.json.data.items[0].id === docB.id);

  // ——— C. Deterministic processing ——
  console.log('\n—— C. Processing ——');
  const rawText = '\uFEFFSECTION 1 — DELIVERABLES\r\nThe supplier shall deliver a login page.\r\n\r\nSECTION 2 — SUPPORT\x07\n  Trailing spaces here.   \n\n\n\nEND of clause \x00 dump.';
  const processed = await req('POST', `/projects/${projA.id}/documents/${doc.id}/process`, { textContent: rawText });
  check('C: processing succeeds (PENDING → COMPLETED)', processed.status === 200 && processed.json.data.processingStatus === 'COMPLETED' && processed.json.data.processingError === null && processed.json.data.processedAt !== null, JSON.stringify({ status: processed.json.data?.processingStatus, error: processed.json.data?.processingError }));
  const normalized = processed.json.data.extractedText;
  check('C: extracted text is normalized (BOM/control chars/CRLF removed)', normalized?.content === 'SECTION 1 — DELIVERABLES\nThe supplier shall deliver a login page.\n\nSECTION 2 — SUPPORT\nTrailing spaces here.\n\nEND of clause  dump.', JSON.stringify(normalized?.content));
  check('C: charCount matches stored content length', normalized?.charCount === normalized?.content.length);

  const reprocessed = await req('POST', `/projects/${projA.id}/documents/${doc.id}/process`);
  check('C: reprocessing without body is deterministic (stored text)', reprocessed.status === 200 && reprocessed.json.data.extractedText?.content === normalized.content && reprocessed.json.data.extractedText?.charCount === normalized.charCount);
  const reprocessedAgain = await req('POST', `/projects/${projA.id}/documents/${doc.id}/process`, { textContent: rawText });
  check('C: reprocessing with the same body is byte-identical', reprocessedAgain.json.data.extractedText?.content === normalized.content && reprocessedAgain.json.data.extractedText?.charCount === normalized.charCount);

  check('C: list still metadata-only after processing', (await req('GET', `/projects/${projA.id}/documents`)).json.data.items.every((d) => !('extractedText' in d)));
  check('C: processing with no content anywhere → 400 (honest unsupported input)', (await req('POST', `/projects/${projA.id}/documents/${doc2.id}/process`)).status === 400);

  const blankDoc = (await req('POST', `/projects/${projA.id}/documents`, {
    title: 'Blank Scan',
    type: 'OTHER',
    storagePath: docPath('blank.txt'),
  })).json.data;
  const failed = await req('POST', `/projects/${projA.id}/documents/${blankDoc.id}/process`, { textContent: '   \n\r\n\t\u0007\u0000  ' });
  check('C: empty-after-normalization input → FAILED state with reason', failed.status === 200 && failed.json.data.processingStatus === 'FAILED' && failed.json.data.processingError?.includes('No extractable text content') && failed.json.data.extractedText === null, JSON.stringify({ status: failed.json.data?.processingStatus, error: failed.json.data?.processingError }));
  check('C: FAILED processing logged as DOCUMENT_PROCESSING_FAILED', failed.json.data.latestActivity?.action === 'DOCUMENT_PROCESSING_FAILED');
  const recovered = await req('POST', `/projects/${projA.id}/documents/${blankDoc.id}/process`, { textContent: 'Real content arrives late.' });
  check('C: FAILED document recovers to COMPLETED on valid input', recovered.status === 200 && recovered.json.data.processingStatus === 'COMPLETED' && recovered.json.data.processingError === null);

  const oversized = await req('POST', `/projects/${projA.id}/documents/${doc.id}/process`, { textContent: 'x'.repeat(2_000_001) });
  check('C: oversized textContent rejected safely (400 validation or 413 body limit)', [400, 413].includes(oversized.status), `status=${oversized.status} body=${JSON.stringify(oversized.json)?.slice(0, 300)}`);
  const docActivity = await req('GET', `/projects/${projA.id}/activity?limit=100&action=DOCUMENT_PROCESSED`);
  check('C: DOCUMENT_PROCESSED entries in the audit trail', docActivity.status === 200 && docActivity.json.data.items.length >= 3);
  const dash = (await req('GET', `/projects/${projA.id}/dashboard`)).json.data;
  check('C: dashboard recent activity reflects document processing', dash.recentActivity.some((a) => a.action === 'DOCUMENT_PROCESSED' && a.entityId === doc.id));

  // ——— D. Requirement → source document traceability ——
  console.log('\n—— D. Traceability ——');
  const traced = await req('POST', `/projects/${projA.id}/scope`, {
    title: 'Login page per SOW section 1',
    description: 'Deliver a login page as required by the SOW.',
    category: 'Authentication',
    approvalStatus: 'AUTHORIZED',
    sourceDocumentId: doc.id,
  });
  check('D: requirement can reference a source document', traced.status === 201 && traced.json.data.sourceDocument?.id === doc.id && traced.json.data.sourceDocument?.type === 'SOW' && traced.json.data.sourceDocument?.title === 'NovaBank SOW v3.1 (signed)', JSON.stringify(traced.json.data?.sourceDocument));

  const manual = await req('POST', `/projects/${projA.id}/scope`, {
    title: 'Manual requirement without a document',
    category: 'Operations',
  });
  check('D: requirements without documents still work (sourceDocument null)', manual.status === 201 && manual.json.data.sourceDocument === null);

  check('D: cross-project source document → 400', (await req('POST', `/projects/${projB.id}/scope`, { title: 'Steals a doc', category: 'X', sourceDocumentId: doc.id })).status === 400);
  check('D: nonexistent source document → 400', (await req('POST', `/projects/${projA.id}/scope`, { title: 'Ghost source', category: 'X', sourceDocumentId: '33333333-3333-4333-8333-333333333333' })).status === 400);

  const docDetail = await req('GET', `/projects/${projA.id}/documents/${doc.id}`);
  check('D: document detail lists requirements sourced from it', docDetail.json.data.sourceRequirements.some((r) => r.id === traced.json.data.id && r.title === 'Login page per SOW section 1'), JSON.stringify(docDetail.json.data.sourceRequirements));

  // ——— E. Phases 10/11 still work end-to-end ——
  console.log('\n—— E. Verification & CR intact ——');
  const meeting = (await req('POST', `/projects/${projA.id}/meetings`, {
    title: 'Phase 13 Sprint Review',
    meetingDate: '2026-10-12T15:00:00Z',
    summary: 'Client asked for a Telegram alerting integration.',
  })).json.data;
  const commitment = (await req('POST', `/projects/${projA.id}/commitments`, {
    title: 'Add Telegram bot alerts for deployments',
    description: 'Team promised Telegram alerts when deployments finish.',
    speaker: 'Dana Client',
    meetingId: meeting.id,
  })).json.data;
  const verify = await req('POST', `/projects/${projA.id}/commitments/${commitment.id}/verify`);
  check('E: Phase 10 verification unchanged (HIGH/UNAUTHORIZED scope creep)', verify.status === 200 && verify.json.data.risk === 'HIGH' && verify.json.data.authorizationStatus === 'UNAUTHORIZED', JSON.stringify({ status: verify.status, risk: verify.json.data?.risk, auth: verify.json.data?.authorizationStatus }));

  const evidence = await req('POST', `/projects/${projA.id}/commitments/${commitment.id}/evidence`, { quote: 'We will wire Telegram alerts this sprint.', source: 'TRANSCRIPT' });
  check('E: evidence remains project-scoped (created under project A)', evidence.status === 201 && evidence.json.data.commitmentId === commitment.id);
  check('E: evidence cannot be read through project B path', (await req('GET', `/projects/${projB.id}/commitments/${commitment.id}/evidence/${evidence.json.data.id}`)).status === 404);

  const cr = (await req('POST', `/projects/${projA.id}/commitments/${commitment.id}/change-request`)).json.data;
  const approved = await req('POST', `/projects/${projA.id}/change-requests/${cr.id}/approve`, { reason: 'SOW amendment signed' });
  check('E: Phase 11 approval still authorizes the commitment (AUTHORIZED/LOW)', approved.status === 200 && approved.json.data.status === 'APPROVED' && approved.json.data.commitment?.authorizationStatus === 'AUTHORIZED' && approved.json.data.commitment?.riskLevel === 'LOW', JSON.stringify({ status: approved.json.data?.status, auth: approved.json.data?.commitment }));

  // ——— F. Deletion semantics ——
  console.log('\n—— F. Deletion ——');
  const delDoc = (await req('POST', `/projects/${projA.id}/documents`, {
    title: 'Disposable Addendum',
    type: 'CONTRACT',
    storagePath: docPath('addendum.txt'),
  })).json.data;
  await req('POST', `/projects/${projA.id}/documents/${delDoc.id}/process`, { textContent: 'Addendum body text.' });
  const traced2 = (await req('POST', `/projects/${projA.id}/scope`, {
    title: 'Addendum-sourced requirement',
    category: 'Delivery',
    sourceDocumentId: delDoc.id,
  })).json.data;
  check('F: requirement source trace exists before deletion', (await req('GET', `/projects/${projA.id}/scope/${traced2.id}`)).json.data.sourceDocument?.id === delDoc.id);

  const deleted = await req('DELETE', `/projects/${projA.id}/documents/${delDoc.id}`);
  check('F: delete document succeeds and logs DOCUMENT_DELETED', deleted.status === 200 && deleted.json.data.id === delDoc.id && (await req('GET', `/projects/${projA.id}/documents/${delDoc.id}`)).status === 404);
  check('F: deleted document disappears from the project list', !(await req('GET', `/projects/${projA.id}/documents?limit=100`)).json.data.items.some((d) => d.id === delDoc.id));
  const afterDelete = (await req('GET', `/projects/${projA.id}/scope/${traced2.id}`)).json.data;
  check('F: requirement survives with source link SET NULL', afterDelete.sourceDocument === null && afterDelete.title === 'Addendum-sourced requirement');
  const staleTexts = await prisma.documentText.count({ where: { documentId: delDoc.id } });
  check('F: extracted text rows are cascade-deleted', staleTexts === 0);
  check('F: delete logged in audit trail', (await req('GET', `/projects/${projA.id}/activity?action=DOCUMENT_DELETED&limit=100`)).json.data.items.some((a) => a.entityId === delDoc.id));

  // ——— G. No secret leakage ——
  console.log('\n—— G. Leakage ——');
  const leaky = JSON.stringify({ list: list.json, detail: detail.json, doc });
  check('G: no storage URLs/tokens/secrets in document payloads', !/signature=|token=|supabase\.co|service_role|apikey|postgresql:\/\//i.test(leaky));

  console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
  if (results.some((x) => !x.ok)) process.exitCode = 1;
} catch (err) {
  console.error('\nSUITE ERROR:', err);
  process.exitCode = 1;
} finally {
  try {
    if (api) api.kill();
  } catch {}
  // Disconnect ALL Prisma pools BEFORE stopping Postgres (Windows PIPE bug).
  try {
    await prisma?.$disconnect();
  } catch {}
  try {
    await pg.stop();
  } catch {}
}
