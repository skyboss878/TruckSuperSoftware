#!/bin/bash

echo "======================================"
echo "   SMITHS ENTERPRISE GO-LIVE AUDIT"
echo "======================================"
echo

PASS=0
FAIL=0
WARN=0

pass() { echo "✅ $1"; PASS=$((PASS+1)); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "⚠️ $1"; WARN=$((WARN+1)); }

# =========================
# 1. PROJECT STRUCTURE
# =========================
echo "1. PROJECT STRUCTURE"

REQUIRED_PATHS=(
  "app/api/health/route.js"
  "app/api/admin/manage/route.js"
  "app"
  "package.json"
  "next.config.js"
)

for path in "${REQUIRED_PATHS[@]}"; do
  [ -e "$path" ] && pass "$path exists" || fail "$path missing"
done

echo

# =========================
# 2. BUILD VALIDATION
# =========================
echo "2. BUILD VALIDATION"

BUILD_LOG=$(npm run build 2>&1)
echo "$BUILD_LOG" > build.log

if echo "$BUILD_LOG" | grep -qi "error"; then
  fail "Build contains errors"
else
  pass "Build completed without fatal errors"
fi

echo

# =========================
# 3. GIT HEALTH
# =========================
echo "3. GIT HEALTH"

if [ -z "$(git status --porcelain)" ]; then
  pass "Working tree clean"
else
  warn "Uncommitted changes detected"
  git status --short
fi

if git branch --show-current | grep -q "main"; then
  pass "On main branch"
else
  warn "Not on main branch"
fi

echo

# =========================
# 4. ENVIRONMENT VALIDATION
# =========================
echo "4. ENVIRONMENT VARIABLES"

ENV_FILE=".env.local"

REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "$var" $ENV_FILE 2>/dev/null; then
    pass "$var present"
  else
    fail "$var missing"
  fi
done

echo

# =========================
# 5. SECURITY SCAN (SAFE)
# =========================
echo "5. SECURITY SCAN"

SECRET_PATTERNS=(
  "sk_live_"
  "service_role"
  "BEGIN PRIVATE KEY"
  "SUPABASE_SERVICE_ROLE_KEY="
)

MATCHES=$(grep -RIn --exclude-dir=node_modules \
  -E "${SECRET_PATTERNS[*]}" . 2>/dev/null | wc -l)

if [ "$MATCHES" -eq 0 ]; then
  pass "No obvious secrets detected"
else
  warn "$MATCHES potential sensitive matches found"
fi

echo

# =========================
# 6. API HEALTH CHECKS
# =========================
echo "6. API HEALTH CHECKS"

HEALTH=$(curl -s https://smiths-dnxx.vercel.app/api/health)

if echo "$HEALTH" | grep -q "healthy"; then
  pass "Production /api/health responding"
else
  fail "Production health endpoint failing"
fi

CRON=$(curl -s -o /dev/null -w "%{http_code}" https://smiths-dnxx.vercel.app/api/cron/health)

if [ "$CRON" = "200" ]; then
  pass "Cron health endpoint exists"
else
  warn "Cron health endpoint missing (expected if not implemented)"
fi

echo

# =========================
# 7. DATABASE / INTEGRATION CHECK
# =========================
echo "7. INTEGRATION CHECK"

if echo "$HEALTH" | grep -q '"drivers":"ok"'; then
  pass "Database tables responding"
else
  fail "Database health signals missing"
fi

echo

# =========================
# FINAL REPORT
# =========================
echo "======================================"
echo "RESULT SUMMARY"
echo "======================================"
echo "Passed: $PASS"
echo "Warnings: $WARN"
echo "Failed: $FAIL"
echo "======================================"

if [ "$FAIL" -eq 0 ]; then
  echo "🚀 STATUS: READY FOR PRODUCTION"
elif [ "$FAIL" -le 2 ]; then
  echo "⚠️ STATUS: MOSTLY READY (minor fixes needed)"
else
  echo "⛔ STATUS: NOT READY FOR GO-LIVE"
fi

