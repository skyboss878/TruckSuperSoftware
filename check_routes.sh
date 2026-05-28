#!/bin/bash
echo "=============================="
echo " Smith's Freight Hub - Check"
echo "=============================="

PASS=0
FAIL=0

check() {
  local label=$1
  local path=$2
  if [ -f "$path" ]; then
    echo "✅ $label"
    PASS=$((PASS+1))
  else
    echo "❌ MISSING: $label => $path"
    FAIL=$((FAIL+1))
  fi
}

grep_check() {
  local label=$1
  local file=$2
  local pattern=$3
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "✅ $label"
    PASS=$((PASS+1))
  else
    echo "❌ NOT FOUND: $label in $file"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "--- API ROUTES ---"
check "Tickets API"     "app/api/tickets/route.js"
check "Drivers API"     "app/api/drivers/route.js"
check "Driver by ID"    "app/api/drivers/[id]/route.js"
check "Timesheets API"  "app/api/timesheets/route.js"
check "Maintenance API" "app/api/maintenance/route.js"
check "Messages API"    "app/api/messages/route.js"
check "Compliance API"  "app/api/compliance/route.js"

echo ""
echo "--- ADMIN PAGES ---"
check "Admin Dashboard"    "app/admin/page.js"
check "Admin Messages"     "app/admin/messages/page.js"
check "Admin Compliance"   "app/admin/compliance/page.js"
check "Admin Driver Detail" "app/admin/drivers/[id]/page.js"
check "Admin New Driver"   "app/admin/drivers/new/page.js"

echo ""
echo "--- DRIVER PAGES ---"
check "Driver Dashboard"   "app/driver/page.js"
check "Driver Messages"    "app/driver/messages/page.js"
check "Driver Compliance"  "app/driver/compliance/page.js"
check "Driver New Ticket"  "app/driver/ticket/new/page.js"

echo ""
echo "--- API WIRING (no raw supabase inserts) ---"
grep_check "Tickets use API"     "app/driver/ticket/new/page.js" "fetch('/api/tickets'"
grep_check "Admin loads tickets via API"  "app/admin/page.js"   "fetch('/api/tickets')"
grep_check "Admin loads timesheets via API" "app/admin/page.js" "fetch('/api/timesheets')"
grep_check "Admin loads maintenance via API" "app/admin/page.js" "fetch('/api/maintenance')"
grep_check "Driver detail uses API"  "app/admin/drivers/[id]/page.js" "fetch(\`/api/drivers"
grep_check "Messages POST uses API"  "app/admin/messages/page.js"     "fetch('/api/messages'"
grep_check "Driver creation uses API" "app/admin/drivers/new/page.js"  "fetch('/api/drivers'"

echo ""
echo "--- SUPABASE ADMIN ---"
check "supabase-admin lib" "lib/supabase-admin.js"

echo ""
echo "=============================="
echo " PASSED: $PASS | FAILED: $FAIL"
echo "=============================="
