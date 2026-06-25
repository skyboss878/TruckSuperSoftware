#!/bin/bash
echo "=== MULTI-TENANT AUDIT ==="
echo ""

API_DIR="/data/data/com.termux/files/home/TruckSuperSoftware/app/api"

echo "--- Routes WITHOUT getAuthContext ---"
for f in $(find $API_DIR -name "route.js"); do
  if ! grep -q "getAuthContext\|verifyAdmin\|requireSuperAdmin" "$f"; then
    echo "  NO AUTH: ${f#$API_DIR/}"
  fi
done

echo ""
echo "--- Routes using old verifyAdmin (PIN-based, needs migration) ---"
for f in $(find $API_DIR -name "route.js"); do
  if grep -q "verifyAdmin" "$f" && ! grep -q "getAuthContext" "$f"; then
    echo "  OLD AUTH: ${f#$API_DIR/}"
  fi
done

echo ""
echo "--- Routes with getAuthContext but NO company_id filter ---"
for f in $(find $API_DIR -name "route.js"); do
  if grep -q "getAuthContext" "$f" && ! grep -q "company_id" "$f"; then
    echo "  NO SCOPE: ${f#$API_DIR/}"
  fi
done

echo ""
echo "=== DONE ==="
