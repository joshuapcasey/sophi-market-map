# Sophi Mobility — v2 Methodology & Build Strategy

**Document scope:** Consolidated reference for the v2 fundraise methodology AND the data-reconciliation pipeline that translates source XLSX files into the deployed app at [joshuapcasey.github.io/sophi-market-map](https://joshuapcasey.github.io/sophi-market-map/).

**Last verified:** 2026-04-30 · 203 accounts · $150.3M TAM · $57.3M SAM · $52.6M Y5 SOM
**Git commit:** `7776487` on `main`

---

## Part 1 — The v2 Methodology

### 1.1 What changed from v1/v5

The previous build used a single coupled metric — WAS scoring drove tier assignment, which drove TAM contribution, which drove SOM. A high WAS score effectively meant "in SAM and revenue-contributing" and a low score meant "out." This conflated three independent questions:

1. **Should we sell to this account?** (WAS — fit, size, ownership base, addressability)
2. **Is this account structurally addressable?** (SAM — operator type, brand bundling, asset size)
3. **What revenue does it produce over five years?** (SOM — sign year, curve shape, ramp pace)

v2 decouples all three. An account can have a high WAS but be excluded from SAM (e.g., a strong-fit hotel locked into a Towne Park enterprise contract). An account can be in SAM but produce zero Y1 revenue (M&A absorption only kicks in Y2). An account can have a low WAS but contribute meaningfully to SOM (Indianapolis hometown legacy properties).

### 1.2 The four canonical numbers

| Metric | Value | Definition |
|---|---:|---|
| **Total TAM** | $150.3M | Sum of every account's TAM, calculated from physical capacity × occupancy × valet conversion × rate × operating days. |
| **Total SAM** | $57.3M (38.1% of TAM) | TAM minus four structural exclusions (Partnership/PMC, Enterprise operator, Extended-stay brand, Micro <$150K). 50% TAM ceiling applied to Charlotte and Denver. |
| **Total Y1 SOM** | $16.8M | Year-1 revenue under the Cold A / Warm A / PMC Gate S-curve assumptions. |
| **Total Y5 SOM** | $52.6M (35.0% of TAM) | Year-5 revenue at curve maturity (95% of SAM contribution for most accounts). |

These four numbers are **frozen** — every transformation in the pipeline is validated against them.

### 1.3 TAM construction

**Hotel:** `Rooms × 60% occupancy × ValetConv × ValetRate × 360 operating days`
- Default ValetConv = 12.5% (overrides per asset where data exists)
- Resort/luxury properties get higher ValetConv (e.g., Westin Kierland 35%)

**Restaurant:** `Seats × 1.5 turns/day × 12.5% valet attach × ValetRate × 250 operating days × 1.08 group lift`
- Restaurants only enter TAM if they are steakhouse / fine-dining AND have an active independent valet program
- Brand seat-count standards used when actual seat count is unknown (Capital Grille 240–260, STK 260–290, Ruth's Chris 200–240)

**50% TAM ceiling:** Charlotte and Denver are large markets where uncapped TAM would overstate addressability. The portfolio rollup applies a haircut so SAM never exceeds 50% of market TAM. Charlotte hits 83.3% haircut, Denver hits 91.3%.

### 1.4 SAM — four structural exclusion pools

A pool is the **reason** an account is or isn't in SAM. Pools are mutually exclusive.

#### In-SAM pools (vibrant, sellable)

| Pool | Description | Counts |
|---|---|---:|
| **Anchor** | Charlotte-only hometown anchors with 100% TAM contribution every year. The Capital Grille, STK Steakhouse, Chima Steakhouse, Ruth's Chris Charlotte. Sophi is current operator. | 4 |
| **Cold SAM** | Standard cold-start SAM accounts. Direct displacement targets with named GMs and identified weak/unknown incumbents. | 84 |
| **M&A SAM** | Indianapolis-only Y2-onset M&A absorption from the Denison roll-in (St. Elmo, Harry & Izzy's, Ruth's Chris, Prime 47, Eddie Merlot's). Y1 = $0; Y2-Y5 = full TAM. | 5 |

**In-SAM total: 93 accounts**

#### Out-of-SAM pools (muted, deprioritized)

| Pool | Exclusion reason | Counts |
|---|---|---:|
| **Partnership / PMC** | Bundled into Preferred or PMC channel deals — surface via partner relationship rather than direct displacement. | 17 |
| **Enterprise operator** | LAZ / SP+ / Towne / Ace / Impark — multi-property enterprise contracts make single-asset displacement uneconomic. | 49 |
| **Extended-stay brand** | Home2 / Homewood / Hyatt House / SpringHill / Element — limited valet upside per asset. | 12 |
| **Micro** | TAM < $150K — economics don't support direct sales motion. | 32 |

**Out-of-SAM total: 110 accounts**

#### Pool counts by market (truth table)

| Market | Anchors | Cold SAM | M&A | Partnership | Enterprise | Extended | Micro | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Charlotte | 4 | 20 | 0 | 6 | 1 | 4 | 4 | **39** |
| Phoenix | 0 | 19 | 0 | 4 | 12 | 2 | 0 | **37** |
| Cleveland | 0 | 8 | 0 | 0 | 7 | 0 | 10 | **25** |
| Louisville | 0 | 7 | 0 | 1 | 6 | 0 | 11 | **25** |
| Denver | 0 | 21 | 0 | 4 | 17 | 5 | 2 | **49** |
| Indianapolis | 0 | 9 | 5 | 2 | 6 | 1 | 5 | **28** |
| **TOTAL** | **4** | **84** | **5** | **17** | **49** | **12** | **32** | **203** |

Every transformation in the pipeline is validated against this table. A miss of even one account in any cell triggers a hard stop.

### 1.5 SOM — three S-curves

| Curve | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| **Cold A** | 40% | 50% | 70% | 85% | 95% |
| **Warm A** (Charlotte non-anchor) | 50% | 65% | 80% | 90% | 95% |
| **PMC Gate** | 30% | 50% | 70% | 85% | 95% |

Each curve multiplies the account's **SAM contribution** (capped TAM) — not raw TAM. Anchors override to 100% retention every year. M&A SAM accounts override to Y1=$0, Y2-Y5=100%.

### 1.6 WAS scoring (decoupled)

WAS scores 0–5 across four sub-scores: Fit, Size, Ownership Base, Addressability. The total drives **tier classification only** — it has no direct impact on whether an account is in SAM or how much it contributes to SOM.

| Tier | WAS range | Meaning |
|---|---|---|
| A | ≥ 4.0 | Beachhead |
| B | 3.4–3.99 | Core |
| C | 2.8–3.39 | Opportunistic |
| D | < 2.8 | Deprioritized |

Tier is shown in the modal as a secondary signal but no longer drives revenue.

### 1.7 Indianapolis v7 — three layers

Indianapolis carries the legacy of Towne Park's hometown founding (Denison era). v7 codifies three structural advantages that don't exist in any other market:

1. **Hometown displaced (3 accounts):** Omni Severin, Conrad Indianapolis, The Capital Grille — re-classified from Enterprise to Cold SAM via Denison-era goodwill and co-located dependency. These would otherwise be unwinnable enterprise contracts.

2. **Hometown WAS boost (1 account):** HGI Indianapolis Downtown gets +0.5 WAS for the Denison ex-CEO connection. This is a tier change, not a SAM change.

3. **M&A absorption (5 accounts):** St. Elmo, Harry & Izzy's, Ruth's Chris, Prime 47, Eddie Merlot's roll into Sophi via the Denison Y2 acquisition. $0.95M/yr Y2-Y5 portfolio contribution. These accounts are in SAM (M&A SAM pool) with Y1=$0.

The v2 schema encodes this in a single `v7_layer` field per account: `hometown_displaced` | `hometown_was_boost` | `ma_absorption` | `null`. The market app surfaces it as an amber callout in the modal.

---

## Part 2 — Source Files & The Reconciliation Problem

### 2.1 What the user provided

Six per-market XLSX files (named `*_som_v5.xlsx` but containing v2 methodology data) plus one rollup:

| File | Contains |
|---|---|
| `charlotte_2026_som_v5.xlsx` | Charlotte v2: SOM_v5, Pool_Structure, Trajectory, Sensitivity sheets |
| `denver_2026_som_v5.xlsx` | Denver v2 |
| `indianapolis_2026_som_v5.xlsx` | Indianapolis v2 (only contains in-SAM accounts on SOM_v5) |
| `phoenix_2025_som_v5.xlsx` | Phoenix v2 |
| `cleveland_2026_som_v5.xlsx` | Cleveland v2 |
| `louisville_2026_som_v5.xlsx` | Louisville v2 |
| `sophi_6market_rollup.xlsx` | Portfolio_Rollup, Pool_Structure, Trajectory, Sensitivity, LP_Headlines |
| `sophi_methodology_export_v2.md` | The authoritative methodology spec |

Plus per-market `*_scored.xlsx` files containing the WAS scoring breakdown (Fit/Size/Ownership Base/Addressability), and `*_tam_refined.xlsx` files with the TAM derivation detail.

### 2.2 The reconciliation problem

Three structural mismatches made the source files unusable as-is:

**Problem 1 — Account scope split across multiple sheets.** The `SOM_v5` sheet of each per-market workbook is the authoritative account list **for in-SAM accounts only** in some markets (Indianapolis), but lists **all 203 accounts including out-of-SAM pools** in other markets (Charlotte, Phoenix, etc.). The pipeline must detect this per-market and supplement Indianapolis with a manual out-of-SAM list.

**Problem 2 — M&A subtotal rows leak into account lists.** Indianapolis's SOM_v5 sheet contains a "M&A Subtotal" row that looks like an account row but is actually an aggregate. Without filtering, the account count comes back as 29 (off by 1) and the M&A pool count is wrong.

**Problem 3 — Phoenix has unlabeled address column.** The Phoenix workbook puts addresses in column 3 but the column header is empty — `pd.read_excel` returns a column named `Unnamed: 2` instead of "Address." Standard column-name lookups fail; geocoder falls back to market center for all 27 Phoenix accounts.

**Problem 4 — Geocoder cache schema drift.** The original cache used `{geocoded: bool, lng: float, lat: float}`. Some manual overrides were keyed differently. The new geocoder must read both schemas without conflict and accept manual overrides via a `{market}::{name}::manual` key pattern.

### 2.3 Why I built three new scripts

Rather than patch the existing v1 normalizer, I built three replacements that treat the truth tables in §1.4 as a hard constraint:

| Script | Lines | Purpose |
|---|---:|---|
| `src/normalize_v2.py` | 583 | Extract 203 accounts with pool classification, TAM, SAM contribution, Y1-Y5 trajectory, WAS, v7_layer. Validates every market against the locked truth table; halts with a diff if any cell mismatches. |
| `src/geocode_v2.py` | 163 | Geocode 203 accounts using cached lookups, manual overrides, and a Phoenix-specific column-3 sniff fallback. Updated bbox for Scottsdale (lng to -111.5, lat to 34.10). |
| `src/build_data_js_v2.py` | 123 | Generate `data.js` from geocoded JSON. Computes per-market summary rollups (TAM/SAM/Y1/Y5, ratios, pool counts) and embeds the v2 schema. |

---

## Part 3 — Build Pipeline (How Source Files Become The App)

```
source XLSX (×7) ──► normalize_v2.py ──► accounts_v2.json
                                              │
                                              ▼
                       geocode_v2.py ──► accounts_v2_geocoded.json
                                              │
                                              ▼
                    build_data_js_v2.py ──► data.js (224KB)
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                     index.html         market.html          style.css
                     landing.js          market.js
```

### 3.1 Stage 1 — `normalize_v2.py`

**Input:** Six per-market `*_som_v5.xlsx` files + the rollup workbook.

**Output:** `src/accounts_v2.json` (336 KB, 203 records).

**Algorithm:**

1. For each market, load the SOM_v5 sheet and detect schema:
   - If a `Pool` column exists with both in-SAM and out-of-SAM tags → use as canonical account list.
   - If only in-SAM tags appear (Indianapolis) → use SOM_v5 for in-SAM, supplement with an embedded `INDY_OUT_OF_SAM` manual list (14 accounts) for out-of-SAM.

2. Filter subtotal rows. The exclusion regex matches: `^(M&A |TOTAL|SUBTOTAL|Subtotal|Out-of-SAM Subtotal)`. This catches the Indy M&A subtotal leak.

3. Map raw `Pool` strings to canonical pool keys:
   ```
   "Anchor" → anchor
   "Cold SAM" / "Cold-SAM" → cold_sam
   "M&A SAM" / "M&A" → ma_sam
   "Partnership" / "PMC" / "Preferred bundled" → partnership
   "Enterprise" / "Enterprise operator" → enterprise
   "Extended-stay" / "Extended Stay" → extended_stay
   "Micro" / "Sub-floor" → micro
   ```

4. Per account, extract: name, type, address, TAM, SAM contribution, Y1–Y5, WAS base, WAS boost, sign year, curve, valet operator, garage operator, management, GM, phone, email, URL, rooms, seats, occupancy, valet conv, rate, TAM class, TAM status, TAM notes, location notes.

5. Apply Indianapolis v7 overrides:
   - Tag `Omni Severin Hotel`, `Conrad Indianapolis`, `The Capital Grille (Indy)` as `v7_layer = hometown_displaced` and force `pool = cold_sam`.
   - Tag `Hilton Garden Inn Indianapolis Downtown` as `v7_layer = hometown_was_boost`.
   - Tag the 5 Elite M&A accounts as `v7_layer = ma_absorption` with `pool = ma_sam`, override Y1 to `$0`, Y2-Y5 to full TAM.

6. **Validate against the truth table.** Build per-market pool counts; compare to the locked dict in §1.4. If any cell differs, print a diff and exit 1.

7. Emit JSON with stable field order.

**Validation output (passing):**
```
charlotte:    {anchor: 4, cold_sam: 20, ma_sam: 0, partnership: 6, enterprise: 1, extended_stay: 4, micro: 4} ✓
phoenix:      {anchor: 0, cold_sam: 19, ma_sam: 0, partnership: 4, enterprise: 12, extended_stay: 2, micro: 0} ✓
cleveland:    {anchor: 0, cold_sam: 8, ma_sam: 0, partnership: 0, enterprise: 7, extended_stay: 0, micro: 10} ✓
louisville:   {anchor: 0, cold_sam: 7, ma_sam: 0, partnership: 1, enterprise: 6, extended_stay: 0, micro: 11} ✓
denver:       {anchor: 0, cold_sam: 21, ma_sam: 0, partnership: 4, enterprise: 17, extended_stay: 5, micro: 2} ✓
indianapolis: {anchor: 0, cold_sam: 9, ma_sam: 5, partnership: 2, enterprise: 6, extended_stay: 1, micro: 5} ✓
TOTAL: 203 accounts | 93 in SAM | $150.34M TAM | $57.27M SAM | $52.60M Y5 SOM ✓
```

### 3.2 Stage 2 — `geocode_v2.py`

**Input:** `accounts_v2.json` + `geocode_cache.json` (Nominatim cache from previous runs).

**Output:** `accounts_v2_geocoded.json` (203/203 geocoded).

**Algorithm:**

1. For each account, build a cache key: `{market}::{name}`.

2. Lookup order:
   - **Manual override:** `{market}::{name}::manual` key. Used for properties Nominatim can't disambiguate (ADERO Scottsdale, Maple & Ash Scottsdale, Del Frisco's CLT, Sullivan's CLT, Caesars Southern Indiana, Mo's Indy).
   - **Cached lookup** with confidence flag (`verified` | `approximate`). Both old `{geocoded: bool}` and new `{confidence: str}` schemas are read.
   - **Fresh Nominatim query** with bbox constrained to the metro area. Phoenix bbox extended to -111.5 lng / 34.10 lat to include Scottsdale.

3. Phoenix-specific column-3 sniff: if the canonical Address column lookup returns null, fall back to row[2] before declaring unaddressable.

4. **Wipe-and-retry policy:** before this run I wiped 42 entries with `geocoded: False` from the cache so they could be retried with the new bbox + manual overrides.

5. Result: 203/203 geocoded. 27 Phoenix accounts that previously fell back to market center now resolve to actual property coordinates.

### 3.3 Stage 3 — `build_data_js_v2.py`

**Input:** `accounts_v2_geocoded.json`.

**Output:** `data.js` (224 KB) — the single artifact loaded by both `landing.js` and `market.js`.

**Algorithm:**

1. Group accounts by market.

2. For each market, compute:
   - `summary`: tam, sam, y1_som, y5_som, n_accounts, n_in_sam, sam_tam_ratio, y5_tam_ratio, y5_sam_ratio
   - `pool_counts`: count of accounts per pool
   - `pool_tam`: TAM sum per pool
   - `tier_counts`: count by WAS tier (A/B/C/D)
   - `rollup` and `pool_structure_rollup`: pre-computed totals for landing-page tiles
   - `center`: [lng, lat] for the map default position

3. Emit `window.SOPHI_DATA = {...}` as a single global JSON literal. No imports, no fetches at runtime.

**Schema per account:**
```js
{
  // Identity
  name, type, pool, in_sam, pool_raw, rank,

  // Money
  tam, sam_contrib, y1, y2, y3, y4, y5,

  // Scoring
  was, was_base, was_boost, tier, tier_full,

  // Lifecycle
  sign_yr, curve,

  // Indy v7
  v7_layer,                  // hometown_displaced | hometown_was_boost | ma_absorption | null

  // Geo
  lng, lat, geocoded, address, area,

  // Property
  phone, email, url, rooms, seats,
  valet_rate, self_park_rate, occupancy, valet_conv,
  gm, management, garage_operator, valet_operator,

  // TAM detail
  tam_class, tam_status, tam_notes
}
```

---

## Part 4 — App Design Strategy

### 4.1 Two-page architecture

| Page | Purpose | Primary task |
|---|---|---|
| **Landing** (`index.html` + `landing.js`) | Portfolio overview — convince an LP in 30 seconds | Read the four headline numbers, scan all 6 markets, click into one |
| **Market view** (`market.html?m=<key>` + `market.js`) | Per-market exploration — show every account on the map with full pool/SAM/SOM detail | Filter by pool, click marker, read modal |

Both share `data.js` (single source of truth) and `style.css` (single design system).

### 4.2 Pool color system

The pool taxonomy is the visual backbone. Color encoding distinguishes in-SAM (vibrant) from out-of-SAM (muted) at a glance:

| Pool | Hex | Saturation strategy |
|---|---|---|
| Anchor | `#7C3AED` | Vibrant purple — Charlotte-only signature |
| Cold SAM | `#0891B2` | Vibrant teal — most common in-SAM pool |
| M&A SAM | `#D97706` | Vibrant gold — Indy v7 signal |
| Partnership | `#64748B` | Muted slate |
| Enterprise | `#B45309` | Muted burnt umber |
| Extended-stay | `#9CA3AF` | Muted gray |
| Micro | `#BFB8AE` | Warm tan, lowest saturation |

**Marker treatment:**
- In-SAM markers: full size (anchors 22px, cold/ma 18px), white halo via box-shadow, full opacity
- Out-of-SAM markers: smaller (partnership/enterprise 11px, extended 10px, micro 9px), 0.6–0.72 opacity
- M&A SAM gets a subtle gold ring to flag Indy v7 carry-in
- Geocode fallbacks (none in current build) would render dashed and 0.55 opacity

### 4.3 Landing page composition

1. **Hero**: "$150M TAM. $52.6M Y5 SOM. Decoupled WAS, structural SAM."
2. **Portfolio summary tile** (4 columns): TAM / SAM / Y5 SOM / Accounts with sub-line ratios
3. **6 market cards** in `[charlotte, phoenix, denver, indianapolis, cleveland, louisville]` order, each showing:
   - Market name + state badge (Warm · 4 anchors / Cold start / Cold · v7 hometown)
   - Pool composition bar (segmented by pool count, in-SAM colors first, out-of-SAM after)
   - TAM / Y5 SOM / Y5-to-TAM ratio
   - Pool chips (one per non-zero pool)
4. **Methodology section** (4 explainer cards): Decoupled WAS/SAM/SOM · 4 Structural Pools · 50% TAM Ceiling · Indy v7 Hometown

### 4.4 Market view composition

**Header** (sticky):
- Back arrow → landing
- Logo + market name + "N accounts · M in SAM"
- TAM / SAM (% of TAM) / Y5 SOM (% of TAM) stat group
- Visible-count pill
- Market switcher dropdown

**Sidebar** (320px desktop, drawer on mobile):
- Summary mini-tiles: Accounts / In SAM / Y1 SOM
- State badge (Warm / Cold / Cold v7)
- **In-SAM Pools** filter group — Anchors / Cold SAM / M&A SAM (filters with zero count auto-hide)
- **Out-of-SAM Pools** filter group — Partnership / Enterprise / Extended / Micro
- Account Type filters (Hotel / Restaurant / Hospital / etc., dynamic)
- Search input (matches name/address/operator/GM/pool tag)
- Legend

**Map**:
- MapLibre raster tiles (Stadia smooth + CartoDB light fallback)
- Per-account markers with pool + in-SAM class
- Hover popup: name, pool, TAM, v7 tag if present
- Click → modal

**Modal** (640px max width, mobile single-column):
- Hero: pool chip · in-SAM/out-of-SAM badge · TAM chip · Tier
- Title + type + address + Downtown badge
- v7 callout (if v7_layer present) — amber tinted box
- For in-SAM: SAM contribution + Y1-Y5 trajectory bars + curve + sign year + Y5/TAM
- For out-of-SAM: "Why excluded from SAM" panel with the reason
- Parking economics (TAM, TAM class, rates, rooms, seats, occupancy, valet conv, status, notes)
- WAS scoring (score, tier, base, boost)
- Operator & management (valet, garage, management company, GM)
- Contact (phone, email, website)

---

## Part 5 — Reconciliation Decisions Log

Decisions made during the rebuild that aren't obvious from the code:

| Decision | Rationale |
|---|---|
| Use `SOM_v5` sheet as primary truth, not `Pool_Structure` | Pool_Structure has aggregate counts but lacks per-account TAM/Y1-Y5. SOM_v5 has both, and we need both. |
| Reject `Indianapolis SOM_v5` as full-account-list | It only contains 14 in-SAM. Supplement with manual `INDY_OUT_OF_SAM` list embedded in normalize_v2.py. |
| Wipe 42 stale geocode cache entries | They were `geocoded: False` fallback markers from before the Phoenix bbox fix. Re-running with the new bbox resolves them. |
| Add 6 manual coordinate overrides | Properties Nominatim genuinely can't find (ADERO Scottsdale Mountain, Maple & Ash Scottsdale, Del Frisco's Charlotte, Sullivan's Charlotte, Caesars Southern Indiana — actually in Elizabeth, IN — and Mo's Indy). Manually verified via Google Maps. |
| Remove tier filters from market sidebar | v2 decouples tier from SAM. Filtering by pool is the meaningful action; tier is shown in modal as secondary. |
| Remove posture filters | Posture (sophi/strong/weak/inhouse/unknown/greenfield) was a v1 concept. v2 replaces it with the 4-pool out-of-SAM taxonomy which encodes the same signal more rigorously. |
| Hide pool filters with zero count per market | Charlotte has no M&A SAM, Indy has no Anchors. Showing them disabled creates clutter; auto-hiding keeps the sidebar tight. |
| Default-show all pools (in and out) | LPs need to see the full landscape, not just the in-SAM subset. Out-of-SAM markers are visually muted so they don't compete. |
| Extended-stay and Micro modal chips render dark on light | These pool colors are too light for white text. Inverted contrast is more accessible. |

---

## Part 6 — File Inventory

### 6.1 Created in this rebuild

| Path | Size | Purpose |
|---|---:|---|
| `src/normalize_v2.py` | 583 lines | Source XLSX → `accounts_v2.json` |
| `src/geocode_v2.py` | 163 lines | `accounts_v2.json` → `accounts_v2_geocoded.json` |
| `src/build_data_js_v2.py` | 123 lines | `accounts_v2_geocoded.json` → `data.js` |
| `src/accounts_v2.json` | 336 KB | 203 accounts with pool/v7/SAM/SOM fields |
| `src/accounts_v2_geocoded.json` | ~360 KB | Geocoded variant |
| `data.js` | 224 KB | Bundled `window.SOPHI_DATA` global |

### 6.2 Modified

| Path | Change |
|---|---|
| `index.html` | New v2 hero, methodology section |
| `landing.js` | Pool composition bars, pool chips, TAM/SAM/Y5/Accounts hero stats |
| `market.html` | Pool layer filters split into in-SAM and out-of-SAM groups, header stats |
| `market.js` | Pool-based marker rendering, v7 modal callouts, exclusion-reason panel, trajectory bars |
| `style.css` | 7 pool color tokens, marker treatments, pool chips, trajectory bars, v7 callout, header-stats layout |

### 6.3 Source files (unchanged, in `past_session_contexts/`)

| Path | Role |
|---|---|
| `*_som_v5.xlsx` (×6) | Per-market account lists with pool tags, TAM, Y1-Y5 |
| `*_scored.xlsx` (×6) | Per-market WAS scoring detail |
| `*_tam_refined.xlsx` (×3) | TAM derivation detail (Charlotte, Denver, Phoenix) |
| `sophi_6market_rollup.xlsx` | Portfolio rollups, pool structure, sensitivity |
| `sophi_methodology_export_v2.md` | Authoritative spec — frozen reference |
| `sophi_was_sam_som_decoupled_v5.md` | The decoupling rationale |

---

## Part 7 — Verification

QA evidence captured during the build:

**Per-market header verification (2026-04-30):**

| Market | Accounts | In SAM | TAM | SAM | Y5 SOM | Marker count | Console errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| Charlotte | 39 | 24 | $18.20M | $9.10M | $8.44M | 39 | 0 |
| Phoenix | 37 | 19 | $33.01M | $9.55M | $8.44M | 37 | 0 |
| Denver | 49 | 21 | $47.96M | $23.98M | $21.91M | 49 | 0 |
| Indianapolis | 28 | 14 | $26.38M | $6.10M | $5.75M | 28 | 0 |
| Cleveland | 25 | 8 | $11.26M | $3.13M | $2.94M | 25 | 0 |
| Louisville | 25 | 7 | $13.53M | $5.41M | $5.12M | 25 | 0 |
| **TOTAL** | **203** | **93** | **$150.34M** | **$57.27M** | **$52.60M** | **203** | **0** |

Every account is geocoded (marker_count == account_count). Every market opens without console errors. Per-market pool counts match the truth table in §1.4. Hero numbers on the live site match the locked reference numbers exactly.

**Modal verification:** Anchor (Capital Grille), Cold SAM (Omni Severin v7), M&A SAM (St. Elmo v7), Out-of-SAM Enterprise (JW Marriott Indianapolis) all tested at desktop and mobile. v7 callouts render correctly. Trajectory bars render with proper Y1-Y5 ramps. Out-of-SAM exclusion reasons display correctly.

**Mobile (390×844):** Hero stacks 2×2, sidebar drawer opens via toggle, modal collapses fields to single column, trajectory bars shrink to 48px height. No layout breaks.

**Live deployment:** Verified on `joshuapcasey.github.io/sophi-market-map/` with a fresh browser context. Charlotte serves 39 accounts with `pool: "anchor"` on the live origin. CDN propagation took ~60 seconds after `git push`.

---

## Appendix — How to regenerate the build

```bash
cd /home/user/workspace/sophi-market-map

# Stage 1: extract and validate accounts
python3 src/normalize_v2.py
# → src/accounts_v2.json

# Stage 2: geocode (mostly cached)
python3 src/geocode_v2.py
# → src/accounts_v2_geocoded.json

# Stage 3: bundle for browser
python3 src/build_data_js_v2.py
# → data.js

# Deploy
git add -A
git commit -m "..."
git push origin main
# GitHub Pages auto-publishes within ~1 minute
```

The pipeline is idempotent — re-running with unchanged source XLSX files produces byte-identical output. Any drift indicates either source-file changes or a regression in the normalizer's pool-mapping logic, both of which trigger validation failure in stage 1.
