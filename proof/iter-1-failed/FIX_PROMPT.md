docproof (attempt 1/5): Kane CLI ran the README in a real browser against http://127.0.0.1:4173/
and 1 of 5 documented claim(s) are not true yet.

### Claim `share-link` (README.md:112): FAILED
The README promises:
  1. Open the app.
  2. You should see "80" in "Bill", "20" in "Tip %" and "3" in "People".
  3. You should see "Each person pays $32.00".
Kane summary: The agent treated the requested values or the address parameters as if they were already shown on the page. The form was left at its visible starting values: bill 0.00, tip 15, and people 2.
Fill the three fields first, then read the displayed values and run the final check.
Reason: Final verification failed: "the page shows "80" in "Bill", "20" in "Tip %" and "3" in "People""

Fix the app so these claims become true. Rules:
- Change the app code (app/), not the README claim, unless the claim itself is wrong. If you change a claim, say why.
- Keep the unit tests passing (`npm test`).
- Then run `npm run proof` again. docproof re-runs Kane CLI; stop when every claim passes.
