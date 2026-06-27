#!/bin/bash

BASE_URL="https://truckinsupersoftware.com"
PASS=0
FAIL=0
WARN=0
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✅ PASS${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}⚠️  WARN${NC} $1"; ((WARN++)); }
log_section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

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

check_body() {
  local url=$1 label=$2 expected=$3
  local body
  body=$(curl -s "$url" --max-time 10)
  if echo "$body" | grep -q "$expected"; then
    log_pass "$label"
  else
    log_fail "$label (got: ${body:0:80})"
  fi
}

check_post() {
  local url=$1 label=$2 data=$3 expected_status=$4 expected_body=$5
  local response status
  response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$data" --max-time 15)
  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  if [ "$status" = "$expected_status" ]; then
    if [ -n "$expected_body" ]; then
      if echo "$body" | grep -q "$expected_body"; then
        log_pass "$label ($status)"
      else
        log_warn "$label ($status but unexpected body: ${body:0:80})"
      fi
    else
      log_pass "$label ($status)"
    fi
  else
    log_fail "$label (expected $expected_status, got $status: ${body:0:80})"
  fi
}

echo "================================================"
echo "  TruckSuperSoftware E2E Test Suite"
echo "  $TIMESTAMP"
echo "================================================"

# ─── PAGES ───
log_section "PUBLIC PAGES"
check_status "$BASE_URL" "Landing page"
check_status "$BASE_URL/login" "Login page"
check_status "$BASE_URL/signup" "Signup page"
check_status "$BASE_URL/loadboard" "Load board page"
check_status "$BASE_URL/billing" "Billing page"
check_status "$BASE_URL/onboard/success" "Onboard success page"

log_section "PROTECTED PAGES (should redirect, not 404/500)"
check_status "$BASE_URL/admin" "Admin page loads"
check_status "$BASE_URL/admin/dispatch" "Dispatch page"
check_status "$BASE_URL/admin/drivers/new" "Add driver page"
check_status "$BASE_URL/admin/finance" "Finance page"
check_status "$BASE_URL/admin/messages" "Messages page"
check_status "$BASE_URL/admin/tracking" "Tracking page"
check_status "$BASE_URL/admin/cpm" "CPM page"
check_status "$BASE_URL/admin/ai" "AI page"
check_status "$BASE_URL/admin/compliance" "Compliance page"
check_status "$BASE_URL/admin/settings" "Settings page"
check_status "$BASE_URL/admin/reports/earnings" "Earnings report"
check_status "$BASE_URL/admin/reports/ifta" "IFTA report"
check_status "$BASE_URL/admin/reports/expenses" "Expenses report"
check_status "$BASE_URL/admin/reports/maintenance" "Maintenance report"
check_status "$BASE_URL/admin/reports/scorecard" "Scorecard report"
check_status "$BASE_URL/admin/reports/settlements" "Settlements report"
check_status "$BASE_URL/admin/reports/tickets" "Tickets report"
check_status "$BASE_URL/admin/reports/timesheets" "Timesheets report"
check_status "$BASE_URL/driver" "Driver dashboard"
check_status "$BASE_URL/driver/messages" "Driver messages"
check_status "$BASE_URL/driver/fuel" "Driver fuel"
check_status "$BASE_URL/driver/maintenance" "Driver maintenance"
check_status "$BASE_URL/driver/hos" "Driver HOS"
check_status "$BASE_URL/driver/compliance" "Driver compliance"
check_status "$BASE_URL/driver/pretrip" "Driver pre-trip"
check_status "$BASE_URL/driver/timesheet" "Driver timesheet"
check_status "$BASE_URL/driver/tracking" "Driver tracking"
check_status "$BASE_URL/driver/scan" "Driver scan"
check_status "$BASE_URL/driver/documents" "Driver documents"
check_status "$BASE_URL/driver/expenses" "Driver expenses"
check_status "$BASE_URL/superadmin" "Superadmin page"

# ─── HEALTH ───
log_section "HEALTH ENDPOINTS"
check_body "$BASE_URL/api/health" "Health API returns ok" "ok\|healthy\|true"
check_status "$BASE_URL/api/cron/health" "Cron health"

# ─── SIGNUP FLOW ───
log_section "SIGNUP FLOW"
# DOT verification (public)
check_status "$BASE_URL/api/verify-carrier?dot=123456" "DOT verify reachable"

# Carrier signup without data
check_post "$BASE_URL/api/carrier-signup" "Signup rejects missing fields" '{}' "400" "required\|error\|missing"

# Signup with invalid email
check_post "$BASE_URL/api/carrier-signup" "Signup rejects bad data" '{"company_name":"","email":""}' "400" ""

# ─── AUTH PROTECTION ───
log_section "API AUTH PROTECTION (unauthenticated)"
for route in drivers tickets messages maintenance timesheets expenses fuel ifta settings customers locations documents compliance dispatch loads invoices revenue scorecard tracking; do
  check_status "$BASE_URL/api/$route" "$route blocks unauth" "401"
done

# ─── POST AUTH PROTECTION ───
log_section "POST ENDPOINTS AUTH PROTECTION"
for route in drivers tickets messages maintenance expenses fuel; do
  check_post "$BASE_URL/api/$route" "POST $route blocks unauth" '{}' "401" ""
done

# ─── PUBLIC API ENDPOINTS ───
log_section "PUBLIC API ENDPOINTS"
check_status "$BASE_URL/api/health" "Health public"
check_status "$BASE_URL/api/verify-carrier?dot=123456" "Verify carrier accessible"

# ─── WEBHOOK ENDPOINTS ───
log_section "WEBHOOK ENDPOINTS"
STRIPE=$(curl -s -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" -d '{}' --max-time 10)
echo "$STRIPE" | grep -q "Invalid signature\|No signatures\|webhook" && \
  log_pass "Stripe webhook reachable" || log_fail "Stripe webhook: $STRIPE"

PAYPAL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/paypal/webhook" --max-time 10)
[ "$PAYPAL" != "500" ] && log_pass "PayPal webhook reachable ($PAYPAL)" || log_fail "PayPal webhook 500"

# ─── STRIPE CHECKOUT ───
log_section "STRIPE BILLING"
check_post "$BASE_URL/api/stripe/checkout" "Stripe checkout blocks unauth" '{"plan":"starter"}' "401" ""

# ─── DNS & SSL ───
log_section "DNS & SSL"
SSL=$(curl -s -o /dev/null -w "%{http_code}" "https://truckinsupersoftware.com" --max-time 10)
[ "$SSL" = "200" ] && log_pass "SSL certificate valid" || log_fail "SSL failed ($SSL)"

REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://truckinsupersoftware.com" --max-time 10 -L)
[ "$REDIRECT" = "200" ] && log_pass "HTTP redirects to HTTPS" || log_warn "HTTP redirect check ($REDIRECT)"

# ─── RESPONSE TIMES ───
log_section "RESPONSE TIMES"
for path in "" "/login" "/api/health"; do
  TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL$path" --max-time 10)
  MS=$(echo "$TIME * 1000" | bc 2>/dev/null | cut -d. -f1)
  if [ -n "$MS" ] && [ "$MS" -lt 3000 ]; then
    log_pass "$BASE_URL$path response time: ${MS}ms"
  else
    log_warn "$BASE_URL$path response time: ${TIME}s (slow)"
  fi
done

# ─── CODE AUDIT ───
log_section "CODE AUDIT"
cd /data/data/com.termux/files/home/TruckSuperSoftware

PLAIN_FETCH=$(grep -rn "await fetch('/api\|await fetch(\`/api" app --include="*.js" 2>/dev/null | \
  grep -v "authFetch\|node_modules\|signup/page\|carrier-signup\|verify-carrier" | wc -l)
[ "$PLAIN_FETCH" -eq 0 ] && log_pass "No unprotected fetch calls" || log_warn "$PLAIN_FETCH unprotected fetch calls"

HARDCODED=$(grep -rn "TWS\|Eagle Freight\|11111111-1111" app --include="*.js" 2>/dev/null | \
  grep -v node_modules | wc -l)
[ "$HARDCODED" -eq 0 ] && log_pass "No hardcoded company names" || log_warn "$HARDCODED hardcoded refs"

SECRETS=$(grep -rn "sk_live_[a-zA-Z0-9]\|whsec_[a-zA-Z0-9]" app --include="*.js" 2>/dev/null | \
  grep -v node_modules | wc -l)
[ "$SECRETS" -eq 0 ] && log_pass "No exposed secrets" || log_fail "$SECRETS exposed secrets!"

CONSOLE_LOG=$(grep -rn "console\.log" app --include="*.js" 2>/dev/null | \
  grep -v node_modules | wc -l)
[ "$CONSOLE_LOG" -lt 10 ] && log_pass "Minimal console.log ($CONSOLE_LOG)" || \
  log_warn "$CONSOLE_LOG console.log statements (clean up before go-live)"

# ─── SUMMARY ───
echo ""
echo "================================================"
echo "  RESULTS: ✅ $PASS passed | ❌ $FAIL failed | ⚠️  $WARN warnings"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

mkdir -p /data/data/com.termux/files/home/TruckSuperSoftware/logs
echo "$TIMESTAMP PASS=$PASS FAIL=$FAIL WARN=$WARN" >> \
  /data/data/com.termux/files/home/TruckSuperSoftware/logs/e2e.log

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
