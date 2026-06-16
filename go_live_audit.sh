#!/bin/bash

echo "==================================="
echo "   SMITHS GO-LIVE AUDIT"
echo "==================================="
echo

PASS=0
FAIL=0

check_pass() {
  echo "✅ $1"
  PASS=$((PASS+1))
}

check_fail() {
  echo "❌ $1"
  FAIL=$((FAIL+1))
}

echo "1. Checking package.json..."

if [ -f package.json ]; then
  check_pass "package.json found"
else
  check_fail "package.json missing"
fi

echo
echo "2. Checking build..."

npm run build >/tmp/smiths_build.log 2>&1

if [ $? -eq 0 ]; then
  check_pass "Build successful"
else
  check_fail "Build failed"
fi

echo
echo "3. Checking API routes..."

ROUTES=(
  app/api/health/route.js
  app/api/admin/manage/route.js
)

for route in "${ROUTES[@]}"
do
  if [ -f "$route" ]; then
    check_pass "$route"
  else
    check_fail "$route missing"
  fi
done

echo
echo "4. Checking env vars..."

VARS=(
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
)

for var in "${VARS[@]}"
do
  if grep -q "$var" .env.local 2>/dev/null; then
    check_pass "$var"
  else
    check_fail "$var missing"
  fi
done

echo
echo "5. Checking git status..."

if [ -z "$(git status --porcelain)" ]; then
  check_pass "Git clean"
else
  check_fail "Uncommitted files"
fi

echo
echo "6. Looking for secrets..."

SECRET_COUNT=$(grep -R \
  -E "(sk_live_|service_role|SUPABASE_SERVICE_ROLE_KEY=)" \
  . \
  --exclude-dir=node_modules \
  2>/dev/null | wc -l)

if [ "$SECRET_COUNT" -eq 0 ]; then
  check_pass "No obvious secrets committed"
else
  check_fail "$SECRET_COUNT possible secrets found"
fi

echo
echo "7. Production health check..."

HEALTH=$(curl -s https://smiths-dnxx.vercel.app/api/health)

if echo "$HEALTH" | grep -q healthy; then
  check_pass "Production health endpoint"
else
  check_fail "Production health endpoint"
fi

echo
echo "==================================="
echo "RESULTS"
echo "==================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo
  echo "🚀 READY FOR GO LIVE"
else
  echo
  echo "⚠️ ISSUES FOUND"
fi
