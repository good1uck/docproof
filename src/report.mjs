// Turn Kane CLI results into a report for humans and a fix prompt for the coding agent.

export function overall(results) {
  if (results.some((r) => r.status === 'error' || r.status === 'timeout')) return 'error';
  if (results.some((r) => r.status === 'failed')) return 'failed';
  return 'passed';
}

const ICON = { passed: 'PASS', failed: 'FAIL', error: 'ERROR', timeout: 'TIMEOUT' };

export function buildReport({ claims, results, appUrl, startedAt, finishedAt }) {
  return {
    tool: 'docproof',
    appUrl,
    startedAt,
    finishedAt,
    status: overall(results),
    claims: claims.map((c, i) => ({
      id: c.id,
      title: c.title,
      source: `${c.source}:${c.line}`,
      steps: c.steps,
      ...pick(results[i]),
    })),
  };
}

function pick(r) {
  const { status, exitCode, summary, reason, failedStep, durationS, testUrl, shareUrl, credits, notSignedIn } = r;
  return { status, exitCode, summary, reason, failedStep, durationS, testUrl, shareUrl, credits, notSignedIn };
}

export function reportMarkdown(report) {
  const rows = report.claims.map((c) =>
    `| ${ICON[c.status] || c.status} | \`${c.id}\` | ${c.title} | ${c.source} | ${c.durationS ?? ''} |`);
  const lines = [
    `# docproof report: ${report.status.toUpperCase()}`,
    '',
    `App: ${report.appUrl}  `,
    `Run: ${report.startedAt} to ${report.finishedAt}`,
    '',
    '| Result | Claim | Title | README line | Seconds |',
    '|---|---|---|---|---|',
    ...rows,
  ];
  for (const c of report.claims.filter((x) => x.status !== 'passed')) {
    lines.push('', `## ${c.id}: ${c.status}`, '');
    if (c.failedStep) lines.push(`Failed at step ${c.failedStep.step}: ${c.failedStep.remark}`, '');
    if (c.summary) lines.push(`Kane summary: ${c.summary}`, '');
    if (c.reason) lines.push(`Reason: ${c.reason}`, '');
    if (c.testUrl) lines.push(`Test Manager: ${c.testUrl}`, '');
  }
  return lines.join('\n') + '\n';
}

/**
 * The message handed back to the coding agent when a claim fails.
 * It names the README promise, the exact Kane failure, and the rules for fixing it.
 */
export function fixPrompt(report, { attempt = 1, maxAttempts = 5 } = {}) {
  const broken = report.claims.filter((c) => c.status !== 'passed');
  if (!broken.length) return '';
  if (broken.every((c) => c.notSignedIn)) {
    return 'docproof could not run Kane CLI: kane-cli is not signed in. Ask the human to run `kane-cli login` ' +
      '(or set LT_USERNAME and LT_ACCESS_KEY), then run `npm run proof` again. Do not change the code for this.\n';
  }
  const parts = [
    `docproof (attempt ${attempt}/${maxAttempts}): Kane CLI ran the README in a real browser against ${report.appUrl}`,
    `and ${broken.length} of ${report.claims.length} documented claim(s) are not true yet.`,
    '',
  ];
  for (const c of broken) {
    parts.push(`### Claim \`${c.id}\` (${c.source}): ${c.status.toUpperCase()}`);
    parts.push('The README promises:');
    c.steps.forEach((s, i) => parts.push(`  ${i + 1}. ${s}`));
    if (c.failedStep) parts.push(`Kane failed at step ${c.failedStep.step}: ${c.failedStep.remark}`);
    if (c.summary) parts.push(`Kane summary: ${c.summary}`);
    if (c.reason) parts.push(`Reason: ${c.reason}`);
    if (c.status === 'error' || c.status === 'timeout') parts.push('This run did not finish; check the app is being served before changing code.');
    parts.push('');
  }
  parts.push(
    'Fix the app so these claims become true. Rules:',
    '- Change the app code (app/), not the README claim, unless the claim itself is wrong. If you change a claim, say why.',
    '- Keep the unit tests passing (`npm test`).',
    '- Then run `npm run proof` again. docproof re-runs Kane CLI; stop when every claim passes.',
  );
  return parts.join('\n') + '\n';
}
