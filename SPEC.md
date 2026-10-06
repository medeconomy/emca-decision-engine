# EMCA Decision Engine — Data Schema & Decisions v0.1

Sibling of the OVCA Decision Engine (`medeconomy/ovca-decision-engine`). The schema, provenance rules and tier scheme are inherited from its `SPEC.md` (decisions 1–19, 2026-10-05/06); this file records only what differs for endometrial carcinoma.

Decision principle (unchanged): OS benefit first → evidence-strength qualifier → PFS-only tier collapsed below → adverse-effect profile decides among survivors → prior-therapy ledger removes or demotes drugs already used.

> **Hard rules** (unchanged from OVCA)
> 1. Every HR / median / rate traces to a vault extract, a PubMed record or a protocol PDF; nothing from memory.
> 2. Label rules come from DailyMed SPL text (§2 dose modification, §4 contraindications), never reconstructed.
> 3. Unreported fields stay `"not_reported"`. No estimation.
> 4. An all-histology trial that did not report a histotype is "included, not broken out" in a histotype-level pool.

## Sources

`20_Area/Medicine/GO_MCP/GO_Algorithm/`: `EMCA_Endometrioid_Algorithm_v1.2`, `EMCA_Serous_Algorithm_v1.2`, `EMCA_ClearCell_Algorithm_v1.2`, `EMCA_Carcinosarcoma_Algorithm_v1.2` (all full-text checked 2026-09-15 / 09-19). Extracts in `GO_summaries/`, PDFs in `GO_PDFs/`.

## Patient profile (input)

```yaml
patient:
  histology: eec | usc | ccc | ucs
  setting: adjuvant | first_line | maintenance | second_line | fertility_sparing   # no neoadjuvant: no data in any note
  stage_system: 2009 | 2023
  stage: IA | IB | II | IIIA | IIIB | IIIC1 | IIIC2 | IVA | IVB                     # FIGO 2009, the staging the trials used; a 2023 substage is mapped (E14)
  status: primary | recurrence            # first_line only (the notes treat both as one chemo-naive population)
  measurable: yes | no | unknown          # first_line (DUO-E newly diagnosed)
  grade: 1 | 2 | 3                         # endometrioid only
  mi: none | lt50 | ge50                   # adjuvant, fertility-sparing
  lvsi: none | substantial                 # adjuvant
  residual: none | le2 | gt2               # adjuvant (GOG-122 ≤2 cm, GOG-150 ≤1 cm)
  sarc: yes | no | unknown                 # carcinosarcoma: sarcoma-component dominance
  response: CR | PR | SD | PD              # maintenance (SIENDO required PR/CR)
  pfi_months: months since last platinum (2L) / since prior systemic therapy (first recurrence)
  prior_lines, age, ecog
  mol_class: POLEmut | MMRd | NSMP | NSMP_noPOLE | p53abn | unknown   # NSMP_noPOLE = p53wt + pMMR without POLE sequencing → NSMP with a notice
  risk_group: low | hir | high | unknown   # derived, endometrioid adjuvant only (E13)
  mmr: pMMR | dMMR | unknown               # if unknown: MMRd → dMMR; NSMP, p53abn → pMMR; POLEmut left unknown
  er_pr: positive | negative | unknown
  her2: 3+ | 2+amp | 2+ | 1+ | 0 | unknown
  baseline_risk: OVCA flags + vte_history
  ledger: [{cls, outcome}]                 # classes add radiotherapy, vegf_tki, mtor, anti_her2, adc_her2, adc_trop2
```

## Data files

- `regimens_eec.json` is the base pool. `regimens_{usc,ccc,ucs}.json` records may carry `base` and **inherit every field they do not set** (broader than OVCA, where only toxicity/label/ledger fields were inherited), so a serous record that agrees with endometrioid is a few lines.
- `tox_ref: {trial, arm, arm_by_mmr?}` points at a `tox.json` entry by label prefix and at one of its `arms`; the app reads the figures at runtime (no numbers copied into regimen files). NRG-GY018 reports toxicity by MMR cohort, hence `arm_by_mmr`.
- `drug_rules.json` holds the label-derived baseline-risk rules per drug and is applied to every regimen containing the drug. Regimen `risk_rules` hold only trial-specific rules.
- `gate` keys: `stage_group`, `stage`, `residual`, `mi` (soft: skipped when unknown), `mmr`, `her2`, `grade`, `response`, `mol_class`, `er_pr`, `status` (hard), `prior_platinum`, `prior_io`.
- `tier_rules[].when` may combine keys (AND), including `stage_group`, `mol_class`, `mmr`, `her2`, `setting`, `status`.
- `risk_rules` / `prefer_when` support `{"flag": "all", "all": [...]}`.

## Decisions taken (2026-10-06, Jay)

E1. **Tier basis for endometrioid and serous: trial-wide (ITT) results and the prespecified MMR strata.** Endometrioid is 54–71% and serous 15–22% of the all-histology trials. When an MMR stratum disagrees with the ITT, the stratum wins for a patient with known MMR. Histology forest-plot subgroups are qualifiers only. Clear cell stays on histotype-level evidence (OVCA rule: tiers 1–4 empty); carcinosarcoma stays histotype-level except for its own randomised trials (GOG-161, GOG-0261, GOG-108, GOG-150), which may hold tiers 2–5 (`evidence_basis: histotype_rct`; the validator enforces this).

E2. **Molecular class.** MMR moves tiers and gates (dMMR → PD-1 monotherapy; dMMR/pMMR tier rules on chemo-IO). POLEmut / NSMP / p53abn are post hoc (PORTEC-3): they add fit / caution flags, and lift stage I–II chemoradiation to tier 3 for p53abn; they do not demote to tier 7.

E3. **Adjuvant radiotherapy is ranked.** Observation, VBT, pelvic EBRT, chemoradiation (PORTEC-3), VBT + carboplatin–paclitaxel (GOG-249), chemotherapy alone (GOG-258), RT → sequential chemotherapy (NSGO/MaNGO), AP (GOG-122), CAP (JGOG-2033), whole-abdominal RT. RT has no DailyMed label; toxicity comes from the trial extracts.

E4. **Scope v0.1:** all four histotypes at once. Uterine leiomyosarcoma (UTSARC note) is out of scope.

## Judgement calls made in the build — reviewed by Jay 2026-10-06 (E5, E8–E12 accepted as written; E6 and E7 revised)

E5. **Comparator that lost on OS → tier 5, not 7.** A backbone that lost OS to an add-on in the patient's own population is tier 5 with the reason shown ("for patients who cannot receive the better option"), so it survives when the add-on is contraindicated: carboplatin–paclitaxel and TAP for dMMR or MMR-unknown (RUBY), and for HER2-positive serous (Fader, randomised phase II); the KEYNOTE-775 chemotherapy control. AP (lost to TAP) and whole-abdominal RT (lost to AP) are tier 7 because better options always exist.

E6. **pMMR first-line (Jay, 2026-10-06): RUBY is tier 3 for pMMR.** The trial-wide OS benefit (0.69, 0.54–0.89) carries the card; the pMMR stratum itself is PFS 0.76 (0.59–0.98) and OS 0.79 (0.60–1.04), NS, which the card prints. Carboplatin–paclitaxel alone stays tier 2 (GOG-177 OS → GOG-209 non-inferiority). The other chemo-IO regimens stay tier 4 (GY018 has no OS in the note; DUO-E OS interim; AtTEnd pMMR PFS 0.92, NS → tier 5).

E7. **DUO-E durvalumab + olaparib interim OS counts, flagged as interim (Jay, 2026-10-06).** ITT OS 0.59 (0.42–0.83, P=.003) at ~28% maturity is credited as an OS benefit but held at **tier 3** until the final analysis; the card prints "INTERIM" in the OS cell and a qualifier. In dMMR the arm stays tier 4: the interim OS is ITT and olaparib added nothing over durvalumab in dMMR (PFS 0.97, 0.49–1.98). Durvalumab alone (interim OS 0.77, NS) stays tier 4.

E8. **Fader (HER2+ serous) is tier 3**: randomised phase II, serous-only, OS 0.49 (0.25–0.97) in the primary stage III–IV subgroup. Recurrent subgroup (n=17) → tier 4.

E9. **Adjuvant tiers:** chemoradiation tier 2 (PORTEC-3 OS 0.70); stage I–II tier 5 (OS 0.84, NS), p53abn stage I–II tier 3. AP ×7 tier 2 (GOG-122 OS 0.68 vs WAI) with a qualifier that the comparator is obsolete. Carboplatin–paclitaxel ×6 tier 5 (GOG-258 NS vs chemoradiation). EBRT tier 4 (local control only), tier 7 in stage III (PORTEC-3 control). VBT tier 4 by non-inferiority to EBRT (PORTEC-2). Observation tier 5. KEYNOTE-B21 tier 7 (negative ITT), dMMR tier 4 (6 in clear cell / carcinosarcoma).

E10. **Carcinosarcoma:** carboplatin–paclitaxel tier 2 first-line (non-inferior to ifosfamide–paclitaxel, which beat ifosfamide on OS) but tier 5 adjuvant (GOG-161's OS gain was in measurable advanced disease; GOG-150 NS). Ifosfamide–paclitaxel tier 5 (PFS worse than TC). Trials that excluded carcinosarcoma → tier 7 (OVCA decision 7), including regimens used in practice by extrapolation (TC + trastuzumab, TC + bevacizumab, lenvatinib–pembrolizumab, dostarlimab monotherapy, NRG-GY018).

E11. **RUBY final OS** (Powell 2024: 0.69, 0.54–0.89; dMMR 0.32; pMMR 0.79) is taken from the carcinosarcoma note's RUBY row and extract; the endometrioid note's row carries the interim (0.64). Card says so.

E12. **Press-release-only TroFuse-005** (sacituzumab tirumotecan) is shown at tier 6 with a caution; no FDA label.

## Decisions taken while validating (2026-10-06, Jay)

E13. **Adjuvant risk group is derived from the trials' eligibility and gates the RT options.** Jay's first test case (endometrioid G1, FIGO 2023 IA2, LVSI−, pMMR, p53wt, ER−) was offered VBT at tier 4 with "fits HIR" above observation. No adjuvant RT trial enrolled low-risk disease (PORTEC-1 took G1 only with ≥50% invasion; PORTEC-2 and GOG-99 high-intermediate risk; ASTEC's meta-analysis excludes a >3% OS gain even there). `readPatient` now derives `risk_group`: low = stage IA, G1–2, no substantial LVSI, not p53abn; hir = IB G1–2, IA G3, substantial LVSI or stage II (PORTEC-2 / GOG-99); high = IB G3, p53abn, stage III–IV. For low risk every RT option (VBT, EBRT, chemoradiation, VBT + TC, RT → chemo) drops to tier 6 with the reason, observation carries a fit, and the PORTEC-3 NSMP / ER fits and cautions (high-risk cohort) do not fire. A "p53wt / pMMR, POLE not tested" option reads as NSMP with a notice that POLEmut is not excluded.

E14. **FIGO 2023 input is translated to FIGO 2009.** The trials staged by FIGO 2009 (GOG-99 and PORTEC-1 by 1988), so the ranker keeps 2009 as its working stage. A staging-system switch accepts the 2023 substages and maps them (IA1/IA2 → IA; IC → IA; IB → IB; IIA → II; IIB and IIC → IA or IB by the myometrial-invasion field, IIB also sets substantial LVSI; IA3 → IIIA; IIIA1/2 → IIIA; IIIB1 → IIIB; IIIB2 → IVB, as 2009 had no pelvic-peritoneum category; IIIC1/2 → IIIC1/2; IVA → IVA; IVB/IVC → IVB). The translation and its reason are shown as a notice and a chip. The 2023 molecular modifiers (IAmPOLEmut, IICmp53abn) are not separate inputs: enter the molecular class.

E15. **Second validation case (EEC G2, FIGO 2023 IA2, p53abn, ER−, positive cytology).** Added: a peritoneal-cytology field (adjuvant only) that only raises a notice — cytology stages nothing in FIGO 2009/2023 and GOG-258's positive-washings entry route was serous / clear cell only; FIGO 2023 molecular-modifier notices (p53abn with invasion = IICm p53abn; POLEmut uterus-confined = IAm POLEmut) while the 2009 working stage is unchanged; a tier-7 card now always prints its reason (KEYNOTE-B21 was shown excluded without one — it now says the trial failed its primary endpoint, with the dMMR subgroup lifting it to tier 4 as before).
