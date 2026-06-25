#!/bin/bash
BASE="https://truck-super-software.vercel.app"
PASS=0
FAIL=0

check() {
  local desc="$1"; local expected="$2"; local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "✅ $desc"
    PASS=$((PASS+1))
  else
    echo "❌ $desc — expected $expected, got $actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=================================================="
echo " Pre-Launch Check — $BASE"
echo " $(date)"
echo "=================================================="

echo ""
echo "--- Public pages ---"
check "Landing page"     200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/)"
check "Login page"       200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"
check "Signup page"      200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/signup)"
check "Billing page"     200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/billing)"
check "RTS deck"         200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/rts.html)"
check "Load board"       200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/loadboard)"

echo ""
echo "--- Landing page copy ---"
LANDING=$(curl -s $BASE/)
if echo "$LANDING" | grep -q "No card required"; then
  echo "❌ Landing page still says 'No card required' — fix before launch"
  FAIL=$((FAIL+1))
else
  echo "✅ Landing page copy is correct"
  PASS=$((PASS+1))
fi

echo ""
echo "--- Auth routes reject no-token ---"
check "/api/me"                    401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/me)"
check "/api/revenue"               401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/revenue)"
check "/api/expenses"              401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/expenses)"
check "/api/factoring"             401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/factoring)"
check "/api/tax"                   401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tax)"
check "/api/invoices"              401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/invoices)"
check "/api/timesheets"            401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/timesheets)"
check "/api/scorecard"             401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/scorecard)"
check "/api/drivers"               401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/drivers)"
check "/api/tickets"               401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tickets)"
check "/api/dispatch"              401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/dispatch)"
check "/api/messages"              401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/messages)"
check "/api/fuel"                  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/fuel)"
check "/api/maintenance"           401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/maintenance)"
check "/api/locations"             401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/locations)"
check "/api/tracking"              401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tracking)"
check "/api/superadmin/companies"  401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/superadmin/companies)"
check "/api/superadmin/stats"      401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/superadmin/stats)"
check "/api/admin/auth GET"        401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/admin/auth)"

echo ""
echo "--- Stripe endpoints exist ---"
check "/api/stripe/checkout" 401 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/stripe/checkout)"
check "/api/stripe/webhook"  401 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/stripe/webhook)"

echo ""
echo "--- Health check ---"
check "/api/health" 200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/health)"

echo ""
echo "=================================================="
echo " Passed: $PASS   Failed: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo " 🚀 ALL SYSTEMS GO — READY TO LAUNCH"
else
  echo " ⚠️  $FAIL issue(s) need attention before launch"
fi
echo "=================================================="
