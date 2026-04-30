"""
normalize_v3.py — Sophi v3 penetration methodology

CHANGES FROM v2:
  v2 baked penetration into y1-y5 fields by ramping each account from
  some sign_yr × curve. v3 separates penetration from revenue:
    1. Each account has a binary acquisition_year ∈ {1,2,3,4,5,null}
    2. Once acquired, account contributes FULL annual TAM every year forward
    3. Acquisition timing is driven by an explicit S-curve penetration engine,
       per-operator credibility gates, and a cumulative ownership-group multiplier

INPUT:  src/accounts_v2.json  (the v2 normalization)
OUTPUT: src/accounts_v3.json  (same shape + acquisition_year + new y1-y5 fields)

The script is deterministic — no randomness, no Monte Carlo. Acquisition is a
greedy ranked-allocation against per-year cumulative penetration targets,
with hard operator gates and cumulative group multipliers boosting eligible
accounts up the ranking.
"""

import json, re, copy, math
from collections import defaultdict, Counter
from pathlib import Path

# ---------------------------------------------------------------------------
# CONFIG — penetration engine knobs
# ---------------------------------------------------------------------------

# Conservative terminal Y5 caps (per user — April 30, 2026):
#   Charlotte and Indianapolis: 50% of in-SAM acquired by Y5 (operational data supports more)
#   Other 4 markets: 30% of in-SAM acquired by Y5 (highly conservative entry)
# Underlying S-curve shape (10/30/50/70/85) is scaled proportionally to land at the cap.
# This intentionally underestimates SOM. Uplifts NOT modeled (relationship multiplier,
# occupancy/conversion improvements vs Sophi operational data, etc.) leave material
# upside on the table.
MARKET_Y5_CAP = {
    'charlotte':    0.50,
    'indianapolis': 0.50,
    'phoenix':      0.30,
    'denver':       0.30,
    'cleveland':    0.30,
    'louisville':   0.30,
}

# Base S-curve shape (will be scaled per market by Y5 cap)
SCURVE_SHAPE = {1: 0.10, 2: 0.30, 3: 0.50, 4: 0.70, 5: 0.85}

def penetration_curve_for_market(market_key):
    """Return cumulative penetration % per year, scaled to market's Y5 cap."""
    cap = MARKET_Y5_CAP.get(market_key, 0.30)
    # Scale: Y5_target = cap; other years = (shape[year]/shape[5]) * cap
    return {y: (SCURVE_SHAPE[y] / SCURVE_SHAPE[5]) * cap for y in range(1, 6)}

# Legacy aliases — engine reads from penetration_curve_for_market() directly
COLD_PENETRATION = SCURVE_SHAPE  # kept for meta export only
WARM_PENETRATION = SCURVE_SHAPE

# Per-operator unlock gates — (min_accounts_won_in_market, min_verticals)
# Independents and SOPHI-already get no gate
OPERATOR_GATES = {
    'towne park':   {'min_accts': 8, 'min_verticals': 3, 'difficulty': 'hardest'},
    'laz':          {'min_accts': 7, 'min_verticals': 3, 'difficulty': 'hard'},
    'sp+':          {'min_accts': 6, 'min_verticals': 2, 'difficulty': 'medium-hard'},
    'abm':          {'min_accts': 5, 'min_verticals': 2, 'difficulty': 'medium'},
    'ace parking':  {'min_accts': 4, 'min_verticals': 2, 'difficulty': 'easier'},
    # Other regional / smaller operators get a light gate
    'propark':      {'min_accts': 4, 'min_verticals': 2, 'difficulty': 'easier'},
    'pmc':          {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'park inc':     {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'denison':      {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'epic valet':   {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'parkwell':     {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'preferred':    {'min_accts': 3, 'min_verticals': 1, 'difficulty': 'easiest'},
    'metropolis':   {'min_accts': 6, 'min_verticals': 2, 'difficulty': 'medium-hard'},
    'reef':         {'min_accts': 6, 'min_verticals': 2, 'difficulty': 'medium-hard'},
    # Independents / in-house / unknown / SOPHI itself → no gate
}

# Cumulative ownership-group multiplier
GROUP_MULTIPLIER = {0: 1.0, 1: 1.5, 2: 2.0}  # 3+ → 3.0

# ---------------------------------------------------------------------------
# OPERATOR + GROUP NORMALIZATION
# ---------------------------------------------------------------------------

def normalize_operator(raw):
    """Map free-text valet_operator to a canonical key.

    Returns the gate key (lowercase) or None if no gate (independent / SOPHI / unknown).
    """
    if not raw:
        return None
    s = raw.lower().strip()

    # No-gate signals
    no_gate_markers = [
        'sophi', 'in-house', 'in house', 'self-park', 'tbd', 'none',
        'independent', 'unknown', 'hotel-managed', 'marriott-managed',
        'hyatt-managed', 'darden concepts', 'gravitas', 'midnight auteur',
        'ebci', 'caesars', 'evolution parking',  # boutique/independent
    ]
    if any(m in s for m in no_gate_markers):
        return None

    # National operator detection (order matters — most specific first)
    if 'towne park' in s:               return 'towne park'
    if 'laz' in s:                       return 'laz'
    if 'sp+' in s or 'sp plus' in s or 'standard parking' in s:
                                          return 'sp+'
    if 'abm' in s:                        return 'abm'
    if 'ace parking' in s:                return 'ace parking'
    if 'metropolis' in s:                 return 'metropolis'
    if 'reef' in s:                       return 'reef'
    if 'propark' in s or 'pro park' in s: return 'propark'
    if 'pmc' in s or 'parking management company' in s or 'pmsi' in s or 'pmsg' in s:
                                          return 'pmc'
    if 'park inc' in s:                   return 'park inc'
    if 'denison' in s:                    return 'denison'
    if 'epic' in s:                       return 'epic valet'
    if 'parkwell' in s:                   return 'parkwell'
    if 'preferred' in s:                  return 'preferred'
    if 'elite management' in s or 'elite parking' in s:
                                          return 'elite'  # acts like a small-regional
    # Anything else → light gate equivalent to PMC
    return 'other_regional'

def detect_ownership_group(account):
    """Identify ownership/management group key for cumulative-multiplier purposes.

    Uses tam_notes, management, name. Returns canonical group key or None.
    """
    notes = ' '.join([
        str(account.get('tam_notes', '') or ''),
        str(account.get('management', '') or ''),
        str(account.get('name', '') or ''),
    ]).lower()

    # Restaurant groups
    if 'darden' in notes or 'capital grille' in notes or 'longhorn' in notes \
       or 'olive garden' in notes or 'seasons 52' in notes or 'yard house' in notes \
       or 'bahama breeze' in notes:
        return 'darden'
    if 'huse culinary' in notes or "harry & izzy" in notes or 'st. elmo' in notes \
       or 'st elmo' in notes:
        return 'huse_culinary'
    if 'elite management' in notes:
        return 'elite_steakhouses'  # Indy v7 ma_absorption group
    if "ruth's chris" in notes or 'ruth chris' in notes:
        return 'ruths_chris'
    if 'fleming' in notes or 'morton' in notes or 'del frisco' in notes \
       or 'sullivan' in notes:
        return 'landrys_or_indy_steakhouse'
    if 'noble 33' in notes:
        return 'noble_33'
    if 'gravitas' in notes or 'midnight auteur' in notes:
        return 'gravitas'

    # Hotel groups
    mgmt = (account.get('management', '') or '').lower()
    if 'marriott' in mgmt:           return 'marriott_mgmt'
    if 'hyatt' in mgmt:              return 'hyatt_mgmt'
    if 'omni' in mgmt:               return 'omni'
    if 'sage hospitality' in mgmt:   return 'sage'
    if 'stonebridge' in mgmt:        return 'stonebridge'
    if 'white lodging' in mgmt:      return 'white_lodging'
    if 'aparium' in mgmt:            return 'aparium'
    if 'pyramid' in mgmt:            return 'pyramid_global'
    if 'remington' in mgmt:          return 'remington'
    if 'driftwood' in mgmt:          return 'driftwood'
    if 'hcw hospitality' in mgmt:    return 'hcw'
    if 'kimpton' in mgmt:            return 'kimpton'
    if 'fairmont' in mgmt or 'accor' in mgmt: return 'accor'
    if 'aimbridge' in mgmt:          return 'aimbridge'
    if 'pmh' in mgmt or 'paragon' in mgmt:    return 'paragon'

    return None  # standalone — no group multiplier applies

def group_multiplier_for_count(n):
    if n >= 3: return 3.0
    return GROUP_MULTIPLIER[n]

# ---------------------------------------------------------------------------
# ACCOUNT SCORING (priority for acquisition order)
# ---------------------------------------------------------------------------

POOL_BASE_PRIORITY = {
    'anchor':   1000,   # SOPHI-already / hometown — top priority always
    'cold_sam': 500,
    'ma_sam':   600,    # Indy v7 M&A absorption — pre-locked to Y2 anyway
}

V7_PRIORITY_BUMP = {
    'hometown_displaced': 5000,  # Forced Y1 acquisition
    'hometown_was_boost': 3000,  # Forced Y1 acquisition
    'ma_absorption':      4000,  # Forced Y2 acquisition
}

def base_priority(account):
    """Per-account priority score before group multiplier.

    Higher = acquired earlier. Composed of:
      - Pool tier (anchor >> cold_sam)
      - WAS score (willingness to switch)
      - Account TAM (bigger = juicier — small tiebreaker)
      - V7 layer overrides
    """
    p = POOL_BASE_PRIORITY.get(account.get('pool', ''), 0)
    if account.get('v7_layer') in V7_PRIORITY_BUMP:
        p += V7_PRIORITY_BUMP[account['v7_layer']]
    p += float(account.get('was', 0) or 0) * 50
    p += min(float(account.get('tam', 0) or 0) / 100000.0, 50)  # cap at 50
    return p

# ---------------------------------------------------------------------------
# PENETRATION ENGINE — main loop
# ---------------------------------------------------------------------------

def run_penetration(accounts, market_key, market_state):
    """Run the v3 acquisition engine for one market.

    Mutates accounts in place: adds 'acquisition_year', overwrites y1..y5,
    adds 'gate_status', 'group_key', 'group_wins_at_acquisition'.
    """
    # Out-of-SAM accounts: skip the engine — they stay $0 SOM
    in_sam = [a for a in accounts if a.get('in_sam')]

    # Pre-compute group keys + operator gates
    for a in accounts:
        a['operator_gate'] = normalize_operator(a.get('valet_operator'))
        a['group_key'] = detect_ownership_group(a)
        a['acquisition_year'] = None
        a['gate_status'] = None
        a['group_wins_at_acquisition'] = 0
        # Reset y1..y5 — engine writes them
        for i in range(1, 6):
            a[f'y{i}'] = 0.0

    n_in_sam = len(in_sam)
    if n_in_sam == 0:
        return

    # Cumulative target per year — uses market-specific scaled S-curve
    pen_curve = penetration_curve_for_market(market_key)
    # math.floor (not ceil) to honor the cap conservatively
    targets = {y: max(0, math.floor(n_in_sam * pen_curve[y])) for y in range(1, 6)}

    # Track per-market state
    won = []                            # list of accounts already won
    won_by_group = Counter()            # group_key -> wins so far
    won_by_vertical = set()             # types acquired (for gate threshold)

    # ----- Forced acquisitions: Anchors (Y1) + v7 layer ---------------------
    # Per user (April 30, 2026, Option B): SOPHI-already Anchor accounts force
    # to Y1 — they represent existing operational revenue, not a future win.
    # v7 accounts also force-acquire. All forced acquisitions count toward the cap.
    # Priority order if cap is tight: Anchors first, then v7 by priority.
    cap_total = targets[5]
    forced_count = 0

    # 1) Anchors (SOPHI-already) — forced Y1
    anchors = [a for a in in_sam if a.get('pool') == 'anchor']
    anchors.sort(key=lambda a: -base_priority(a))
    for a in anchors:
        if forced_count >= cap_total:
            a['gate_status'] = 'anchor (cap-deferred — competes normally)'
            continue
        a['acquisition_year'] = 1
        a['gate_status'] = 'anchor: SOPHI-already (forced Y1, counts toward cap)'
        forced_count += 1

    # 2) v7 layer — forced (Y1 hometown / Y2 M&A)
    v7_accts = [a for a in in_sam
                if a.get('v7_layer') in V7_PRIORITY_BUMP
                and a['acquisition_year'] is None]  # not already forced as anchor
    v7_accts.sort(key=lambda a: -base_priority(a))
    for a in v7_accts:
        if forced_count >= cap_total:
            a['gate_status'] = f'v7_{a["v7_layer"]} (cap-deferred — competes normally)'
            continue
        if a['v7_layer'] == 'hometown_displaced' or a['v7_layer'] == 'hometown_was_boost':
            a['acquisition_year'] = 1
            a['gate_status'] = f'v7_{a["v7_layer"]} (forced Y1, counts toward cap)'
        elif a['v7_layer'] == 'ma_absorption':
            a['acquisition_year'] = 2
            a['gate_status'] = 'v7_ma_absorption (forced Y2 trigger, counts toward cap)'
        forced_count += 1

    # Process forced wins immediately for state tracking
    for a in in_sam:
        if a['acquisition_year'] is not None:
            won.append(a)
            if a.get('group_key'):
                won_by_group[a['group_key']] += 1
            if a.get('type'):
                won_by_vertical.add(a['type'])

    # ----- Year-by-year acquisition loop ------------------------------------
    for year in range(1, 6):
        target_won = targets[year]
        # Already-acquired in earlier or this year
        already = sum(1 for a in in_sam if a['acquisition_year'] is not None and a['acquisition_year'] <= year)

        # How many more do we need to win in THIS year?
        slots = target_won - already
        if slots <= 0:
            continue

        # Build candidate pool: not-yet-acquired in-SAM accounts that pass the gate
        candidates = []
        for a in in_sam:
            if a['acquisition_year'] is not None:
                continue
            # Gate check
            gate_key = a.get('operator_gate')
            gate_ok = True
            gate_reason = None
            if gate_key and gate_key in OPERATOR_GATES:
                g = OPERATOR_GATES[gate_key]
                accts_won = len(won)
                verticals_won = len(won_by_vertical)
                if accts_won < g['min_accts'] or verticals_won < g['min_verticals']:
                    gate_ok = False
                    gate_reason = f"gated: {gate_key} unlock requires {g['min_accts']} accts / {g['min_verticals']} verticals (have {accts_won}/{verticals_won})"
            elif gate_key == 'other_regional':
                # Light gate for unknown regionals: 3 accts / 1 vertical
                if len(won) < 3 or len(won_by_vertical) < 1:
                    gate_ok = False
                    gate_reason = f"gated: unknown regional operator (need 3 accts / 1 vertical)"
            elif gate_key == 'elite':
                # Elite Management — light gate
                if len(won) < 3 or len(won_by_vertical) < 1:
                    gate_ok = False
                    gate_reason = f"gated: Elite Management (need 3 accts / 1 vertical)"

            if not gate_ok:
                a['gate_status'] = gate_reason
                continue

            # Compute effective priority with group multiplier
            base = base_priority(a)
            grp = a.get('group_key')
            grp_count = won_by_group[grp] if grp else 0
            mult = group_multiplier_for_count(grp_count) if grp else 1.0
            effective = base * mult
            candidates.append((effective, mult, grp_count, a))

        # Sort by priority desc, take top `slots`
        candidates.sort(key=lambda x: -x[0])
        for eff, mult, grp_count, a in candidates[:slots]:
            a['acquisition_year'] = year
            a['gate_status'] = (
                f"acquired Y{year} (priority {eff:.0f}, group×{mult:.1f})"
                if a.get('group_key') else
                f"acquired Y{year} (priority {eff:.0f})"
            )
            a['group_wins_at_acquisition'] = grp_count
            won.append(a)
            if a.get('group_key'):
                won_by_group[a['group_key']] += 1
            if a.get('type'):
                won_by_vertical.add(a['type'])

        # Mark candidates that didn't make it this year (will retry next year)
        for eff, mult, grp_count, a in candidates[slots:]:
            if a['acquisition_year'] is None:
                a['gate_status'] = (
                    f"in-pool, not yet acquired (priority {eff:.0f}, group×{mult:.1f})"
                    if a.get('group_key') else
                    f"in-pool, not yet acquired (priority {eff:.0f})"
                )

    # ----- Apply revenue: full TAM from acquisition_year forward ------------
    for a in in_sam:
        ay = a.get('acquisition_year')
        tam_annual = float(a.get('tam', 0) or 0)
        if ay is None:
            # Mark as not-yet-acquired in 5-yr window
            if not a.get('gate_status'):
                a['gate_status'] = 'not yet acquired in 5-yr window'
            continue
        for y in range(ay, 6):
            a[f'y{y}'] = tam_annual

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    here = Path(__file__).parent
    src_path = here / 'accounts_v2.json'
    out_path = here / 'accounts_v3.json'

    with open(src_path) as f:
        data = json.load(f)

    # Run engine per-market
    for market_key, market in data['markets'].items():
        accts = market['accounts']
        state = market['summary']['state']
        run_penetration(accts, market_key, state)

        # Recompute summary y1/y5 SOM from acquired accounts
        y1_som = sum(a.get('y1', 0) for a in accts)
        y5_som = sum(a.get('y5', 0) for a in accts)
        market['summary']['y1_som'] = y1_som
        market['summary']['y5_som'] = y5_som
        market['summary']['y5_tam_ratio'] = y5_som / market['summary']['tam'] if market['summary']['tam'] else 0
        market['summary']['y5_sam_ratio'] = y5_som / market['summary']['sam'] if market['summary']['sam'] else 0

        # Acquisition-year breakdown
        ay_counts = Counter(a.get('acquisition_year') for a in accts if a.get('in_sam'))
        market['summary']['acquisition_year_counts'] = {
            str(k) if k is not None else 'never': v for k, v in sorted(ay_counts.items(), key=lambda x: (x[0] is None, x[0]))
        }
        # Per-year SOM
        market['summary']['som_by_year'] = {
            f'y{y}': sum(a.get(f'y{y}', 0) for a in accts) for y in range(1, 6)
        }

    # Update meta
    data['meta'] = data.get('meta', {})
    data['meta']['methodology'] = 'v3 (April 2026) — penetration engine with conservative Y5 caps: 50% Charlotte/Indianapolis, 30% other markets. S-curve scaled to caps. Anchor (SOPHI-already) accounts forced Y1; v7 accounts forced Y1/Y2; both count toward cap. Per-operator credibility gates, cumulative ownership-group multiplier, binary acquisition with full-TAM accrual.'
    data['meta']['market_y5_caps'] = MARKET_Y5_CAP
    data['meta']['scurve_shape'] = SCURVE_SHAPE
    data['meta']['penetration_curves_scaled'] = {mk: penetration_curve_for_market(mk) for mk in MARKET_Y5_CAP}
    data['meta']['operator_gates'] = OPERATOR_GATES
    data['meta']['group_multiplier'] = {**{str(k): v for k, v in GROUP_MULTIPLIER.items()}, '3+': 3.0}
    data['meta']['conservative_caveat'] = 'Penetration is intentionally capped below operational signal. Uplifts NOT modeled: relationship multiplier compounding beyond first-tier sister properties, occupancy improvements vs Sophi operational data, valet-conversion lift from Sophi vs status-quo operators, brand-flag network effects, post-Y5 continued penetration. Material upside left on the table for fundraise defensibility.'

    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)

    # Print summary
    print(f'\n=== v3 PENETRATION ENGINE — RESULTS ===\n')
    portfolio_som_yr = {f'y{y}': 0 for y in range(1, 6)}
    for mk in ['charlotte', 'phoenix', 'denver', 'indianapolis', 'cleveland', 'louisville']:
        m = data['markets'][mk]
        s = m['summary']
        print(f"{mk:14s} ({s['state']})  Y1=${s['y1_som']/1e6:>5.2f}M  "
              f"Y5=${s['y5_som']/1e6:>5.2f}M  TAM=${s['tam']/1e6:>5.2f}M  "
              f"acq: {s['acquisition_year_counts']}")
        for y in range(1, 6):
            portfolio_som_yr[f'y{y}'] += s['som_by_year'][f'y{y}']
    print(f"\nPORTFOLIO Y1-Y5 SOM:")
    for y in range(1, 6):
        print(f"  Y{y}: ${portfolio_som_yr[f'y{y}']/1e6:.2f}M")
    print(f"  5-yr cumulative: ${sum(portfolio_som_yr.values())/1e6:.2f}M")
    print(f"\nWritten: {out_path}")

if __name__ == '__main__':
    main()
