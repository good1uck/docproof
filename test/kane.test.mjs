import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kaneArgs, parseNdjson, resultMdPath, summarise } from '../src/kane.mjs';
import { buildReport, fixPrompt, reportMarkdown } from '../src/report.mjs';

const fail = readFileSync(new URL('./fixtures/fail.ndjson', import.meta.url), 'utf8');

test('parses NDJSON and ignores plain lines', () => {
  assert.equal(parseNdjson('hello\n{"a":1}\n{bad\n').length, 1);
});

test('summarises a failed testmd run', () => {
  const s = summarise(parseNdjson(fail), 1);
  assert.equal(s.status, 'failed');
  assert.deepEqual(s.failedStep, { step: 2, remark: 'Bill field shows empty, expected 80' });
  assert.equal(s.summary, 'Bill input is empty');
  assert.equal(s.testUrl, 'https://example.test/tc/1');
  assert.equal(s.credits, 8);
  assert.equal(s.durationS, 41.2);
});

test('summarises a pass and a not-signed-in refusal', () => {
  const ok = summarise(parseNdjson('{"type":"run_end","status":"passed","summary":"ok"}\n{"type":"test_md_done","overall_status":"passed"}'), 0);
  assert.equal(ok.status, 'passed');
  const no = summarise(parseNdjson('{"type":"stream_start"}'), 1, 'Not authenticated. Run: kane-cli login --oauth');
  assert.equal(no.status, 'error');
  assert.equal(no.notSignedIn, true);
});

test('kane args', () => {
  const a = kaneArgs('tests/docproof/x_test.md', { url: 'http://h/', appUrl: 'http://h/' });
  assert.deepEqual(a.slice(0, 4), ['testmd', 'run', 'tests/docproof/x_test.md', '--agent']);
  assert.ok(a.includes('--headless'));
  assert.equal(resultMdPath('tests/docproof/x_test.md'), 'tests/docproof/output-x/Result.md');
});

test('fix prompt names the claim and Kane failure', () => {
  const claims = [
    { id: 'a', title: 'A', source: 'README.md', line: 3, steps: ['Open the app.', 'You should see "Hi".'] },
    { id: 'b', title: 'B', source: 'README.md', line: 9, steps: ['Open the app.'] },
  ];
  const results = [summarise(parseNdjson(fail), 1), { status: 'passed' }];
  const report = buildReport({ claims, results, appUrl: 'http://h/', startedAt: 's', finishedAt: 'f' });
  assert.equal(report.status, 'failed');
  const p = fixPrompt(report, { attempt: 2, maxAttempts: 5 });
  assert.match(p, /attempt 2\/5/);
  assert.match(p, /Claim `a` \(README.md:3\): FAILED/);
  assert.match(p, /Kane failed at step 2: Bill field shows empty, expected 80/);
  assert.doesNotMatch(p, /Claim `b`/);
  assert.match(reportMarkdown(report), /\| FAIL \| `a` \|/);
  const green = buildReport({ claims: [claims[1]], results: [{ status: 'passed' }], appUrl: 'x', startedAt: 's', finishedAt: 'f' });
  assert.equal(fixPrompt(green), '');
});

test('fix prompt tells the agent to ask for sign-in instead of editing code', () => {
  const report = buildReport({ claims: [{ id: 'a', title: 'A', source: 'R', line: 1, steps: [] }],
    results: [{ status: 'error', notSignedIn: true }], appUrl: 'x', startedAt: 's', finishedAt: 'f' });
  assert.match(fixPrompt(report), /not signed in/);
});
