#!/usr/bin/env python3
"""Assemble docs/research/PLACEMENT_AUDIT_DATA.md (team:data) from: work/data/audit/sectionBC.md (prose B+C), the per-shop table (shop_table.py) and the street tables (placement_audit.py)."""
import subprocess, sys
R = '/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad'
MAP = sys.argv[1] if len(sys.argv) > 1 else R + '/gk3/kifisia_map.json'
subprocess.run(['python3', R + '/tools/data/shop_table.py', MAP, R + '/work/data/audit/sectionD.md'], check=True)
head = ('# Placement audit — data pipeline and measured game (team:data)\n\nCompanion of docs/research/PLACEMENT_AUDIT.md (research-census). Section B: game vs OSM measured before/after; '
        'C: the placement rules now in build_map3.py; D: per-shop verification table (every business on the core streets, built or not); then street-by-street game order vs OSM order.\n')
bc = open(R + '/work/data/audit/sectionBC.md').read(); d = open(R + '/work/data/audit/sectionD.md').read()
t = open(R + '/work/data/audit/A2_map.md').read().replace('## AFTER v3.2 (map bays)', '## E. Street tables: game order next to OSM order (map v3.2)', 1)
open(R + '/docs/research/PLACEMENT_AUDIT_DATA.md', 'w').write(head + bc + '\n' + d + '\n' + t)
print('written')
