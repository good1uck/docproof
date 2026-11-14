import { computeSplit, formatMoney } from './split.js';

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
  });
});

form.addEventListener('input', render);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});
render();
