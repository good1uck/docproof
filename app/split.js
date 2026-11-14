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
