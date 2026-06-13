#!/bin/bash
BASE="https://smiths-dnxx.vercel.app"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="$4"
  
  if [ "$method" = "GET" ]; then
    res=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  else
    res=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" "$url")
  fi
  
  if [ "$res" = "200" ] || [ "$res" = "201" ]; then
    echo "  ✅ $name ($res)"
    PASS=$((PASS+1))
  elif [ "$res" = "307" ] || [ "$res" = "302" ]; then
    echo "  ✅ $name ($res - auth redirect, expected)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name ($res)"
    FAIL=$((FAIL+1))
  fi
}

echo "======================================"
echo " API Test Suite — smiths-dnxx"
echo "======================================"

echo ""
echo "── GET ROUTES ───────────────────────"
check "GET /api/drivers" "$BASE/api/drivers"
check "GET /api/tickets" "$BASE/api/tickets"
check "GET /api/timesheets" "$BASE/api/timesheets"
check "GET /api/maintenance" "$BASE/api/maintenance"
check "GET /api/messages" "$BASE/api/messages"
check "GET /api/compliance" "$BASE/api/compliance"
check "GET /api/customers" "$BASE/api/customers"
check "GET /api/locations" "$BASE/api/locations"
check "GET /api/tracking" "$BASE/api/tracking"
check "GET /api/fuel" "$BASE/api/fuel"

echo ""
echo "── POST ROUTES ──────────────────────"
check "POST /api/assistant" "$BASE/api/assistant" "POST" \
  '{"messages":[{"role":"user","content":"hi"}],"role":"admin"}'

check "POST /api/dispatch" "$BASE/api/dispatch" "POST" \
  '{"action":"morning_briefing"}'

echo ""
echo "── PAGES ────────────────────────────"
check "GET /login" "$BASE/login"
check "GET /admin" "$BASE/admin"
check "GET /driver" "$BASE/driver"
check "GET /admin/manage" "$BASE/admin/manage"
check "GET /admin/compliance" "$BASE/admin/compliance"
check "GET /admin/messages" "$BASE/admin/messages"
check "GET /admin/tracking" "$BASE/admin/tracking"
check "GET /admin/dispatch" "$BASE/admin/dispatch"
check "GET /admin/reports/ifta" "$BASE/admin/reports/ifta"
check "GET /admin/reports/earnings" "$BASE/admin/reports/earnings"
check "GET /driver/hos" "$BASE/driver/hos"
check "GET /driver/fuel" "$BASE/driver/fuel"
check "GET /driver/maintenance" "$BASE/driver/maintenance"
check "GET /driver/messages" "$BASE/driver/messages"

echo ""
echo "── AI ASSISTANT ─────────────────────"
reply=$(curl -s -X POST "$BASE/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"how many active drivers"}],"role":"admin"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reply','ERROR')[:80])" 2>/dev/null)
echo "  AI Reply: $reply"

echo ""
echo "======================================"
echo " PASSED: $PASS | FAILED: $FAIL"
echo "======================================"
