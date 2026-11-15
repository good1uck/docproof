import { computeSplit, formatMoney, parseShare, shareQuery } from './split.js';

const $ = (id) => document.getElementById(id);
const form = $('split-form');
const fields = { bill: $('bill'), tip: $('tip'), people: $('people'), roundUp: $('round-up') };

function readForm() {
  return {
    bill: parseFloat(fields.bill.value),
    tipPct: parseFloat(fields.tip.value),
    people: Number(fields.people.value),
    roundUp: fields.roundUp.checked,
  };
}

function render() {
  const result = computeSplit(readForm());
  const out = $('result');
  const err = $('error');
  if (fields.bill.value.trim() === '') {
    out.hidden = true;
    err.hidden = true;
    return;
  }
  if (result.error) {
    out.hidden = true;
    err.hidden = false;
    err.textContent = result.error;
    return;
  }
  err.hidden = true;
  out.hidden = false;
  $('each').textContent = `Each person pays ${formatMoney(result.each)}`;
  $('breakdown').textContent =
    `Tip ${formatMoney(result.tip)} · Total ${formatMoney(result.total)}` +
    (fields.roundUp.checked ? ` · Collected ${formatMoney(result.collected)}` : '');
}

document.querySelectorAll('[data-tip]').forEach((button) => {
  button.addEventListener('click', () => {
    fields.tip.value = button.dataset.tip;
    render();
    syncUrl();
  });
});

// Shared links: ?bill=80&tip=20&people=3 pre-fills the form.
const shared = parseShare(location.search);
for (const key of ['bill', 'tip', 'people']) if (shared[key] != null) fields[key].value = shared[key];
if (shared.roundUp) fields.roundUp.checked = true;

// Keep the address bar in sync so the current split can be shared by copying the URL.
function syncUrl() {
  const query = shareQuery({
    bill: fields.bill.value.trim(), tip: fields.tip.value.trim(),
    people: fields.people.value.trim(), roundUp: fields.roundUp.checked,
  });
  history.replaceState(null, '', location.pathname + query);
}

$('copy-link').addEventListener('click', async () => {
  syncUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    $('copy-link').textContent = 'Link copied';
  } catch {
    $('copy-link').textContent = 'Copy the address bar';
  }
  setTimeout(() => { $('copy-link').textContent = 'Copy share link'; }, 2000);
});

form.addEventListener('input', () => { render(); syncUrl(); });
form.addEventListener('change', syncUrl);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});
render();
