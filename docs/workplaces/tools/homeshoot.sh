#!/bin/sh
# Shoot household pieces in the lab house: sh homeshoot.sh <outDir> <piece name> [...] (run beside review.mjs).
out=$1; shift
for p in "$@"; do node review.mjs home --out "$out/$p" --piece "$p" --auto 6 2>&1 | cut -c1-150 | tail -n 8; done
