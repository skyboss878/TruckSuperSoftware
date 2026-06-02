#!/bin/bash
# ============================================================
#  analyze.sh — Smiths Trucking App · Full Health Check
#  Run from: ~/Smiths
#  Usage: bash analyze.sh > report.txt 2>&1
# ============================================================

ROOT="$(pwd)"
PASS=0; WARN=0; FAIL=0

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

pass() { echo -e "${GREEN}  ✓ $1${RESET}"; ((PASS++)); }
warn() { echo -e "${YELLOW}  ⚠ $1${RESET}"; ((WARN++)); }
fail() { echo -e "${RED}  ✗ $1${RESET}"; ((FAIL++)); }
section() { echo -e "\n${CYAN}${BOLD}══════════════════════════════════════${RESET}"; echo -e "${CYAN}${BOLD}  $1${RESET}"; echo -e "${CYAN}${BOLD}══════════════════════════════════════${RESET}"; }

echo -e "${BOLD}"
echo "  ███████╗███╗   ███╗██╗████████╗██╗  ██╗███████╗"
echo "  ██╔════╝████╗ ████║██║╚══██╔══╝██║  ██║██╔════╝"
echo "  ███████╗██╔████╔██║██║   ██║   ███████║███████╗"
echo "  ╚════██║██║╚██╔╝██║██║   ██║   ██╔══██║╚════██║"
echo "  ███████║██║ ╚═╝ ██║██║   ██║   ██║  ██║███████║"
echo "  ╚══════╝╚═╝     ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝"
echo -e "  Trucking App · Full Analysis Report${RESET}"
echo "  $(date)"
echo ""

# ── 1. PROJECT STRUCTURE ────────────────────────────────────
section "1. PROJECT STRUCTURE"

for dir in app components lib public; do
  [ -d "$dir" ] && pass "/$dir exists" || fail "/$dir missing"
done

# Count pages
PAGE_COUNT=$(find app -name "page.js" 2>/dev/null | wc -l)
API_COUNT=$(find app/api -name "route.js" 2>/dev/null | wc -l)
COMP_COUNT=$(find components -name "*.js" 2>/dev/null | wc -l)
echo -e "\n  📄 Pages:      $PAGE_COUNT"
echo    "  🔌 API routes: $API_COUNT"
echo    "  🧩 Components: $COMP_COUNT"

# List all pages
echo -e "\n  ${BOLD}All pages:${RESET}"
find app -name "page.js" | sed 's|/page.js||' | sed 's|app||' | sort | while read p; do
  echo "    → ${p:-/}"
done

# List all API routes
echo -e "\n  ${BOLD}All API routes:${RESET}"
find app/api -name "route.js" | sed 's|/route.js||' | sed 's|app/api|/api|' | sort | while read r; do
  echo "    → $r"
done

# ── 2. REQUIRED FILES ───────────────────────────────────────
section "2. CRITICAL FILES"

files=(
  "package.json"
  "next.config.js"
  ".env.local"
  "lib/supabase.js"
  "lib/supabase-admin.js"
  "app/layout.js"
  "app/page.js"
  "app/globals.css"
)
for f in "${files[@]}"; do
  [ -f "$f" ] && pass "$f" || fail "$f MISSING"
done

# ── 3. ENV VARIABLES ────────────────────────────────────────
section "3. ENVIRONMENT VARIABLES"

if [ -f ".env.local" ]; then
  vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
  )
  for v in "${vars[@]}"; do
    grep -q "^${v}=" .env.local && pass "$v set" || warn "$v not in .env.local"
  done
  # Check for empty values
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    key="${line%%=*}"; val="${line#*=}"
    [ -z "$val" ] && warn "$key is empty"
  done < .env.local
else
  fail ".env.local missing — app will not connect to Supabase"
fi

# ── 4. PACKAGE DEPENDENCIES ─────────────────────────────────
section "4. DEPENDENCIES"

if [ -f "package.json" ]; then
  deps=("next" "react" "react-dom" "@supabase/supabase-js")
  for dep in "${deps[@]}"; do
    grep -q "\"$dep\"" package.json && pass "$dep" || fail "$dep missing from package.json"
  done
  # Optional but useful
  optdeps=("next-auth" "leaflet" "recharts" "lucide-react")
  for dep in "${optdeps[@]}"; do
    grep -q "\"$dep\"" package.json && pass "$dep (optional) ✓" || warn "$dep not installed (optional)"
  done
  [ -d "node_modules" ] && pass "node_modules exists" || fail "node_modules missing — run npm install"
fi

# ── 5. FEATURE COMPLETENESS ─────────────────────────────────
section "5. FEATURE COMPLETENESS"

echo -e "  ${BOLD}Core Features:${RESET}"

check_feature() {
  local name="$1"; shift
  local found=false
  for path in "$@"; do
    [ -e "$path" ] && found=true && break
  done
  $found && pass "$name" || fail "$name — NOT BUILT"
}

check_feature "Auth / Login"              "app/login" "app/(auth)/login" "pages/login.js"
check_feature "Admin Dashboard"           "app/admin" "app/admin/page.js"
check_feature "Driver Dashboard"          "app/driver" "app/driver/page.js"
check_feature "Customer Management"       "app/admin/customers" "app/customers"
check_feature "Driver Management"         "app/admin/drivers" "app/drivers"
check_feature "Ticket / Load Management"  "app/admin/tickets" "app/tickets"
check_feature "Live Tracking Map"         "app/admin/tracking" "app/tracking" "components/TrackingMap.js"
check_feature "Drive Session Tracker"     "components/DriveTracker.js" "app/driver/track"
check_feature "Fuel Log"                  "app/driver/fuel" "app/admin/fuel" "components/FuelLog.js"
check_feature "Timesheet / Hours"         "app/admin/reports/timesheet" "app/driver/timesheet"
check_feature "Driver Earnings Report"    "app/admin/reports/earnings" "app/admin/reports/driver-earnings"
check_feature "IFTA Fuel Tax Report"      "app/admin/reports/ifta"
check_feature "Ticket Report"             "app/admin/reports/tickets" "app/admin/reports/ticket"
check_feature "AI Assistant"              "app/admin/ai" "app/admin/assistant" "components/AIAssistant.js"
check_feature "Driver Settlements"        "app/admin/settlements" "app/admin/reports/settlements"
check_feature "Notifications"             "components/Notifications.js" "app/api/notifications"
check_feature "PDF/Receipt Generation"    "app/api/pdf" "lib/pdf.js"

echo -e "\n  ${BOLD}API Routes:${RESET}"
api_routes=(
  "app/api/auth"
  "app/api/drivers"
  "app/api/customers"
  "app/api/tickets"
  "app/api/tracking"
  "app/api/fuel"
  "app/api/ifta"
  "app/api/reports"
  "app/api/settlements"
  "app/api/ai"
)
for r in "${api_routes[@]}"; do
  [ -d "$r" ] && pass "${r/app\/api\//\/api\/}" || fail "${r/app\/api\//\/api\/} route missing"
done

# ── 6. MISSING / RECOMMENDED FEATURES ───────────────────────
section "6. RECOMMENDED FEATURES (not yet built)"

recommend() {
  local name="$1"; local path="$2"; local why="$3"
  [ ! -e "$path" ] && echo -e "  ${YELLOW}💡 $name${RESET} — $why"
}

recommend "Customer Portal"        "app/customer"              "Customers log in, view their deliveries & invoices"
recommend "Invoice Generator"      "app/admin/invoices"        "Auto-generate PDF invoices from tickets"
recommend "Maintenance Tracker"    "app/admin/maintenance"     "Track truck service schedules & costs"
recommend "Load Board"             "app/admin/loads"           "Assign and dispatch loads to drivers"
recommend "Expense Tracker"        "app/admin/expenses"        "Log repairs, tolls, misc costs per truck"
recommend "Push Notifications"     "lib/push.js"               "Alert drivers of new assignments via PWA"
recommend "Offline Mode"           "public/sw.js"              "Service worker for GPS tracking without internet"
recommend "DOT Compliance Log"     "app/admin/compliance"      "HOS logs, inspection records, violations"
recommend "Trip Profitability"     "app/admin/reports/profit"  "Revenue vs fuel vs pay per trip"
recommend "Driver App (PWA)"       "public/manifest.json"      "Installable on driver phones like a native app"
recommend "Multi-company support"  "lib/tenants.js"            "Run multiple trucking companies from one install"
recommend "SMS Alerts"             "app/api/sms"               "Text drivers on new load assignments (Twilio)"

# ── 7. CODE QUALITY ─────────────────────────────────────────
section "7. CODE QUALITY"

# Check for console.log left in production files
LOG_COUNT=$(grep -r "console\.log" app components --include="*.js" 2>/dev/null | grep -v "console\.error" | wc -l)
[ "$LOG_COUNT" -gt 20 ] && warn "$LOG_COUNT console.log statements (clean up before prod)" || pass "console.log count OK ($LOG_COUNT)"

# Check for hardcoded localhost
LOCALHOST=$(grep -r "localhost" app components lib --include="*.js" 2>/dev/null | grep -v "node_modules" | wc -l)
[ "$LOCALHOST" -gt 0 ] && warn "$LOCALHOST hardcoded localhost references found" || pass "No hardcoded localhost"

# Check for TODO/FIXME
TODOS=$(grep -r "TODO\|FIXME\|HACK\|XXX" app components --include="*.js" 2>/dev/null | wc -l)
[ "$TODOS" -gt 0 ] && warn "$TODOS TODO/FIXME comments need attention" || pass "No TODO/FIXME comments"

# Check for any .env values accidentally committed
if [ -f ".gitignore" ]; then
  grep -q ".env.local" .gitignore && pass ".env.local in .gitignore" || fail ".env.local NOT in .gitignore — credentials could leak!"
fi

# Large files
echo -e "\n  ${BOLD}Largest files (top 10):${RESET}"
find app components lib -name "*.js" -exec wc -l {} \; 2>/dev/null | sort -rn | head -10 | while read count file; do
  [ "$count" -gt 500 ] && echo -e "  ${YELLOW}  $count lines — $file (consider splitting)${RESET}" || echo "    $count lines — $file"
done

# ── 8. DATABASE SCHEMA CHECK ────────────────────────────────
section "8. EXPECTED SUPABASE TABLES"

echo "  Tables your app queries (from API routes):"
tables=$(grep -r "\.from(" app/api --include="*.js" 2>/dev/null | grep -oP "from\('\K[^']+" | sort -u)
for t in $tables; do
  echo "    📋 $t"
done

echo -e "\n  ${BOLD}Recommended indexes to add in Supabase:${RESET}"
echo "    • drivers(id), drivers(status)"
echo "    • tickets(driver_id), tickets(customer_id), tickets(created_at)"
echo "    • drive_sessions(driver_id), drive_sessions(status), drive_sessions(started_at)"
echo "    • fuel_logs(driver_id), fuel_logs(date)"
echo "    • driver_trips(driver_id), driver_trips(trip_id)"

# ── 9. SECURITY AUDIT ───────────────────────────────────────
section "9. SECURITY"

# Check if admin routes are protected
ADMIN_PAGES=$(find app/admin -name "page.js" 2>/dev/null | wc -l)
AUTH_CHECKS=$(grep -r "getSession\|useSession\|auth()\|checkAuth\|redirect.*login" app/admin --include="*.js" 2>/dev/null | wc -l)
[ "$AUTH_CHECKS" -gt 0 ] && pass "Auth checks found in admin ($AUTH_CHECKS references)" || warn "Admin pages may not be auth-protected — check middleware"

# Check for middleware
[ -f "middleware.js" ] || [ -f "middleware.ts" ] && pass "middleware.js exists (route protection)" || warn "No middleware.js — admin routes may be publicly accessible"

# Check API routes use supabaseAdmin (not anon key)
ADMIN_API=$(grep -r "supabaseAdmin" app/api --include="*.js" 2>/dev/null | wc -l)
ANON_API=$(grep -r "supabase\b" app/api --include="*.js" 2>/dev/null | grep -v "supabaseAdmin" | wc -l)
[ "$ADMIN_API" -gt 0 ] && pass "API routes use supabaseAdmin ($ADMIN_API references)" || warn "API routes may be using anon key"

# ── 10. BUILD & GIT STATUS ──────────────────────────────────
section "10. BUILD & GIT STATUS"

if [ -d ".git" ]; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  LAST_COMMIT=$(git log -1 --pretty="%h %s" 2>/dev/null)
  UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
  pass "Git repo on branch: $BRANCH"
  echo "    Last commit: $LAST_COMMIT"
  [ "$UNCOMMITTED" -gt 0 ] && warn "$UNCOMMITTED uncommitted changes" || pass "Working tree clean"
else
  fail "Not a git repo"
fi

# Check if .next build exists
[ -d ".next" ] && pass ".next build exists" || warn "No build found — run npm run build"

# ── 11. FINAL SCORE ─────────────────────────────────────────
section "11. FINAL SCORE"

TOTAL=$((PASS + WARN + FAIL))
SCORE=$(echo "scale=0; ($PASS * 100) / $TOTAL" | bc 2>/dev/null || echo "?")

echo -e "  ${GREEN}✓ Passing:  $PASS${RESET}"
echo -e "  ${YELLOW}⚠ Warnings: $WARN${RESET}"
echo -e "  ${RED}✗ Failing:  $FAIL${RESET}"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -le 3 ]; then
  echo -e "  ${GREEN}${BOLD}🏆 SCORE: $SCORE/100 — Production Ready!${RESET}"
elif [ "$FAIL" -le 3 ]; then
  echo -e "  ${YELLOW}${BOLD}📈 SCORE: $SCORE/100 — Almost There${RESET}"
else
  echo -e "  ${RED}${BOLD}🔧 SCORE: $SCORE/100 — Needs Work${RESET}"
fi

echo ""
echo -e "  ${BOLD}Next steps to build the best trucking software:${RESET}"
echo "  1. Fix all ✗ FAIL items first"
echo "  2. Add Customer Portal (huge value for clients)"
echo "  3. Add Invoice PDF generation"
echo "  4. Add middleware.js for auth protection"
echo "  5. Add PWA manifest for driver app install"
echo "  6. Add offline GPS tracking (service worker)"
echo "  7. Add DOT compliance / HOS logs"
echo "  8. Add trip profitability report"
echo ""
echo "  Run: bash analyze.sh > report.txt  to save this report"
echo "  ════════════════════════════════════════════════════"

