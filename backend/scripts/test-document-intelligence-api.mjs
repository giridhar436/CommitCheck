/**
 * End-to-end Document Intelligence & Semantic Scope Retrieval tests
 * (Phase 14): ephemeral PostgreSQL + compiled Nest app + deterministic
 * development AI provider, NO embedding provider configured (the honest
 * lexical mode) — provider behavior is covered by test-embedding-provider.mjs
 * with stubbed fetch.
 *
 * Covers: real PDF/DOCX/text extraction (base64 binaryContent), unsupported
 * formats failing loudly, deterministic chunking + rebuild-on-reprocess
 * (no duplicate derived records), FAILED → recovery, retrieval scoped to
 * the project (lexical mode labeled as such, never "vector"), verification
 * enrichment that can never authorize (Phase 10 invariants intact, Phase 11
 * change-request semantics unchanged), grounded traceability, and security
 * (cross-project isolation, path traversal, secret leakage).
 * Usage: node scripts/test-document-intelligence-api.mjs
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
  // No EMBEDDING_PROVIDER on purpose — retrieval must run (and be labeled)
  // deterministic lexical. Vector mode with a real provider is exercised in
  // test-embedding-provider.mjs via stubbed HTTP.
  EMBEDDING_PROVIDER: '',
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

// ——— fixture builders (real files, built in-memory) ———

/** Builds a minimal but valid single-page PDF whose text layer contains the
 *  given lines. Offsets are computed so the xref table is correct. */
function buildTestPdf(lines) {
  const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const contentOps = lines
    .map((line, i) => (i === 0 ? `BT /F1 12 Tf 72 720 Td (${escape(line)}) Tj` : `0 -20 Td (${escape(line)}) Tj`))
    .join('\n');
  const stream = `BT\n${contentOps}\nET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const parts = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(Buffer.concat(parts)));
    parts.push(Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`));
  });
  const xrefOffset = Buffer.byteLength(Buffer.concat(parts));
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.concat([...parts, Buffer.from(xref + trailer)]);
}

// ——— minimal ZIP (stored, no compression) for the DOCX fixture ———
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStore(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 8); // stored
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    central.push(
      Buffer.concat([
        (() => {
          const h = Buffer.alloc(46);
          h.writeUInt32LE(0x02014b50, 0);
          h.writeUInt16LE(20, 4);
          h.writeUInt16LE(0, 10);
          h.writeUInt32LE(crc, 16);
          h.writeUInt32LE(data.length, 20);
          h.writeUInt32LE(data.length, 24);
          h.writeUInt16LE(nameBuf.length, 28);
          h.writeUInt32LE(offset, 42);
          return h;
        })(),
        nameBuf,
      ]),
    );
    local.push(Buffer.concat([localHeader, nameBuf, data]));
    offset += localHeader.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, eocd]);
}
function buildTestDocx(paragraphs) {
  const escaped = paragraphs.map((p) => p.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${escaped
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`)
    .join('')}<w:sectPr/></w:body></w:document>`;
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      ),
    },
    { name: 'word/document.xml', data: Buffer.from(document) },
  ]);
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
  execSync('npx prisma migrate deploy', { env, stdio: 'pipe' });
  execSync('npm run db:seed', { env, stdio: 'pipe' });

  api = spawn('node', ['dist/main.js'], { env, stdio: 'pipe' });
  api.stderr.on('data', (d) => process.stderr.write(d));
  await waitReady();

  prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  // ——— fixtures ———
  console.log('\n—— Fixtures ——');
  const projA = (await req('POST', '/projects', {
    name: 'Phase 14 Intelligence Project',
    clientName: 'SemanticCorp',
  })).json.data;
  const projB = (await req('POST', '/projects', {
    name: 'Phase 14 Other Project',
    clientName: 'OtherCorp',
  })).json.data;
  const docPath = (name) => `projects/${projA.id}/docs/${name}`;

  // commitments require a meeting (Phase 2 model)
  const meetingA = (await req('POST', `/projects/${projA.id}/meetings`, {
    title: 'Kickoff notes',
    meetingDate: new Date().toISOString(),
  })).json.data;

  const createDoc = (title, type, storagePath, extra = {}) =>
    req('POST', `/projects/${projA.id}/documents`, { title, type, storagePath, ...extra });

  // ============ A. PROCESSING ============
  console.log('\n—— A. Document processing ——');

  // A1. text document still processes (Phase 13 behavior preserved)
  const textDoc = (await createDoc('SOW v3 (text)', 'SOW', docPath('sow-v3.txt'))).json.data;
  const TEXT_PAYLOAD = [
    'SECTION 1 — DELIVERABLES',
    'The supplier shall deliver a login page with email and password authentication.',
    '',
    'SECTION 2 — SUPPORT',
    'The supplier shall provide email support during business hours.',
  ].join('\n');
  const textProcessed = (await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, { textContent: TEXT_PAYLOAD })).json.data;
  check('A1: text document processes to COMPLETED', textProcessed.processingStatus === 'COMPLETED');
  // asserted against the compiled backend normalizer itself, not a re-implementation
  const { normalizeExtractedText } = await import('../dist/documents/documents.service.js');
  check('A1: normalized text stored', textProcessed.extractedText?.content === normalizeExtractedText(TEXT_PAYLOAD));

  // A2. PDF processes with real extraction
  const PDF_LINES = [
    'Alpha delivery clause: the supplier shall build a reporting dashboard.',
    'Beta limitation clause: mobile native applications are out of scope.',
    'Gamma pricing clause: additional languages are billable.',
  ];
  const pdfDoc = (await createDoc('SOW v3 (pdf)', 'SOW', docPath('sow-v3.pdf'))).json.data;
  const pdfProcessed = (
    await req('POST', `/projects/${projA.id}/documents/${pdfDoc.id}/process`, {
      binaryContent: buildTestPdf(PDF_LINES).toString('base64'),
    })
  ).json.data;
  check('A2: PDF processes to COMPLETED', pdfProcessed.processingStatus === 'COMPLETED', JSON.stringify(pdfProcessed).slice(0, 300));
  check('A2: PDF text really extracted (not raw bytes)', PDF_LINES.every((l) => (pdfProcessed.extractedText?.content ?? '').includes(l.split(':')[0])) && !(pdfProcessed.extractedText?.content ?? '').includes('%PDF'), pdfProcessed.extractedText?.content?.slice(0, 120));

  // A3. DOCX processes with real extraction
  const DOCX_PARAS = [
    'Workshop discovery sessions are included for two days.',
    'Post-launch hypercare support lasts four weeks.',
  ];
  const docxDoc = (await createDoc('Addendum (docx)', 'PROPOSAL', docPath('addendum.docx'))).json.data;
  const docxProcessed = (
    await req('POST', `/projects/${projA.id}/documents/${docxDoc.id}/process`, {
      binaryContent: buildTestDocx(DOCX_PARAS).toString('base64'),
    })
  ).json.data;
  check('A3: DOCX processes to COMPLETED', docxProcessed.processingStatus === 'COMPLETED', JSON.stringify(docxProcessed).slice(0, 300));
  check('A3: DOCX text really extracted', DOCX_PARAS.every((p) => (docxProcessed.extractedText?.content ?? '').includes(p)), docxProcessed.extractedText?.content?.slice(0, 120));

  // A4. unsupported binary format fails honestly (PNG bytes)
  const pngBytes = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 0),
  ]);
  const imgDoc = (await createDoc('Screenshot (unsupported)', 'OTHER', docPath('shot.png'))).json.data;
  const imgProcessed = (
    await req('POST', `/projects/${projA.id}/documents/${imgDoc.id}/process`, {
      binaryContent: pngBytes.toString('base64'),
    })
  ).json.data;
  check('A4: unsupported binary → FAILED (never COMPLETED)', imgProcessed.processingStatus === 'FAILED');
  check('A4: unsupported binary explains the limitation', /unsupported document format/i.test(imgProcessed.processingError ?? ''), imgProcessed.processingError);

  // A5. both content sources at once → 400; invalid base64 → 400
  const bothStatus = (
    await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, {
      textContent: 'x',
      binaryContent: 'aGk=',
    })
  ).status;
  check('A5: textContent + binaryContent together → 400', bothStatus === 400, `status=${bothStatus}`);
  const badB64Status = (
    await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, {
      binaryContent: '!!!not base64!!!',
    })
  ).status;
  check('A5: invalid base64 → 400', badB64Status === 400, `status=${badB64Status}`);

  // A6. determinism: same input twice → identical stored text + identical chunk plan
  const firstRun = (await req('GET', `/projects/${projA.id}/documents/${textDoc.id}`)).json.data;
  await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, { textContent: TEXT_PAYLOAD });
  const secondRun = (await req('GET', `/projects/${projA.id}/documents/${textDoc.id}`)).json.data;
  check('A6: processing is deterministic', firstRun.extractedText.content === secondRun.extractedText.content && firstRun.chunkCount === secondRun.chunkCount);
  const firstHashes = await prisma.documentChunk.findMany({ where: { documentId: textDoc.id }, orderBy: { chunkIndex: 'asc' }, select: { contentHash: true } });
  await prisma.documentChunk.deleteMany({ where: { documentId: textDoc.id } });
  await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, { textContent: TEXT_PAYLOAD });
  const secondHashes = await prisma.documentChunk.findMany({ where: { documentId: textDoc.id }, orderBy: { chunkIndex: 'asc' }, select: { contentHash: true } });
  check('A6: chunk hashes identical across runs', JSON.stringify(firstHashes) === JSON.stringify(secondHashes));

  // A7. repeated processing does not duplicate derived records
  await req('POST', `/projects/${projA.id}/documents/${textDoc.id}/process`, { textContent: TEXT_PAYLOAD });
  const chunkRows = await prisma.documentChunk.findMany({ where: { documentId: textDoc.id }, orderBy: { chunkIndex: 'asc' } });
  check(
    'A7: reprocessing leaves exactly one row per chunkIndex (no duplicates)',
    chunkRows.length === chunkRows.filter((c, i, a) => a.findIndex((x) => x.chunkIndex === c.chunkIndex) === i).length &&
      chunkRows.every((c, i) => c.chunkIndex === i),
  );

  // A8. FAILED → recovery
  const blankDoc = (await createDoc('Blank notes', 'OTHER', docPath('blank.txt'))).json.data;
  const blankRun = (await req('POST', `/projects/${projA.id}/documents/${blankDoc.id}/process`, { textContent: '   \n\n  ' })).json.data;
  check('A8: empty content → FAILED with reason', blankRun.processingStatus === 'FAILED' && !!blankRun.processingError);
  const recovered = (await req('POST', `/projects/${projA.id}/documents/${blankDoc.id}/process`, { textContent: 'Recovered clause: the supplier shall provide uptime reports.' })).json.data;
  check('A8: FAILED recovers to COMPLETED on valid input', recovered.processingStatus === 'COMPLETED' && recovered.processingError === null);

  // A9. processing is project-scoped
  const crossProcess = await req('POST', `/projects/${projB.id}/documents/${textDoc.id}/process`, { textContent: 'x' });
  check('A9: cross-project process → 404', crossProcess.status === 404, `status=${crossProcess.status}`);

  // ============ B. CHUNKING ============
  console.log('\n—— B. Chunking ——');

  const longParagraph = (seed) =>
    `Requirement ${seed}: the platform shall provide ${seed} functionality including configuration options, audit logging, and administrator controls for the ${seed} module across the whole product surface area ${seed}.`;
  const LONG_TEXT = Array.from({ length: 20 }, (_, i) => longParagraph(i + 1)).join('\n\n');
  const longDoc = (await createDoc('Long spec', 'REQUIREMENTS', docPath('long-spec.txt'))).json.data;
  const longRun = (await req('POST', `/projects/${projA.id}/documents/${longDoc.id}/process`, { textContent: LONG_TEXT })).json.data;
  check('B1: chunks are created', longRun.chunkCount >= 2, `chunkCount=${longRun.chunkCount}`);

  const longChunks = await prisma.documentChunk.findMany({
    where: { documentId: longDoc.id },
    orderBy: { chunkIndex: 'asc' },
  });
  check(
    'B2: chunk order is deterministic (indices 0..n-1, ascending, contiguous offsets)',
    longChunks.every((c, i) => c.chunkIndex === i) &&
      longChunks.every((c) => c.charEnd > c.charStart) &&
      longChunks.every((c, i) => i === 0 || c.charStart >= longChunks[i - 1].charEnd),
  );
  check(
    'B3: chunk sizes bounded (≤ ~1.2× chunk size) and hashes unique',
    longChunks.every((c) => c.text.length <= 1500) &&
      new Set(longChunks.map((c) => c.contentHash)).size === longChunks.length,
  );
  check(
    'B4: chunk text is grounded in the stored document text',
    longChunks.every((c) => LONG_TEXT.includes(c.text.trim()) || c.text.trim().split(/\s+/).every((w) => LONG_TEXT.includes(w))),
  );
  check('B5: chunk ownership — cross-project detail 404', (await req('GET', `/projects/${projB.id}/documents/${longDoc.id}`)).status === 404);

  // B6. reprocessing replaces stale chunks rather than duplicating
  await req('POST', `/projects/${projA.id}/documents/${longDoc.id}/process`, { textContent: 'Short replacement clause only.' });
  const afterReplace = await prisma.documentChunk.findMany({ where: { documentId: longDoc.id } });
  const afterDetail = (await req('GET', `/projects/${projA.id}/documents/${longDoc.id}`)).json.data;
  check(
    'B6: stale chunks replaced (count shrinks, indices reset, no orphans)',
    afterReplace.length === 1 && afterReplace[0].chunkIndex === 0 && afterDetail.chunkCount === 1,
  );
  await req('POST', `/projects/${projA.id}/documents/${longDoc.id}/process`, { textContent: LONG_TEXT });
  const restored = await prisma.documentChunk.findMany({ where: { documentId: longDoc.id } });
  check('B6: rebuild restores full chunk set', restored.length === longChunks.length);

  // B7. document deletion cascades chunks
  const tempDoc = (await createDoc('Temp chunk doc', 'OTHER', docPath('temp.txt'))).json.data;
  await req('POST', `/projects/${projA.id}/documents/${tempDoc.id}/process`, { textContent: 'Temporary clause for deletion.' });
  await req('DELETE', `/projects/${projA.id}/documents/${tempDoc.id}`);
  check('B7: chunks cascade-deleted with the document', (await prisma.documentChunk.count({ where: { documentId: tempDoc.id } })) === 0);

  // ============ C. EMBEDDINGS (lexical mode — no provider configured) ============
  console.log('\n—— C. Embedding status (no provider configured) ——');

  check('C1: chunk embedding stays SKIPPED without a provider', (await prisma.documentChunk.count({ where: { documentId: longDoc.id, embeddingStatus: { not: 'SKIPPED' } } })) === 0);
  check('C2: document reports 0 indexed chunks', longRun.indexedChunks === 0 && longRun.chunkCount > 0);
  const listNoEmbed = (await req('GET', `/projects/${projA.id}/documents`)).json.data;
  check('C3: list items expose counts but never embeddings', 'chunkCount' in listNoEmbed.items[0] && !('embedding' in listNoEmbed.items[0]) && !('extractedText' in listNoEmbed.items[0]));

  // ============ D. RETRIEVAL ============
  console.log('\n—— D. Semantic scope retrieval (deterministic lexical) ——');

  const retrieval = (query, extra = '') =>
    req('GET', `/projects/${projA.id}/retrieval/scope?query=${encodeURIComponent(query)}${extra}`);

  const hit = (await retrieval('login page with email and password authentication')).json.data;
  check('D1: relevant chunk retrieved first', hit.results.length > 0 && hit.results[0].sourceType === 'DOCUMENT_CHUNK' && hit.results[0].documentId === textDoc.id, JSON.stringify(hit.results[0] ?? {}).slice(0, 200));
  check('D2: mode is lexical + provider inactive with reason', hit.mode === 'lexical' && hit.provider.active === false && typeof hit.provider.reason === 'string' && hit.provider.reason.length > 0);
  check('D3: scores labeled as retrieval similarity', hit.results.every((r) => r.similarityKind === 'lexical' && r.score > 0 && r.score <= 1));

  const unrelated = (await retrieval('quantum cryptocurrency mining rig')).json.data;
  check(
    'D4: unrelated query ranks lower or returns nothing for the doc',
    unrelated.results.length === 0 || unrelated.results[0].score < hit.results[0].score,
  );

  // D5. requirements are retrievable without documents
  const reqA = (await req('POST', `/projects/${projA.id}/scope`, {
    title: 'Password reset flow',
    description: 'Users can reset their password by email',
    category: 'Authentication',
    priority: 'HIGH',
    approvalStatus: 'AUTHORIZED',
  })).json.data;
  const reqHit = (await retrieval('password reset by email')).json.data;
  check(
    'D5: requirement retrievable without any source document',
    reqHit.results.some((r) => r.sourceType === 'SCOPE_REQUIREMENT' && r.requirementId === reqA.id),
  );

  // D6. chunk → requirement traceability via sourceDocumentId
  await req('POST', `/projects/${projA.id}/scope`, {
    title: 'Email support window',
    description: 'Support during business hours only',
    category: 'Support',
    priority: 'MEDIUM',
    approvalStatus: 'AUTHORIZED',
    sourceDocumentId: textDoc.id,
  });
  const linkHit = (await retrieval('email support during business hours')).json.data;
  const chunkHit = linkHit.results.find((r) => r.sourceType === 'DOCUMENT_CHUNK' && r.documentId === textDoc.id);
  check(
    'D6: retrieved chunk maps back to its linked requirement',
    !!chunkHit && chunkHit.linkedRequirements.some((r) => r.title === 'Email support window'),
    JSON.stringify(chunkHit ?? {}).slice(0, 200),
  );

  // D7. project scoping + cross-project impossibility
  check('D7: retrieval on empty project returns empty results', ((await req('GET', `/projects/${projB.id}/retrieval/scope?query=login`)).json.data.results ?? null) !== null && ((await req('GET', `/projects/${projB.id}/retrieval/scope?query=login`)).json.data.results).length === 0);
  const unknownProj = await req('GET', `/projects/00000000-0000-4000-8000-000000000000/retrieval/scope?query=login`);
  check('D7: unknown project → 404', unknownProj.status === 404);
  const badQuery = await req('GET', `/projects/${projA.id}/retrieval/scope`);
  check('D7: missing query → 400', badQuery.status === 400);
  const limitHit = (await retrieval('the supplier shall', '&limit=2')).json.data;
  check('D7: limit respected', limitHit.results.length <= 2);

  // ============ E. VERIFICATION INTEGRATION ============
  console.log('\n—— E. Verification enrichment (never authorizing) ——');

  // E1. semantic candidate enriches context for an out-of-scope commitment
  const oauthCommitment = (await req('POST', `/projects/${projA.id}/commitments`, {
    title: 'Add Google and Microsoft SSO login buttons',
    speaker: 'Dana',
    description: 'Marketing wants single sign-on with Google and Microsoft accounts on the login page',
    meetingId: meetingA.id,
  })).json.data;
  const oauthVerify = (await req('POST', `/projects/${projA.id}/commitments/${oauthCommitment.id}/verify`, {})).json.data;
  check(
    'E1: retrieved context present for unauthorized commitment',
    Array.isArray(oauthVerify.retrievedContext) && oauthVerify.retrievedContext.length > 0,
    JSON.stringify(oauthVerify.retrievedContext ?? null).slice(0, 200),
  );
  check(
    'E2: deterministic verdict remains authoritative (UNAUTHORIZED/HIGH)',
    oauthVerify.authorizationStatus === 'UNAUTHORIZED' && oauthVerify.risk === 'HIGH' && oauthVerify.authorizationSource === null,
  );
  check(
    'E3: semantic similarity did not authorize',
    oauthVerify.retrievedContext.every((c) => typeof c.relevance === 'number' && c.relevance <= 1) &&
      oauthVerify.authorizationStatus === 'UNAUTHORIZED',
  );

  // E4. grounded evidence — every excerpt exists in stored document text
  const allGrounded = await Promise.all(
    oauthVerify.retrievedContext.map(async (c) => {
      const docText = (await req('GET', `/projects/${projA.id}/documents/${c.documentId}`)).json.data.extractedText?.content ?? '';
      return c.text.split(/\n/).every((line) => docText.includes(line.trim()) || line.trim() === '' || docText.includes(c.text));
    }),
  );
  check('E4: every excerpt maps to stored document text', allGrounded.every(Boolean));
  check(
    'E5: retrieved context maps back to real documents',
    oauthVerify.retrievedContext.every((c) => typeof c.documentId === 'string' && typeof c.documentTitle === 'string' && typeof c.chunkIndex === 'number'),
  );

  // E6. authorized commitment (approved change request) → no retrievedContext
  const crTarget = (await req('POST', `/projects/${projA.id}/commitments`, {
    title: 'Deliver completely separate invoicing portal for partners',
    speaker: 'Priya',
    description: 'A dedicated invoicing portal outside the current product',
    meetingId: meetingA.id,
  })).json.data;
  const cr = (await req('POST', `/projects/${projA.id}/commitments/${crTarget.id}/change-request`, {})).json.data;
  await req('POST', `/projects/${projA.id}/change-requests/${cr.id}/approve`, { reason: 'Sponsored' });
  const approvedVerify = (await req('POST', `/projects/${projA.id}/commitments/${crTarget.id}/verify`, {})).json.data;
  check(
    'E6: approved change request still authorizes (AUTHORIZED/LOW)',
    approvedVerify.authorizationStatus === 'AUTHORIZED' && approvedVerify.risk === 'LOW' && approvedVerify.authorizationSource === 'CHANGE_REQUEST',
  );
  check('E6: no retrievedContext when authorized', approvedVerify.retrievedContext === undefined);

  // E7. rejected change request does not authorize
  const rejectedTarget = (await req('POST', `/projects/${projA.id}/commitments`, {
    title: 'Build a customer-facing native mobile app for iOS and Android',
    speaker: 'Sam',
    description: 'Native mobile applications for app stores',
    meetingId: meetingA.id,
  })).json.data;
  const cr2 = (await req('POST', `/projects/${projA.id}/commitments/${rejectedTarget.id}/change-request`, {})).json.data;
  await req('POST', `/projects/${projA.id}/change-requests/${cr2.id}/reject`, { reason: 'Not budgeted' });
  const rejectedVerify = (await req('POST', `/projects/${projA.id}/commitments/${rejectedTarget.id}/verify`, {})).json.data;
  check('E7: rejected CR does not authorize', rejectedVerify.authorizationStatus === 'UNAUTHORIZED' && rejectedVerify.risk === 'HIGH');

  // E8. audit trail intact — DOCUMENT_PROCESSED + COMMITMENT_VERIFIED exist
  const activities = await prisma.activity.findMany({
    where: { projectId: projA.id, action: { in: ['DOCUMENT_PROCESSED', 'DOCUMENT_PROCESSING_FAILED', 'COMMITMENT_VERIFIED'] } },
  });
  check(
    'E8: processing + verification audit entries written',
    activities.some((a) => a.action === 'DOCUMENT_PROCESSED') &&
      activities.some((a) => a.action === 'DOCUMENT_PROCESSING_FAILED') &&
      activities.some((a) => a.action === 'COMMITMENT_VERIFIED'),
  );

  // ============ F. SECURITY ============
  console.log('\n—— F. Security ——');

  check('F1: cross-project document detail → 404', (await req('GET', `/projects/${projB.id}/documents/${textDoc.id}`)).status === 404);
  check('F1: cross-project document delete → 404', (await req('DELETE', `/projects/${projB.id}/documents/${textDoc.id}`)).status === 404);

  const traversal1 = await createDoc('Traversal', 'SOW', 'projects/../../other-project/secret.txt');
  const traversal2 = await createDoc('Traversal', 'SOW', 'projects//double-slash.txt');
  const traversal3 = await createDoc('Traversal', 'SOW', 'projects/../%2e%2e/escape.txt');
  check('F2: storage path traversal rejected (.., //, encoded)', traversal1.status === 400 && traversal2.status === 400 && traversal3.status === 400, `${traversal1.status}/${traversal2.status}/${traversal3.status}`);
  const patchTraversal = await req('PATCH', `/projects/${projA.id}/documents/${textDoc.id}`, { storagePath: 'projects/x/../../../y.txt' });
  check('F2: PATCH cannot introduce traversal', patchTraversal.status === 400);

  // F3. cross-project retrieval impossible — projB never sees projA's content
  const projADocIds = [textDoc.id, pdfDoc.id, docxDoc.id, imgDoc.id, longDoc.id, blankDoc.id];
  const projBRetrieval = (await req('GET', `/projects/${projB.id}/retrieval/scope?query=supplier shall provide`)).json.data;
  check(
    'F3: project B retrieval never returns project A chunks/requirements',
    projBRetrieval.results.every((r) => !projADocIds.includes(r.documentId) && !projADocIds.includes(r.requirementId)),
  );

  // F4. secret leakage scan across all touched endpoints' responses.
  // ('authorizationStatus'/'authorizationSource' are the API's own field
  // names — the marker is 'bearer', the shape of a leaked auth header.)
  const SECRET_MARKERS = ['postgresql://', 'service_role', 'supabase.co', 'apikey', 'EMBEDDING_API_KEY', 'SUPABASE_STORAGE_SERVICE_KEY', 'bearer '];
  const sampleResponses = [
    (await req('GET', `/projects/${projA.id}/documents`)).json,
    (await req('GET', `/projects/${projA.id}/documents/${textDoc.id}`)).json,
    hit,
    reqHit,
    linkHit,
    oauthVerify,
    approvedVerify,
    (await req('GET', `/projects/${projA.id}/retrieval/scope?query=clause`)).json,
  ];
  const leaks = sampleResponses.filter((r) => SECRET_MARKERS.some((m) => JSON.stringify(r).toLowerCase().includes(m.toLowerCase())));
  check('F4: no storage/credential markers in any response', leaks.length === 0, JSON.stringify(leaks[0] ?? {}).slice(0, 200));

  // F5. list endpoints never expose raw document contents or embeddings
  const docList = (await req('GET', `/projects/${projA.id}/documents?limit=100`)).json.data;
  check(
    'F5: document list is metadata-only',
    docList.items.every((d) => !('extractedText' in d) && !('embedding' in d) && !('chunks' in d)),
  );

  console.log(`\n—— ${results.filter((r) => r.ok).length}/${results.length} checks passed ——`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
} catch (error) {
  console.error('SUITE ERROR:', error);
  process.exitCode = 1;
} finally {
  console.log('\nDisconnecting Prisma…');
  await prisma?.$disconnect();
  if (api) api.kill();
  try {
    await pg.stop();
    console.log('Ephemeral PostgreSQL stopped.');
  } catch {
    /* already stopped */
  }
}

// (the byte-exact A1 expectation imports the compiled normalizeExtractedText
// from dist — no mirror of the backend logic is kept in this file)
