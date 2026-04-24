"""Fast geocoding using Photon (Komoot OSM-based, no rate limit) with parallel requests."""
import json
import urllib.parse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

SRC = Path("/home/user/workspace/sophi-market-map/src")

with open(SRC / "accounts.json") as f:
    data = json.load(f)

cache_path = SRC / "geocode_cache.json"
cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}

MARKET_CENTERS = {
    "denver":       [-104.9903, 39.7392],
    "charlotte":    [-80.8431, 35.2271],
    "indianapolis": [-86.1581, 39.7684],
    "phoenix":      [-112.0740, 33.4484],
    "cleveland":    [-81.6944, 41.4993],
    "louisville":   [-85.7585, 38.2527],
}

# Broader bounding boxes to include suburbs/resorts
MARKET_BBOX = {
    "denver":       [-105.50, 39.40, -104.50, 40.10],
    "charlotte":    [-81.30, 34.90, -80.50, 35.55],
    "indianapolis": [-86.50, 39.50, -85.80, 40.05],
    "phoenix":      [-112.80, 33.00, -111.30, 34.00],
    "cleveland":    [-82.15, 41.20, -81.30, 41.75],
    "louisville":   [-86.10, 38.00, -85.40, 38.50],
}

def photon_geocode(query, timeout=8):
    url = "https://photon.komoot.io/api/?" + urllib.parse.urlencode({"q": query, "limit": 1})
    req = urllib.request.Request(url, headers={"User-Agent": "SophiMap/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            j = json.loads(r.read())
            if j.get("features"):
                c = j["features"][0]["geometry"]["coordinates"]
                return [float(c[0]), float(c[1])]
    except Exception:
        pass
    return None

def in_bbox(lng, lat, bbox):
    return bbox[0] <= lng <= bbox[2] and bbox[1] <= lat <= bbox[3]

def geocode_one(mkey, name, addr, bbox, center):
    market_city = mkey.title() if mkey != "indianapolis" else "Indianapolis"
    state_abbr = {"denver":"CO","charlotte":"NC","indianapolis":"IN","phoenix":"AZ","cleveland":"OH","louisville":"KY"}[mkey]

    # Try address
    if addr:
        q = addr
        if market_city.lower() not in addr.lower() and state_abbr not in addr:
            q = f"{addr}, {market_city}, {state_abbr}"
        coords = photon_geocode(q)
        if coords and in_bbox(coords[0], coords[1], bbox):
            return coords, "verified"

    # Try name + city
    q2 = f"{name}, {market_city}, {state_abbr}"
    coords = photon_geocode(q2)
    if coords and in_bbox(coords[0], coords[1], bbox):
        return coords, "approximate"

    # Fallback: jittered center
    import random
    return [
        center[0] + (random.random() - 0.5) * 0.04,
        center[1] + (random.random() - 0.5) * 0.04,
    ], "fallback"

# Process each market with thread pool
total = 0
by_conf = {"verified": 0, "approximate": 0, "fallback": 0, "cached": 0}

for mkey, market in data["markets"].items():
    center = MARKET_CENTERS[mkey]
    bbox = MARKET_BBOX[mkey]
    tasks = []

    print(f"\n=== {mkey.upper()} ({len(market['accounts'])} accounts) ===", flush=True)

    def worker(acct):
        name = acct["name"]
        addr = acct.get("address")
        cache_key = f"{mkey}::{name}::{addr or ''}"
        if cache_key in cache:
            entry = cache[cache_key]
            acct["lng"] = entry["lng"]
            acct["lat"] = entry["lat"]
            acct["geo_confidence"] = entry.get("confidence", "verified" if entry.get("geocoded") else "fallback")
            return "cached"

        coords, conf = geocode_one(mkey, name, addr, bbox, center)
        acct["lng"] = coords[0]
        acct["lat"] = coords[1]
        acct["geo_confidence"] = conf
        cache[cache_key] = {"lng": coords[0], "lat": coords[1], "confidence": conf}
        return conf

    # Photon has no documented rate limit — use 10 workers
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(worker, a) for a in market["accounts"]]
        done = 0
        for fut in as_completed(futures):
            res = fut.result()
            by_conf[res] = by_conf.get(res, 0) + 1
            done += 1
            total += 1
            if done % 25 == 0:
                # Save cache periodically
                cache_path.write_text(json.dumps(cache))
                print(f"  [{done}/{len(market['accounts'])}]  verified={by_conf['verified']} approx={by_conf['approximate']} fallback={by_conf['fallback']}", flush=True)

cache_path.write_text(json.dumps(cache))

with open(SRC / "accounts_geocoded.json", "w") as f:
    json.dump(data, f, indent=2, default=str)

print(f"\n\n=== DONE ===")
print(f"Total: {total}")
print(f"Verified: {by_conf['verified']}")
print(f"Approximate: {by_conf['approximate']}")
print(f"Fallback (jittered center): {by_conf['fallback']}")
print(f"Cached from previous run: {by_conf['cached']}")
