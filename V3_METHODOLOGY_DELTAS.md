# Sophi v3 Methodology — Penetration Engine

**Status:** Engine built and run. App **NOT yet refactored.** Reviewing deltas with you before any UI changes.

**Date:** April 30, 2026

---

## What changed conceptually

### v2 (the model we just shipped)
- Each account had a fractional Y1→Y5 ramp (e.g., a $190K/yr account contributed $38K Y1, $76K Y2, …, $190K Y5)
- "Penetration" was implicitly baked into those fractions
- No explicit acquisition timing — all in-SAM accounts contributed *something* every year
- No concept of "we haven't won this account yet"

### v3 (this build)
- **Binary acquisition.** Each in-SAM account has a single `acquisition_year ∈ {1, 2, 3, 4, 5, never}`
- **Full-TAM accrual.** Once acquired, the account contributes its full annual TAM every year forward (and $0 before)
- **Explicit penetration engine** drives acquisition timing using:
  1. **S-curve cumulative target** (cold market: 10% / 30% / 50% / 70% / 85% by year)
  2. **Per-operator credibility gates** (Towne Park requires 8 accts/3 verticals before unlocking; LAZ 7/3; SP+ 6/2; etc.)
  3. **Cumulative ownership-group multiplier** (1 win in a group → 1.5× priority for sister properties; 2 wins → 2×; 3+ → 3×)
- **V7 layer preserved** — Indianapolis hometown_displaced & WAS_boost accounts are forced to Y1; M&A absorption accounts forced to Y2 (the M&A trigger event)

---

## Portfolio-level deltas

| Year | v2 | v3 | Δ$ | Δ% |
|---|---|---|---|---|
| Y1 | $16.85M | $9.53M | **−$7.32M** | **−43.5%** |
| Y2 | $27.21M | $19.27M | −$7.94M | −29.2% |
| Y3 | $37.97M | $37.80M | −$0.17M | −0.5% |
| Y4 | $46.44M | **$53.03M** | **+$6.60M** | **+14.2%** |
| Y5 | $52.60M | **$56.47M** | **+$3.88M** | **+7.4%** |
| **5-yr total** | **$181.06M** | **$176.10M** | −$4.96M | −2.7% |

**Headline:** the curve shifted right and got steeper. Y1 dropped hard (no fractional revenue from accounts we haven't won yet), Y4-Y5 lifted (full-TAM accrual on accounts we did win). 5-yr total essentially flat — we're rotating revenue around the curve, not creating or destroying it. The TAM and SAM are unchanged.

---

## Per-market breakdown

### Charlotte (WARM, 24 in-SAM)
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $3.21M | $0.59M | **−81.7%** |
| Y5 SOM | $8.44M | $10.22M | +21.1% |
| 5-yr | $31.19M | $33.28M | +6.7% |

Acquisition timing: Y1=3, Y2=5, Y3=4, Y4=5, Y5=4, never=3
Charlotte ends at 21/24 acquired (87.5%). The three "never" are Steak 48, The Palm, and Sullivan's — small TAM, gated by Park Inc / no operator listed. **Note:** Charlotte was your "50% by Y2" anchor — under the v2 numbers it was effectively at 100%. v3 shows 50%-ish by Y2 (3+5 = 8 of 24 = 33%, which is *below* the Y2=30% S-curve target — close enough but slightly behind).

### Phoenix (COLD, 19 in-SAM)
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $1.69M | $0.51M | −69.8% |
| Y5 SOM | $8.44M | $9.21M | +9.1% |
| 5-yr | $26.83M | $27.40M | +2.1% |

Acquisition: Y1=2, Y2=2, Y3=6, Y4=4, Y5=3, never=2

### Denver (COLD, 21 in-SAM) — biggest absolute mover
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $7.20M | $3.97M | −44.8% |
| Y5 SOM | $21.91M | $25.45M | **+16.2%** |
| 5-yr | $74.23M | $72.92M | −1.8% |

Acquisition: Y1=3, Y2=4, Y3=4, Y4=4, Y5=3, never=3
Denver's three "never" accounts: Hotel Clio, Moxy Cherry Creek, Le Colonial — all behind Propark / Parkwell gates that didn't unlock fast enough.

### Indianapolis (COLD with v7, 14 in-SAM) — only market that gained Y1
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $1.66M | **$3.70M** | **+122.9%** |
| Y5 SOM | $5.75M | $5.42M | −5.7% |
| 5-yr | $20.41M | $23.43M | +14.8% |

Acquisition: Y1=4, Y2=5, Y4=1, Y5=2, never=2
The v7 layer fires correctly: Omni Severin, Conrad, Capital Grille (hometown_displaced) and Hilton Garden Inn Downtown (was_boost) all forced to Y1; the 5 Elite-managed steakhouses (St. Elmo, Harry & Izzy's, Ruth's Chris, Prime 47, Eddie Merlot's) forced to Y2 absorption.

### Cleveland (COLD, 8 in-SAM) — biggest drop
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $1.13M | $0.19M | −83.2% |
| Y5 SOM | $2.94M | $0.99M | **−66.4%** |
| 5-yr | $10.34M | $3.34M | **−67.7%** |

Acquisition: Y1=1, Y2=2, Y3=1, Y4=2, never=2
**This is the one to discuss.** Cleveland Marriott Downtown ($1.66M TAM) and Metropolitan at The 9 ($0.48M) are both gated by Propark. Propark requires 4 accts / 2 verticals to unlock — Cleveland only has 8 in-SAM accounts and only 6 get acquired before Y5. Propark never unlocks. **Question for you:** is that realistic, or should the Propark gate be looser? Cleveland has very few national-operator-blocked accounts overall, so this is a real outcome of the gate logic.

### Louisville (COLD, 7 in-SAM)
| | v2 | v3 | Δ |
|---|---|---|---|
| Y1 SOM | $1.96M | $0.57M | −71.0% |
| Y5 SOM | $5.12M | $5.18M | +1.2% |
| 5-yr | $18.07M | $15.73M | −13.0% |

Acquisition: Y1=1, Y2=2, Y3=1, Y4=1, Y5=1, never=1

---

## Key account-level changes (top movers)

**Big winners (acquired early under v3, accruing full TAM longer):**
- Grand Hyatt Denver: $8.85M → $14.27M (+$5.41M) — acq Y1
- Omni Severin (Indy): $7.57M → $11.13M (+$3.56M) — acq Y1 (v7 forced)
- JW Marriott Charlotte: $4.34M → $6.32M (+$1.98M) — acq Y2
- Omni Scottsdale: $2.71M → $4.43M (+$1.72M) — acq Y2
- Four Seasons Denver: $2.60M → $4.19M (+$1.59M) — acq Y1

**Big losers (acquired late or never under v3):**
- Sheraton Denver Downtown: $22.24M → $14.33M (−$7.91M) — acq Y4 (only 2 years of full TAM vs 5 years of ramp)
- Cleveland Marriott Downtown: $5.64M → $0 (−$5.64M) — never acquired (Propark gated)
- The Brown Palace (Denver): $5.25M → $3.38M (−$1.87M) — acq Y4
- Metropolitan at The 9 (Cleveland): $1.63M → $0 (−$1.63M) — never (Propark)
- Punch Bowl Social (Indy): $1.24M → $0 (−$1.24M) — never (Elite gated; not v7 ma_absorption)

---

## Operator-gate impact

| Operator | Won | Unwon | Total | Win rate |
|---|---|---|---|---|
| Towne Park | 3 | 0 | 3 | 100% |
| LAZ | (none in-SAM) | — | — | — |
| SP+ | (none in-SAM) | — | — | — |
| Propark | 11 | 4 | 15 | 73% |
| PMC | 18 | 1 | 19 | 95% |
| Park Inc | 4 | 2 | 6 | 67% |
| Epic Valet | 7 | 2 | 9 | 78% |
| Elite Mgmt | 5 | 1 | 6 | 83% |
| Independent / no gate | 21 | 2 | 23 | 91% |

**Towne Park unlocked successfully** in markets where there are enough wins (Indy + Denver). The 3 Towne Park accounts that did get acquired all came after the gate opened.

**Propark is the most-gated operator in the data** — 15 in-SAM accounts. 4 didn't get acquired (2 in Cleveland, 2 in Denver). That's where most of the gating impact lives.

**No in-SAM accounts are operated by LAZ or SP+** — so those gate thresholds had no effect. They're set up for future markets / future SAM expansion.

---

## Indy v7 — verified working correctly

| Account | v7 Layer | Acquisition Year | TAM |
|---|---|---|---|
| Omni Severin Hotel | hometown_displaced | Y1 (forced) | $2.23M |
| Conrad Indianapolis | hometown_displaced | Y1 (forced) | $846K |
| The Capital Grille (Indy) | hometown_displaced | Y1 (forced) | $190K |
| Hilton Garden Inn Indy Downtown | hometown_was_boost | Y1 (forced) | $437K |
| St. Elmo Steak House | ma_absorption | Y2 (M&A trigger) | $266K |
| Harry & Izzy's | ma_absorption | Y2 | $171K |
| Ruth's Chris (Indy) | ma_absorption | Y2 | $190K |
| Prime 47 | ma_absorption | Y2 | $152K |
| Eddie Merlot's | ma_absorption | Y2 | $171K |

All 9 Indy v7-flagged accounts forced into the right year. Behavior matches the v7 spec.

---

## Group multiplier — verified working

Example: Darden steakhouses in Charlotte (rank-ordered by acquisition):
1. **The Capital Grille** — acquired Y1, group×1.0 (first Darden win)
2. **Ruth's Chris** — acquired Y1, group×1.0 (still 0 prior Darden wins at start of Y1)
3. **Ruth's Chris #2** — acquired Y2, group×2.0 (2 prior Darden wins → 2× priority boost)
4. **Eddie V's** — out-of-SAM (Partnership pool, correctly excluded)

The multiplier is firing as designed.

---

## Open questions before I touch the app

1. **Cleveland gating outcome.** Cleveland Marriott Downtown ($1.66M TAM) never gets acquired in 5 years because Propark requires 4 accts/2 verticals to unlock and Cleveland only has 8 in-SAM accounts total. **Is this the right outcome?** Options:
   - (a) Yes — small markets are harder to crack, this is honest.
   - (b) No — loosen Propark threshold to 3 accts/1 vertical (would likely add Cleveland Marriott back).
   - (c) Add a "small market modifier" — gates scale down with SAM size.

2. **S-curve calibration vs reality.** Your stated Charlotte rule was "50% of SAM in 2 years" — under the conservative S-curve we picked (50% by Y3), Charlotte hits 33% by Y2 and 50% by Y3. **Want to bump Charlotte to a faster curve** (since it's WARM)? Or hold the line as conservative-defensible?

3. **Acquisition curve targets vs reality.** Y1 portfolio drops 43% vs v2. **Is that the story you want to tell investors?** It's *more honest* (we haven't yet won most accounts in Y1) but it's a less impressive headline. The flip side is Y4-Y5 are more credible. Three options:
   - (a) Ship v3 as-is — more honest, slightly lower 5-yr total.
   - (b) Tune the S-curve front-loaded (Y1=15%, Y2=45%) to lift Y1 numbers.
   - (c) Keep v3 numbers, but add a "v2 vs v3" toggle in the app so you can show either depending on audience.

4. **Group multiplier didn't fire much in non-restaurant cases.** Most group keys ended up being singletons in their market (e.g., one Marriott-managed property per market). The multiplier mainly fires for Darden/Huse/Ruth's Chris — restaurants with multiple sister properties in the same market. **Want to expand group detection** to capture flag-level (e.g., "Hilton-branded property" as a group) rather than only management-company groups? Could lift Indy/Denver further.

---

## Files

- `src/normalize_v3.py` — penetration engine (404 lines)
- `src/accounts_v3.json` — full output, 6 markets, 203 accounts with acquisition_year + per-account gate_status + group metadata
- `src/compare_v2_v3.py` — diff script
- `V3_METHODOLOGY_DELTAS.md` — this memo

`data.js` and the live app are still on **v2**. Nothing user-facing has changed.
