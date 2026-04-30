# Sophi Mobility — Investor Memo

**Subject:** v3 Penetration Model — methodology summary and five-year SOM
**From:** Joshua Casey, Sophi Mobility (jcasey@sophimobility.com)
**Date:** April 30, 2026
**Live model:** https://joshuapcasey.github.io/sophi-market-map/

---

## TL;DR

We rebuilt the SOM model from the ground up. The TAM ($150.35M across six markets) and SAM ($57.27M / 93 accounts) are unchanged. What changed is **how we model winning those accounts**: instead of every in-SAM account contributing a fractional ramp, each account now has a binary acquisition year governed by a credibility-weighted penetration engine — operator gates, ownership-group multipliers, and conservative per-market caps.

The result is a more defensible curve: lower in Y1 (we don't book revenue from accounts we haven't won), heavier in Y4–Y5 (full-TAM accrual from the day we win), and a five-year cumulative SOM of **$75.52M** with a **$28.29M Y5 run-rate** off only **34 of 93 in-SAM accounts won** — leaving 59 accounts of remaining runway in the same six markets.

---

## Why we rebuilt the model

The v2 model used an implicit penetration ramp: every in-SAM account contributed a fractional share of its TAM each year, growing toward full TAM by Y5. That approach front-loaded revenue from accounts we haven't actually closed yet, and it didn't model the two real-world frictions that shape any new operator-displacement sale:

1. **Operator credibility gates.** National operators (Towne Park, LAZ, SP+, Propark, Park Inc, Epic Valet, Elite) don't lose accounts to an unproven challenger until the challenger has demonstrated wins across enough properties and verticals. We can't book displaced-Towne-Park revenue in Y1 if we haven't beaten them anywhere yet.
2. **Ownership-group network effects.** Once we win one Darden / Huse / Marriott-managed property, sister properties in the same market move materially faster. v2 had no mechanic for this.

v3 makes both of these explicit, plus it caps per-market penetration at conservative levels (50% Charlotte/Indianapolis where we have the strongest unlock stories; 30% elsewhere) so the curve can't run away on us.

---

## Methodology, in one page

**Per account, the engine produces a single field:** `acquisition_year ∈ {1, 2, 3, 4, 5, never}`.

**The selection logic each year:**

- **Cumulative S-curve** sets the upper bound of penetration in a market: 10% / 30% / 50% / 70% / 85% by Y1–Y5 of the candidate set, multiplied by the per-market cap.
- **Operator gates** require minimum prior wins and verticals before that operator's accounts unlock — Towne Park 8 accts/3 verticals, Propark 4/2, Park Inc 3/1, Epic 2/1, Elite 2/1, independents are open. Until the gate clears, those accounts can't be selected.
- **Group multiplier** boosts priority for sister properties: 1 prior in-market win in the same group → 1.5×, 2 → 2.0×, 3+ → 3.0×.
- **Anchor and v7 layers force Y1.** Sophi anchor accounts force Y1. Indianapolis hometown_displaced and was_boost accounts force Y1; ma_absorption accounts force Y2 (the M&A trigger event).

**Once acquired, an account contributes its full annual TAM every year forward — no fractional ramp.**

That's the entire model. Full canonical doc: `METHODOLOGY_v3.md` in the repo.

---

## Five-year financial summary

### Portfolio

| Metric | Value |
|---|---|
| TAM (six markets) | $150.35M |
| SAM (in-SAM only) | $57.27M |
| Accounts in SAM | 93 |
| **Acquired by Y5** | **34** |
| **5-year cumulative SOM** | **$75.52M** |
| **Y5 run-rate SOM** | **$28.29M** |
| Y5-on-TAM share | 18.8% |
| Y5-on-SAM share | 49.4% |

### Year-by-year SOM

| Year | SOM | Cumulative | YoY |
|---|---|---|---|
| Y1 | $4.02M | $4.02M | — |
| Y2 | $9.00M | $13.01M | +124% |
| Y3 | $14.74M | $27.75M | +64% |
| Y4 | $19.48M | $47.23M | +32% |
| Y5 | $28.29M | $75.52M | +45% |

The Y5 step-up reflects two things: (a) Charlotte and Indianapolis approaching their per-market caps with their full-TAM accounts on the books, and (b) Denver's Towne Park gate clearing in Y4, allowing two Y5 acquisitions to start accruing full TAM.

### Per-market

| Market | Cap | In-SAM | Won by Y5 | 5-yr SOM | Y5 SOM |
|---|---|---|---|---|---|
| Denver | 30% | 21 | 6 | $23.81M | $11.26M |
| Charlotte | 50% | 24 | 12 | $20.17M | $7.75M |
| Indianapolis | 50% | 14 | 7 | $19.42M | $4.04M |
| Phoenix | 30% | 19 | 5 | $9.27M | $3.92M |
| Louisville | 30% | 7 | 2 | $2.12M | $0.98M |
| Cleveland | 30% | 8 | 2 | $0.72M | $0.34M |
| **Portfolio** | | **93** | **34** | **$75.52M** | **$28.29M** |

---

## What this means for the investor narrative

**The model now matches our sales motion.** v3 says we win Charlotte and Indianapolis early because we have anchor relationships and credible unlock stories there, and we earn the rest of the portfolio across years 3–5 as gates clear and group effects compound. That's exactly how we plan to execute, and it's exactly what the numbers now show.

**The 5-year total is conservative on purpose.** 34 of 93 accounts is a 37% acquisition rate over five years, against per-market caps of 30–50%. That's deliberate headroom: 59 unwon in-SAM accounts is runway, not failure. The investor takeaway is "this $75.5M is what we believe we can defend, not what we hope we can claim."

**Y5 run-rate ($28.3M) is the headline metric.** It compounds beyond the five-year window, it's a clean ARR analog for parking-management software-plus-operations economics, and it's tied to a known account list — every dollar in that number is a named property with a documented gate and group history.

**Cleveland is small and we're documenting it honestly.** With 8 in-SAM accounts and Propark dominance, Cleveland comes in at $720K cumulative. We could soften the gate model to lift Cleveland; we chose not to. The credibility cost of one underperforming small market is far lower than the credibility cost of a model that hides its assumptions.

---

## What's in the live app

https://joshuapcasey.github.io/sophi-market-map/

- **Landing page:** portfolio hero ($150M TAM / $28.3M Y5 / "Conservative, gated, defensible") and four methodology cards (binary acquisition, operator gates, group multiplier, per-market caps).
- **Portfolio page:** $75.5M / $28.3M / 7.0× multiple hero, stacked acquisition timeline by market by year, market table with Cap and Won/In-SAM columns.
- **Per-market pages:** acquisition-year filter, per-account modal showing v3 lifecycle (acquisition year, gate detail, group multiplier), trajectory bars (dashed pre-acquisition, solid post-acquisition, ★ on acquisition year).
- **Status pills:** SOPHI Anchor · v7 Hometown · v7 M&A Absorption · Operator-gated · Cap-deferred · Below cap line.

Repo (private): https://github.com/joshuapcasey/sophi-market-map. Engine in `src/normalize_v3.py`, build pipeline in `src/build_data_js_v3.py`, full methodology in `METHODOLOGY_v3.md`.

---

*Questions or specific scenarios you want modeled — happy to run them. The engine is parameterized, so loosening a single gate or raising a market cap is a one-line change and a 30-second rebuild.*
