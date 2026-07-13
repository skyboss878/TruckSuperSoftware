#!/bin/bash
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "======================================"
echo " TruckSuperSoftware — Health Check"
echo " $(date)"
echo "======================================"

echo -e "\n── SECURITY ──────────────────────────"
if git log --all --full-history -- .env.vercel 2>/dev/null | grep -q .; then
  fail ".env.vercel still in git history — filter-repo scrub NOT done. Keys need rotation."
else
  pass "No .env.vercel found in git history"
fi

if [ -f .env.vercel ] || [ -f .env ]; then
  fail "Env file present in working directory — check it's in .gitignore"
fi

if grep -q "^\.env" .gitignore 2>/dev/null; then
  pass ".env* is gitignored"
else
  warn ".env* not found in .gitignore — add it"
fi

if find . -path ./node_modules -prune -o -iname "debug.js" -print | grep -q .; then
  fail "debug.js file(s) found — check they don't expose internal IDs publicly"
fi

echo -e "\n── LEFTOVER PAYPAL REFS ──────────────"
PP=$(grep -rl "paypal\|PayPal\|PAYPAL" app/ --include="*.js" 2>/dev/null | wc -l)
if [ "$PP" -gt 0 ]; then
  warn "$PP file(s) still reference PayPal — you said you don't use it anymore"
  grep -rl "paypal\|PayPal\|PAYPAL" app/ --include="*.js" 2>/dev/null
else
  pass "No PayPal references found"
fi

echo -e "\n── AUTH CONFIG ───────────────────────"
if grep -q "detectSessionInUrl: true" lib/supabase.js 2>/dev/null; then
  pass "detectSessionInUrl is true"
else
  fail "detectSessionInUrl is NOT true — email confirm links won't create sessions"
fi

if grep -q "emailRedirectTo" app/signup/page.js 2>/dev/null; then
  pass "emailRedirectTo is set on signup"
else
  fail "emailRedirectTo missing from signup — confirm emails redirect to bare homepage"
fi

if grep -q "getSession" app/signup/page.js 2>/dev/null; then
  pass "Signup page checks for existing session on mount"
else
  warn "No session check on signup mount — confirmed users may re-enter the wizard"
fi

echo -e "\n── STRIPE CONFIG ─────────────────────"
for key in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
  if grep -rq "$key" app/api/stripe/ 2>/dev/null; then
    pass "$key referenced in stripe routes"
  else
    warn "$key not referenced — check app/api/stripe/"
  fi
done

echo -e "\n── FMCSA API KEY ──────────────────────"
if grep -rq "'demo'" app/api/verify-carrier* 2>/dev/null; then
  warn "FMCSA verify-carrier still using 'demo' key — get real key from mobile.fmcsa.dot.gov"
else
  pass "No demo FMCSA key found"
fi

echo -e "\n── SERVICE WORKER CACHE ──────────────"
CACHE_VER=$(grep "CACHE = " public/sw.js 2>/dev/null | head -1)
echo "Current: $CACHE_VER"

echo -e "\n── BUILD ─────────────────────────────"
if npm run build > $HOME/build.log 2>&1; then
  pass "Build succeeded"
else
  fail "Build FAILED — see $HOME/build.log"
  tail -20 $HOME/build.log
fi

echo -e "\n── LIVE ENDPOINT SMOKE TEST ──────────"
BASE="https://truckinsupersoftware.com"
for route in "/" "/signup" "/login" "/api/health"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$route" --max-time 10)
  if [ "$CODE" = "200" ]; then
    pass "$route → $CODE"
  else
    fail "$route → $CODE"
  fi
done

echo -e "\n── GIT STATUS ─────────────────────────"
git status --short

echo -e "\n======================================"
echo " Done"
echo "======================================"
