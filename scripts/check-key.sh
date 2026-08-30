#!/usr/bin/env bash
# Validates model API keys in .env.local without printing them.
set -u
cd "$(dirname "$0")/.."
# Keys come from .env.local locally and from the environment on hosts like
# Replit, where secrets are injected as variables and no file exists.
if [ -f .env.local ]; then
  echo "Reading .env.local"
else
  echo "No .env.local; reading the environment (Replit Secrets land here)"
fi
echo

read_key() {
  local v=""
  if [ -f .env.local ]; then
    v="$(awk -F= -v n="$1" '$1==n {x=substr($0,index($0,"=")+1); gsub(/^[ \t"\x27]+|[ \t"\x27\r]+$/,"",x); print x}' .env.local)"
  fi
  [ -n "$v" ] || v="$(printenv "$1" 2>/dev/null || true)"
  # Trim whatever the source was: a secret pasted with a trailing space or
  # newline is the usual cause of a 401 on a key that is otherwise fine.
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  v="${v%\"}"; v="${v#\"}"
  v="${v%\'}"; v="${v#\'}"
  printf %s "$v"
}

check() {
  local name="$1" key http
  key="$(read_key "$name")"
  [ -n "$key" ] || return 0
  local rawlen
  rawlen=$(printenv "$name" 2>/dev/null | wc -c | tr -d ' ')
  printf '%s (%d chars)\n' "$name" "${#key}"
  if [ -n "$rawlen" ] && [ "$rawlen" -gt 0 ] && [ "$((rawlen - 1))" -ne "${#key}" ]; then
    echo "  ! the stored value has surrounding whitespace or quotes; trimmed before testing"
  fi

  # Shape report. Prints structure, never the key: the first three and last two
  # characters, and any character outside the alphabet these keys use.
  printf '  shape: starts %s… ends …%s\n' "$(printf %s "$key" | cut -c1-3)" "$(printf %s "$key" | tail -c 3)"
  local odd
  odd="$(printf %s "$key" | grep -oE '[^A-Za-z0-9._-]' | sort -u | tr -d '\n')"
  if [ -n "$odd" ]; then
    echo "  ! contains characters these keys never use:"
    printf %s "$key" | grep -obE '[^A-Za-z0-9._-]' | while IFS=: read -r pos ch; do
      printf "      position %s: %s (hex %s)\n" "$((pos + 1))" "$ch" "$(printf %s "$ch" | xxd -p | head -c 8)"
    done
  fi

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

found=0
for n in GEMINI_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY; do
  [ -n "$(read_key "$n")" ] && found=1
  check "$n"
done

if [ "$found" -eq 0 ]; then
  echo "No model key found in .env.local or the environment."
  echo "On Replit: add GEMINI_API_KEY in the Secrets pane, then stop and re-run the Repl."
  echo "Locally:   echo 'GEMINI_API_KEY=...' >> .env.local, then restart the dev server."
fi
