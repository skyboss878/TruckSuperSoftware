#!/bin/bash
echo "======================================"
echo " Smith's Freight Hub — Full Audit"
echo " $(date)"
echo "======================================"

echo ""
echo "── ROUTES ──────────────────────────"
echo "Pages ($(find app -name 'page.js' | grep -v node_modules | wc -l)):"
find app -name 'page.js' | grep -v node_modules | sed 's|app||;s|/page.js||' | sort

echo ""
echo "API Routes ($(find app/api -name 'route.js' | grep -v node_modules | wc -l)):"
find app/api -name 'route.js' | grep -v node_modules | sed 's|app/api||;s|/route.js||' | sort

echo ""
echo "── BUILD ────────────────────────────"
npm run build 2>&1 | grep -E "✓|Error|Failed|warn" | grep -v node_modules | head -20

echo ""
echo "── ADMIN REPORT CARDS ───────────────"
grep "label:.*desc:.*path:" app/admin/page.js | sed "s/.*label: '//;s/'.*//" 

echo ""
echo "── DRIVER MENU ITEMS ────────────────"
grep "label:.*icon:.*path:" app/driver/page.js | sed "s/.*label: '//;s/'.*//"

echo ""
echo "── ADMIN TABS ───────────────────────"
grep "key:.*label:" app/admin/page.js | sed "s/.*label: '//;s/'.*//"

echo ""
echo "── SUPABASE TABLES REFERENCED ───────"
grep -rh "from('" app/api --include="*.js" | sed "s/.*from('//;s/').*//" | sort -u

echo ""
echo "── ENV VARS ─────────────────────────"
[ -f .env.local ] && grep -v "^#" .env.local | grep "=" | sed 's/=.*/=✓/' || echo "No .env.local"

echo ""
echo "── MISSING FEATURES CHECK ───────────"
checks=(
  "app/driver/hos/page.js:HOS Logger"
  "app/driver/fuel/page.js:Fuel Log"
  "app/admin/manage/page.js:Customer/Location Management"
  "app/admin/reports/ifta/page.js:IFTA Report"
  "app/admin/reports/earnings/page.js:Driver Earnings"
  "app/admin/dispatch/page.js:AI Dispatch Center"
  "app/admin/tracking/page.js:Live Fleet Map"
  "components/DriveTracker.js:GPS Drive Tracker"
  "public/manifest.json:PWA Manifest"
  "public/sw.js:Service Worker"
  "middleware.js:Route Middleware"
  "app/api/fuel/route.js:Fuel API"
  "app/api/customers/route.js:Customers API"
  "app/api/locations/route.js:Locations API"
  "app/api/dispatch/route.js:Dispatch API"
  "app/api/ifta/route.js:IFTA API"
)

for check in "${checks[@]}"; do
  file="${check%%:*}"
  name="${check##*:}"
  if [ -f "$file" ]; then
    echo "  ✅ $name"
  else
    echo "  ❌ $name — MISSING: $file"
  fi
done

echo ""
echo "── FILE SIZES (largest) ─────────────"
find app components -name "*.js" | xargs wc -l 2>/dev/null | sort -rn | head -12

echo ""
echo "── GIT STATUS ───────────────────────"
git status --short
git log --oneline -5

echo ""
echo "======================================"
echo " Done"
echo "======================================"
