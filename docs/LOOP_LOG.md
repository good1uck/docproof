# Loop log

Every real Kane CLI run against this repo, in order: what Kane reported, what the coding agent changed, and the re-run.
Times are UTC. Raw NDJSON is committed for the failing run ([`proof/iter-1-failed/`](../proof/iter-1-failed/)) and the latest green run ([`proof/latest/`](../proof/latest/)).
"Authored" means Kane's agent drove the browser and decided each step (costs credits); "replayed" means Kane re-executed its cached steps and assertions for an unchanged test (0 credits).

Kane CLI 0.10.4, `kane-cli testmd run --agent --headless`, local Chrome, app served by `npm run proof` at http://127.0.0.1:4173/.
The coding agent in this loop was Grok Bot, reading `.docproof/FIX_PROMPT.md` and editing `app/`.

## Before any account: 2026-11-14 01:06

`npm run proof` was wired up before the TestMu AI account existed. All three attempts ended `error` with kane-cli not signed in, and docproof's fix prompt told the agent to ask the human to sign in instead of changing code. No Kane runs happened.

## Run 0 (smoke test): 2026-11-15 10:47:50 to 10:49:02

`npm run proof -- --only split-basic` after `kane-cli login` (basic auth). Balance before: 1200 credits.

| Claim | Result | Kane | Seconds | Credits | Session | Kane run |
|---|---|---|---|---|---|---|
| split-basic | PASS | authored 3 steps | 61 | ~43 | b19b5ab1-a44c-4ffd-a3a6-2bca66830eba | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FD46ET24J1FRC29DQC0EWT/dashboard/share/US_0QSIZU51EJUF32VAY2PDMYE3KPLUFR8TSMVKIC3VRKM3KBCP7CP9EFBJ9MXFRX1C?type=summary&agentView=true&fqdn=summary-page) |

## Run 1 (all claims): 2026-11-15 10:49:11 to 10:53:47 · FAILED 4/5

`npm run proof`. Credits 1156.67 to 1005.40.

| Claim | Result | Kane | Seconds | Credits | Session | Kane run |
|---|---|---|---|---|---|---|
| split-basic | PASS | replayed 3 steps (unchanged since run 0) | 9 | 0 | 853328a8-9fdb-4475-917c-a3c70238f132 | (replay, see run 0) |
| round-up | PASS | authored 4 steps | 70 | 34.8 | 41e6c0e4-0cce-4a34-a3f1-a55aff797316 | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FD6XGEYVMA398KB0FZNJQ3/dashboard/share/US_JL5EJQEJD0UJ395RIW02F6884VKA73PABU1T0X0OVYDJDRE63B70YVY42RKDFX2N?type=summary&agentView=true&fqdn=summary-page) |
| quick-tip | PASS | authored 4 steps | 62 | 36.3 | 6dccace8-b6fe-44dc-bee9-9fee2c527bd2 | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FD99N34AK129FBD29ZH9G7/dashboard/share/US_AOSWOWB2YV6BGV6Z2K74LMFH78DFB2857CY4WSONTU0NN1KFKMD721GSRLXJQ6SY?type=summary&agentView=true&fqdn=summary-page) |
| validation | PASS | authored 3 steps | 51 | 31.7 | 065083e8-6c21-4b37-a2ea-8b89ad91fcfe | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDBDEQY16J4SK8QBQK36ER/dashboard/share/US_YRRB05LKUI2P1RL1REVGRVMLLAEAWHVBZCWXR75TXCXPN8VAHBCZYA6EGP36QN9S?type=summary&agentView=true&fqdn=summary-page) |
| share-link | **FAIL** | authored 3 steps | 56 | 19.6 | bcc631fc-f83c-486d-bfe6-b5f808b643a9 | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDD7BS9G2Y13NGH3B8X0BR/dashboard/share/US_W7WM0RI24819TQT870NKXBE8ZGNS8PUF1YAM032XJXBHK324K393LA4T8KBUVKG7?type=summary&agentView=true&fqdn=summary-page) |

What Kane saw for `share-link` (opened `/?bill=80&tip=20&people=3`):

> The form was left at its visible starting values: bill 0.00, tip 15, and people 2.
> Final verification failed: "the page shows "80" in "Bill", "20" in "Tip %" and "3" in "People""

This was the expected failure: the README documented share links before the app supported them. The generated fix prompt is in [`proof/iter-1-failed/FIX_PROMPT.md`](../proof/iter-1-failed/FIX_PROMPT.md).

### Fix (agent, from FIX_PROMPT.md)

- `app/split.js`: `parseShare()` reads `bill`, `tip`, `people` (and `round=1`) from the query string, ignoring malformed values; `shareQuery()` builds it back.
- `app/main.js`: pre-fills the form from the URL on load, keeps the address bar in sync with `history.replaceState`, and adds a **Copy share link** button.
- `test/split.test.mjs`: 2 new unit tests (19 total, all passing). README claim unchanged.

## Run 2 (all claims): 2026-11-15 10:54:25 to 10:55:54 · PASSED 5/5

`npm run proof`. Credits 1005.40 to 976.82.

| Claim | Result | Kane | Seconds | Credits | Session | Kane run |
|---|---|---|---|---|---|---|
| split-basic | PASS | replayed 3 steps | 9 | 0 | 84de852b-ec1a-4463-a25b-5cbcc2fc3047 | (replay) |
| round-up | PASS | replayed 4 steps | 10 | 0 | 104cf684-d183-49c8-8468-70902ead195b | (replay) |
| quick-tip | PASS | replayed 4 steps | 9 | 0 | 9f2adbbd-b000-47e7-8722-62490ab531c5 | (replay) |
| validation | PASS | replayed 3 steps | 9 | 0 | 90555e91-d1e9-42d1-b0c7-eaa517b3b155 | (replay) |
| share-link | **PASS** | 1 replayed, 2 re-authored | 36 | 24.5 | 1679863f-556b-4de6-b0c7-bdcb0e437dc5 | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDD7BS9G2Y13NGH3B8X0BR/dashboard/share/US_5MTCG0OSEPCMQ88CXNKDUPZ2FP1ID0RP4ETN1TBBZEIEENL7LDDSHVJOKVH4ORM7?type=summary&agentView=true&fqdn=summary-page) |

Kane: "Completed the bill split calculation with an $80 bill, a 20% tip, and 3 people. The page showed that each person pays $32.00."

The four unchanged claims replayed against the changed app and still passed, so the fix broke nothing. Raw output: [`proof/latest/`](../proof/latest/). `npm run proof:replay` re-reads it without an account.

## Run 3 (deployed site): 2026-11-15 11:00:25 to 11:06:08 · PASSED 5/5

After deploying the fix to GitHub Pages: `node bin/docproof.mjs check --url https://good1uck.github.io/docproof/ --out tests/docproof-live`.
A new URL means new Kane test cases, so every claim was authored from scratch in the browser, not replayed. Credits 976.82 to 885.75.

| Claim | Result | Kane | Seconds | Credits | Session | Kane run |
|---|---|---|---|---|---|---|
| split-basic | PASS | authored 3 steps | 58 | 14.9 | 861825ba-2045-409d-9a7a-bc4cd423f34c | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDV5XZG45T6XWZA9X4EGRX/dashboard/share/US_RK2AVW3O9J1OWKFJJOOBZEAYIOQPCI3R60Z43050DBTVPVKGYD731HWI6Z2HIZ1M?type=summary&agentView=true&fqdn=summary-page) |
| round-up | PASS | authored 4 steps | 71 | 13.1 | afb44801-45f1-4485-9ae2-30eb253592bf | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDX6DS71ZPYZE98CCCVG8J/dashboard/share/US_QMFJ54WOA26M3AWXN1NKV4IOUMV1JV4TQ67WDG2FSQDW66G3RH0QTZOFHBCMUDCV?type=summary&agentView=true&fqdn=summary-page) |
| quick-tip | PASS | authored 4 steps | 64 | 16.7 | 25119bd9-44b4-4b06-b1d6-8dab02f52e0f | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FDZKQAS3PNV2M71FC8TR03/dashboard/share/US_J804S3DUMJBG8Z293J0JZ7IYTPJ1GEAB6T2ONSZBM2OYCT12OYPHENI2UEPUDLEP?type=summary&agentView=true&fqdn=summary-page) |
| validation | PASS | authored 3 steps | 51 | 14.1 | 4e882c14-4689-4c13-9e94-1cfc1dcfa58b | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FE1TGTZZNSS0J0TMDKHFM9/dashboard/share/US_N81C7DYF2RU7WRRW1MDXGCHRQL1L3JH7GBF0EV19BXK7N136BIMMUY2YUNDUV9JO?type=summary&agentView=true&fqdn=summary-page) |
| share-link | PASS | authored 3 steps | 49 | 12.9 | 0bc17a3c-41ea-4fc8-9b2f-1fdc4eb8a6c3 | [Test Manager](https://test-manager.lambdatest.com/projects/01M7FD3S92MNX3MHTN8K1PJN5D/test-cases/01M7FE3XHKPVW8WNHHKBSYFKM2/dashboard/share/US_32EL8IT8T8HD7SGE5OHFEJXMIA5RGZZCM5NBXNGC7L23NXQ5K4DPBY7PF23JEFNR?type=summary&agentView=true&fqdn=summary-page) |

For `share-link`, Kane only read values: it opened `?bill=80&tip=20&people=3`, read the Bill, Tip % and People inputs (80, 20, 3) without typing, then checked "Each person pays $32.00". Raw output: [`proof/live/`](../proof/live/).

## Runs 4 and 5 (recording the demo video): 2026-11-15 11:09:54 to 11:11:59 · PASSED 5/5 both times

Two local `npm run proof` re-runs under `asciinema` for the demo video. Nothing had changed, so all 5 claims replayed from Kane's cache both times. The first recording was discarded because a pipe buffered the output; the second is the one in the video.
`run_end` reported 0 credits, but the balance still dropped by about 1.5 credits per full run (885.75 to 882.51 for both).

Run 5 sessions: split-basic aaa8ccb3-92f4-4249-8deb-8b946c78c8b6, round-up 9e99d322-f045-4b03-ac03-8c4f6a3a08d3, quick-tip 570436ab-0b26-42e2-9702-9df7ab81f3d9, validation 4b3db356-37ea-4191-b971-4213d2121de3, share-link 74547b89-427a-461b-8e53-c235cdbed1d5.

## Summary

| Run | Where | Result | Kane-authored | Replayed |
|---|---|---|---|---|
| 0 | local | 1/1 (smoke) | 1 | 0 |
| 1 | local | **4/5, share-link failed** | 4 | 1 |
| fix | agent edits `app/` from FIX_PROMPT.md | | | |
| 2 | local | **5/5** | 1 | 4 |
| 3 | GitHub Pages | **5/5** | 5 | 0 |
| 4, 5 | local (video) | **5/5**, twice | 0 | 10 |

Total: 1200 to 882.51 credits (about 317) for 26 Kane test runs.
