# Sophi Mobility — 6-Market Analysis

Interactive map application for Sophi Mobility's 2026 market entry strategy.

## Overview

825 valet parking accounts scored across 6 target markets:
- **Denver, CO** (135 accounts, $59.3M TAM, $44.8M Y5 SOM)
- **Charlotte, NC** (80 accounts, $16.6M TAM, $12.2M Y5 SOM) — warm market, 4 SOPHI anchors
- **Indianapolis, IN** (91 accounts, $25.2M TAM, $21.4M Y5 SOM)
- **Phoenix, AZ** (365 accounts, $39.0M TAM, $29.1M Y5 SOM)
- **Cleveland, OH** (84 accounts, $11.3M TAM, $8.6M Y5 SOM)
- **Louisville, KY** (70 accounts, $13.5M TAM, $10.9M Y5 SOM)

**Total:** $164.9M TAM · $127.0M Y5 SOM

## Features

- **Landing page** with 6 market tiles showing tier distribution, TAM, Y5 SOM
- **Per-market map views** with MapLibre GL
- **WAS v2 priority scoring** — Fit 25% · Size 25% · Ownership 20% · Addressability 15% · Adjacency 15%
- **Tier visualization** (A/B/C/D) via marker size and color
- **Competitive posture filters** — SOPHI current / Strong / Weak incumbent / In-house / Unknown / Greenfield
- **Account type filters** (dynamic per market)
- **Full account modal** — tier + TAM + operator posture hero, plus priority, economics, operator, and contact details
- **Geocoding confidence flags** — Verified / Approximate / Fallback

## Methodology

See `data/` for source XLSX files with scoring, SOM projections, and operator inventory.

## Tech

Pure static HTML/CSS/JS. No build step. MapLibre GL for the map, Photon (Komoot OSM) for geocoding.

## Files

- `index.html` — landing page
- `market.html` — per-market map view (query param `?m=denver`)
- `style.css` — shared stylesheet
- `data.js` — embedded account data (auto-generated)
- `landing.js`, `market.js` — page logic
- `src/` — data pipeline scripts (normalize, geocode, build)
- `data/` — source XLSX files

Created with Perplexity Computer.
