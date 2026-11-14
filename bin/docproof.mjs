#!/usr/bin/env node
// docproof: your README makes promises; Kane CLI checks them in a real browser,
// and failures go straight back to your coding agent.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { extractClaims, toTestMd } from '../src/extract.mjs';
import { parseNdjson, runTest, summarise } from '../src/kane.mjs';
import { buildReport, fixPrompt, reportMarkdown } from '../src/report.mjs';
import { serve } from '../src/serve.mjs';

const HELP = `docproof: verify the promises in your README with Kane CLI

Usage:
  docproof extract            Write one Kane _test.md per README claim into tests/docproof/
  docproof check              Serve app/, run every claim with kane-cli, write .docproof/report.*
  docproof watch              Re-run check whenever app/ or the README changes
  docproof loop --agent-cmd "<cmd>"
                              check -> pipe FIX_PROMPT.md to your agent -> check again, until green
  docproof hook claude|cursor Run as a Claude Code / Cursor "stop" hook (feeds failures back to the agent)

Options:
  --readme <file>     Markdown with claims (default README.md)
  --app <dir>         Static app to serve (default app)
  --url <url>         Test an already running/deployed app instead of serving app/
  --port <n>          Port for the local server (default 4173)
  --only <ids>        Comma-separated claim ids
  --headed            Show the browser
  --replay <dir>      Read recorded <id>.ndjson/<id>.exit files instead of calling kane-cli
  --max <n>           Max loop/hook attempts (default 5)
`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    readme: { type: 'string', default: 'README.md' },
    app: { type: 'string', default: 'app' },
    url: { type: 'string' },
    port: { type: 'string', default: '4173' },
    only: { type: 'string' },
    headed: { type: 'boolean', default: false },
    replay: { type: 'string' },
    out: { type: 'string', default: 'tests/docproof' },
    'agent-cmd': { type: 'string' },
    max: { type: 'string', default: '5' },
    quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});

const STATE = '.docproof';
const log = (...a) => { if (!opt.quiet) console.error(...a); };

function loadClaims() {
  const md = readFileSync(opt.readme, 'utf8');
  let claims = extractClaims(md, opt.readme);
  if (opt.only) {
    const want = new Set(opt.only.split(','));
    claims = claims.filter((c) => want.has(c.id));
  }
  return claims;
}

function writeTests(claims) {
  mkdirSync(opt.out, { recursive: true });
  return claims.map((c) => {
    const file = join(opt.out, `${c.id}_test.md`);
    const text = toTestMd(c);
    // Only rewrite when the claim changed, so Kane keeps replaying cached steps for free.
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
    return file;
  });
}

async function check() {
  const claims = loadClaims();
  if (!claims.length) throw new Error(`no docproof claims found in ${opt.readme}`);
  const files = writeTests(claims);
  let server = null;
  let appUrl = opt.url;
  if (!appUrl) {
    server = await serve(opt.app, Number(opt.port));
    appUrl = server.url;
  }
  const startedAt = new Date().toISOString();
  log(`docproof: ${claims.length} claim(s) from ${opt.readme} against ${appUrl}`);
  const results = [];
  try {
    for (const [i, claim] of claims.entries()) {
      log(`\n▶ ${claim.id}: ${claim.title}`);
      let r;
      if (opt.replay) {
        const nd = readFileSync(join(opt.replay, `${claim.id}.ndjson`), 'utf8');
        const code = Number(readFileSync(join(opt.replay, `${claim.id}.exit`), 'utf8').trim());
        r = { ...summarise(parseNdjson(nd), code, nd), ndjson: nd };
      } else {
        r = await runTest(files[i], {
          url: appUrl + claim.path.replace(/^\//, ''),
          appUrl: appUrl.replace(/\/$/, '/'),
          headless: !opt.headed,
          onEvent: (ev) => {
            if (!ev.type && ev.step != null && ev.status && ev.status !== 'running') log(`   step ${ev.step} ${ev.status}: ${ev.remark ?? ''}`);
          },
        });
        saveRun(claim.id, r);
      }
      log(`  ${r.status.toUpperCase()}${r.summary ? ' · ' + r.summary : ''}${r.reason ? ' · ' + r.reason : ''}`);
      results.push(r);
    }
  } finally {
    server?.server.close();
  }
  const report = buildReport({ claims, results, appUrl, startedAt, finishedAt: new Date().toISOString() });
  mkdirSync(STATE, { recursive: true });
  writeFileSync(join(STATE, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(STATE, 'report.md'), reportMarkdown(report));
  const attempt = Number(readState('attempts') || 0) + (report.status === 'passed' ? 0 : 1);
  const prompt = fixPrompt(report, { attempt, maxAttempts: Number(opt.max) });
  writeFileSync(join(STATE, 'FIX_PROMPT.md'), prompt);
  if (!opt.replay) {
    appendFileSync(join(STATE, 'history.jsonl'), JSON.stringify({
      at: report.finishedAt, status: report.status,
      claims: Object.fromEntries(report.claims.map((c) => [c.id, c.status])),
    }) + '\n');
  }
  log(`\ndocproof: ${report.status.toUpperCase()} (${report.claims.filter((c) => c.status === 'passed').length}/${report.claims.length} claims true) · ${STATE}/report.md`);
  return { report, prompt };
}

function saveRun(id, r) {
  const dir = join(STATE, 'runs', 'latest');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.ndjson`), r.ndjson || '');
  writeFileSync(join(dir, `${id}.exit`), String(r.exitCode ?? 2));
}

const readState = (k) => (existsSync(join(STATE, k)) ? readFileSync(join(STATE, k), 'utf8').trim() : '');
const writeState = (k, v) => { mkdirSync(STATE, { recursive: true }); writeFileSync(join(STATE, k), String(v)); };

const exitFor = (status) => (status === 'passed' ? 0 : status === 'failed' ? 1 : 2);

async function cmdCheck() {
  const { report } = await check();
  return exitFor(report.status);
}

async function cmdWatch() {
  let timer = null;
  let running = false;
  const trigger = (why) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) return trigger(why);
      running = true;
      log(`\n— change in ${why}, re-running Kane —`);
      try { await check(); } catch (e) { log(String(e.message || e)); }
      running = false;
    }, 1500);
  };
  watch(opt.app, { recursive: true }, (_, f) => trigger(join(opt.app, f || '')));
  watch(opt.readme, () => trigger(opt.readme));
  log(`docproof watch: watching ${opt.app}/ and ${opt.readme}`);
  trigger('startup');
  return new Promise(() => {});
}

async function cmdLoop() {
  const cmd = opt['agent-cmd'];
  if (!cmd) throw new Error('loop needs --agent-cmd, e.g. --agent-cmd "claude -p" or --agent-cmd "codex exec -"');
  const max = Number(opt.max);
  writeState('attempts', 0);
  for (let attempt = 1; attempt <= max; attempt++) {
    const { report, prompt } = await check();
    if (report.status === 'passed') { log(`\nAll claims true after ${attempt - 1} fix(es).`); return 0; }
    if (report.claims.every((c) => c.notSignedIn)) { log(prompt); return 2; }
    writeState('attempts', attempt);
    log(`\n↻ attempt ${attempt}/${max}: handing ${STATE}/FIX_PROMPT.md to: ${cmd}`);
    const code = await new Promise((ok) => {
      const child = spawn(cmd, { shell: true, stdio: ['pipe', 'inherit', 'inherit'],
        env: { ...process.env, DOCPROOF_PROMPT_FILE: resolve(STATE, 'FIX_PROMPT.md') } });
      child.stdin.end(prompt);
      child.on('close', ok);
    });
    if (code !== 0) log(`agent exited ${code}`);
  }
  const { report } = await check();
  return exitFor(report.status);
}

async function readStdinJson() {
  if (process.stdin.isTTY) return {};
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

async function cmdHook(kind) {
  const input = await readStdinJson();
  const max = Number(opt.max);
  const attempts = Number(readState('attempts') || 0);
  opt.quiet = true;
  const { report, prompt } = await check();
  if (report.status === 'passed') {
    writeState('attempts', 0);
    if (kind === 'cursor') process.stdout.write('{}\n');
    return 0;
  }
  if (report.claims.every((c) => c.notSignedIn)) {
    // Not a code problem: tell the human, don't send the agent off to "fix" it.
    process.stderr.write(prompt);
    if (kind === 'cursor') process.stdout.write('{}\n');
    return 0;
  }
  if (attempts >= max || (kind === 'cursor' && Number(input.loop_count || 0) >= max)) {
    writeState('attempts', 0);
    process.stderr.write(`docproof: giving up after ${max} attempts; see ${STATE}/report.md\n`);
    if (kind === 'cursor') process.stdout.write('{}\n');
    return 0;
  }
  writeState('attempts', attempts + 1);
  if (kind === 'claude') {
    // Claude Code Stop hook: "block" keeps the agent working and shows it the reason.
    process.stdout.write(JSON.stringify({ decision: 'block', reason: prompt }) + '\n');
  } else if (kind === 'cursor') {
    // Cursor stop hook: followup_message is submitted to the agent as the next user message.
    process.stdout.write(JSON.stringify({ followup_message: prompt }) + '\n');
  } else {
    throw new Error('hook must be "claude" or "cursor"');
  }
  return 0;
}

async function main() {
  const [cmd, arg] = positionals;
  if (opt.help || !cmd) { process.stdout.write(HELP); return 0; }
  switch (cmd) {
    case 'extract': {
      const files = writeTests(loadClaims());
      files.forEach((f) => console.log(f));
      return 0;
    }
    case 'check': return cmdCheck();
    case 'watch': return cmdWatch();
    case 'loop': return cmdLoop();
    case 'hook': return cmdHook(arg);
    case 'reset': rmSync(join(STATE, 'attempts'), { force: true }); return 0;
    default: process.stderr.write(HELP); return 2;
  }
}

main().then((code) => process.exit(code), (e) => { console.error(`docproof: ${e.message || e}`); process.exit(2); });
