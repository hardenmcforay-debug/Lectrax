#!/usr/bin/env bash
# Run a Lectrax k6 scenario with common env.
# Usage: ./loadtests/k6/run.sh 01-smoke 100
#        ./loadtests/k6/run.sh 10-mixed-production 1000
set -euo pipefail

SCENARIO="${1:-01-smoke}"
SCALE="${2:-100}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

export BASE_URL="${BASE_URL:-http://localhost:3000}"
export SCALE

SCRIPT="$ROOT/scenarios/${SCENARIO}.js"
if [[ ! -f "$SCRIPT" ]]; then
  # allow passing bare name without number prefix match
  MATCH=$(ls "$ROOT/scenarios"/*"${SCENARIO}"*.js 2>/dev/null | head -n1 || true)
  if [[ -z "${MATCH}" ]]; then
    echo "Unknown scenario: $SCENARIO"
    echo "Available:"
    ls "$ROOT/scenarios"
    exit 1
  fi
  SCRIPT="$MATCH"
fi

echo "==> k6 run $SCRIPT (SCALE=$SCALE BASE_URL=$BASE_URL)"
k6 run \
  -e "BASE_URL=$BASE_URL" \
  -e "SCALE=$SCALE" \
  -e "THRESHOLD_PROFILE=${THRESHOLD_PROFILE:-standard}" \
  -e "ALLOW_RATE_LIMITS=${ALLOW_RATE_LIMITS:-true}" \
  -e "USERS_FILE=${USERS_FILE:-data/users.json}" \
  -e "LECTURER_IDENTIFIER=${LECTURER_IDENTIFIER:-}" \
  -e "LECTURER_PASSWORD=${LECTURER_PASSWORD:-}" \
  -e "CLASS_SESSION_ID=${CLASS_SESSION_ID:-}" \
  -e "ASSIGNMENT_ID=${ASSIGNMENT_ID:-}" \
  -e "TEST_ID=${TEST_ID:-}" \
  -e "ENROLLMENT_IDS=${ENROLLMENT_IDS:-}" \
  -e "TOKEN_FEED_URL=${TOKEN_FEED_URL:-}" \
  -e "QR_TOKEN=${QR_TOKEN:-}" \
  -e "ATTENDANCE_SESSION_ID=${ATTENDANCE_SESSION_ID:-}" \
  -e "PAYMENT_DRY_RUN=${PAYMENT_DRY_RUN:-true}" \
  -e "ALLOW_DISTRIBUTED_SCALE=${ALLOW_DISTRIBUTED_SCALE:-false}" \
  -e "RUN_EXPORT=${RUN_EXPORT:-false}" \
  --out "json=$ROOT/results/${SCENARIO}-scale${SCALE}-$(date +%Y%m%d%H%M%S).json" \
  "$SCRIPT"
