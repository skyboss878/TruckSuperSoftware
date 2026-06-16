#!/bin/bash
URL="https://smiths-dnxx.vercel.app/api/health"
CRON_URL="https://smiths-dnxx.vercel.app/api/cron/health"
FAIL_COUNT=0
echo "🚛 TWS Fleet Command — Live Monitor"
echo "Checking every 60s. Ctrl+C to stop."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
while true; do
  HEALTH=$(curl -s --max-time 10 $URL)
  CRON=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $CRON_URL)
  TIME=$(date '+%H:%M:%S')
  if echo "$HEALTH" | grep -q "healthy"; then
    FAIL_COUNT=0
    echo "✅ $TIME — All systems operational"
  else
    FAIL_COUNT=$((FAIL_COUNT+1))
    echo "❌ $TIME — HEALTH CHECK FAILED (x$FAIL_COUNT)"
    echo "   Response: $HEALTH"
    if [ "$FAIL_COUNT" -ge 3 ]; then
      echo "🚨 $TIME — 3 CONSECUTIVE FAILURES — SYSTEM MAY BE DOWN"
    fi
  fi
  [ "$CRON" != "200" ] && echo "⚠️  $TIME — Cron health: $CRON"
  sleep 60
done
