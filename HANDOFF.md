# Handoff — 2026-10-06

v0.1 built in one Claude Code session from the four EMCA v1.2 vault notes, forking the OVCA engine. This file is a dated snapshot; `CLAUDE.md` holds the standing rules.

## State

- `validate.py` → 0 errors; `tools/smoke.js` → OK (18 scenarios, 4 evidence pages, trial link, phone width 390 px).
- Design agreed with Jay before the build (SPEC E1–E4): ITT + prespecified MMR strata for endometrioid / serous; MMR moves tiers, other classes are fit / caution; adjuvant RT ranked; all four histotypes at once.
- Toxicity (`tox.json`) and labels (`labels.json`) were extracted by subagents with verbatim evidence quotes / DailyMed setids. Only 16 of 49 trials print an any-cause G≥3 rate, so within-tier toxicity sorting often falls back to cautions and name.

## Reviewed by Jay (2026-10-06)

All build-time judgement calls (SPEC E5–E12) were reviewed the same day: E5 and E8–E12 accepted as written; E6 revised (RUBY pMMR → tier 3 on trial-wide OS); E7 revised (DUO-E durvalumab + olaparib interim OS counts, tier 3, flagged interim; dMMR stays tier 4). Nothing is waiting on Jay. Validation with real cases started the same day; the first case produced E13 (trial-derived adjuvant risk group) and E14 (FIGO 2023 → 2009 mapping).

## Discrepancies found during extraction (vault notes untouched)

- Carcinosarcoma note, KEYNOTE-775 row: OS 18.0 vs 12.2 mo, HR 0.70 — the extract (Makker 2022) gives 18.3 vs 11.4, HR 0.62. Possibly a later analysis; the ranker uses the endometrioid row (0.62).
- Carcinosarcoma note, GARNET row: G≥3 TRAE 16.6% is the pooled A1 + A2 figure; A1 alone is 13.2%.
- PORTEC-3 G3–4: 2018 extract 60% vs 12%; the 2025 Post extract quotes 45% (haematological only). `tox.json` uses 60%.
- Within-extract inconsistencies (PORTEC-1 G3–4 7 vs 1; SIENDO discontinuations 17 vs 18; TROPiCS-03 2 vs 3; MoST-CIRCUIT "3 (7%)" of 28; DESTINY-PanTumor02 8.6% vs 6.7%) are listed in `tox.json` notes.
- AtTEnd OS: the serous note carries ESMO 2025 (36.0 vs 30.5 mo), the endometrioid note says "not verified here". Shown as a qualifier only on the serous card.

## Not done / possible next steps

- `rechallenge.json` (OVCA) has no EMCA equivalent; re-challenge shows only as ledger cautions.
- No fertility-sparing LNG-IUS data (note: not yet tabulated).
- Uterine leiomyosarcoma (`UTSARC_Leiomyosarcoma_Algorithm_v1.2`) could be a fifth pool with its own settings, as GCT/SCST were in OVCA.
- NRG-GY026, RAINBO / GY020 / PORTEC-4a, TroFuse-005 full data: update when reported.
