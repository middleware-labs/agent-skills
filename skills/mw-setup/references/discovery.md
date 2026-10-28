# Credential discovery & validation (bash)

Works in bash and zsh. Each agent command runs in a fresh shell, so paste the loader at the top of every block that needs the values. It never prints secrets.

## Loader

Precedence: shell env > `.env.local` > `.env` > `~/.config/middleware/credentials.env`. A real env var is never overwritten; surrounding quotes are stripped. `<VAR>_SRC` records where each value came from.

```bash
mw_load() {
  local f k v
  for k in MW_API_KEY MW_TARGET MW_UID MW_PUBLIC_API_KEY MW_RUM_TOKEN; do
    eval "v=\${$k:-}"
    [ -n "$v" ] && { eval "[ -n \"\${${k}_SRC:-}\" ]" || eval "${k}_SRC=env"; continue; }
    for f in .env.local .env "$HOME/.config/middleware/credentials.env"; do
      [ -f "$f" ] || continue
      v=$(grep -E "^(export )?$k=" "$f" | tail -1 | cut -d= -f2- | sed -E "s/^[\"']//; s/[\"']$//; s/\r$//")
      [ -n "$v" ] && { export "$k=$v"; eval "${k}_SRC='$f'"; break; }
    done
  done
  # Derive UID <-> target.
  if [ -z "${MW_UID:-}" ] && [ -n "${MW_TARGET:-}" ]; then
    MW_UID=$(printf '%s' "$MW_TARGET" | sed -E 's#^https?://([^.]+)\..*#\1#'); export MW_UID; MW_UID_SRC="MW_TARGET (derived)"
  fi
  if [ -z "${MW_TARGET:-}" ] && [ -n "${MW_UID:-}" ]; then
    export MW_TARGET="https://$MW_UID.middleware.io:443"; MW_TARGET_SRC="MW_UID (derived)"
  fi
}
mw_show() {
  local k v s
  for k in MW_TARGET MW_UID MW_API_KEY MW_PUBLIC_API_KEY MW_RUM_TOKEN; do
    eval "v=\${$k:-}; s=\${${k}_SRC:-}"
    case "$k" in MW_TARGET|MW_UID) shown="$v" ;; *) shown="${v:+set …${v: -4}}" ;; esac
    printf '%-18s %s%s\n' "$k" "${shown:-<missing>}" "${s:+  (from $s)}"
  done
}
mw_load; mw_show
```

## Installed agent (ingestion key + target only)

Read in place, on the machine being set up; don't copy the key elsewhere unless the user asks.

| Install | File | Keys |
|---|---|---|
| Linux managed / OpAMP (`mw-agent-opamp` service) | `/etc/mw-agent/mw-supervisor.env` | `MW_API_KEY=`, `MW_TARGET=` |
| Linux classic (`mw-agent` service) | `/etc/mw-agent/agent-config.yaml` (or `mw-agent.env`) | `api-key:`, `target:` |
| Kubernetes | `helm get values mw-agent -n mw-agent-ns` | `global.mw.apiKey`, `global.mw.target` |

```bash
F=/etc/mw-agent/mw-supervisor.env
sudo grep -E '^MW_(API_KEY|TARGET)=' "$F" | sed -E 's/^(MW_API_KEY=).*(.{4})$/\1…\2/'
```

The target may not follow the `<uid>.middleware.io` pattern on some environments (e.g. a dedicated or regional subdomain). Take it as-is from the agent rather than rebuilding it from the UID.

## Validate

```bash
mw_load
# Connectivity (any HTTP code = reachable)
curl -s -o /dev/null -m 10 -w 'target reachable: HTTP %{http_code}\n' "$MW_TARGET" || echo "target unreachable (DNS/TLS/egress/proxy)"

# Ingestion key: one real data point (empty payloads return 200 even with a bad key)
now=$(date +%s)000000000
body='{"resourceMetrics":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"mw-setup-key-check"}}]},"scopeMetrics":[{"metrics":[{"name":"mw.setup.key_check","gauge":{"dataPoints":[{"asInt":"1","timeUnixNano":"'"$now"'"}]}}]}]}]}'
curl -s -m 15 -o /dev/null -w 'ingestion key: HTTP %{http_code} (200=valid, 400=wrong key/target)\n' \
  -X POST "${MW_TARGET%/}/v1/metrics" -H "authorization: $MW_API_KEY" -H 'Content-Type: application/json' -d "$body"

# Public API key
curl -s -m 15 -o /dev/null -w 'public API key: HTTP %{http_code} (2xx=valid, 401=invalid or ingestion key used)\n' \
  -H "Authorization: ApiKey $MW_PUBLIC_API_KEY" "https://$MW_UID.middleware.io/api/v1/agent/hosts"
```

Observed responses (2026-10-26):
- OTLP: valid key → `200 {"partialSuccess":{}}`; wrong key → `400 {"code":3,"message":"agent config not found"}`; no header → `400 … token is missing from the header`.
- REST: valid → `202` with a JSON array of host IDs; invalid → `401 {"error":"invalid API key"}`.

## Saving a pasted value (fallback)

Write it without echoing, mode 600:
```bash
umask 077; mkdir -p ~/.config/middleware; f=~/.config/middleware/credentials.env
touch "$f"; chmod 600 "$f"
# replace or append KEY=value; the value comes from the agent's tool input, never printed back
grep -v '^MW_PUBLIC_API_KEY=' "$f" > "$f.tmp" || true; printf 'MW_PUBLIC_API_KEY=%s\n' "$VALUE" >> "$f.tmp"; mv "$f.tmp" "$f"
```

For a project `.env.local` / `.env`: `git ls-files --error-unmatch <file>` must fail (untracked), and `git check-ignore -q <file>` must succeed; otherwise add the file to `.gitignore` first.
