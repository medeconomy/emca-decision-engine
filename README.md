# EMCA Decision Engine

Evidence browser and patient-driven regimen ranker for endometrial carcinoma: endometrioid (EEC), serous (USC), clear cell (CCC) and carcinosarcoma (UCS). Sibling of the [OVCA Decision Engine](https://github.com/medeconomy/ovca-decision-engine).

Decision principle: **overall-survival benefit first → evidence-strength qualifier → PFS-only tier collapsed below → adverse-effect profile decides among survivors → prior-therapy ledger removes or demotes drugs already used.**

## Layout

| Path | What it is |
|---|---|
| `index.html` | Single-page app. View 1: ranker (patient profile → tiered list; histology picks the pool, setting list follows it). View 2: evidence browser (histology switch → setting tabs, outcome and evidence-level filters, PubMed-linked references). No build step; loads `data/*.json` at runtime. |
| `data/trials_{eec,usc,ccc,ucs}.json` | Exports of `EMCA_{Endometrioid,Serous,ClearCell,Carcinosarcoma}_Algorithm_v1.2` by `tools/export_note.py`: 45 / 25 / 29 / 44 rows, 39 / 23 / 34 / 77 references. Cells verbatim; `out` (trial-wide reading for EEC/USC, histotype-level for CCC/UCS) and `level` are derived, with every row reviewed in `tools/overrides/`. |
| `data/regimens_eec.json` | 36 regimen × setting records — the base pool. Adjuvant RT and systemic options, first-line (stage III–IV or first recurrence), maintenance, 2L+, fertility-sparing. |
| `data/regimens_{usc,ccc,ucs}.json` | 22 / 25 / 24 records. A record with `base` inherits every field it does not set from the endometrioid record. |
| `data/tox.json` | 49 trials, per-arm grade ≥3, discontinuation and dose-reduction rates with verbatim evidence quotes from `GO_summaries/`. Unreported = `"not_reported"`. |
| `data/labels.json` | DailyMed §2 / §4 rules for 34 agents (16 reused from OVCA, fetched 2026-10-05; 15 fetched 2026-10-06; sacituzumab tirumotecan, adavosertib and aspirin recorded as no label). |
| `data/drug_rules.json` | Label-derived baseline-risk rules per drug, applied to every regimen containing that drug. |
| `SPEC.md` | Schema differences from OVCA and the decisions (E1–E12). |
| `tools/` | `export_note.py`, `fetch_labels.py`, `validate.py`, `smoke.js`, `overrides/*.json`. |

## Ranking logic

1. **Gate** by histology (pool), setting, FIGO 2009 stage (FIGO 2023 input is translated and the translation shown), adjuvant risk group derived from the trials' eligibility (low / high-intermediate / high), residual, myometrial invasion, MMR, HER2, grade, response to platinum, prior platinum / prior PD-(L)1 — as each pivotal trial requires.
2. **Tier**: 1 replicated OS · 2 single phase 3 OS (or non-inferior to an OS-positive regimen) · 3 OS in a subgroup / randomised phase II · 4 PFS / RFS / local control only · 5 no difference, or the comparator that lost (kept for patients who cannot receive the better option) · 6 no phase 3 · 7 do not use. **Endometrioid and serous** rank on the trial-wide result and the prespecified dMMR / pMMR strata; **clear cell** on clear-cell-level evidence only (tiers 1–4 empty); **carcinosarcoma** on its own randomised trials, with trials that excluded it at tier 7.
3. **Molecular class**: MMR moves tiers and gates; POLEmut / NSMP / p53abn (PORTEC-3 post hoc) add fit and caution flags, and p53abn lifts stage I–II chemoradiation to tier 3.
4. **Exclude** on label contraindications and trial exclusions matched to baseline-risk flags; the ledger excludes a class stopped for toxicity and flags checkpoint-inhibitor re-challenge.
5. **Order within a tier** by cautions minus fits, then grade ≥3 any-cause (treatment-related as a lower bound when that is all that is printed).
6. Tiers 1–3 open; 4–5 open when 1–3 are empty; 6 when 1–5 are empty.

Every card shows why it sits where it sits and links each trial to its row in the evidence browser.

## Running locally

```
python3 -m http.server 8766
python3 tools/validate.py              # must print "errors: 0"
npm install && node tools/smoke.js     # 18 headless scenarios + browser pages + phone width
```

## Scope

v0.1 ranks the four histotypes in adjuvant, first-line, maintenance, 2L+ and (endometrioid) fertility-sparing settings. No randomised neoadjuvant data exist in any of the four notes, so there is no neoadjuvant setting. Uterine sarcomas are out of scope.

Not clinical advice. Built for one gynecologic oncologist's own decision support; every recommendation carries its source so it can be checked.

## License

Code (`index.html`, `tools/`): MIT. Data files under `data/`: CC BY 4.0 (see `data/LICENSE`).
