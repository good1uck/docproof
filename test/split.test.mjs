import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSplit, formatMoney, parseShare, shareQuery, validate } from '../app/split.js';

test('splits a bill with tip', () => {
  const r = computeSplit({ bill: 120, tipPct: 15, people: 4 });
  assert.equal(r.error, null);
  assert.equal(r.tip, 18);
  assert.equal(r.total, 138);
  assert.equal(formatMoney(r.each), '$34.50');
});

test('round up to whole dollars', () => {
  const r = computeSplit({ bill: 120, tipPct: 15, people: 4, roundUp: true });
  assert.equal(formatMoney(r.each), '$35.00');
  assert.equal(formatMoney(r.collected), '$140.00');
});

test('quick tip 20% on 50 for 2', () => {
  assert.equal(formatMoney(computeSplit({ bill: 50, tipPct: 20, people: 2 }).each), '$30.00');
});

test('validation messages', () => {
  assert.equal(validate({ bill: 60, tipPct: 15, people: 0 }), 'Add at least 1 person');
  assert.equal(validate({ bill: 0, tipPct: 15, people: 2 }), 'Enter a bill amount greater than 0');
  assert.equal(validate({ bill: 10, tipPct: 120, people: 2 }), 'Tip must be between 0 and 100%');
  assert.equal(computeSplit({ bill: NaN, tipPct: 15, people: 2 }).error, 'Enter a bill amount greater than 0');
});

test('no floating point drift', () => {
  assert.equal(formatMoney(computeSplit({ bill: 33.33, tipPct: 18, people: 3 }).each), '$13.11');
});

test('reads a shared split from the query string', () => {
  assert.deepEqual(parseShare('?bill=80&tip=20&people=3'), { bill: '80', tip: '20', people: '3' });
  assert.deepEqual(parseShare('?bill=abc&people=&round=1'), { roundUp: true });
  assert.deepEqual(parseShare(''), {});
});

test('builds a share query that round-trips', () => {
  const q = shareQuery({ bill: '80', tip: '20', people: '3' });
  assert.equal(q, '?bill=80&tip=20&people=3');
  assert.deepEqual(parseShare(q), { bill: '80', tip: '20', people: '3' });
  assert.equal(shareQuery({ bill: '', tip: '', people: '' }), '');
});
