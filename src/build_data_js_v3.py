#!/usr/bin/env python3
"""Build v3 data.js from accounts_v3.json + v2 geocode cache.

Schema additions over v2:
  - acquisition_year: 1..5 or null (binary acquisition)
  - gate_status: human-readable string (e.g. 'unlocked', 'gated by towne park (3/8)', 'anchor: forced Y1')
  - group_key: ownership group identifier
  - group_wins_at_acquisition: how many sister-property wins at the moment this account was acquired (drives multiplier)
  - operator_gate: operator key the account is gated against (if any)
  - y1..y5 now follow binary semantics: 0 before acquisition_year, full TAM from acquisition_year onward

Markets carry a v3 summary block:
  - som_by_year: {y1, y2, y3, y4, y5}
  - acquisition_year_counts: histogram including 'never'
  - market_cap: terminal Y5 SOM cap (0.30 or 0.50 of SAM)
  - n_acquired: total in-SAM accounts that get acquired
  - n_in_sam: total in-SAM accounts
"""
import json
from pathlib import Path

SRC = Path("/home/user/workspace/sophi-market-map/src")
OUT = Path("/home/user/workspace/sophi-market-map/data.js")

with open(SRC / "accounts_v3.json") as f:
    data = json.load(f)

# Geocode lookup from v2
with open(SRC / "accounts_v2_geocoded.json") as f:
    v2 = json.load(f)

GEOCODES = {}
for mkey, m in v2["markets"].items():
    for a in m["accounts"]:
        GEOCODES[(mkey, a["name"])] = {
            "lat": a.get("lat"),
            "lng": a.get("lng"),
            "geocoded": a.get("geocoded", False),
        }

MARKET_CENTERS = {
    "denver":       [-104.9903, 39.7392],
    "charlotte":    [-80.8431, 35.2271],
    "indianapolis": [-86.1581, 39.7684],
    "phoenix":      [-112.0740, 33.4484],
    "cleveland":    [-81.6944, 41.4993],
    "louisville":   [-85.7585, 38.2527],
}

MARKET_CAP = {
    "charlotte": 0.50,
    "indianapolis": 0.50,
    "phoenix": 0.30,
    "denver": 0.30,
    "cleveland": 0.30,
    "louisville": 0.30,
}


def _tier(was):
    if was is None: return None
    if was >= 4.0: return "A"
    if was >= 3.4: return "B"
    if was >= 2.8: return "C"
    return "D"


def _tier_full(was):
    if was is None: return None
    if was >= 4.0: return "A — Hero"
    if was >= 3.4: return "B — Core"
    if was >= 2.8: return "C — Opportunistic"
    return "D — Skip / De-prioritize"


def trim_account(a, mkey):
    geo = GEOCODES.get((mkey, a["name"]), {})
    return {
        # Identity
        "name": a["name"],
        "type": a.get("type") or "Other",
        "pool": a["pool"],
        "in_sam": a["in_sam"],
        "rank": a.get("rank"),
        # v3 lifecycle
        "acquisition_year": a.get("acquisition_year"),
        "gate_status": a.get("gate_status") or "",
        "group_key": a.get("group_key") or "",
        "group_wins_at_acquisition": a.get("group_wins_at_acquisition"),
        "operator_gate": a.get("operator_gate") or "",
        # Money
        "tam": round(a.get("tam") or 0),
        "sam_contrib": round(a.get("sam_contrib") or 0),
        "y1": round(a.get("y1") or 0),
        "y2": round(a.get("y2") or 0),
        "y3": round(a.get("y3") or 0),
        "y4": round(a.get("y4") or 0),
        "y5": round(a.get("y5") or 0),
        # Scoring
        "was": a.get("was"),
        "was_base": a.get("was_base"),
        "was_boost": a.get("was_boost"),
        "tier": _tier(a.get("was")),
        "tier_full": _tier_full(a.get("was")),
        # Legacy lifecycle (from v2 — informational only in v3)
        "sign_yr": a.get("sign_yr"),
        "curve": a.get("curve"),
        # Geo
        "lng": geo.get("lng"),
        "lat": geo.get("lat"),
        "geocoded": geo.get("geocoded", False),
        "address": a.get("address") or "",
        "area": a.get("area") or "",
        # Contact / property
        "phone": a.get("phone") or "",
        "email": a.get("email") or "",
        "url": a.get("url") or "",
        "rooms": a.get("rooms"),
        "seats": a.get("seats"),
        "valet_rate": a.get("valet_rate"),
        "self_park_rate": a.get("self_park_rate"),
        "occupancy": a.get("occupancy"),
        "valet_conv": a.get("valet_conv"),
        "gm": a.get("gm") or "",
        "gm_role": a.get("gm_role") or "",
        "management": a.get("management") or "",
        "garage_operator": a.get("garage_operator") or "",
        "valet_operator": a.get("valet_operator") or "",
        "tam_class": a.get("tam_class") or "",
        "tam_status": a.get("tam_status") or "",
        "tam_notes": a.get("tam_notes") or "",
        "location_notes": a.get("location_notes") or "",
        "pool_raw": a.get("pool_raw") or "",
        # Indy v7
        "v7_layer": a.get("v7_layer"),
    }


# Build output
output = {"markets": {}, "meta": data.get("meta", {})}
output["meta"]["methodology_version"] = "v3"
output["meta"]["market_caps"] = MARKET_CAP

portfolio_y = {"y1": 0, "y2": 0, "y3": 0, "y4": 0, "y5": 0}
portfolio_tam = portfolio_sam = 0
portfolio_n = portfolio_in_sam = portfolio_acquired = 0

for mkey, m in data["markets"].items():
    accts = [trim_account(a, mkey) for a in m["accounts"]]
    summary = m.get("summary", {}) or {}
    sby = summary.get("som_by_year", {}) or {}
    acq_counts = summary.get("acquisition_year_counts", {}) or {}
    n_acquired = sum(int(v) for k, v in acq_counts.items() if k != "never")

    output["markets"][mkey] = {
        "name": m["name"],
        "state": m["state"],
        "center": MARKET_CENTERS.get(mkey),
        "cap": MARKET_CAP.get(mkey),
        "accounts": accts,
        "summary": summary,
        "som_by_year": sby,
        "acquisition_year_counts": acq_counts,
        "n_acquired": n_acquired,
        "pool_counts": m.get("pool_counts", {}),
        "pool_tam": m.get("pool_tam", {}),
        "tier_counts": m.get("tier_counts", {}),
        "rollup": m.get("rollup"),
        "pool_structure_rollup": m.get("pool_structure_rollup"),
    }

    # Roll up portfolio totals
    for y in ("y1", "y2", "y3", "y4", "y5"):
        portfolio_y[y] += sby.get(y, 0) or 0
    portfolio_tam += summary.get("tam", 0) or 0
    portfolio_sam += summary.get("sam", 0) or 0
    portfolio_n += summary.get("n_accounts", 0) or 0
    portfolio_in_sam += summary.get("n_in_sam", 0) or 0
    portfolio_acquired += n_acquired

output["portfolio"] = {
    "tam": round(portfolio_tam),
    "sam": round(portfolio_sam),
    "n_accounts": portfolio_n,
    "n_in_sam": portfolio_in_sam,
    "n_acquired": portfolio_acquired,
    "som_by_year": {y: round(v) for y, v in portfolio_y.items()},
    "som_5yr_cumulative": round(sum(portfolio_y.values())),
}

# Write data.js
with open(OUT, "w") as f:
    f.write("/* Auto-generated by build_data_js_v3.py — do not edit */\n")
    f.write("window.SOPHI_DATA = ")
    json.dump(output, f, separators=(",", ":"), default=str)
    f.write(";\n")

print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
print(f"Markets: {list(output['markets'].keys())}")
print(f"Total accounts: {sum(len(m['accounts']) for m in output['markets'].values())}")
print()
print("Portfolio v3:")
for k, v in output["portfolio"].items():
    if isinstance(v, dict):
        print(f"  {k}:")
        for k2, v2 in v.items():
            print(f"    {k2}: {v2:,}" if isinstance(v2, (int, float)) else f"    {k2}: {v2}")
    else:
        print(f"  {k}: {v:,}" if isinstance(v, (int, float)) else f"  {k}: {v}")
