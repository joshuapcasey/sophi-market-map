"""Geocode all addresses using Nominatim OSM API (free, no API key)."""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

SRC = Path("/home/user/workspace/sophi-market-map/src")

# Load accounts
with open(SRC / "accounts_v2.json") as f:
    data = json.load(f)

# Cache results
cache_path = SRC / "geocode_cache.json"
if cache_path.exists():
    with open(cache_path) as f:
        cache = json.load(f)
else:
    cache = {}

# Market center fallbacks for when geocoding fails
MARKET_CENTERS = {
    "denver":       [-104.9903, 39.7392],
    "charlotte":    [-80.8431, 35.2271],
    "indianapolis": [-86.1581, 39.7684],
    "phoenix":      [-112.0740, 33.4484],
    "cleveland":    [-81.6944, 41.4993],
    "louisville":   [-85.7585, 38.2527],
}

# Market bounding boxes (min_lng, min_lat, max_lng, max_lat) for sanity check
MARKET_BBOX = {
    "denver":       [-105.30, 39.50, -104.70, 39.95],
    "charlotte":    [-81.10, 35.00, -80.60, 35.45],
    "indianapolis": [-86.40, 39.60, -85.90, 39.95],
    "phoenix":      [-112.50, 33.10, -111.50, 34.10],
    "cleveland":    [-82.00, 41.30, -81.40, 41.65],
    "louisville":   [-85.95, 38.10, -85.50, 38.40],
}

def geocode_nominatim(query):
    """Query Nominatim OSM geocoding API."""
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "limit": 1,
    })
    req = urllib.request.Request(url, headers={"User-Agent": "SophiMarketMap/1.0 (jcasey@sophimobility.com)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.loads(r.read().decode())
            if result:
                return [float(result[0]["lon"]), float(result[0]["lat"])]
    except Exception as e:
        print(f"  Error: {e}")
    return None

def in_bbox(lng, lat, bbox):
    return bbox[0] <= lng <= bbox[2] and bbox[1] <= lat <= bbox[3]

# Geocode each account
total = 0
successes = 0
fallbacks = 0

for mkey, market in data["markets"].items():
    print(f"\n=== {mkey.upper()} ===")
    center = MARKET_CENTERS[mkey]
    bbox = MARKET_BBOX[mkey]

    for i, acct in enumerate(market["accounts"]):
        total += 1
        addr = acct.get("address")
        name = acct["name"]

        # Create cache key
        cache_key = f"{mkey}::{name}::{addr or ''}"

        # Check for manual override (name-only key)
        manual_key = f"{mkey}::{name}::manual"
        if manual_key in cache:
            entry = cache[manual_key]
            acct["lng"] = entry["lng"]
            acct["lat"] = entry["lat"]
            acct["geocoded"] = True
            successes += 1
            continue

        if cache_key in cache:
            acct["lng"] = cache[cache_key]["lng"]
            acct["lat"] = cache[cache_key]["lat"]
            # Handle both schemas: 'geocoded' (bool) or 'confidence' (str)
            entry = cache[cache_key]
            if "geocoded" in entry:
                acct["geocoded"] = entry["geocoded"]
            else:
                acct["geocoded"] = entry.get("confidence", "") in ("verified", "approximate", "high", "medium")
            if acct["geocoded"]:
                successes += 1
            else:
                fallbacks += 1
            continue

        coords = None
        # Try address first
        if addr:
            query = f"{addr}"
            # Many addresses don't have city — prepend market city name
            market_city = mkey.title() if mkey != "indianapolis" else "Indianapolis"
            if market_city.lower() not in addr.lower():
                query = f"{addr}, {market_city}"
            coords = geocode_nominatim(query)
            time.sleep(1.1)  # Respect Nominatim rate limit (1 req/sec)

            # Validate coords are in market bbox
            if coords and not in_bbox(coords[0], coords[1], bbox):
                coords = None

        # Fallback: try name + market
        if coords is None:
            query = f"{name}, {mkey.title()}"
            coords = geocode_nominatim(query)
            time.sleep(1.1)
            if coords and not in_bbox(coords[0], coords[1], bbox):
                coords = None

        # Final fallback: jittered center
        if coords is None:
            import random
            coords = [
                center[0] + (random.random() - 0.5) * 0.04,
                center[1] + (random.random() - 0.5) * 0.04,
            ]
            acct["geocoded"] = False
            fallbacks += 1
        else:
            acct["geocoded"] = True
            successes += 1

        acct["lng"] = coords[0]
        acct["lat"] = coords[1]

        # Cache it
        cache[cache_key] = {"lng": coords[0], "lat": coords[1], "geocoded": acct["geocoded"]}

        # Save cache every 20 accounts
        if i % 20 == 0:
            with open(cache_path, "w") as f:
                json.dump(cache, f)
            print(f"  [{i+1}/{len(market['accounts'])}] {name[:50]} → {'✓' if acct['geocoded'] else '✗'}")

# Save cache + final data
with open(cache_path, "w") as f:
    json.dump(cache, f)

with open(SRC / "accounts_v2_geocoded.json", "w") as f:
    json.dump(data, f, indent=2, default=str)

print(f"\n\n=== DONE ===")
print(f"Total: {total}")
print(f"Geocoded successfully: {successes}")
print(f"Fallback (jittered): {fallbacks}")
