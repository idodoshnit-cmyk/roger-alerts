"""Research only (the live bot never reads this): world headlines from GDELT with the time GDELT first saw them.
Runs in GitHub Actions (GDELT is free, no key). Appends to news/gdelt_world.csv, deduplicated by URL.
Columns: seen_utc, seen_et, tags, title, domain, sourcecountry, url
seen_utc = when GDELT's crawler saw the article (usually minutes after publication); use it as the earliest
time Roger could have known. Window: GDELT_DAYS back from now (default 60), in GDELT_HOURS-hour slices."""
import csv, os, sys, time, re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import requests
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "gdelt_world.csv")
ET = ZoneInfo("America/New_York")
DAYS = float(os.environ.get("GDELT_DAYS", "60"))
HOURS = int(os.environ.get("GDELT_HOURS", "2"))
# market-moving world events: war and defense, sanctions and trade, deals with the US, energy shocks
QUERY = ('(war OR invasion OR missile OR airstrike OR ceasefire OR "military strike" OR sanctions OR tariff OR tariffs '
         'OR "trade deal" OR "trade agreement" OR "defense contract" OR "Pentagon contract" OR embargo OR "oil supply" '
         'OR "executive order" OR coup) sourcelang:english')
TAGS = {"war": r"\b(war|invasion|missile|airstrike|strike|attack|troops|ceasefire|drone)\b",
        "defense": r"\b(defen[cs]e|pentagon|army|navy|military|weapons?|arms)\b",
        "trade": r"\b(tariffs?|trade (deal|agreement|war)|sanctions?|embargo|export (ban|controls?))\b",
        "us_deal": r"\b(contract|deal|agreement|partnership)\b.*\b(u\.?s\.?|united states|washington|white house|trump)\b|\b(u\.?s\.?|united states|white house)\b.*\b(contract|deal|agreement)\b",
        "energy": r"\b(oil|gas|opec|pipeline|crude)\b",
        "policy": r"\b(executive order|fed|federal reserve|rate (cut|hike)|fda)\b"}
seen, rows = set(), []
if os.path.exists(OUT):
    for r in csv.DictReader(open(OUT, encoding="utf-8")):
        seen.add(r["url"]); rows.append(r)
start_old = len(rows)
end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
t = end - timedelta(days=DAYS)
calls = fails = 0
while t < end:
    t2 = min(t + timedelta(hours=HOURS), end)
    params = {"query": QUERY, "mode": "artlist", "format": "json", "maxrecords": 250, "sort": "datedesc",
              "startdatetime": t.strftime("%Y%m%d%H%M%S"), "enddatetime": t2.strftime("%Y%m%d%H%M%S")}
    js = None
    for k in range(4):
        try:
            r = requests.get("https://api.gdeltproject.org/api/v2/doc/doc", params=params, timeout=40,
                             headers={"User-Agent": "roger-alerts research"})
            if r.status_code == 200 and r.text.lstrip().startswith("{"):
                js = r.json(); break
        except Exception:
            pass
        time.sleep(6 * (k + 1))
    calls += 1
    if js is None:
        fails += 1
    for a in (js or {}).get("articles", []):
        u = a.get("url", "")
        if not u or u in seen:
            continue
        seen.add(u)
        sd = datetime.strptime(a["seendate"], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        title = " ".join(a.get("title", "").split())
        low = title.lower()
        rows.append({"seen_utc": sd.strftime("%Y-%m-%d %H:%M:%S"), "seen_et": sd.astimezone(ET).strftime("%Y-%m-%d %H:%M:%S"),
                     "tags": " ".join(k for k, rx in TAGS.items() if re.search(rx, low)), "title": title,
                     "domain": a.get("domain", ""), "sourcecountry": a.get("sourcecountry", ""), "url": u})
    if calls % 50 == 0:
        print(t2.isoformat(), "rows", len(rows), "fails", fails, flush=True)
    time.sleep(5)            # GDELT asks for about one request every 5 seconds
    t = t2
rows.sort(key=lambda r: r["seen_utc"])
with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, ["seen_utc", "seen_et", "tags", "title", "domain", "sourcecountry", "url"])
    w.writeheader(); w.writerows(rows)
print(f"{calls} windows, {fails} failed, {len(rows) - start_old} new headlines, {len(rows)} total")
if calls and fails / calls > 0.5:
    sys.exit("more than half the GDELT windows failed")
