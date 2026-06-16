#!/bin/bash

echo "============================================"
echo "   TWS FLEET COMMAND — ENTERPRISE AUDIT"
echo "============================================"
echo

PASS=0
FAIL=0
WARN=0
SCORE=0

pass() { echo "✅ $1"; PASS=$((PASS+1)); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "⚠️  $1"; WARN=$((WARN+1)); }

# =========================
# 1. PROJECT STRUCTURE
# =========================
echo "── 1. PROJECT STRUCTURE ──────────────────"
REQUIRED=(
  "app/api/health/route.js"
  "app/api/admin/auth/route.js"
  "app/api/admin/manage/route.js"
  "app/api/cron/health/route.js"
  "lib/rate-limit.js"
  "lib/use-session-timeout.js"
  "lib/supabase-admin.js"
  "lib/admin-auth.js"
  ".github/workflows/production-gate.yml"
  "public/manifest.json"
)
for path in "${REQUIRED[@]}"; do
  [ -e "$path" ] && pass "$path" || fail "MISSING: $path"
done
echo

# =========================
# 2. BUILD VALIDATION
# =========================
echo "── 2. BUILD VALIDATION ───────────────────"
BUILD_LOG=$(npm run build 2>&1)
if echo "$BUILD_LOG" | grep -qi "Build failed\|SyntaxError\|Module not found\|Export encountered"; then
  fail "Build has fatal errors"
else
  pass "Build completed successfully"
  SCORE=$((SCORE+25))
fi
echo

# =========================
# 3. GIT HEALTH
# =========================
echo "── 3. GIT HEALTH ─────────────────────────"
if [ -z "$(git status --porcelain)" ]; then
  pass "Working tree clean"
  SCORE=$((SCORE+10))
else
  warn "Uncommitted changes:"
  git status --short
fi
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] && pass "On main branch" || warn "On branch: $BRANCH"
COMMITS=$(git rev-list --count HEAD)
pass "$COMMITS total commits"
echo

# =========================
# 4. ENVIRONMENT VARIABLES
# =========================
echo "── 4. ENVIRONMENT VARIABLES ──────────────"
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "JWT_SECRET"
  "ANTHROPIC_API_KEY"
)
ENV_PASS=true
for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^${var}=" .env.local 2>/dev/null; then
    pass "$var"
  else
    fail "$var missing from .env.local"
    ENV_PASS=false
  fi
done
[ "$ENV_PASS" = true ] && SCORE=$((SCORE+15))
echo

# =========================
# 5. SECURITY SCAN
# =========================
echo "── 5. SECURITY SCAN ──────────────────────"
LEAKS=$(grep -rn "service_role_key\s*=\s*['\"]ey" app/ lib/ --include="*.js" 2>/dev/null | wc -l)
if [ "$LEAKS" -eq 0 ]; then
  pass "No hardcoded secrets in source"
  SCORE=$((SCORE+15))
else
  fail "$LEAKS hardcoded secret(s) found in source files!"
fi
# Check rate limiting exists
grep -q "rateLimit" app/api/admin/auth/route.js 2>/dev/null && \
  pass "Rate limiting on admin auth" || fail "Rate limiting missing on admin auth"
# Check RLS mention
grep -q "service_role" lib/supabase-admin.js 2>/dev/null && \
  pass "Service role client configured" || warn "Check supabase-admin.js"
echo

# =========================
# 6. API HEALTH CHECKS
# =========================
echo "── 6. LIVE API CHECKS ────────────────────"
HEALTH=$(curl -s --max-time 10 https://smiths-dnxx.vercel.app/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
  pass "Production /api/health → healthy"
  SCORE=$((SCORE+20))
else
  fail "Production health endpoint not responding"
fi
CRON=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://smiths-dnxx.vercel.app/api/cron/health)
[ "$CRON" = "200" ] && pass "Cron health → 200 OK" || fail "Cron health → $CRON"

LANDING=$(curl -s --max-time 10 https://smiths-dnxx.vercel.app)
echo "$LANDING" | grep -q "TWS Fleet Command" && pass "Landing page → TWS Fleet Command" || fail "Landing page branding wrong"
echo "$LANDING" | grep -qi "smith" && warn "Old branding still found" || pass "No old branding detected"
echo

# =========================
# 7. DATABASE CHECKS
# =========================
echo "── 7. DATABASE INTEGRATION ───────────────"
TABLES=("drivers" "tickets" "messages" "maintenance" "timesheets" "admins" "fuel_logs" "pre_trip_inspections")
DB_PASS=true
for table in "${TABLES[@]}"; do
  echo "$HEALTH" | grep -q "\"$table\":\"ok\"" && pass "Table: $table" || { fail "Table: $table not ok"; DB_PASS=false; }
done
[ "$DB_PASS" = true ] && SCORE=$((SCORE+15))
echo

# =========================
# 8. FEATURE FLAGS
# =========================
echo "── 8. FEATURE VERIFICATION ───────────────"
grep -q "useSessionTimeout" app/admin/page.js 2>/dev/null && pass "Session timeout active" || warn "Session timeout not found in admin"
grep -q "rateLimit" app/api/admin/auth/route.js 2>/dev/null && pass "Auth rate limiting active" || warn "Auth rate limiting not found"
grep -q "exportCSV\|downloadCSV" app/admin/reports/settlements/page.js 2>/dev/null && pass "CSV export present" || warn "CSV export missing"
grep -q "TWS Fleet Command" app/layout.js 2>/dev/null && pass "Rebrand complete in layout" || fail "Layout still has old branding"
[ -f "app/error.js" ] && pass "Error boundary exists" || warn "No error boundary"
[ -f "app/not-found.js" ] && pass "Custom 404 exists" || warn "No custom 404"
echo

# =========================
# FINAL REPORT
# =========================
echo "============================================"
echo "  FINAL REPORT"
echo "============================================"
printf "  ✅ Passed:    %d\n" $PASS
printf "  ⚠️  Warnings:  %d\n" $WARN
printf "  ❌ Failed:    %d\n" $FAIL
echo
echo "  PRODUCTION SCORE: $SCORE / 100"
echo

if [ "$SCORE" -ge 90 ] && [ "$FAIL" -eq 0 ]; then
  echo "  🚀 STATUS: ENTERPRISE READY"
elif [ "$FAIL" -eq 0 ]; then
  echo "  ✅ STATUS: PRODUCTION READY"
elif [ "$FAIL" -le 2 ]; then
  echo "  ⚠️  STATUS: MOSTLY READY (fix failures above)"
else
  echo "  ⛔ STATUS: NOT READY"
fi
echo "============================================"
