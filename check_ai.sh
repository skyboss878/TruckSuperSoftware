#!/bin/bash
# ============================================
#  Smith's Freight Hub — AI Diagnostic
# ============================================
set +H
BASE_URL="${1:-https://smiths.vercel.app}"  # pass your URL as arg if different

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0; WARN=0

ok()   { echo -e "${GREEN}✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}✗  $1${NC}"; ((FAIL++)); }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; ((WARN++)); }
hdr()  { echo -e "\n${YELLOW}--- $1 ---${NC}"; }

echo "============================================"
echo " Smith's AI Diagnostic"
echo " Target: $BASE_URL"
echo "============================================"

# ── 1. LOCAL FILE CHECKS ──────────────────────
hdr "LOCAL FILES"

check_file() {
  [ -f "$1" ] && ok "$1" || fail "MISSING: $1"
}

check_file app/api/ai/route.js
check_file app/api/assistant/route.js
check_file app/admin/assistant/page.js
check_file app/driver/assistant/page.js
check_file lib/supabase-admin.js 2>/dev/null || check_file lib/supabase-admin.ts 2>/dev/null || fail "MISSING: lib/supabase-admin.js"

# ── 2. ENV VAR CHECKS ─────────────────────────
hdr "ENV VARS (local .env / .env.local)"

check_env() {
  local val
  val=$(grep -h "^$1=" .env .env.local 2>/dev/null | head -1 | cut -d= -f2-)
  if [ -n "$val" ]; then
    ok "$1 is set (${#val} chars)"
  else
    fail "$1 is NOT set in .env/.env.local"
  fi
}

check_env ANTHROPIC_API_KEY
check_env NEXT_PUBLIC_SUPABASE_URL
check_env NEXT_PUBLIC_SUPABASE_ANON_KEY
check_env SUPABASE_SERVICE_ROLE_KEY

# ── 3. VERCEL ENV CHECK ───────────────────────
hdr "VERCEL ENV VARS"
if command -v vercel &>/dev/null; then
  VENV=$(vercel env ls 2>/dev/null)
  for var in ANTHROPIC_API_KEY SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
    echo "$VENV" | grep -q "$var" && ok "Vercel: $var" || fail "Vercel: $var MISSING"
  done
else
  warn "vercel CLI not found — skipping Vercel env check"
fi

# ── 4. ROUTE CONTENT CHECKS ───────────────────
hdr "API ROUTE CONTENT"

# /api/ai — should proxy to Anthropic
if [ -f app/api/ai/route.js ]; then
  grep -q "ANTHROPIC_API_KEY" app/api/ai/route.js && ok "/api/ai uses ANTHROPIC_API_KEY" || fail "/api/ai missing ANTHROPIC_API_KEY reference"
  grep -q "api.anthropic.com" app/api/ai/route.js && ok "/api/ai calls Anthropic endpoint" || fail "/api/ai not calling Anthropic endpoint"
  grep -q "claude-" app/api/ai/route.js && ok "/api/ai has model set" || warn "/api/ai model string not found"
else
  fail "app/api/ai/route.js missing — AI calls will 404"
fi

# /api/assistant — should call Anthropic and use supabaseAdmin
if [ -f app/api/assistant/route.js ]; then
  grep -q "api.anthropic.com" app/api/assistant/route.js && ok "/api/assistant calls Anthropic" || fail "/api/assistant not calling Anthropic"
  grep -q "supabaseAdmin" app/api/assistant/route.js && ok "/api/assistant uses supabaseAdmin" || fail "/api/assistant NOT using supabaseAdmin (RLS will block data)"
  grep -q "ANTHROPIC_API_KEY" app/api/assistant/route.js || warn "/api/assistant — ANTHROPIC_API_KEY not referenced (may rely on /api/ai proxy)"
  grep -q "systemPrompt\|system:" app/api/assistant/route.js && ok "/api/assistant has system prompt" || fail "/api/assistant missing system prompt"
else
  fail "app/api/assistant/route.js missing"
fi

# Admin assistant page — should call /api/assistant not Anthropic directly
if [ -f app/admin/assistant/page.js ]; then
  grep -q "api.anthropic.com" app/admin/assistant/page.js && fail "admin/assistant calls Anthropic DIRECTLY (API key exposed to browser!)" || ok "admin/assistant uses backend proxy ✓"
  grep -q "/api/assistant" app/admin/assistant/page.js && ok "admin/assistant → /api/assistant" || fail "admin/assistant not hitting /api/assistant"
fi

# Driver assistant
if [ -f app/driver/assistant/page.js ]; then
  grep -q "api.anthropic.com" app/driver/assistant/page.js && fail "driver/assistant calls Anthropic DIRECTLY (API key exposed!)" || ok "driver/assistant uses backend proxy ✓"
  grep -q "/api/assistant" app/driver/assistant/page.js && ok "driver/assistant → /api/assistant" || fail "driver/assistant not hitting /api/assistant"
fi

# Old AI page — check if it's still calling Anthropic directly
if [ -f app/admin/ai/page.js ]; then
  grep -q "api.anthropic.com" app/admin/ai/page.js && fail "admin/ai/page.js STILL calling Anthropic directly — fix or delete this file" || ok "admin/ai/page.js uses proxy"
fi

# ── 5. LIVE ENDPOINT TESTS ────────────────────
hdr "LIVE ENDPOINT TESTS (curl)"

if command -v curl &>/dev/null; then
  # /api/assistant quick ping
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/assistant" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"ping"}],"role":"admin"}' \
    --max-time 20)
  if [ "$STATUS" = "200" ]; then
    ok "/api/assistant returned 200"
  elif [ "$STATUS" = "500" ]; then
    fail "/api/assistant returned 500 — likely missing env var or Supabase error"
  elif [ "$STATUS" = "404" ]; then
    fail "/api/assistant returned 404 — route not deployed"
  else
    warn "/api/assistant returned HTTP $STATUS"
  fi

  # /api/ai quick ping
  STATUS2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"say hi"}],"model":"claude-sonnet-4-20250514","max_tokens":50}' \
    --max-time 20)
  if [ "$STATUS2" = "200" ]; then
    ok "/api/ai returned 200"
  elif [ "$STATUS2" = "500" ]; then
    fail "/api/ai returned 500 — check ANTHROPIC_API_KEY on Vercel"
  elif [ "$STATUS2" = "404" ]; then
    fail "/api/ai returned 404 — route not deployed"
  else
    warn "/api/ai returned HTTP $STATUS2"
  fi
else
  warn "curl not found — skipping live tests"
fi

# ── 6. SUMMARY ────────────────────────────────
echo ""
echo "============================================"
echo -e " PASSED: ${GREEN}$PASS${NC}  FAILED: ${RED}$FAIL${NC}  WARNINGS: ${YELLOW}$WARN${NC}"
echo "============================================"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Common fixes:"
  echo "  • Missing ANTHROPIC_API_KEY on Vercel → vercel env add ANTHROPIC_API_KEY production"
  echo "  • /api/ai 500 → check route.js reads process.env.ANTHROPIC_API_KEY"
  echo "  • Supabase data empty → check SUPABASE_SERVICE_ROLE_KEY on Vercel"
  echo "  • Direct Anthropic call in browser → move fetch to /api/ai route"
fi
