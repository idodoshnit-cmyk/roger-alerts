#!/bin/bash
# run.sh prefix views.json [main] — retries when no browser slot is free; log in work/lm-starbucks/run_<prefix>.log
R=/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad; cd $R
P=$1; V=$2; L=work/lm-starbucks/run_$P.log
export GK_SHOTS=$R/work/lm-starbucks/shots
[ "$3" = main ] || export GK_DIR=$R/work/lm-starbucks/gk3
export EVAL='(()=>{const pts=[[163,70],[160,66.5],[165,71.5],[161.5,60]];return {lm:LM.built,g:pts.map(p=>[p,+terr(p[0],p[1]).toFixed(2),+groundY(p[0],p[1]).toFixed(2),typeof lvl==="function"?+lvl(p[0],p[1]).toFixed(2):null]),court:window.LM_STARBUCKS&&LM_STARBUCKS.court&&LM_STARBUCKS.court.y,yF:window.LM_STARBUCKS&&LM_STARBUCKS.F&&LM_STARBUCKS.F.yF,trees:(MAP.garden_trees||[]).filter(a=>Math.abs(a[0]/10-162)<14&&Math.abs(a[1]/10-64)<12).map(a=>[a[0]/10,a[1]/10,a[2]])}})()'
for i in 1 2 3 4; do timeout 3000 node tools/lm/starbucks/shot.js $P $V > $L 2>&1; grep -q "no free browser slot" $L || break; done
tail -40 $L
