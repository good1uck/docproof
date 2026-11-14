// Run Kane CLI on generated _test.md files and summarise its NDJSON stream.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export function parseNdjson(text) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try { events.push(JSON.parse(t)); } catch { /* kane-cli also prints plain notices */ }
  }
  return events;
}

const STATUS_BY_EXIT = { 0: 'passed', 1: 'failed', 2: 'error', 3: 'timeout' };

/**
 * Summarise the events of one `kane-cli testmd run --agent` invocation.
 * @param {object[]} events
 * @param {number|null} exitCode
 * @param {string} [stderr]
 */
export function summarise(events, exitCode, stderr = '') {
  const done = events.findLast?.((e) => e.type === 'test_md_done') ?? [...events].reverse().find((e) => e.type === 'test_md_done');
  const runEnds = events.filter((e) => e.type === 'run_end');
  const failedRunEnd = runEnds.find((e) => e.status && !/^pass/i.test(e.status));
  const failedProgress = [...events].reverse().find((e) => !e.type && e.status === 'failed');
  const errors = events.filter((e) => e.type === 'error');

  let status = STATUS_BY_EXIT[exitCode] ?? 'error';
  if (done?.overall_status) {
    const s = String(done.overall_status).toLowerCase();
    if (s.startsWith('pass')) status = exitCode && exitCode !== 0 ? STATUS_BY_EXIT[exitCode] : 'passed';
    else if (s.startsWith('fail')) status = 'failed';
  }
  // kane-cli 0.10.x exits 1 when not signed in, before any run starts.
  const notSignedIn = /not authenticated/i.test(stderr) || errors.some((e) => /auth/i.test(e.message || e.reason || ''));
  if (notSignedIn && !done && !runEnds.length) status = 'error';

  return {
    status,
    exitCode,
    notSignedIn,
    summary: failedRunEnd?.summary || failedRunEnd?.one_liner || runEnds.at(-1)?.summary || '',
    reason: failedRunEnd?.reason || errors.at(-1)?.message || errors.at(-1)?.reason || (notSignedIn ? 'kane-cli is not signed in' : ''),
    failedStep: failedProgress ? { step: failedProgress.step, remark: failedProgress.remark } : null,
    durationS: done?.duration_s ?? null,
    sessionId: done?.session_id ?? null,
    shareUrl: done?.share_url || null,
    testUrl: runEnds.map((e) => e.test_url).filter(Boolean).at(-1) || null,
    credits: runEnds.reduce((sum, e) => sum + (Number(e.credits_consumed) || 0), 0),
  };
}

export function resultMdPath(testFile) {
  const stem = basename(testFile).replace(/_test\.md$/, '');
  return join(dirname(testFile), `output-${stem}`, 'Result.md');
}

/** Build the kane-cli argv for one test. Credentials come from env, never from argv logs. */
export function kaneArgs(testFile, { url, appUrl, headless = true, timeout = 300 }) {
  const args = ['testmd', 'run', testFile, '--agent', '--url', url,
    '--variables', JSON.stringify({ app_url: { value: appUrl } }), '--timeout', String(timeout)];
  if (headless) args.push('--headless');
  if (process.env.LT_USERNAME && process.env.LT_ACCESS_KEY) {
    args.push('--username', process.env.LT_USERNAME, '--access-key', process.env.LT_ACCESS_KEY);
  }
  return args;
}

/**
 * Run one generated test with kane-cli. Streams progress lines to onEvent.
 * @returns {Promise<object>} summary plus raw ndjson text
 */
export function runTest(testFile, opts) {
  const bin = opts.kaneBin || process.env.KANE_BIN || 'kane-cli';
  return new Promise((resolve) => {
    const child = spawn(bin, kaneArgs(testFile, opts), {
      env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'docproof' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    let buf = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const [ev] = parseNdjson(line);
        if (ev && opts.onEvent) opts.onEvent(ev);
      }
    });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', (e) => resolve({ ...summarise([], 2, String(e)), reason: `could not start ${bin}: ${e.message}`, ndjson: '', stderr: String(e) }));
    child.on('close', (code) => {
      const events = parseNdjson(out);
      const s = summarise(events, code, err + '\n' + out);
      const rp = resultMdPath(testFile);
      resolve({ ...s, ndjson: out, stderr: err, resultMd: existsSync(rp) ? readFileSync(rp, 'utf8') : null });
    });
  });
}
