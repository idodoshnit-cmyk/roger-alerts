#!/bin/bash
# probe vrisko.gr category slugs for Kifisia (robots.txt allows /dir/); 2 s between requests
OUT=$1; shift
for s in "$@"; do
  code=$(curl -s -o /tmp/vrp.html -w "%{http_code}" -m 25 -A "Mozilla/5.0" "https://www.vrisko.gr/dir/$s/kifisia/")
  n=$(grep -o 'mainCountResultsTitle"> : [0-9]* ' /tmp/vrp.html | grep -o '[0-9]*' | head -1)
  t=$(grep -o 'mainCountTitle"[^>]*>[^<]*' /tmp/vrp.html | sed 's/.*>//' | head -1)
  echo "$s $code ${n:-0} $t" | tee -a $OUT
  sleep 2
done
