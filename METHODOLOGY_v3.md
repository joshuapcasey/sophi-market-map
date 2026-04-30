# Sophi v3 Methodology — Penetration Engine (Canonical)

**Status:** Live in app. Supersedes METHODOLOGY_v2.md.
**Repo:** https://github.com/joshuapcasey/sophi-market-map
**Live app:** https://joshuapcasey.github.io/sophi-market-map/
**Date:** April 30, 2026
**Author:** Joshua Casey (Sophi Mobility)

---

## 1. Why v3

v2 modeled penetration implicitly: every in-SAM account contributed a fractional share of its TAM in Y1–Y5 along a generic ramp. That produced an attractive but overstated curve — every account contributed *something* even when, in reality, we have not won that account yet.

v3 separates the two questions that v2 collapsed into one ramp:

1. **When (or whether) do we win this account?** → a binary per-account `acquisition_year ∈ {1, 2, 3, 4, 5, never}`, governed by a penetration engine.
2. **What does this account contribute once we own it?** → its full annual TAM, accrued every year forward from acquisition (and zero before).

This rotates revenue **right** on the curve (Y1 falls, Y4–Y5 lift) and exposes more honest credibility risk (operator gates, ownership-group dynamics, conservative per-market caps), at the cost of a less impressive headline number in Y1.

TAM and SAM are **unchanged** between v2 and v3. The only thing that changed is how we model SOM out of SAM.

---

## 2. The penetration engine

```
For each market m:
  candidates_m = accounts in SAM(m), excluding cap-deferred reserve
  cap_m = MARKET_CAP[m]   # 50% Charlotte/Indy, 30% others
  for each year y in 1..5:
    target_m,y = S_CURVE[y] × cap_m × |candidates_m|
    score each not-yet-acquired candidate by:
      base_priority(account)
      × group_multiplier(account, prior_wins_in_same_group)
      × operator_unlock_status(account, prior_wins_with_same_operator)
      × v7_force_factor(account, year)
    select top-K candidates such that cumulative wins ≤ target_m,y
    mark selected with acquisition_year = y
  remaining candidates → acquisition_year = 'never'
```

### 2.1 Binary acquisition + full-TAM accrual

Each in-SAM account is awarded `acquisition_year`. From the year of acquisition onward, the account contributes its **full annual TAM** to SOM. Before the acquisition year it contributes zero. There are no fractional ramps.

This is the most consequential change vs v2 and the foundation of every other v3 mechanic.

### 2.2 S-curve targets

The portfolio S-curve sets the **upper bound** of cumulative penetration of the SAM-eligible candidate set in a market, before the per-market cap is applied:

| Year | Cumulative S-curve target |
|---|---|
| Y1 | 10% |
| Y2 | 30% |
| Y3 | 50% |
| Y4 | 70% |
| Y5 | 85% |

These are *targets*, not promises — operator gates and group multipliers may push wins later than the S-curve would otherwise allow.

### 2.3 Per-market caps

Conservative cap on the share of in-SAM accounts that can be acquired in five years:

| Market | Cap |
|---|---|
| Charlotte | 50% |
| Indianapolis | 50% |
| Denver | 30% |
| Phoenix | 30% |
| Cleveland | 30% |
| Louisville | 30% |

Charlotte and Indianapolis carry our two highest-conviction unlock stories (Charlotte WARM beachhead; Indianapolis hometown + verified M&A absorption pattern). The other four markets carry the conservative 30% cap until we have stronger evidence to raise them.

The cap creates a "cap-deferred" pool — accounts in SAM that the engine could in principle acquire under the S-curve but chooses not to, because it would push the market past its cap. These accounts surface in the app as **Below cap line** (in-pool) or **Cap-deferred**, never as Won.

### 2.4 Operator credibility gates

National parking operators block direct sales motion until we have enough proof to credibly displace them. Each gate requires a minimum number of prior wins **and** a minimum number of distinct verticals (hotel / F&B / mixed-use) before the operator-controlled accounts unlock:

| Operator | Min accts | Min verticals |
|---|---|---|
| Towne Park | 8 | 3 |
| LAZ | 7 | 3 |
| SP+ | 6 | 2 |
| Propark | 4 | 2 |
| Park Inc | 3 | 1 |
| Epic Valet | 2 | 1 |
| Elite Mgmt | 2 | 1 |
| Independent / no operator | 0 | 0 |

Until the gate unlocks, accounts under that operator cannot be selected — regardless of their underlying account-level priority. Once unlocked, they re-enter the candidate pool at their usual priority.

In the live data, **Towne Park, Propark, and Park Inc are the gates that actually matter**. LAZ and SP+ have no in-SAM accounts in the current six markets, so their thresholds will only fire when we expand SAM.

### 2.5 Ownership-group relationship multiplier

If we have already won prior properties owned/managed by the same group within the same market, sister properties get a priority multiplier:

| Prior wins in group | Multiplier |
|---|---|
| 0 | 1.0× |
| 1 | 1.5× |
| 2 | 2.0× |
| 3+ | 3.0× |

This compounds the natural network effect of selling into Darden, Huse Culinary, Marriott-managed clusters, etc., without overwriting the operator gate (you still have to clear the operator gate first).

### 2.6 V7 layer (Indianapolis-specific, preserved from v2)

Indianapolis carries three account flags that bypass the normal scoring:

- `hometown_displaced` → forced Y1 (Sophi-anchor or warm-personal-relationship account)
- `hometown_was_boost` → forced Y1 (high WAS-boost score, hometown advantage)
- `ma_absorption` → forced Y2 (the M&A trigger event landing the absorption pattern)

In the app these surface as **SOPHI Anchor** or **v7 Hometown** / **v7 M&A Absorption** pills on the modal lifecycle block.

---

## 3. Locked v3 outputs

### 3.1 Portfolio totals

| Metric | Value |
|---|---|
| TAM (six markets) | **$150.35M** |
| SAM (in-SAM only) | **$57.27M** |
| Accounts in SAM | **93** |
| Acquired by Y5 | **34** (37% of in-SAM) |
| 5-year cumulative SOM | **$75.52M** |
| Y5 run-rate SOM | **$28.29M** |

### 3.2 Year-by-year SOM (portfolio)

| Year | SOM | Cumulative |
|---|---|---|
| Y1 | $4.02M | $4.02M |
| Y2 | $9.00M | $13.01M |
| Y3 | $14.74M | $27.75M |
| Y4 | $19.48M | $47.23M |
| Y5 | $28.29M | $75.52M |

### 3.3 Per-market 5-year SOM (v3)

| Market | Cap | In-SAM | Acquired by Y5 | 5-yr SOM |
|---|---|---|---|---|
| Denver | 30% | 21 | 6 | $23.81M |
| Charlotte | 50% | 24 | 12 | $20.17M |
| Indianapolis | 50% | 14 | 7 | $19.42M |
| Phoenix | 30% | 19 | 5 | $9.27M |
| Louisville | 30% | 7 | 2 | $2.12M |
| Cleveland | 30% | 8 | 2 | $0.72M |
| **Portfolio** | | **93** | **34** | **$75.52M** |

### 3.4 Acquisition timeline (count of new wins per year)

| Market | Y1 | Y2 | Y3 | Y4 | Y5 | Never |
|---|---|---|---|---|---|---|
| Charlotte | 4 | 0 | 3 | 2 | 3 | 12 |
| Indianapolis | 3 | 4 | 0 | 0 | 0 | 7 |
| Denver | 0 | 2 | 1 | 2 | 1 | 15 |
| Phoenix | 0 | 2 | 1 | 1 | 1 | 14 |
| Louisville | 0 | 0 | 1 | 0 | 1 | 5 |
| Cleveland | 0 | 0 | 1 | 0 | 1 | 6 |
| **Portfolio** | **7** | **8** | **6** | **5** | **6** | **59** |

The 59 "never" is **not** a list of accounts we believe we will lose forever. It is the population that the engine does not award within the first five years under the current operator gates and per-market caps. They remain in the addressable SAM pool and carry forward as runway beyond Y5.

---

## 4. Cleveland note

Cleveland is the most-discussed v3 outcome. With only 8 in-SAM accounts and a 30% cap, the market can mathematically acquire at most 2 accounts in five years. Because Cleveland is heavily Propark-operated and the Propark gate (4 accts / 2 verticals) does not unlock from inside Cleveland alone, the two acquisitions that do happen are operator-independent or already-cleared. Cleveland Marriott Downtown — the largest TAM in the market — surfaces in the app as **Operator-gated** and stays unwon at Y5.

This is the right output of an honest gate model. We are documenting it explicitly so investors and the team can evaluate the trade-off: a more credible Charlotte/Indianapolis story comes paired with a deliberately small Cleveland Y1–Y5.

---

## 5. App surfaces

| Surface | What v3 shows |
|---|---|
| Landing hero | $150.35M TAM · $28.3M Y5 run-rate · "Conservative, gated, defensible" |
| Methodology cards | Binary Acquisition · Operator Credibility Gates · Relationship Multiplier · Conservative Per-Market Caps |
| Portfolio page hero | $75.5M five-year SOM · $28.3M Y5 run-rate · 7.0× multiple |
| Acquisition timeline | Stacked column per year (Y1–Y5) showing wins by market + unacquired tail |
| Market table | Cap column · Won-of-In-SAM column |
| Market badge | "WARM/COLD · N anchors · X% Y5 cap" |
| Account modal | v3 Lifecycle block: acquisition year + status pill + gate detail + group multiplier |
| Trajectory bars | Dashed/striped pre-acquisition years, solid post-acquisition, ★ on acquisition year |
| Status pills | SOPHI Anchor · v7 Hometown · v7 M&A Absorption · Operator-gated · Cap-deferred · Below cap line |

---

## 6. Build pipeline

```
operator_data/*.csv ──┐
                     ├─► src/normalize_v3.py ──► src/accounts_v3.json
v7 flag layer ────────┘                                   │
                                                          ▼
                                  src/build_data_js_v3.py ──► data.js
                                                          │
                                                          ▼
                                              index.html, landing.js,
                                              portfolio.html, portfolio.js,
                                              market.html, market.js, style.css
```

### 6.1 Reproduction

```bash
cd /home/user/workspace/sophi-market-map
python3 src/normalize_v3.py        # rebuild accounts_v3.json
python3 src/build_data_js_v3.py    # rebuild data.js
git diff data.js                   # sanity-check the diff
```

### 6.2 Files

| Path | Purpose | Size |
|---|---|---|
| `src/normalize_v3.py` | v3 penetration engine | ~430 lines |
| `src/accounts_v3.json` | Engine output: 6 markets, 203 accounts | 380 KB |
| `src/build_data_js_v3.py` | Builds front-end `data.js` from `accounts_v3.json` + v2 geocode cache | — |
| `src/compare_v2_v3.py` | Diff utility | — |
| `data.js` | Front-end-consumable model | 255 KB |
| `V3_METHODOLOGY_DELTAS.md` | Original delta memo (kept for history) | 10 KB |
| `METHODOLOGY_v3.md` | This document — canonical | — |

---

## 7. Reconciliation log

| Field | v2 | v3 |
|---|---|---|
| Per-account behavior | Fractional Y1–Y5 ramp on every in-SAM account | Binary acquisition_year; full-TAM from acq onward |
| Penetration mechanism | Implicit in the ramp | Explicit S-curve × per-market cap × gates × multipliers |
| Operator gates | None | 8 named operators with min-accts/min-verticals thresholds |
| Group dynamics | None | Cumulative 1.5× / 2× / 3× multiplier |
| Per-market cap | None | 50% Charlotte/Indy, 30% others |
| Anchor handling | Implicit Y1 priority | Hard Y1 force |
| v7 (Indy) | Hometown displaced + WAS boost + M&A absorption | Preserved; hometown/was_boost forced Y1, ma_absorption forced Y2 |
| TAM, SAM | Methodology unchanged | Methodology unchanged |

---

## 8. What v3 deliberately does not do (yet)

- No annual churn or lost-account mechanic — once won, always won across Y1–Y5
- No price escalation across years — TAM is held constant
- No per-account ramp inside the year of acquisition — full TAM applies from Y_acq
- No cross-market network effect — the group multiplier is in-market only
- No "small market modifier" — Cleveland's gating is honest, not softened
- No "v2 toggle" in the UI — v3 supersedes v2, period

These are all candidate v4 levers if we need them.
