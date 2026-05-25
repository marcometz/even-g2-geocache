#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-$ROOT_DIR}"
EVENHUB_BIN="${EVENHUB_BIN:-}"

DEV_PORT="${DEV_PORT:-5173}"
DEV_IP="${DEV_IP:-}"
DEV_URL="${DEV_URL:-}"
DEV_PATH="${DEV_PATH:-/}"
WAIT_SECONDS="${WAIT_SECONDS:-45}"
OPEN_QR_EXTERNAL="${OPEN_QR_EXTERNAL:-0}"
START_SIMULATOR="${START_SIMULATOR:-1}"
SIMULATOR_CMD="${SIMULATOR_CMD:-}"
SIMULATOR_AUTOMATION_PORT="${SIMULATOR_AUTOMATION_PORT:-9898}"
SIMULATOR_GLOW="${SIMULATOR_GLOW:-0}"

DEV_PID=""
SIMULATOR_PID=""
EVENHUB_CMD=""

print_info() {
  printf '[even-start] %s\n' "$1"
}

print_error() {
  printf '[even-start] ERROR: %s\n' "$1" >&2
}

require_supported_node() {
  local node_version_raw
  local node_version
  local node_major

  if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js not found. Install Node.js 20 LTS or 22+ before starting the EvenHub dev flow."
    exit 1
  fi

  node_version_raw="$(node --version 2>/dev/null || true)"
  node_version="${node_version_raw#v}"
  node_major="${node_version%%.*}"

  if [[ -z "$node_major" ]] || [[ ! "$node_major" =~ ^[0-9]+$ ]]; then
    print_error "Could not parse Node.js version from '$node_version_raw'. Expected Node.js 20 LTS or 22+."
    exit 1
  fi

  if (( node_major < 20 )) || (( node_major == 21 )); then
    print_error "Unsupported Node.js version: $node_version_raw. EvenHub currently requires Node.js 20 LTS or 22+."
    exit 1
  fi
}

resolve_command() {
  local candidate

  for candidate in "$@"; do
    if [[ -z "$candidate" ]]; then
      continue
    fi

    if [[ "$candidate" == */* ]]; then
      if [[ -x "$candidate" ]]; then
        printf '%s' "$candidate"
        return 0
      fi
      continue
    fi

    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  return 1
}

cleanup() {
  local code=$?
  if [[ -n "$SIMULATOR_PID" ]] && kill -0 "$SIMULATOR_PID" 2>/dev/null; then
    kill "$SIMULATOR_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
    wait "$DEV_PID" >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap cleanup INT TERM EXIT

resolve_ip() {
  if [[ -n "$DEV_IP" ]]; then
    printf '%s' "$DEV_IP"
    return 0
  fi

  local ip
  local default_iface

  default_iface="$(route get default 2>/dev/null | awk '/interface:/{print $2}' || true)"
  if [[ -n "$default_iface" ]]; then
    ip="$(ipconfig getifaddr "$default_iface" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi
  fi

  ip="$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)"
  if [[ -n "$ip" ]]; then
    printf '%s' "$ip"
    return 0
  fi

  return 1
}

wait_for_url() {
  local url="$1"
  local max_wait="$2"
  local dev_pid="$3"
  local i

  for ((i = 1; i <= max_wait; i++)); do
    if ! kill -0 "$dev_pid" 2>/dev/null; then
      return 2
    fi
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

require_free_port() {
  local port="$1"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    print_error "Port $port is already in use. Stop the existing process or set DEV_PORT to a free port."
    exit 1
  fi
}

SIMULATOR_CMD="$(resolve_command evenhub-simulator || true)"
if [[ ! -f "$APP_DIR/package.json" ]]; then
  print_error "Could not find app package.json in $APP_DIR"
  exit 1
fi

require_supported_node
require_free_port "$DEV_PORT"

EVENHUB_BIN="$(resolve_command \
  "$EVENHUB_BIN" \
  "$ROOT_DIR/node_modules/.bin/evenhub" \
  "$APP_DIR/node_modules/.bin/evenhub" \
  evenhub \
  eh || true)"

if [[ -z "$EVENHUB_BIN" ]]; then
  print_error "EvenHub CLI not found. Install it locally with 'npm install' or globally with 'npm install -g @evenrealities/evenhub-cli'."
  exit 1
fi

SIMULATOR_CMD="$(resolve_command \
  "$SIMULATOR_CMD" \
  "$APP_DIR/node_modules/.bin/evenhub-simulator" \
  "$ROOT_DIR/node_modules/.bin/evenhub-simulator" \
  evenhub-simulator || true)"

if [[ "$START_SIMULATOR" == "1" && -z "$SIMULATOR_CMD" ]]; then
  print_error "Simulator command not found. Install it locally with 'npm install -D @evenrealities/evenhub-simulator' or globally with 'npm install -g @evenrealities/evenhub-simulator'."
  exit 1
fi

if [[ -z "$DEV_URL" ]]; then
  HOST_IP="$(resolve_ip || true)"
  if [[ -z "$HOST_IP" ]]; then
    print_error "Could not determine local IP. Set DEV_IP or DEV_URL manually."
    exit 1
  fi
  DEV_URL="http://$HOST_IP:$DEV_PORT$DEV_PATH"
fi

print_info "Starting dev server in $APP_DIR on port $DEV_PORT ..."
(
  cd "$APP_DIR"
  npm run dev -- --strictPort --port "$DEV_PORT"
) &
DEV_PID=$!

print_info "Waiting for dev server at $DEV_URL ..."
wait_status=0
wait_for_url "$DEV_URL" "$WAIT_SECONDS" "$DEV_PID" || wait_status=$?
if [[ "$wait_status" -ne 0 ]]; then
  if [[ "$wait_status" -eq 2 ]]; then
    print_error "Dev server exited before becoming reachable."
  else
    print_error "Dev server did not become reachable within ${WAIT_SECONDS}s."
  fi
  exit 1
fi

print_info "Dev server reachable: $DEV_URL"
print_info "QR Code for Even app:"
"$EVENHUB_BIN" qr --url "$DEV_URL"

if [[ "$OPEN_QR_EXTERNAL" == "1" ]]; then
  print_info "Opening external QR window ..."
  "$EVENHUB_BIN" qr --url "$DEV_URL" --external || print_error "Could not open external QR window."
fi

if [[ "$START_SIMULATOR" == "1" ]]; then
  simulator_args=("$DEV_URL")
  if [[ "$SIMULATOR_GLOW" == "1" ]]; then
    simulator_args=(-g "${simulator_args[@]}")
  fi
  if [[ -n "$SIMULATOR_AUTOMATION_PORT" ]]; then
    simulator_args+=(--automation-port "$SIMULATOR_AUTOMATION_PORT")
    print_info "Simulator automation API: http://127.0.0.1:$SIMULATOR_AUTOMATION_PORT"
  fi

  print_info "Starting simulator: $SIMULATOR_CMD ${simulator_args[*]}"
  "$SIMULATOR_CMD" "${simulator_args[@]}" >/tmp/evenhub-simulator.log 2>&1 &
  SIMULATOR_PID=$!
fi

print_info "Ready. Scan QR in the Even app. Press Ctrl+C to stop everything."
wait "$DEV_PID"
