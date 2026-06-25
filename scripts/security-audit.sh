#!/bin/bash
# security-audit.sh — static checks across API routes

cd "$(dirname "$0")/.." 2>/dev/null || true
API_DIR="app/api"

echo "=================================================="
echo " Security Audit — $(date)"
echo "=================================================="

if [ ! -d "$API_DIR" ]; then
  echo "Could not find $API_DIR — run this from the project root."
  exit 1
fi

ROUTES=$(find "$API_DIR" -name "route.js")
TOTAL=0

echo ""
echo "--- 1. Routes using supabaseAdmin with no visible company_id check ---"
for f in $ROUTES; do
  TOTAL=$((TOTAL+1))
  if grep -q "supabaseAdmin" "$f"; then
    if ! grep -qE "company_id|companyId" "$f"; then
      echo "⚠️  $f — uses service role key, no company_id reference found"
    fi
  fi
done

echo ""
echo "--- 2. Routes that may swallow errors (success:true near a catch) ---"
for f in $ROUTES; do
  if grep -A2 "catch" "$f" | grep -q "success: true" 2>/dev/null; then
    echo "⚠️  $f — possible silent failure"
  fi
done

echo ""
echo "--- 3. Routes with no auth-related keyword at all ---"
for f in $ROUTES; do
  if ! grep -qE "auth|user_id|getUser|session|Authorization" "$f"; then
    echo "⚠️  $f — no auth-related keyword found, verify manually"
  fi
done

echo ""
echo "--- 4. Possible hardcoded secrets/keys in app/ and lib/ ---"
grep -rnE "(sk_live|sk_test|service_role|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9)" app lib 2>/dev/null | grep -v node_modules | while read -r line; do
  echo "🚨 $line"
done

echo ""
echo "--- 5. .env files tracked by git? ---"
if git ls-files | grep -qE "^\.env"; then
  echo "🚨 Tracked .env files found:"
  git ls-files | grep -E "^\.env"
else
  echo "✅ No .env files tracked by git"
fi

echo ""
echo "=================================================="
echo " Scanned $TOTAL API routes"
echo " This is a static scan — review every flag manually."
echo "=================================================="
