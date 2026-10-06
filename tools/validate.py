#!/usr/bin/env python3
"""Cross-reference check for every data file: trials named by regimens exist in the matching trials file,
tox_ref labels (and arms) resolve in tox.json, drugs resolve in labels.json, drug_rules keys are labelled drugs,
"base" ids resolve in the endometrioid pool, histotype 'out' classes are in each file's outcomes map, and the
histotype-level pools (clear cell, carcinosarcoma) do not claim OS tiers they cannot hold."""
import json, sys, os
D = os.path.join(os.path.dirname(__file__), "..", "data")
load = lambda f: json.load(open(os.path.join(D, f), encoding="utf-8"))

tox = load("tox.json")
tox_entries = [e for k, v in tox.items() if isinstance(v, list) for e in v]
labels = {k: v for k, v in load("labels.json").items() if k != "_meta"}
drug_rules = {k: v for k, v in load("drug_rules.json").items() if k != "_meta"}
base = {g["id"]: g for g in load("regimens_eec.json")["regimens"]}

errors = 0
def err(m):
    global errors; errors += 1; print("ERR", m)

for d in drug_rules:
    if d not in labels: err(f"drug_rules.json: '{d}' has no label record")

def check(hist, histotype_level):
    reg = load(f"regimens_{hist}.json"); tr = load(f"trials_{hist}.json")
    names = {r["name"] for s in tr["sections"] for r in s.get("rows", [])}
    outs = set(tr["outcomes"])
    for s in tr["sections"]:
        for r in s.get("rows", []):
            if r["out"] not in outs: err(f"trials_{hist}.json: {r['name']} out={r['out']} not in outcomes")
    settings = {x["key"] for x in reg["_meta"]["settings"]}
    ids = set()
    for g0 in reg["regimens"]:
        if g0["id"] in ids: err(f"{hist}: duplicate id {g0['id']}")
        ids.add(g0["id"])
        if "base" in g0 and g0["base"] not in base: err(f"{hist}: {g0['id']} base {g0['base']} not in regimens_eec.json"); continue
        g = {**base.get(g0.get("base"), {}), **g0}
        if g0.get("histology") != hist: err(f"{hist}: {g0['id']} histology={g0.get('histology')}")
        sts = [g["setting"]] if g.get("setting") else g.get("settings", [])
        if not sts or any(s not in settings for s in sts): err(f"{hist}: {g['id']} setting {sts} not in _meta.settings")
        for t in g["trials"]:
            if t not in names: err(f"{hist}: {g['id']} trial '{t}' not in trials_{hist}.json")
        t = g.get("tox_ref")
        if t:
            m = [e for e in tox_entries if e["trial"].startswith(t["trial"])]
            if not m: err(f"{hist}: {g['id']} tox_ref '{t['trial']}' not in tox.json")
            else:
                arms = m[0].get("arms") or {}
                for a in [t.get("arm")] + list((t.get("arm_by_mmr") or {}).values()):
                    if a and a not in arms: err(f"{hist}: {g['id']} tox arm '{a}' not in {m[0]['trial']} arms {list(arms)}")
        for d in g["drugs"]:
            if d not in labels: err(f"{hist}: {g['id']} drug '{d}' has no label record")
        tiers = [g.get("tier")] + [r["tier"] for r in g.get("tier_rules", [])]
        if any(x not in range(1, 8) for x in tiers): err(f"{hist}: {g['id']} tier missing/invalid")
        if histotype_level and min(tiers) <= 4 and g.get("evidence_basis") != "histotype_rct":
            err(f"{hist}: {g['id']} tier {min(tiers)} — histotype-level pool may hold tiers 1–4 only on its own randomised trials")
    print(f"regimens_{hist}.json: {len(reg['regimens'])} records, {len(names)} trial names, ok")

check("eec", False)
check("usc", False)
check("ccc", True)
check("ucs", True)
print("errors:", errors)
sys.exit(1 if errors else 0)
