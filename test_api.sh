#!/bin/bash
BASE="https://smiths-dnxx.vercel.app"
PASS=0
FAIL=0

test_endpoint() {
  local label=$1
  local url=$2
  local method=${3:-GET}
  local body=$4

  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /tmp/api_resp.json -w "%{http_code}" "$url")
  else
    status=$(curl -s -o /tmp/api_resp.json -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" -d "$body" "$url")
  fi

  resp=$(cat /tmp/api_resp.json)

  if [ "$status" = "200" ]; then
    echo "✅ $label ($status)"
    PASS=$((PASS+1))
  else
    echo "❌ $label ($status)"
    echo "   Response: $(echo $resp | head -c 120)"
    FAIL=$((FAIL+1))
  fi
}

echo "=============================="
echo " API Live Tests"
echo "=============================="

echo ""
echo "--- GET ROUTES ---"
test_endpoint "GET /api/drivers"     "$BASE/api/drivers"
test_endpoint "GET /api/tickets"     "$BASE/api/tickets"
test_endpoint "GET /api/timesheets"  "$BASE/api/timesheets"
test_endpoint "GET /api/maintenance" "$BASE/api/maintenance"
test_endpoint "GET /api/messages"    "$BASE/api/messages"
test_endpoint "GET /api/compliance"  "$BASE/api/compliance"

echo ""
echo "--- DRIVER LOOKUP ---"
DRIVER_ID=$(curl -s "$BASE/api/drivers" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
if [ -n "$DRIVER_ID" ]; then
  echo "✅ Got driver ID: ${DRIVER_ID:0:8}..."
  test_endpoint "GET /api/drivers/[id]" "$BASE/api/drivers/$DRIVER_ID"
  test_endpoint "GET /api/tickets?driver_id" "$BASE/api/tickets?driver_id=$DRIVER_ID"
  test_endpoint "GET /api/compliance?driver_id" "$BASE/api/compliance?driver_id=$DRIVER_ID"
  PASS=$((PASS+1))
else
  echo "⚠️  No drivers in DB yet — skipping driver-specific tests"
fi

echo ""
echo "=============================="
echo " PASSED: $PASS | FAILED: $FAIL"
echo "=============================="
