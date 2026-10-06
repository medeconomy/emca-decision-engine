# EMCA Decision Engine — project notes for Claude Code

Static single-page app for Jay (吳晉睿, gynecologic oncologist, NTUH): an **evidence browser** of endometrial cancer trials and a **regimen ranker** driven by a patient profile, for endometrioid, serous, clear cell and carcinosarcoma. Data comes from Jay's Obsidian GO_MCP algorithm notes. Repo `medeconomy/emca-decision-engine` (public); GitHub Pages from `main` → https://medeconomy.github.io/emca-decision-engine/. Sibling of `medeconomy/ovca-decision-engine` — same architecture, same rules.

Decision principle: **overall survival first, then toxicity against the patient's own risks, then the prior-therapy ledger.**

Read `HANDOFF.md` for current state and open items, `SPEC.md` for schema differences from OVCA and the decisions (E1–E12), `README.md` for layout and ranking logic.

## Working with Jay

- **Discuss design before building.** For anything that changes what the ranker shows or how a tier is assigned, propose first and wait for his answer. Small fixes and data corrections can go straight in.
- **Never write the label "一句話"** in anything.
- Commit as `Jay Wu <cjwu00@gmail.com>`. Push to `main` deploys.
- Not clinical advice; every number on screen must be traceable (see Provenance).

## Architecture

- `index.html` — the whole app (HTML + CSS + one `<script>`), no build step. Loads `data/*.json` with `fetch()`; serve over HTTP.
- `HIST` keys `eec`, `usc`, `ccc`, `ucs`, each `{trials, regimens, meta}`. Endometrioid is the base pool; other pools' records with `base` inherit **every** field they do not set (`inheritBase`).
- Ranker pipeline: `readPatient` → `gateOK` → `effectiveTier` → `assess` (drug_rules + risk_rules / prefer_when / ledger_rules / exclude_default / caution_default) → `sortKey` (tier, cautions − fits, G≥3) → `rank`.
- `syncSettings(h)` builds the Setting options from `meta.settings`, keeping only settings that have records in that pool.
- Toxicity is resolved at runtime: `toxFor(g, p)` → `tox.json` entry by label prefix + `arm` (or `arm_by_mmr`).
- `readPatient` derives `stage_group` (I–IV) from the FIGO 2009 substage, and MMR from the molecular class when MMR is unknown (MMRd → dMMR; NSMP / p53abn → pMMR).
- Tiers: 1 OS replicated · 2 OS single phase 3 or NI to an OS-positive regimen · 3 OS subgroup / randomised phase II · 4 PFS/RFS/local control · 5 no difference or the comparator that lost · 6 no phase 3 · 7 do not use. Clear cell may not hold tiers 1–4; carcinosarcoma only with `evidence_basis: histotype_rct` (validator).

## Commands

```
python3 -m http.server 8766           # serve
python3 tools/validate.py             # must print "errors: 0"
npm install && node tools/smoke.js    # 18 scenarios + browser pages + phone width; exit 1 on any page error
python3 tools/export_note.py <note.md> <hist> data/trials_<hist>.json --mode itt|histotype --overrides tools/overrides/<hist>.json
python3 tools/fetch_labels.py <outdir> [keys...]   # DailyMed SPL §1/§2/§4 text dump; rules are written by hand
```

`--mode itt` for eec / usc (trial-wide reading), `histotype` for ccc / ucs. Run `validate.py` and `smoke.js` before every commit that touches `data/` or `index.html`; the smoke output lists every card per scenario, so say which ranking changes are intended.

## Provenance (non-negotiable)

1. Every HR / median / rate traces to a vault extract, a PubMed record or a protocol PDF; nothing from memory.
2. Label rules come from DailyMed SPL text, never reconstructed.
3. `"not_reported"` means the source does not report it. No estimation.
4. In the clear cell and carcinosarcoma pools an all-histology trial that did not report the histotype is "included, not broken out" — its HR is never shown as a histotype result.

## Source material (Jay's Mac)

- Vault `AIObsi`, `20_Area/Medicine/GO_MCP/GO_Algorithm/`: `EMCA_Endometrioid_Algorithm_v1.2`, `EMCA_Serous_Algorithm_v1.2`, `EMCA_ClearCell_Algorithm_v1.2`, `EMCA_Carcinosarcoma_Algorithm_v1.2`. Extracts in `GO_summaries/`, PDFs in `GO_PDFs/`.
- Fetching papers: no bypassing bot detection, CAPTCHAs or paywalls; never pirate mirrors.

## Gotchas

- Prefer string concatenation to nested template literals inside `${}`. Syntax check: extract the `<script>` block and run `node --check`.
- `.fld[hidden]` must stay `display:none!important`.
- Trial names in `regimens_*.json` must match the exported row names exactly (`validate.py` checks); the exporter strips `*`, `⚠️` and reference markers and skips "—" placeholder rows.
- `tox_ref.trial` is a prefix of the `tox.json` label — include the " (" when a shorter label would also match (`RUBY (` vs `RUBY Part 2`, `GOG-81 (` vs `GOG-81F`).
