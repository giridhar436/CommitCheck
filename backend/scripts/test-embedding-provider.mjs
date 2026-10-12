/**
 * Unit tests for the Phase 14 embedding abstraction: compiled
 * OpenAiEmbeddingProvider + EmbeddingsService against a stubbed
 * globalThis.fetch (no server, no database, no real vendor).
 *
 * Asserts: request shape (URL/model/input/Authorization), internal batching,
 * strict response-shape validation, sanitized error classification
 * (HTTP status only, timeout vs network, malformed JSON), that the API key
 * NEVER appears in any error message, and the honest config matrix —
 * no provider configured means cleanly INACTIVE (never a fake embedding).
 * Usage: node scripts/test-embedding-provider.mjs
 */
const { OpenAiEmbeddingProvider } = await import('../dist/embeddings/openai-embedding-provider.js').then(
  (m) => m.default ?? m,
);
const { EmbeddingsService } = await import('../dist/embeddings/embeddings.service.js').then(
  (m) => m.default ?? m,
);
const {
  EmbeddingConfigError,
  EmbeddingProviderError,
} = await import('../dist/embeddings/embedding-provider.js').then((m) => m.default ?? m);

const SECRET_KEY = 'sk-SUPERSECRET-embedding-key-0f3a9';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

const vec = (n, fill) => Array.from({ length: n }, () => fill);
/** OpenAI-shaped data[]: one {embedding} item per input text. */
const dataOf = (...vectors) => vectors.map((embedding) => ({ embedding }));
const jsonOk = (data) => ({ ok: true, status: 200, json: async () => ({ object: 'list', data }) });

const caught = []; // every provider error message, for the leak scan at the end
async function expectProviderError(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof Error) caught.push(error.message);
    return error;
  }
}

const originalFetch = globalThis.fetch;
let calls = [];
/** Replaces globalThis.fetch; handler may return a response or throw. */
function stubFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return handler(url, opts);
  };
}
const respond = (batches) => {
  let i = 0;
  return stubFetch(() => {
    const data = batches[Math.min(i, batches.length - 1)];
    i += 1;
    return jsonOk(data);
  });
};

const ENV_KEYS = ['EMBEDDING_PROVIDER', 'EMBEDDING_API_KEY', 'EMBEDDING_MODEL', 'EMBEDDING_BASE_URL', 'EMBEDDING_TIMEOUT_MS'];
function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}
function setEnv(vars) {
  clearEnv();
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;
}

function makeProvider(overrides = {}) {
  return new OpenAiEmbeddingProvider({
    apiKey: SECRET_KEY,
    model: 'test-model',
    baseUrl: 'https://stub.example/v1',
    timeoutMs: 5000,
    maxBatchSize: 64,
    ...overrides,
  });
}

try {
  // ——— Provider behavior ———
  console.log('—— OpenAiEmbeddingProvider (stubbed fetch) ——');

  // P1/P2/P3. happy path: one vector per input, correct request
  respond([dataOf(vec(3, 0.1), vec(3, 0.2), vec(3, 0.3))]);
  const provider = makeProvider();
  const vectors = await provider.embed(['first text', 'second text', 'third text']);
  check('P1: one vector per input, in order', vectors.length === 3 && vectors[0][0] === 0.1 && vectors[2][0] === 0.3);
  check('P2: POST to {baseUrl}/embeddings with model + input', calls.length === 1 && calls[0].url === 'https://stub.example/v1/embeddings' && JSON.parse(calls[0].opts.body).model === 'test-model' && JSON.parse(calls[0].opts.body).input.length === 3);
  check('P3: Authorization Bearer carries the key', calls[0].opts.headers.Authorization === `Bearer ${SECRET_KEY}` && calls[0].opts.headers['Content-Type'] === 'application/json');

  // P4. batching
  respond([dataOf(vec(2, 1), vec(2, 2)), dataOf(vec(2, 1), vec(2, 2)), dataOf(vec(2, 1))]);
  const batched = await makeProvider({ maxBatchSize: 2 }).embed(['a', 'b', 'c', 'd', 'e']);
  check('P4: batches internally (5 texts, size 2 → 3 calls), order kept', calls.length === 3 && batched.length === 5 && JSON.parse(calls[0].opts.body).input.length === 2 && JSON.parse(calls[2].opts.body).input.length === 1);

  // P5. empty input → no HTTP call
  stubFetch(() => jsonOk([]));
  check('P5: empty embed() makes no HTTP call', (await makeProvider().embed([])).length === 0 && calls.length === 0);

  // P6. dimensions tracked on first success
  respond([dataOf(vec(3, 1))]);
  const dimProvider = makeProvider();
  await dimProvider.embed(['x']);
  check('P6: dimensions tracked from first response', dimProvider.dimensions === 3);

  // P7. inconsistent dimensions across batches → error
  stubFetch(() => jsonOk(dataOf(vec(4, 1))));
  const inconsistent = await expectProviderError(dimProvider.embed(['y']));
  check('P7: inconsistent dimensions rejected', inconsistent instanceof EmbeddingProviderError && /inconsistent dimensions/i.test(inconsistent.message));

  // P8/P9. HTTP errors surface status only
  stubFetch(() => ({ ok: false, status: 401, json: async () => ({ error: { message: `invalid key ${SECRET_KEY}` } }) }));
  const http401 = await expectProviderError(makeProvider().embed(['x']));
  check('P8: HTTP 401 → sanitized status-only error', http401 instanceof EmbeddingProviderError && http401.message === 'Embedding provider returned HTTP 401');
  stubFetch(() => ({ ok: false, status: 500, json: async () => 'internal explosion' }));
  const http500 = await expectProviderError(makeProvider().embed(['x']));
  check('P9: HTTP 500 → sanitized status-only error', http500?.message === 'Embedding provider returned HTTP 500');

  // P10. malformed JSON
  stubFetch(() => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } }));
  const malformed = await expectProviderError(makeProvider().embed(['x']));
  check('P10: malformed JSON → sanitized error', malformed instanceof EmbeddingProviderError && /malformed json/i.test(malformed.message));

  // P11. shape validation: missing data / length mismatch / non-numeric
  stubFetch(() => jsonOk(undefined));
  const noData = await expectProviderError(makeProvider().embed(['x']));
  check('P11: missing data[] → shape error', /shape invalid/i.test(noData?.message ?? ''));
  stubFetch(() => jsonOk([vec(3, 1), vec(3, 1)]));
  const lengthMismatch = await expectProviderError(makeProvider().embed(['only-one']));
  check('P11: data length mismatch → shape error', /shape invalid/i.test(lengthMismatch?.message ?? ''));
  stubFetch(() => jsonOk([{ embedding: 'not-an-array' }]));
  const notNumbers = await expectProviderError(makeProvider().embed(['x']));
  check('P11: non-numeric embedding → shape error', /shape invalid/i.test(notNumbers?.message ?? ''));

  // P12. timeout classification
  stubFetch(() => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'TimeoutError';
    throw err;
  });
  const timeout = await expectProviderError(makeProvider({ timeoutMs: 1234 }).embed(['x']));
  check('P12: timeout classified with configured ms', timeout instanceof EmbeddingProviderError && timeout.message === 'Embedding provider timed out after 1234ms');

  // P13. network error classification
  stubFetch(() => {
    throw new TypeError('fetch failed: ECONNREFUSED');
  });
  const network = await expectProviderError(makeProvider().embed(['x']));
  check('P13: network failure classified as unreachable', network instanceof EmbeddingProviderError && network.message === 'Embedding provider is unreachable (network error)');

  // ——— EmbeddingsService config matrix ———
  console.log('\n—— EmbeddingsService (environment matrix) ——');

  clearEnv();
  const unconfigured = new EmbeddingsService();
  check('S1: no EMBEDDING_PROVIDER → cleanly inactive with reason', unconfigured.status.active === false && unconfigured.status.provider === null && typeof unconfigured.status.reason === 'string' && /EMBEDDING_PROVIDER/.test(unconfigured.status.reason));
  const cfgError = await expectProviderError(unconfigured.embed(['x']));
  check('S2: embed() without provider → EmbeddingConfigError', cfgError instanceof EmbeddingConfigError);
  const quietNull = await unconfigured.embedQuietly(['x']);
  check('S3: embedQuietly without provider → null (never fake vectors)', quietNull === null);

  setEnv({ EMBEDDING_PROVIDER: 'cohere', EMBEDDING_API_KEY: 'k' });
  const unsupported = new EmbeddingsService();
  check('S4: unsupported provider name → inactive + reason names the support set', unsupported.status.active === false && /not supported.*openai/i.test(unsupported.status.reason ?? ''));

  setEnv({ EMBEDDING_PROVIDER: 'openai' });
  const noKey = new EmbeddingsService();
  check('S5: openai without key → inactive with key-specific reason', noKey.status.active === false && /EMBEDDING_API_KEY/.test(noKey.status.reason ?? ''));

  setEnv({ EMBEDDING_PROVIDER: 'openai', EMBEDDING_API_KEY: SECRET_KEY });
  respond([dataOf(vec(1536, 0.5))]);
  const active = new EmbeddingsService();
  check('S6: openai + key → active with default model', active.status.active === true && active.status.provider === 'openai' && active.model === 'text-embedding-3-small' && active.status.reason === null);
  const serviceVectors = await active.embed(['x']);
  check('S7: active service embeds through the provider', serviceVectors.length === 1 && serviceVectors[0].length === 1536);

  setEnv({ EMBEDDING_PROVIDER: 'openai', EMBEDDING_API_KEY: SECRET_KEY, EMBEDDING_MODEL: 'custom-embedding-v2' });
  check('S8: EMBEDDING_MODEL override honored', new EmbeddingsService().model === 'custom-embedding-v2');

  setEnv({ EMBEDDING_PROVIDER: '  OPENAI  ', EMBEDDING_API_KEY: SECRET_KEY });
  check('S9: provider name is trimmed + lowercased', new EmbeddingsService().status.active === true);

  // S10. provider runtime failure through embedQuietly → null, no throw
  setEnv({ EMBEDDING_PROVIDER: 'openai', EMBEDDING_API_KEY: SECRET_KEY });
  stubFetch(() => ({ ok: false, status: 429, json: async () => ({}) }));
  const quietFail = await new EmbeddingsService().embedQuietly(['x']);
  check('S10: provider failure via embedQuietly → null, chunks left unindexed', quietFail === null);

  // ——— Secret-leak scan over every error we provoked ———
  console.log('\n—— Secret hygiene ——');
  check('S11: no API key in any error message', caught.length > 5 && caught.every((m) => !m.includes(SECRET_KEY)), caught.find((m) => m.includes(SECRET_KEY)));
  check('S12: no Authorization header echo in any error message', caught.every((m) => !/bearer/i.test(m)));
  check('S13: status snapshot never contains the key', !JSON.stringify(new EmbeddingsService().status).includes(SECRET_KEY));

  console.log(`\n—— ${results.filter((r) => r.ok).length}/${results.length} checks passed ——`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  clearEnv();
}
