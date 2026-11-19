"""Research only (the live bot never reads this): world events from GDELT 2.0's 15-minute event files
(data.gdeltproject.org, free, no key, no rate limit like the DOC API that refuses shared GitHub IPs).
Writes news/gdelt_world.csv.gz, one row per article URL, the first 15-minute batch it appeared in:
added_utc, added_et, tag, root, code, actor1_cc, actor2_cc, goldstein, mentions, url, words
added_utc = GDELT's DATEADDED (the batch time, at most ~15 min after GDELT read the article): the earliest time
Roger could have known. tag: war (CAMEO 19/20, 18 assault), sanction (17 coerce: sanctions, embargoes),
us_deal (05/06 agreements and material cooperation with a US actor). words = the URL slug, usually the headline."""
import csv, gzip, io, os, re, sys, time, zipfile
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor
import requests
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "gdelt_world.csv.gz")
ET = ZoneInfo("America/New_York")
DAYS = float(os.environ.get("GDELT_DAYS", "60"))
COLS = ["added_utc", "added_et", "tag", "root", "code", "actor1_cc", "actor2_cc", "goldstein", "mentions", "url", "words"]


def tag_of(c):
    root, a1, a2 = c[28], c[7], c[17]
    if root in ("18", "19", "20"):
        return "war"
    if root == "17":
        return "sanction"
    if root in ("05", "06") and "USA" in (a1, a2) and c[25] == "1":
        return "us_deal"
    return ""


def slug(u):
    p = re.sub(r"\.(s?html?|php|aspx?)$", "", u.rstrip("/").split("/")[-1].split("?")[0])
    w = re.sub(r"[-_+]+", " ", p)
    return w if len(re.findall(r"[A-Za-z]{3,}", w)) >= 3 else ""


def batch(ts):
    url = f"http://data.gdeltproject.org/gdeltv2/{ts:%Y%m%d%H%M%S}.export.CSV.zip"
    for k in range(3):
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 404:
                return ts, None
            if r.status_code == 200:
                z = zipfile.ZipFile(io.BytesIO(r.content))
                txt = z.read(z.namelist()[0]).decode("utf-8", "replace")
                out = []
                for line in txt.splitlines():
                    c = line.split("\t")
                    if len(c) < 61:
                        continue
                    t = tag_of(c)
                    if t:
                        out.append((t, c))
                return ts, out
        except Exception:
            pass
        time.sleep(3 * (k + 1))
    return ts, "fail"


end = datetime.now(timezone.utc)
end = end.replace(minute=end.minute - end.minute % 15, second=0, microsecond=0) - timedelta(minutes=15)
slots = []
t = end - timedelta(days=DAYS)
t = t.replace(minute=t.minute - t.minute % 15, second=0, microsecond=0)
while t <= end:
    slots.append(t); t += timedelta(minutes=15)
first = {}
if os.path.exists(OUT):        # keep what earlier runs saved: a short run (GDELT_DAYS=3) just extends the file
    for r in csv.DictReader(gzip.open(OUT, "rt", encoding="utf-8")):
        first[r["url"]] = r
old = len(first)
missing = fails = 0
with ThreadPoolExecutor(8) as ex:
    for n, (ts, out) in enumerate(ex.map(batch, slots)):
        if out is None:
            missing += 1; continue
        if out == "fail":
            fails += 1; continue
        for tg, c in out:
            u = c[60].strip()
            if not u or u in first:
                continue
            added = datetime.strptime(c[59], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
            first[u] = {"added_utc": added.strftime("%Y-%m-%d %H:%M:%S"), "added_et": added.astimezone(ET).strftime("%Y-%m-%d %H:%M:%S"),
                        "tag": tg, "root": c[28], "code": c[26], "actor1_cc": c[7], "actor2_cc": c[17],
                        "goldstein": c[30], "mentions": c[31], "url": u, "words": slug(u)}
        if n % 500 == 0:
            print(ts.isoformat(), "urls", len(first), "missing", missing, "fails", fails, flush=True)
rows = sorted(first.values(), key=lambda r: r["added_utc"])
with gzip.open(OUT, "wt", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, COLS); w.writeheader(); w.writerows(rows)
from collections import Counter
print(f"{len(slots)} batches, {missing} not published, {fails} failed, {len(rows) - old} new, {len(rows)} URLs:", dict(Counter(r['tag'] for r in rows)))
print(f"file {os.path.getsize(OUT) / 1e6:.1f} MB")
if fails > len(slots) * 0.2:
    sys.exit("more than 20% of GDELT batches failed")
