#!/bin/bash
# smoke-test.sh — live endpoint checks against production

BASE="https://truck-super-software.vercel.app"
PASS=0
FAIL=0

check() {
  local desc="$1"; local expected="$2"; local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "✅ $desc (got $actual)"
    PASS=$((PASS+1))
  else
    echo "❌ $desc — expected $expected, got $actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=================================================="
echo " Smoke Test — $BASE"
echo " $(date)"
echo "=================================================="
echo ""

echo "--- Public pages should load (200) ---"
check "Landing /"          200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/)"
check "Login page"         200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"
check "Signup page"        200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/signup)"
check "RTS deck"           200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/rts.html)"

echo ""
echo "--- Secured APIs should REJECT no-token requests (401) ---"
check "/api/me   no token"      401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/me)"
check "/api/revenue no token"   401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/revenue)"

echo ""
echo "--- Secured APIs should REJECT a garbage token (401) ---"
check "/api/me   bad token"     401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer garbage123' $BASE/api/me)"
check "/api/revenue bad token"  401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer garbage123' $BASE/api/revenue)"

echo ""
echo "=================================================="
echo " Passed: $PASS   Failed: $FAIL"
echo "=================================================="

echo ""
echo "--- Batch 1 routes should REJECT no-token (401) ---"
check "/api/expenses   no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/expenses)"
check "/api/factoring  no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/factoring)"
check "/api/tax        no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tax)"
check "/api/ifta       no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/ifta)"
check "/api/invoices   no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/invoices)"
check "/api/timesheets no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/timesheets)"
check "/api/scorecard  no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/scorecard)"

echo ""
echo "--- Batch 1 routes should REJECT no-token (401) ---"
check "/api/expenses   no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/expenses)"
check "/api/factoring  no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/factoring)"
check "/api/tax        no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tax)"
check "/api/ifta       no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/ifta)"
check "/api/invoices   no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/invoices)"
check "/api/timesheets no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/timesheets)"
check "/api/scorecard  no token"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/scorecard)"

echo ""
echo "--- Superadmin routes should REJECT no-token (401/403) ---"
check "/api/superadmin/companies no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/superadmin/companies)"
check "/api/superadmin/stats     no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/superadmin/stats)"

echo ""
echo "--- Admin auth GET should REJECT no-token (401) ---"
check "/api/admin/auth GET no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/admin/auth)"

echo ""
echo "--- Batch 4 operational routes should REJECT no-token (401) ---"
check "/api/drivers    no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/drivers)"
check "/api/tickets    no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tickets)"
check "/api/dispatch   no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/dispatch)"
check "/api/messages   no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/messages)"
check "/api/fuel       no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/fuel)"
check "/api/maintenance no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/maintenance)"
check "/api/locations  no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/locations)"
check "/api/tracking   no token" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tracking)"
