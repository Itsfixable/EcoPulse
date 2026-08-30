#!/usr/bin/env bash
# Validates model API keys in .env.local without printing them.
set -u
cd "$(dirname "$0")/.."
[ -f .env.local ] || { echo "No .env.local found."; exit 1; }

read_key() {
  awk -F= -v n="$1" '$1==n {v=substr($0,index($0,"=")+1); gsub(/^[ \t"\x27]+|[ \t"\x27\r]+$/,"",v); print v}' .env.local
}

check() {
  local name="$1" key http
  key="$(read_key "$name")"
  [ -n "$key" ] || return 0
  printf '%s (%d chars)\n' "$name" "${#key}"

  case "$name" in
    GEMINI_API_KEY)
      # Google is migrating from "Standard" AIza keys to "Auth" AQ. keys;
      # AI Studio issues AQ. for all new keys, and AIza keys stop working in
      # September 2026.
      if printf %s "$key" | grep -qE '^AQ\.[A-Za-z0-9_.-]{20,}$'; then
        :
      elif printf %s "$key" | grep -qE '^AIza[A-Za-z0-9_-]{35}$'; then
        echo "  ! legacy Standard key — Google stops accepting these in Sept 2026"
      else
        echo "  ✗ malformed — expected an AQ. auth key or a 39-char AIza key"
      fi
      http=$(curl -s -o /dev/null -w '%{http_code}' \
        "https://generativelanguage.googleapis.com/v1beta/models?key=$key")
      ;;
    OPENAI_API_KEY)
      http=$(curl -s -o /dev/null -w '%{http_code}' \
        -H "Authorization: Bearer $key" https://api.openai.com/v1/models)
      ;;
    ANTHROPIC_API_KEY)
      # /v1/models returns 200 even with no credit balance, so send a real
      # 1-token message: that is what surfaces a billing problem.
      local body
      body=$(curl -s -w '\n%{http_code}' -X POST https://api.anthropic.com/v1/messages \
        -H "x-api-key: $key" -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{"model":"claude-haiku-4-5","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}')
      http=$(printf %s "$body" | tail -n1)
      if printf %s "$body" | grep -qi "credit balance"; then
        echo "  ✗ key is valid but the account has no credits — add some at console.anthropic.com"
        return 0
      fi
      ;;
  esac

  case "$http" in
    200) echo "  ✓ works" ;;
    400) echo "  ✗ HTTP 400 — key rejected as invalid" ;;
    401|403) echo "  ✗ HTTP $http — key not authorised" ;;
    429) echo "  ! HTTP 429 — valid but rate limited" ;;
    *) echo "  ? HTTP $http" ;;
  esac
}

for n in GEMINI_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY; do check "$n"; done
