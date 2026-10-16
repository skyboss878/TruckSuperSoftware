#!/usr/bin/env bash

# Output Report File
REPORT_FILE="APP_REPORT.md"

echo "=========================================="
echo "Starting App Quality Audit..."
echo "=========================================="

# Timestamp
DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Project Metrics
TOTAL_FILES=$(find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './Build*' | wc -l)
JS_TS_FILES=$(find app components lib scripts tests -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)
LOC=$(find app components lib scripts tests -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | xargs wc -l 2>/dev/null | tail -n 1 | awk '{print $1}')
SHELL_SCRIPTS=$(find . -maxdepth 2 -name "*.sh" | wc -l)

# Code Quality Checks
echo "Running ESLint check..."
LINT_OUTPUT=$(npx eslint . --ext .js,.jsx,.ts,.tsx 2>&1)
LINT_STATUS=$?

echo "Checking package dependencies..."
AUDIT_OUTPUT=$(npm audit --summary 2>&1)

# Generate Markdown Report
cat << REPORT > $REPORT_FILE
# App Quality & Technical Audit Report

**Project Name:** TruckSuperSoftware  
**Generated On:** $DATE  
**Target Architecture:** Next.js / Supabase / Tailwind CSS / Vercel  

---

## 1. Codebase Overview & Metrics
* **Total Tracked Files:** $TOTAL_FILES
* **Source Code Files (.js, .jsx, .ts, .tsx):** $JS_TS_FILES
* **Total Lines of Code (LOC):** ${LOC:-0}
* **Automation Scripts (.sh):** $SHELL_SCRIPTS

---

## 2. Directory Structure Breakdown
\`\`\`text
$(tree -L 2 -I 'node_modules|.git|Build|.next' 2>/dev/null || ls -la)
\`\`\`

---

## 3. Code Quality & Linting
$(if [ $LINT_STATUS -eq 0 ]; then
  echo "✅ **ESLint Status:** Passed with zero critical errors."
else
  echo "⚠️ **ESLint Summary:** Issues detected during linting."
  echo "\`\`\`text"
  echo "$LINT_OUTPUT" | head -n 25
  echo "\`\`\`"
fi)

---

## 4. Security & Dependency Audit
\`\`\`text
$AUDIT_OUTPUT
\`\`\`

---

## 5. Automation & Utility Inventory
Listed bash scripts responsible for CI/CD, route checking, and operational management:
$(find . -maxdepth 2 -name "*.sh" | sed 's/^/* /')

---
*Report generated automatically via audit_project.sh*
REPORT

echo "=========================================="
echo "Audit complete! Report saved to $REPORT_FILE"
echo "=========================================="
