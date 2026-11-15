# docproof report: FAILED

App: http://127.0.0.1:4173/  
Run: 2026-11-15T10:49:11.191Z to 2026-11-15T10:53:47.253Z

| Result | Claim | Title | README line | Seconds |
|---|---|---|---|---|
| PASS | `split-basic` | Split a bill | README.md:82 | 9 |
| PASS | `round-up` | Round up | README.md:89 | 70 |
| PASS | `quick-tip` | Quick tip buttons | README.md:97 | 62 |
| PASS | `validation` | Nobody to split with | README.md:105 | 51 |
| FAIL | `share-link` | Share a split as a link | README.md:112 | 56 |

## share-link: failed

Kane summary: The agent treated the requested values or the address parameters as if they were already shown on the page. The form was left at its visible starting values: bill 0.00, tip 15, and people 2.
Fill the three fields first, then read the displayed values and run the final check.

Reason: Final verification failed: "the page shows "80" in "Bill", "20" in "Tip %" and "3" in "People""

