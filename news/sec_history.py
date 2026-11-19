"""Research only (not used by the live bot): SEC EDGAR filings with exact acceptance times for every training-library ticker.
Runs in GitHub Actions (sec.gov is free, no key). Output news/sec_filings.csv:
ticker,cik,form,accepted_utc,accepted_et,filing_date,items,description,accession
8-K items: 1.01 deal, 2.02 results, 3.01 delisting notice, 3.02 unregistered sale, 5.02 officers, 7.01/8.01 press releases.
424B* = offering prospectus, S-1/S-3/F-1/F-3 = registration (dilution risk), 6-K = foreign issuer report."""
import csv, json, os, time, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import requests
HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "roger-alerts practice research github.com/idodoshnit-cmyk/roger-alerts", "Accept-Encoding": "gzip"}
SINCE = os.environ.get("SEC_SINCE", "2026-06-01")
ET = ZoneInfo("America/New_York")
tick = [t.strip() for t in open(os.path.join(HERE, "tickers.txt")) if t.strip()]
m = requests.get("https://www.sec.gov/files/company_tickers.json", headers=UA, timeout=30).json()
cik = {v["ticker"].upper(): int(v["cik_str"]) for v in m.values()}
rows, missing, fail = [], [], []
for i, t in enumerate(tick):
    c = cik.get(t.upper()) or cik.get(t.upper().replace(".", "-"))
    if not c:
        missing.append(t); continue
    for k in range(3):
        try:
            r = requests.get(f"https://data.sec.gov/submissions/CIK{c:010d}.json", headers=UA, timeout=20)
            if r.status_code == 200: break
        except Exception:
            r = None
        time.sleep(2 + 2 * k)
    time.sleep(0.15)          # SEC asks for at most 10 requests a second
    if r is None or r.status_code != 200:
        fail.append(t); continue
    f = r.json()["filings"]["recent"]
    for j in range(len(f["form"])):
        if f["filingDate"][j] < SINCE: continue
        acc = f["acceptanceDateTime"][j]          # e.g. 2026-11-18T16:05:12.000Z (UTC)
        ts = datetime.strptime(acc[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        rows.append({"ticker": t, "cik": c, "form": f["form"][j], "accepted_utc": ts.strftime("%Y-%m-%d %H:%M:%S"),
                     "accepted_et": ts.astimezone(ET).strftime("%Y-%m-%d %H:%M:%S"), "filing_date": f["filingDate"][j],
                     "items": f.get("items", [""] * len(f["form"]))[j], "description": f["primaryDocDescription"][j],
                     "accession": f["accessionNumber"][j]})
    if i % 100 == 0: print(i, t, len(rows), flush=True)
rows.sort(key=lambda r: (r["ticker"], r["accepted_utc"]))
with open(os.path.join(HERE, "sec_filings.csv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, list(rows[0])); w.writeheader(); w.writerows(rows)
print(f"{len(tick)} tickers, {len(rows)} filings since {SINCE}, no CIK: {len(missing)}, failed: {len(fail)}")
print("no CIK:", " ".join(missing[:80]))
