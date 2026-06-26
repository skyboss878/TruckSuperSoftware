#!/bin/bash

BASE_URL="https://truckinsupersoftware.com"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
PASS=0
FAIL=0
WARN=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✅ PASS${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}⚠️  WARN${NC} $1"; ((WARN++)); }

check_status() {
  local url=$1 label=$2 expected=${3:-200}
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
  if [ "$status" = "$expected" ]; then
    log_pass "$label ($status)"
  else
    log_fail "$label (expected $expected, got $status)"
  fi
}

echo "================================================"
echo "  TruckSuperSoftware Health Check"
echo "  $TIMESTAMP"
echo "================================================"
echo ""

echo "--- SITE AVAILABILITY ---"
check_status "$BASE_URL" "Homepage"
check_status "$BASE_URL/login" "Login page"
check_status "$BASE_URL/signup" "Signup page"

echo ""
echo "--- API HEALTH ---"
HEALTH=$(curl -s "$BASE_URL/api/health" --max-time 10)
if echo "$HEALTH" | grep -q "ok\|healthy\|true"; then
  log_pass "Health API"
else
  log_fail "Health API: $HEALTH"
fi

echo ""
echo "--- AUTH PROTECTION ---"
for route in customers drivers tickets messages maintenance timesheets expenses fuel ifta settings; do
  check_status "$BASE_URL/api/$route" "$route requires auth" "401"
done

echo ""
echo "--- PUBLIC ROUTES ---"
check_status "$BASE_URL/api/health" "health public"
check_status "$BASE_URL/api/cron/health" "cron/health public"

echo ""
echo "--- STRIPE WEBHOOK ---"
STRIPE=$(curl -s -X POST "$BASE_URL/api/stripe/webhook" -H "Content-Type: application/json" -d "{}" --max-time 10)
if echo "$STRIPE" | grep -q "Invalid signature\|No signatures"; then
  log_pass "Stripe webhook reachable (signature check working)"
else
  log_fail "Stripe webhook unexpected: $STRIPE"
fi

echo ""
echo "--- DNS & SSL ---"
check_status "https://truckinsupersoftware.com" "SSL valid"

echo ""
echo "--- CODE AUDIT ---"
cd /data/data/com.termux/files/home/TruckSuperSoftware

PLAIN_FETCH=$(grep -rn "await fetch('/api\|await fetch(\`/api" app --include="*.js" 2>/dev/null | grep -v "authFetch\|node_modules\|signup\|carrier-signup\|verify-carrier" | wc -l)
if [ "$PLAIN_FETCH" -eq 0 ]; then
  log_pass "No unprotected fetch calls"
else
  log_warn "$PLAIN_FETCH unprotected fetch calls found"
fi

HARDCODED=$(grep -rn "TWS\|Eagle Freight\|eaglefreight\|11111111-1111" app --include="*.js" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$HARDCODED" -eq 0 ]; then
  log_pass "No hardcoded company names"
else
  log_warn "$HARDCODED hardcoded company references"
fi

SECRETS=$(grep -rn "sk_live_[a-zA-Z0-9]\|whsec_[a-zA-Z0-9]" app --include="*.js" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$SECRETS" -eq 0 ]; then
  log_pass "No exposed secrets in code"
else
  log_fail "$SECRETS exposed secrets found!"
fi

NO_AUTH=$(grep -rL "getAuthContext\|verifyAdmin\|requireSuperAdmin" app/api/*/route.js app/api/*/*/route.js 2>/dev/null | grep -v "health\|push\|carrier-signup\|verify-carrier\|stripe\|paypal\|cron" | wc -l)
if [ "$NO_AUTH" -eq 0 ]; then
  log_pass "All sensitive API routes protected"
else
  log_warn "$NO_AUTH routes may lack auth"
fi

echo ""
echo "================================================"
echo "  RESULTS: ✅ $PASS passed | ❌ $FAIL failed | ⚠️  $WARN warnings"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

mkdir -p /data/data/com.termux/files/home/TruckSuperSoftware/logs
echo "$TIMESTAMP PASS=$PASS FAIL=$FAIL WARN=$WARN" >> /data/data/com.termux/files/home/TruckSuperSoftware/logs/health.log

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
