import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractClaims, plain, toObjective, toTestMd } from '../src/extract.mjs';

const md = `# App

\`\`\`markdown
<!-- docproof:claim id=inside-fence -->
1. Ignored.
\`\`\`

### Split a bill
<!-- docproof:claim id=split-basic -->
1. Open the app.
2. Type \`120\` in **Bill** and \`4\` in **People**,
   then press Tab.
3. You should see **Each person pays $34.50**.

Some prose.

<!-- docproof:claim id=share path=?bill=80 title="Shared link" -->

1. Open the app.
2. Verify the bill is 80.
`;

test('extracts claims, skips fenced examples, joins continuation lines', () => {
  const claims = extractClaims(md, 'X.md');
  assert.deepEqual(claims.map((c) => c.id), ['split-basic', 'share']);
  const [a, b] = claims;
  assert.equal(a.title, 'Split a bill');
  assert.equal(a.line, 9);
  assert.equal(a.steps.length, 3);
  assert.equal(a.steps[1], 'Type "120" in "Bill" and "4" in "People", then press Tab.');
  assert.equal(b.path, '?bill=80');
  assert.equal(b.title, 'Shared link');
});

test('plain() strips markdown', () => {
  assert.equal(plain('Click [**Save**](#x) and `Ok`'), 'Click "Save" and "Ok"');
});

test('objectives: open, see, verify', () => {
  const c = { path: '?bill=80' };
  assert.equal(toObjective('Open the app.', c), 'Open {{app_url}}?bill=80 and wait for the page to finish loading.');
  assert.equal(toObjective('You should see "Each person pays $34.50".', c), 'Verify the page shows "Each person pays $34.50".');
  assert.equal(toObjective('Verify the bill is 80.', c), 'Verify the bill is 80.');
});

test('renders a Kane _test.md with one H2 per step', () => {
  const [claim] = extractClaims(md, 'X.md');
  const t = toTestMd(claim);
  assert.match(t, /^---\nmode: testing\ntags: \[docproof\]/);
  assert.equal((t.match(/^## /gm) || []).length, 3);
  assert.match(t, /## 3\. You should see "Each person pays \$34\.50"\nVerify the page shows/);
});

test('errors on bad markers', () => {
  assert.throws(() => extractClaims('<!-- docproof:claim id=x -->\nno list'), /no numbered steps/);
  assert.throws(() => extractClaims('<!-- docproof:claim -->\n1. a'), /needs id/);
  assert.throws(() => extractClaims('<!-- docproof:claim id=a -->\n1. a\n\n<!-- docproof:claim id=a -->\n1. b'), /duplicate/);
});

test('the real README has the five Splitty claims', () => {
  const claims = extractClaims(readFileSync(new URL('../README.md', import.meta.url), 'utf8'));
  assert.deepEqual(claims.map((c) => c.id), ['split-basic', 'round-up', 'quick-tip', 'validation', 'share-link']);
});
