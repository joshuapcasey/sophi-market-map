"""Compare v2 vs v3 SOM outputs across all 6 markets."""
import json
from pathlib import Path
from collections import Counter

here = Path(__file__).parent
with open(here / 'accounts_v2.json') as f: v2 = json.load(f)
with open(here / 'accounts_v3.json') as f: v3 = json.load(f)

MARKETS = ['charlotte','phoenix','denver','indianapolis','cleveland','louisville']

def fmt_m(v): return f"${v/1e6:.2f}M"
def fmt_pct(a, b): return f"{((a-b)/b*100):+.1f}%" if b else "n/a"

print("="*90)
print("PORTFOLIO ROLLUP — v2 vs v3")
print("="*90)
def portfolio(d):
    p = {f'y{y}': 0 for y in range(1,6)}
    p['tam'] = 0; p['sam'] = 0; p['n_in_sam'] = 0
    for mk in MARKETS:
        m = d['markets'][mk]
        for a in m['accounts']:
            for y in range(1,6): p[f'y{y}'] += a.get(f'y{y}', 0)
        p['tam'] += m['summary']['tam']
        p['sam'] += m['summary']['sam']
        p['n_in_sam'] += m['summary']['n_in_sam']
    return p

p2 = portfolio(v2); p3 = portfolio(v3)

print(f"\n{'Year':<10}{'v2':>14}{'v3':>14}{'Δ$':>14}{'Δ%':>10}")
print("-"*62)
for y in range(1,6):
    a, b = p3[f'y{y}'], p2[f'y{y}']
    print(f"Y{y:<9}{fmt_m(b):>14}{fmt_m(a):>14}{fmt_m(a-b):>14}{fmt_pct(a,b):>10}")
v2_5 = sum(p2[f'y{y}'] for y in range(1,6))
v3_5 = sum(p3[f'y{y}'] for y in range(1,6))
print("-"*62)
print(f"{'5yr total':<10}{fmt_m(v2_5):>14}{fmt_m(v3_5):>14}{fmt_m(v3_5-v2_5):>14}{fmt_pct(v3_5,v2_5):>10}")

print(f"\nTAM (constant): {fmt_m(p3['tam'])}   SAM (constant): {fmt_m(p3['sam'])}   In-SAM accts: {p3['n_in_sam']}")

# Per-market breakdown
print("\n" + "="*90)
print("PER-MARKET BREAKDOWN")
print("="*90)
for mk in MARKETS:
    m2 = v2['markets'][mk]['summary']
    m3 = v3['markets'][mk]['summary']
    print(f"\n--- {mk.upper()} ({m3['state']}) — TAM ${m2['tam']/1e6:.2f}M, SAM ${m2['sam']/1e6:.2f}M, {m2['n_in_sam']} in-SAM accts ---")
    print(f"  Y1 SOM:  v2 {fmt_m(m2['y1_som']):>9}  →  v3 {fmt_m(m3['y1_som']):>9}   Δ {fmt_pct(m3['y1_som'], m2['y1_som']):>8}")
    print(f"  Y5 SOM:  v2 {fmt_m(m2['y5_som']):>9}  →  v3 {fmt_m(m3['y5_som']):>9}   Δ {fmt_pct(m3['y5_som'], m2['y5_som']):>8}")
    # 5-yr totals from accounts
    v2_5 = sum(sum(a.get(f'y{y}',0) for y in range(1,6)) for a in v2['markets'][mk]['accounts'])
    v3_5 = sum(sum(a.get(f'y{y}',0) for y in range(1,6)) for a in v3['markets'][mk]['accounts'])
    print(f"  5-yr:    v2 {fmt_m(v2_5):>9}  →  v3 {fmt_m(v3_5):>9}   Δ {fmt_pct(v3_5, v2_5):>8}")
    # Acquisition-year distribution
    ayc = m3.get('acquisition_year_counts', {})
    parts = []
    for k in ['1','2','3','4','5','never']:
        if k in ayc: parts.append(f"Y{k}={ayc[k]}" if k!='never' else f"never={ayc[k]}")
    print(f"  Acquisition timing: {', '.join(parts)}")

# Account-level deltas — show big movers
print("\n" + "="*90)
print("ACCOUNT-LEVEL CHANGES — TOP 25 BIGGEST 5-YR DELTAS")
print("="*90)
deltas = []
for mk in MARKETS:
    a2_by_name = {a['name']: a for a in v2['markets'][mk]['accounts']}
    for a3 in v3['markets'][mk]['accounts']:
        a2 = a2_by_name.get(a3['name'])
        if not a2: continue
        v2_5 = sum(a2.get(f'y{y}',0) for y in range(1,6))
        v3_5 = sum(a3.get(f'y{y}',0) for y in range(1,6))
        delta = v3_5 - v2_5
        deltas.append((delta, mk, a3, a2, v2_5, v3_5))
# Top gainers
deltas_sorted = sorted(deltas, key=lambda x: -abs(x[0]))[:25]
print(f"\n{'Mkt':<6}{'Account':<42}{'Pool':<14}{'AcqYr':<7}{'v2 5yr':>11}{'v3 5yr':>11}{'Δ':>11}")
print("-"*102)
for delta, mk, a3, a2, v2_5, v3_5 in deltas_sorted:
    name = a3['name'][:40]
    pool = a3.get('pool','')[:13]
    ay = a3.get('acquisition_year') or 'never'
    sign = '+' if delta >= 0 else ''
    print(f"{mk[:5]:<6}{name:<42}{pool:<14}{str(ay):<7}{fmt_m(v2_5):>11}{fmt_m(v3_5):>11}{sign+fmt_m(delta):>11}")

# Gating impact
print("\n" + "="*90)
print("GATING IMPACT — accounts NEVER acquired in 5-yr window")
print("="*90)
never = []
for mk in MARKETS:
    for a in v3['markets'][mk]['accounts']:
        if a.get('in_sam') and a.get('acquisition_year') is None:
            never.append((mk, a))
print(f"\nTotal in-SAM accounts NEVER acquired: {len(never)} of {p3['n_in_sam']}")
print(f"\n{'Mkt':<6}{'Account':<42}{'TAM':>10}{'Operator':<22}{'Reason':<60}")
print("-"*140)
for mk, a in never:
    op = (a.get('valet_operator','') or '')[:20]
    reason = (a.get('gate_status','') or '')[:58]
    print(f"{mk[:5]:<6}{a['name'][:40]:<42}{fmt_m(a.get('tam',0)):>10}{op:<22}{reason:<60}")

# Operator-gate impact
print("\n" + "="*90)
print("OPERATOR-GATE IMPACT — won-vs-not by operator")
print("="*90)
op_won = Counter(); op_unwon = Counter()
for mk in MARKETS:
    for a in v3['markets'][mk]['accounts']:
        if not a.get('in_sam'): continue
        op = a.get('operator_gate') or 'no_gate'
        if a.get('acquisition_year'): op_won[op] += 1
        else: op_unwon[op] += 1
print(f"\n{'Operator':<22}{'Won':>6}{'Unwon':>8}{'Total':>8}{'Win rate':>12}")
print("-"*60)
for op in sorted(set(list(op_won.keys()) + list(op_unwon.keys()))):
    w, u = op_won[op], op_unwon[op]
    t = w + u
    rate = f"{w/t*100:.0f}%" if t else "—"
    print(f"{op:<22}{w:>6}{u:>8}{t:>8}{rate:>12}")
