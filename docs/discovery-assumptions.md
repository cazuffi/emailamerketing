# Discovery Assumptions

No explicit answers were provided for the discovery questionnaire. Implementation follows the **recommended default** from the Email Marketing Discovery plan.

## Assumed answers

| Question | Assumption | Rationale |
|----------|------------|-----------|
| 1. Top priority | **A** — Publish library to D365 | Lowest effort, immediate team value |
| 2. Who builds emails | **D** — Hybrid workflow | Repo matches this: dev maintains blocks, team edits in D365 |
| 3. Email types | **Promos/events** + **Product launches** | Existing RockStar campaign and `WM_promo` template |
| 4. D365 status | **B** — Partial publish | Corporate HQ templates exist; USA library not fully published |
| 5. Brand scope | USA regional variant of corporate HQ | `WM_footer` uses Weidmuller USA address |
| 6. Missing blocks | Two-up cards, image-right feature, event details | Top gaps for promo/event emails |
| 7. Pain points | Manual HTML paste, block sync, pre-send validation | Addressed via publish guide, cheat sheet, validate script |

## Selected path

**Combined A + B + C + D (default milestone):**

1. **Path A** — Publish-ready build output + team cheat sheet
2. **Path B** — Three new content blocks + `WM_event` template
3. **Path C** — Enhanced `new-draft` with campaign-type presets
4. **Path D** — `validate:d365` pre-publish checklist script

## Override

If any assumption is wrong, update this file and we can reprioritize. Reply with your actual answers to questions 1–7 to tailor the next iteration.
