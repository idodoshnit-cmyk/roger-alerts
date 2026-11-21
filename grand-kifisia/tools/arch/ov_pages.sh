#!/bin/bash
# polite Openverse paging (research-arch): 15 s between requests
cd "$1"
for q in kifisia kifissia %CE%9A%CE%B7%CF%86%CE%B9%CF%83%CE%B9%CE%AC kefalari; do
 for p in 1 2 3 4 5 6 7 8 9 10 11 12; do
  f="p_${q:0:8}_$p.json"; [ -s "$f" ] && continue
  curl -s -m 60 -A "GrandKifisiaResearchBot/1.0 (non-commercial offline game research)" "https://api.openverse.org/v1/images/?q=$q&page_size=20&page=$p" -o "$f"
  n=$(python3 -c "import json;print(len(json.load(open('$f')).get('results',[])))" 2>/dev/null); echo "$q $p $n"
  [ "$n" = "0" -o -z "$n" ] && { rm -f "$f"; break; }
  sleep 15
 done
done
echo DONE
