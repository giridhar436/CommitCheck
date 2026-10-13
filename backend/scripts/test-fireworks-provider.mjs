/**
 * Fireworks provider tests (Phase 9, dev-only): exercises the compiled
 * FireworksMeetingAnalysisProvider with stubbed global fetch — no real
 * Fireworks API key or network access required.
 *
 * Covers: valid response mapping, markdown-fence tolerance, malformed JSON,
 * invalid schema (missing/ill-typed fields), timeout, network errors,
 * missing API key, unknown/failing provider boot configuration, and
 * secret-leak prevention.
 * Usage: node scripts/test-fireworks-provider.mjs
 */
import { spawn } from 'node:child_process';

const mod = await import('../dist/meeting-analysis/providers/fireworks-meeting-analysis.provider.js');
const FireworksMeetingAnalysisProvider =
  mod.FireworksMeetingAnalysisProvider ?? mod.default.FireworksMeetingAnalysisProvider;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

const DUMMY_KEY = 'test-key-not-a-secret';
const MEETING_DATE = new Date('2026-10-10T10:00:00Z');
const input = {
  meeting: {
    id: 'm1',
    title: 'Sprint Review',
    summary: 'Dana: We will add Google Login by Friday. Client: Can we also add CSV export?',
    meetingDate: MEETING_DATE,
  },
  transcripts: [{ attachmentId: 'a1', fileName: 'transcript.txt', fileType: 'text/plain' }],
};

const VALID_RESPONSE = {
  commitments: [
    {
      title: 'Add Google Login to onboarding',
      description: 'Team promised Google Login integration in onboarding.',
      speaker: 'Dana',
      deadline: 'Friday',
      confidence: 0.9,
      riskLevel: 'HIGH',
      quote: 'Dana: We will add Google Login by Friday.',
    },
  ],
};

/** Installs a fetch stub; returns [restore, calls] where calls log each request. */
function stubFetch(impl) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return impl(url, opts, calls);
  };
  return () => {
    globalThis.fetch = real;
  };
}

function fireworksResponse(content) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

function provider(overrides = {}) {
  return new FireworksMeetingAnalysisProvider({
    apiKey: DUMMY_KEY,
    model: 'test-model',
    ...overrides,
  });
}

async function rejects(fn, name) {
  try {
    await fn();
    return false;
  } catch (err) {
    return true;
  }
}

// ————————————————————————————————————————————————————————————
console.log('——— A. valid Fireworks response ———');
{
  const restore = stubFetch(async () => fireworksResponse(JSON.stringify(VALID_RESPONSE)));
  const result = await provider().analyzeMeeting(input);
  restore();
  check('returns 1 commitment', result.commitments.length === 1);
  const c = result.commitments[0];
  check('title mapped', c.title === 'Add Google Login to onboarding');
  check('speaker mapped', c.speaker === 'Dana');
  check('deadline folded into description', c.description.includes('(Deadline: Friday)'));
  check('confidence mapped', c.confidenceScore === 0.9);
  check('riskLevel mapped', c.riskLevel === 'HIGH');
  check('authorization forced to PENDING (AI never authorizes)', c.authorizationStatus === 'PENDING');
  check('evidence quote verbatim', c.evidence[0].quote === 'Dana: We will add Google Login by Friday.');
  check('evidence source TRANSCRIPT', c.evidence[0].source === 'TRANSCRIPT');
  check('evidence timestamp = meeting date', c.evidence[0].timestamp === MEETING_DATE);
  check('evidenceReference = transcript fileName', c.evidenceReference === 'transcript.txt');
}

console.log('——— A2. API request shape & security ———');
{
  let calls;
  const restore = stubFetch(async (url, opts, c) => {
    calls = c;
    return fireworksResponse(JSON.stringify({ commitments: [] }));
  });
  const result = await provider().analyzeMeeting(input);
  restore();
  check('clean meeting → empty commitments is valid', result.commitments.length === 0);
  check('posts to Fireworks chat completions URL', calls[0].url === 'https://api.fireworks.ai/inference/v1/chat/completions');
  check('Authorization header uses the key (server-side only)', calls[0].opts.headers.Authorization === `Bearer ${DUMMY_KEY}`);
  const body = JSON.parse(calls[0].opts.body);
  check('sends the configured model', body.model === 'test-model');
  check('prompt demands JSON-only output', /Return ONLY the JSON/i.test(body.messages[0].content));
  check('prompt distinguishes requests from commitments', /not merely client requests/i.test(body.messages[0].content));
  check('user message carries the meeting text', body.messages[1].content.includes('Google Login'));
}

console.log('——— A3. markdown-fenced JSON tolerated ———');
{
  const restore = stubFetch(async () =>
    fireworksResponse('Here is the analysis:\n```json\n' + JSON.stringify(VALID_RESPONSE) + '\n```'),
  );
  const result = await provider().analyzeMeeting(input);
  restore();
  check('fenced response parsed', result.commitments.length === 1);
}

console.log('——— B. malformed JSON ———');
for (const [name, content] of [
  ['truncated JSON → fails', '{"commitments": [{"title": "x"'],
  ['plain prose → fails', 'I found three commitments in this meeting.'],
  ['empty content → fails', ''],
]) {
  const restore = stubFetch(async () => fireworksResponse(content));
  const ok = await rejects(() => provider().analyzeMeeting(input));
  restore();
  check(name, ok);
}

console.log('——— C. invalid schema ———');
const INVALID = [
  ['missing commitments array → fails', '{"commitments": null}'],
  ['commitments not an array → fails', '{"commitments": "three"}'],
  ['entry without title → fails', JSON.stringify({ commitments: [{ quote: 'q' }] })],
  ['entry without quote → fails', JSON.stringify({ commitments: [{ title: 't' }] })],
  ['empty quote → fails', JSON.stringify({ commitments: [{ title: 't', quote: '   ' }] })],
  ['non-string speaker → fails', JSON.stringify({ commitments: [{ title: 't', quote: 'q', speaker: 42 }] })],
  ['non-string deadline → fails', JSON.stringify({ commitments: [{ title: 't', quote: 'q', deadline: [] }] })],
  ['non-numeric confidence → fails', JSON.stringify({ commitments: [{ title: 't', quote: 'q', confidence: 'high' }] })],
  ['invalid riskLevel → fails', JSON.stringify({ commitments: [{ title: 't', quote: 'q', riskLevel: 'EXTREME' }] })],
  ['top-level array → fails', JSON.stringify([{ title: 't', quote: 'q' }])],
];
for (const [name, content] of INVALID) {
  const restore = stubFetch(async () => fireworksResponse(content));
  const ok = await rejects(() => provider().analyzeMeeting(input));
  restore();
  check(name, ok);
}

console.log('——— C2. optional-field fallbacks (uncertainty preserved) ———');
{
  const restore = stubFetch(async () =>
    fireworksResponse(JSON.stringify({ commitments: [{ title: 'Vague promise', quote: 'We should look into it.' }] })),
  );
  const result = await provider().analyzeMeeting(input);
  restore();
  const c = result.commitments[0];
  check('speaker absent → null', c.speaker === null);
  check('confidence absent → null', c.confidenceScore === null);
  check('riskLevel absent → undefined (service defaults LOW)', c.riskLevel === undefined);
  check('description falls back to the quote', c.description === 'We should look into it.');
}

console.log('——— D. timeout & network errors ———');
{
  // Simulates real fetch: honors the AbortController signal with an AbortError.
  const restore = stubFetch(
    (url, opts) =>
      new Promise((_, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );
  const started = Date.now();
  let timedOut = false;
  try {
    await provider({ timeoutMs: 100 }).analyzeMeeting(input);
  } catch (err) {
    timedOut = /timed out/i.test(err.message);
  }
  restore();
  check('hanging request aborts with timeout error', timedOut, `${Date.now() - started}ms`);
}
{
  const restore = stubFetch(async () => {
    throw new Error('ECONNREFUSED');
  });
  let message = '';
  try {
    await provider().analyzeMeeting(input);
  } catch (err) {
    message = err.message;
  }
  restore();
  check('network error surfaces a provider failure', /Fireworks API request failed/i.test(message), message);
}
{
  const restore = stubFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  let message = '';
  try {
    await provider().analyzeMeeting(input);
  } catch (err) {
    message = err.message;
  }
  restore();
  check('HTTP error → status only, no response body echoed', /HTTP 401/.test(message), message);
  check('no API key in error message', !message.includes(DUMMY_KEY));
}

console.log('——— E. missing API key ———');
{
  let calls;
  const restore = stubFetch(async (url, opts, c) => {
    calls = c;
    return fireworksResponse(JSON.stringify(VALID_RESPONSE));
  });
  let message = '';
  try {
    await provider({ apiKey: '' }).analyzeMeeting(input);
  } catch (err) {
    message = err.message;
  }
  restore();
  check('missing key fails before any HTTP call', message.includes('FIREWORKS_API_KEY') && (calls ?? []).length === 0, message);
}

console.log('——— F. provider boot configuration ———');
async function bootExits(envProvider, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', ['dist/main.js'], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/none',
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5433/none',
        PORT: '3199',
        // Phase 15: auth config is validated before provider config; give a
        // dummy secret so the boot reaches the MEETING_ANALYSIS_PROVIDER error.
        SUPABASE_JWT_SECRET: 'boot-config-test-secret-not-a-real-key',
        MEETING_ANALYSIS_PROVIDER: envProvider,
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', (code) => resolve({ code, out }));
  });
}
{
  const { code, out } = await bootExits('bogus');
  check('unknown provider → boot fails fast (nonzero exit)', code !== 0, `exit=${code}`);
  check('unknown provider error names the variable and valid options', out.includes('MEETING_ANALYSIS_PROVIDER') && out.includes('development') && out.includes('fireworks'));
  const { code: code2, out: out2 } = await bootExits('fireworks');
  check('fireworks without API key → boot fails fast (nonzero exit)', code2 !== 0, `exit=${code2}`);
  check('fireworks-without-key error names FIREWORKS_API_KEY', out2.includes('FIREWORKS_API_KEY'));
  check('no secrets in boot output (none exist)', !out.includes('Bearer') && !out2.includes('Bearer'));
}

console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
if (results.some((x) => !x.ok)) process.exitCode = 1;

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
