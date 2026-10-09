#!/usr/bin/env bash
# OctoLite post-build: assemble the standalone server for self-hosted runs.
# On Vercel the platform runs `next build` itself with its own output mode,
# and .next/standalone does not exist — so this is a harmless no-op there.
set -e
if [ -d .next/standalone ]; then
  mkdir -p .next/standalone/.next
  cp -r .next/static .next/standalone/.next/
  [ -d public ] && cp -r public .next/standalone/
  echo "postbuild: standalone output assembled"
else
  echo "postbuild: no .next/standalone (Vercel build) — skipped"
fi
