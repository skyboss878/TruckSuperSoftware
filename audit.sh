#!/bin/bash
set +H
BASE_URL="${SMITHS_URL:-https://smiths-dnxx.vercel.app}"
LIVE_MODE=false
FIX_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--fix" ]] && FIX_MODE=true
  [[ "$arg" == "--live" ]] && LIVE_MODE=true
done

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0; WARN=0; FIXES=()
ok()   { echo -e "${GREEN}✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}✗  $1${NC}"; ((FAIL++)); }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; ((WARN++)); }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
fix()  { FIXES+=("$1"); echo -e "${YELLOW}   FIX: $1${NC}"; }

echo "============================================================"
echo " Smith's Freight Hub — AI Code Guardian"
echo " $(date '+%Y-%m-%d %H:%M')"
echo "============================================================"

hdr "ENV VARS"
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  val=$(grep -h "^$var=" .env .env.local 2>/dev/null | head -1 | cut -d= -f2-)
  [ -n "$val" ] && ok "$var (${#val} chars)" || fail "$var missing"
done

hdr "API ROUTES — All present"
for f in \
  app/api/ai/route.js app/api/assistant/route.js app/api/compliance/route.js \
  app/api/customers/route.js app/api/dispatch/route.js app/api/drivers/route.js \
  "app/api/drivers/[id]/route.js" app/api/locations/route.js app/api/maintenance/route.js \
  app/api/messages/route.js app/api/tickets/route.js "app/api/tickets/[id]/route.js" \
  app/api/timesheets/route.js app/api/tracking/route.js app/api/upload/route.js; do
  if [ ! -f "$f" ]; then
    fail "MISSING: $f"
  else
    grep -q "catch\|error" "$f" && ok "$f" || warn "$f — no error handling"
    if grep -q "from('drivers')\|from('tickets')\|from('timesheets')\|from('maintenance')\|from('messages')\|from('dot_compliance')\|from('customers')\|from('locations')\|from('driver_trips')" "$f" 2>/dev/null; then
      grep -q "supabaseAdmin" "$f" || { fail "$f — uses anon client not supabaseAdmin"; fix "# Replace supabase with supabaseAdmin in $f"; }
    fi
  fi
done

hdr "SECURITY — No Anthropic calls in browser"
for f in app/admin/page.js app/admin/assistant/page.js app/admin/dispatch/page.js app/driver/page.js app/driver/assistant/page.js app/driver/ticket/new/page.js; do
  [ ! -f "$f" ] && continue
  grep -q "api.anthropic.com" "$f" && { fail "$f — API key exposed in browser!"; fix "python3 -c \"path='$f'; c=open(path).read(); c=c.replace('https://api.anthropic.com/v1/messages', '/api/ai'); open(path,'w').write(c)\""; } || ok "$f — safe"
done

hdr "REACT — Duplicate keys"
for f in app/admin/page.js app/driver/page.js; do
  [ ! -f "$f" ] && continue
  DUPES=$(grep "key: '" "$f" | grep -oP "key: '\K[^']+" | sort | uniq -d | tr '\n' ' ')
  [ -n "$DUPES" ] && { fail "$f — duplicate keys: $DUPES"; fix "# Remove duplicate '{ key: $DUPES }' from $f"; } || ok "$f — no duplicate keys"
done

hdr "REACT — Null guards on detail pages"
for entry in "app/admin/ticket/[id]/page.js:ticket" "app/admin/drivers/[id]/page.js:driver" "app/admin/maintenance/[id]/page.js:log"; do
  f="${entry%%:*}"; var="${entry##*:}"
  [ ! -f "$f" ] && continue
  grep -q "${var}\?\.\|if (!\?${var})" "$f" && ok "$f — null safe" || { warn "$f — no null guard for '$var'"; fix "python3 -c \"path='$f'; c=open(path).read(); c=c.replace('{${var}.', '{${var}?.'); open(path,'w').write(c)\""; }
done

hdr "AI MODEL STRINGS"
for f in app/api/ai/route.js app/api/assistant/route.js app/api/dispatch/route.js; do
  [ ! -f "$f" ] && continue
  MODEL=$(grep -oP "model: '\K[^']+" "$f" | head -1)
  if [ -z "$MODEL" ]; then
    warn "$f — no model string"
  elif [[ "$MODEL" == "claude-sonnet-4-6" || "$MODEL" == "claude-opus-4-6" || "$MODEL" == "claude-haiku-4-5" ]]; then
    ok "$f — $MODEL"
  else
    fail "$f — invalid model: $MODEL"
    fix "python3 -c \"path='$f'; c=open(path).read(); c=c.replace('$MODEL', 'claude-sonnet-4-6'); open(path,'w').write(c)\""
  fi
done

hdr "DISPATCH ACTIONS"
if [ -f app/api/dispatch/route.js ]; then
  for action in auto_review paperwork_scan morning_briefing broadcast full_auto; do
    grep -q "'$action'" app/api/dispatch/route.js && ok "dispatch/$action" || fail "dispatch/$action MISSING"
  done
fi

hdr "BUILD"
BUILD_OUT=$(npm run build 2>&1)
echo "$BUILD_OUT" | grep -q "Generating static pages" && ok "Build passed" || { fail "Build FAILED"; echo "$BUILD_OUT" | grep -i "error" | head -5; }

if $LIVE_MODE; then
  hdr "LIVE ENDPOINTS — $BASE_URL"
  test_get() {
    S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$1" --max-time 15)
    [ "$S" = "200" ] && ok "GET $1" || fail "GET $1 — $S"
  }
  test_post() {
    S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$1" -H "Content-Type: application/json" -d "$2" --max-time 20)
    [ "$S" = "200" ] && ok "POST $1" || fail "POST $1 — $S"
  }
  test_get /api/drivers
  test_get /api/tickets
  test_get /api/timesheets
  test_get /api/maintenance
  test_get /api/compliance
  test_get /api/messages
  test_get /api/customers
  test_get /api/locations
  test_get /api/tracking
  test_post /api/assistant '{"messages":[{"role":"user","content":"ping"}],"role":"admin"}'
  test_post /api/dispatch '{"action":"paperwork_scan"}'
fi

hdr "AI DEEP AUDIT"
ANTHROPIC_API_KEY=$(grep "^ANTHROPIC_API_KEY=" .env .env.local 2>/dev/null | head -1 | cut -d= -f2-)
if [ -n "$ANTHROPIC_API_KEY" ]; then
  CODE=""
  for f in app/admin/page.js app/api/dispatch/route.js app/api/assistant/route.js; do
    [ -f "$f" ] && CODE+="=== $f ===\n$(head -60 "$f")\n\n"
  done
  python3 << PYEOF
import json, urllib.request
code = """$CODE"""
payload = {"model":"claude-sonnet-4-6","max_tokens":800,"system":"You are a senior Next.js/Supabase code reviewer for a trucking SaaS. Review the code and list up to 10 specific bugs, security issues, or improvements needed. Be concise. Format as numbered list.","messages":[{"role":"user","content":f"Review:\n\n{code}"}]}
req = urllib.request.Request("https://api.anthropic.com/v1/messages",data=json.dumps(payload).encode(),headers={"Content-Type":"application/json","x-api-key":"$ANTHROPIC_API_KEY","anthropic-version":"2023-06-01"})
try:
  with urllib.request.urlopen(req,timeout=30) as r:
    print(json.loads(r.read())["content"][0]["text"])
except Exception as e:
  print(f"AI audit skipped: {e}")
PYEOF
else
  warn "Add ANTHROPIC_API_KEY to .env.local to enable AI deep audit"
fi

hdr "GIT"
U=$(git status --porcelain | wc -l)
[ "$U" -gt 0 ] && warn "$U uncommitted files" || ok "All committed"
echo "   $(git log --oneline -1)"

echo ""
echo "============================================================"
echo -e " PASSED: ${GREEN}$PASS${NC}  FAILED: ${RED}$FAIL${NC}  WARNINGS: ${YELLOW}$WARN${NC}"
echo "============================================================"
[ ${#FIXES[@]} -gt 0 ] && ! $FIX_MODE && echo -e "${YELLOW}Run: bash audit.sh --fix to auto-apply ${#FIXES[@]} fix(es)${NC}"
if $FIX_MODE && [ ${#FIXES[@]} -gt 0 ]; then
  echo "Applying fixes..."
  for f in "${FIXES[@]}"; do eval "$f"; done
fi
[ $FAIL -eq 0 ] && echo -e "${GREEN}✅ Safe to deploy — vercel --prod${NC}" || echo -e "${RED}⚠  Fix failures before deploying${NC}"
