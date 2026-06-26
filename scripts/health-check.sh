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

echo "================================================"
echo "  TruckSuperSoftware Health Check"
echo "  $TIMESTAMP"
echo "================================================"
echo ""

echo "--- SITE AVAILABILITY ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" --max-time 10)
[ "$STATUS" = "200" ] && log_pass "Homepage ($STATUS)" || log_fail "Homepage ($STATUS)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login" --max-time 10)
[ "$STATUS" = "200" ] && log_pass "Login page ($STATUS)" || log_fail "Login page ($STATUS)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/signup" --max-time 10)
[ "$STATUS" = "200" ] && log_pass "Signup page ($STATUS)" || log_fail "Signup page ($STATUS)"

echo ""
echo "--- API HEALTH ---"
HEALTH=$(curl -s "$BASE_URL/api/health" --max-time 10)
echo "$HEALTH" | grep -q "ok\|healthy\|true" && log_pass "Health API" || log_fail "Health API: $HEALTH"

echo ""
echo "--- AUTH PROTECTION ---"
# These should return 401
for route in customers drivers tickets messages maintenance timesheets expenses fuel ifta settings; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/$route" --max-time 10)
  [ "$STATUS" = "401" ] && log_pass "$route requires auth (401)" || log_warn "$route returned $STATUS (expected 401)"
done

echo ""
echo "--- PUBLIC ROUTES (no auth needed) ---"
for route in health cron/health; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/$route" --max-time 10)
  [ "$STATUS" = "200" ] && log_pass "$route public ($STATUS)" || log_warn "$route returned $STATUS"
done

echo ""
echo "--- STRIPE WEBHOOK REACHABLE ---"
STRIPE=$(curl -s -X POST "$BASE_URL/api/stripe/webhook" -H "Content-Type: application/json" -d "{}" --max-time 10)
echo "$STRIPE" | grep -q "Invalid signature\|No signatures" && log_pass "Stripe webhook reachable (signature check working)" || log_fail "Stripe webhook unexpected: $STRIPE"

echo ""
echo "--- DNS & SSL ---"
SSL=$(curl -s -o /dev/null -w "%{http_code}" "https://truckinsupersoftware.com" --max-time 10)
[ "$SSL" = "200" ] && log_pass "SSL valid" || log_fail "SSL check failed ($SSL)"

echo ""
echo "--- CODE AUDIT ---"
cd /data/data/com.termux/files/home/TruckSuperSoftware

# Check for plain fetch in pages
PLAIN_FETCH=$(grep -rn "await fetch('/api\|await fetch(\`/api" app --include="*.js" 2>/dev/null | grep -v "authFetch\|node_modules" | wc -l)
[ "$PLAIN_FETCH" -eq 0 ] && log_pass "No unprotected fetch calls" || log_warn "$PLAIN_FETCH unprotected fetch calls found"

# Check for hardcoded company names
HARDCODED=$(grep -rn "TWS\|Eagle Freight\|eaglefreight\|11111111-1111" app --include="*.js" 2>/dev/null | grep -v node_modules | wc -l)
[ "$HARDCODED" -eq 0 ] && log_pass "No hardcoded company names" || log_warn "$HARDCODED hardcoded company references"

# Check for exposed secrets
SECRETS=$(grep -rn "sk_live_[a-zA-Z0-9]\|re_[a-zA-Z0-9]\{20\}\|whsec_[a-zA-Z0-9]" app --include="*.js" 2>/dev/null | grep -v node_modules | wc -l)
[ "$SECRETS" -eq 0 ] && log_pass "No exposed secrets in code" || log_fail "$SECRETS exposed secrets found!"

# Check routes without auth
NO_AUTH=$(grep -rL "getAuthContext\|verifyAdmin\|requireSuperAdmin\|No auth needed" app/api/*/route.js app/api/*/*/route.js 2>/dev/null | grep -v "health\|push\|carrier-signup\|verify-carrier\|stripe\|paypal\|cron" | wc -l)
[ "$NO_AUTH" -eq 0 ] && log_pass "All sensitive API routes protected" || log_warn "$NO_AUTH routes may lack auth"

echo ""
echo "================================================"
echo "  RESULTS: ✅ $PASS passed | ❌ $FAIL failed | ⚠️  $WARN warnings"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# Save log
LOG_FILE="/data/data/com.termux/files/home/TruckSuperSoftware/logs/health-$(date '+%Y%m%d-%H%M').log"
mkdir -p /data/data/com.termux/files/home/TruckSuperSoftware/logs
echo "PASS=$PASS FAIL=$FAIL WARN=$WARN" >> "$LOG_FILE"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
