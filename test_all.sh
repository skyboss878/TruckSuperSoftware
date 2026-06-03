#!/bin/bash
BASE="https://smiths-dnxx.vercel.app"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  local expect="$3"
  if echo "$result" | grep -q "$expect"; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name"
    echo "     Got: $(echo $result | head -c 120)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "══════════════════════════════════════"
echo "  Smith's Freight Hub — API Test Suite"
echo "══════════════════════════════════════"

echo ""
echo "── DRIVERS ─────────────────────────"
R=$(curl -s "$BASE/api/drivers")
check "GET /api/drivers" "$R" "name"

echo ""
echo "── TICKETS ──────────────────────────"
R=$(curl -s "$BASE/api/tickets")
check "GET /api/tickets" "$R" "id\|status\|\[\]"

echo ""
echo "── TRACKING ─────────────────────────"
R=$(curl -s "$BASE/api/tracking")
check "GET /api/tracking" "$R" "\[\|status\|id"

echo ""
echo "── CUSTOMERS ────────────────────────"
R=$(curl -s "$BASE/api/customers")
check "GET /api/customers" "$R" "name\|id\|\[\]"

echo ""
echo "── LOCATIONS ────────────────────────"
R=$(curl -s "$BASE/api/locations")
check "GET /api/locations" "$R" "name\|id\|\[\]"

echo ""
echo "── MAINTENANCE ──────────────────────"
R=$(curl -s "$BASE/api/maintenance")
check "GET /api/maintenance" "$R" "id\|status\|\[\]"

echo ""
echo "── TIMESHEETS ───────────────────────"
R=$(curl -s "$BASE/api/timesheets")
check "GET /api/timesheets" "$R" "id\|date\|\[\]"

echo ""
echo "── COMPLIANCE ───────────────────────"
R=$(curl -s "$BASE/api/compliance")
check "GET /api/compliance" "$R" "id\|record_type\|\[\]"

echo ""
echo "── MESSAGES ─────────────────────────"
R=$(curl -s "$BASE/api/messages")
check "GET /api/messages" "$R" "id\|content\|\[\]"

echo ""
echo "── IFTA ─────────────────────────────"
R=$(curl -s "$BASE/api/ifta?quarter=2&year=2026")
check "GET /api/ifta" "$R" "quarter\|states\|summary"

echo ""
echo "── SCORECARD ────────────────────────"
R=$(curl -s "$BASE/api/scorecard?days=30")
check "GET /api/scorecard" "$R" "driver\|safety\|\[\]"

echo ""
echo "── PRE-TRIP ─────────────────────────"
R=$(curl -s "$BASE/api/pre-trip?admin=true")
check "GET /api/pre-trip (admin)" "$R" "drivers\|date"

echo ""
echo "── FUEL ─────────────────────────────"
R=$(curl -s "$BASE/api/fuel")
check "GET /api/fuel" "$R" "fuel_logs\|\[\]"

echo ""
echo "── PUSH ─────────────────────────────"
R=$(curl -s -X PUT "$BASE/api/push" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"API test","url":"/driver"}')
check "PUT /api/push" "$R" "sent"

echo ""
echo "── AI ASSISTANT ─────────────────────"
R=$(curl -s -X POST "$BASE/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"how many active drivers"}],"role":"admin"}')
check "POST /api/assistant" "$R" "reply\|driver"

echo ""
echo "══════════════════════════════════════"
echo "  Results: $PASS passed · $FAIL failed"
echo "══════════════════════════════════════"
echo ""
