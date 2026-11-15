// Pure bill-splitting logic. Used by the page (app/main.js) and by the unit tests.

/** Round to cents without floating-point drift (e.g. 34.499999 -> 34.5). */
export function toCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Validate raw form values. Returns an error message, or null when the input is usable.
 * @param {{bill:number, tipPct:number, people:number}} input
 */
export function validate({ bill, tipPct, people }) {
  if (!Number.isFinite(bill) || bill <= 0) return 'Enter a bill amount greater than 0';
  if (!Number.isFinite(tipPct) || tipPct < 0 || tipPct > 100) return 'Tip must be between 0 and 100%';
  if (!Number.isInteger(people) || people < 1) return 'Add at least 1 person';
  return null;
}

/**
 * Split a bill. Amounts are in dollars.
 * @param {{bill:number, tipPct:number, people:number, roundUp?:boolean}} input
 */
export function computeSplit({ bill, tipPct, people, roundUp = false }) {
  const error = validate({ bill, tipPct, people });
  if (error) return { error };
  const tip = toCents(bill * (tipPct / 100));
  const total = toCents(bill + tip);
  let each = toCents(total / people);
  if (roundUp) each = Math.ceil(each);
  return { error: null, tip, total, each, collected: toCents(each * people) };
}

export function formatMoney(value) {
  return '$' + value.toFixed(2);
}

/**
 * Read a shared split from a query string like "?bill=80&tip=20&people=3".
 * Only well-formed numeric values are returned, so a bad link never breaks the form.
 * @param {string} search
 */
export function parseShare(search) {
  const q = new URLSearchParams(search);
  const out = {};
  for (const key of ['bill', 'tip', 'people']) {
    const raw = q.get(key);
    if (raw != null && raw.trim() !== '' && Number.isFinite(Number(raw))) out[key] = raw.trim();
  }
  if (q.get('round') === '1') out.roundUp = true;
  return out;
}

/** Build the query string that reproduces the current split. */
export function shareQuery({ bill, tip, people, roundUp = false }) {
  const q = new URLSearchParams();
  if (bill !== '') q.set('bill', bill);
  if (tip !== '') q.set('tip', tip);
  if (people !== '') q.set('people', people);
  if (roundUp) q.set('round', '1');
  const s = q.toString();
  return s ? '?' + s : '';
}
