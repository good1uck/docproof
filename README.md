# docproof

**Your README makes promises. Kane CLI checks them in a real browser. When one is false, the failure goes straight back to your coding agent, which fixes the code and runs Kane again.**

Built for the [Kane CLI Online Hackathon](https://www.kaneclihack.sh) (TestMu AI, 12–19 Nov 2026).

- Live demo app: https://good1uck.github.io/docproof/
- Run locally in one command: `npm start` (then open http://localhost:4173/)
- Latest Kane CLI result: [`proof/latest/report.md`](proof/latest/report.md)
- Loop log (every Kane run, failure and fix): [`docs/LOOP_LOG.md`](docs/LOOP_LOG.md)

## Why

Coding agents write "1. Open the app 2. Click X 3. You should see Y" into READMEs all day, and nobody checks it. Docs drift, the demo in the README stops working, and the agent that wrote both can't tell.

docproof turns every numbered "try it" list in a README into a [Kane CLI](https://www.testmuai.com/kane-cli/) test, runs it in real Chrome, and hands any failure back to the agent as its next instruction. The README becomes the spec, Kane CLI is the referee, and the agent keeps going until the docs are true.

```
README claim ──► docproof extract ──► tests/docproof/<id>_test.md
                                            │
          ┌──────────── kane-cli testmd run --agent (NDJSON) ◄┘
          ▼
   all pass? ── yes ──► done, report.md is green
          │ no
          ▼
   .docproof/FIX_PROMPT.md ──► Claude Code Stop hook / Cursor stop hook / any agent CLI
          ▲                                     │ edits app/
          └──────────── re-run Kane ◄───────────┘
```

## Quick start

Requires Node 20+, Chrome, and a free [TestMu AI account](https://www.testmuai.com/register/) (10,000 Kane CLI credits).

```bash
git clone https://github.com/good1uck/docproof && cd docproof
npm test                                  # unit tests, no account needed
npm start                                 # demo app at http://localhost:4173/

npm install -g @testmuai/kane-cli
kane-cli login                            # or export LT_USERNAME and LT_ACCESS_KEY
npm run proof                             # Kane CLI checks every claim below
cat .docproof/report.md                   # what passed, what failed and why
cat .docproof/FIX_PROMPT.md               # what the agent is told to fix
```

No account? `npm run proof:replay` re-reads the committed Kane CLI run in `proof/latest/` and prints the same report.

## Close the loop with your agent

| Agent | How | What happens |
|---|---|---|
| Claude Code | [`.claude/settings.json`](.claude/settings.json) registers `docproof hook claude` as a **Stop** hook | When Claude tries to finish, Kane runs. A false claim returns `{"decision":"block","reason":<fix prompt>}`, so Claude keeps working on exactly that failure. |
| Cursor | [`.cursor/hooks.json`](.cursor/hooks.json) registers `docproof hook cursor` as a **stop** hook | A false claim returns `{"followup_message":<fix prompt>}`, which Cursor sends to the agent as the next message. |
| Any CLI agent | `node bin/docproof.mjs loop --agent-cmd "claude -p"` (or `"codex exec -"`, …) | docproof pipes `FIX_PROMPT.md` to the agent's stdin, waits, re-runs Kane, repeats up to `--max` times. |
| You, live | `npm run proof:watch` | Re-runs Kane on every save in `app/` or the README. |

Attempts are capped (`--max`, default 5) so a hook can never loop forever. If kane-cli isn't signed in, the agent is told to ask you instead of "fixing" the code.

## Writing claims

Put a marker comment above any numbered list. Readers see normal steps; docproof sees a test.

```markdown
<!-- docproof:claim id=split-basic -->
1. Open the app.
2. Type `120` in **Bill**, `15` in **Tip %** and `4` in **People**.
3. You should see **Each person pays $34.50**.
```

- `Open the app` becomes `Open {{app_url}}…` (served locally, or `--url https://your.deploy/`).
- `You should see X` becomes a Kane assertion: `Verify the page shows X.`
- `path=?a=1` on the marker appends a path or query string to the app URL.
- Generated tests are only rewritten when a claim changes, so unchanged claims replay from Kane's cache at zero credits.

## Demo app: Splitty

[`app/`](app/) is a small bill splitter built for this project by an AI coding agent. Every list below is a docproof claim, verified by Kane CLI.

### Split a bill

<!-- docproof:claim id=split-basic -->
1. Open the app.
2. Type `120` in **Bill**, `15` in **Tip %** and `4` in **People**.
3. You should see **Each person pays $34.50**.

### Round up

<!-- docproof:claim id=round-up -->
1. Open the app.
2. Type `120` in **Bill**, `15` in **Tip %** and `4` in **People**.
3. Tick **Round up to whole dollars**.
4. You should see **Each person pays $35.00** and **Collected $140.00**.

### Quick tip buttons

<!-- docproof:claim id=quick-tip -->
1. Open the app.
2. Type `50` in **Bill** and `2` in **People**.
3. Click the **20%** button.
4. You should see **Each person pays $30.00**.

### Nobody to split with

<!-- docproof:claim id=validation -->
1. Open the app.
2. Type `60` in **Bill** and `0` in **People**.
3. You should see the error **Add at least 1 person**.

### Share a split as a link

<!-- docproof:claim id=share-link path=?bill=80&tip=20&people=3 -->
1. Open the app.
2. You should see **80** in **Bill**, **20** in **Tip %** and **3** in **People**.
3. You should see **Each person pays $32.00**.

## Repository map

| Path | What |
|---|---|
| `bin/docproof.mjs` | CLI: `extract`, `check`, `watch`, `loop`, `hook claude|cursor` |
| `src/extract.mjs` | README claims → Kane `_test.md` |
| `src/kane.mjs` | Runs `kane-cli testmd run --agent`, parses the NDJSON stream |
| `src/report.mjs` | `report.json` / `report.md` / `FIX_PROMPT.md` |
| `app/` | Splitty demo app (static, no build) |
| `tests/docproof/` | Generated Kane tests and their `output-*/` recordings (committed so replays are free) |
| `proof/latest/` | The latest real Kane CLI run: raw NDJSON, exit codes, report |
| `docs/LOOP_LOG.md` | Each Kane failure, the agent's fix, and the green re-run |

## How Kane CLI is used

- `kane-cli testmd run tests/docproof/<id>_test.md --agent --headless --url <app> --variables '{"app_url":…}'` per claim.
- docproof reads the NDJSON stream: progress events (`step`, `status`, `remark`), `run_end` (`summary`, `reason`, `test_url`, `credits_consumed`) and `test_md_done` (`overall_status`, `duration_s`), plus the exit code (0 pass, 1 fail, 2 did not start, 3 timeout).
- Failed step remarks and summaries are written into the fix prompt verbatim, so the agent reacts to what Kane actually saw in the browser.
- CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs unit tests, replays the committed run, and runs real Kane CLI when `LT_USERNAME`/`LT_ACCESS_KEY` secrets are set.

## License

MIT
