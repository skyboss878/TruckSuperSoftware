#!/bin/bash

echo "======================================"
echo " SMITHS FREIGHT HUB VALUATION REPORT"
echo "======================================"

echo
echo "── CODEBASE ─────────────────────────"
find . \
  -path ./node_modules -prune -o \
  -path ./.next -prune -o \
  -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -print | wc -l

echo
echo "── TOTAL LINES OF CODE ──────────────"
find . \
  -path ./node_modules -prune -o \
  -path ./.next -prune -o \
  -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec cat {} + 2>/dev/null | wc -l

echo
echo "── API ROUTES ───────────────────────"
find app/api -type f 2>/dev/null | sort

echo
echo "── APP PAGES ────────────────────────"
find app -name "page.*" 2>/dev/null | sort

echo
echo "── DATABASE TABLES REFERENCED ──────"
grep -Rho "from('[^']*'\|from(\"[^\"]*\"\|\\.from('[^']*'\|\\.from(\"[^\"]*\"" . \
  --exclude-dir=node_modules \
  --exclude-dir=.next 2>/dev/null \
  | sed -E "s/.*from\(['\"]([^'\"]+).*/\1/" \
  | sort -u

echo
echo "── SUPABASE USAGE ───────────────────"
grep -R "supabase" . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null | wc -l

echo
echo "── AUTHENTICATION ───────────────────"
grep -R "auth.getUser\|auth.getSession\|verifyAdmin" . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null | wc -l

echo
echo "── DEPLOYMENT ───────────────────────"
if [ -f package.json ]; then
  grep '"next"' package.json
fi

echo
echo "── BUILD STATUS ─────────────────────"
npm run build >/tmp/build.log 2>&1

if [ $? -eq 0 ]; then
  echo "BUILD: SUCCESS"
else
  echo "BUILD: FAILED"
fi

echo
echo "======================================"
