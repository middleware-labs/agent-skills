---
name: mw-setup
description: Discover, collect and validate Middleware credentials before any instrumentation — the ingestion API key (MW_API_KEY), the target URL (MW_TARGET, https://your-uid.middleware.io:443), the public API key (MW_PUBLIC_API_KEY) and RUM tokens — from env vars, .env files, a user credentials file, or an installed agent; guide the user to provide missing ones safely; validate them against Middleware; and connect the Middleware MCP server to verify data. Use when a user starts with Middleware, asks where to find their API key or target, hits a 400/401 from Middleware, or when another mw-* skill needs credentials.
metadata:
  version: "0.2.0"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,setup,credentials,api-key,mcp,onboarding
  alwaysApply: "false"
---

# Middleware setup: credentials, connectivity, MCP

Other `mw-*` skills call this one when they need credentials. Goal: get to **validated values in the environment or a mode-600 file, never in chat or git**, then hand back.

## Ground rules

- Never invent an API key, UID or target URL.
- Never print a full secret, write it to a tracked file, a commit, or persistent memory. Show only `…last4` plus where it came from.
- Ask only for the credentials the calling task needs (table below), not all of them up front.
- Treat the credential types as distinct (`references/credentials.md`). Mixing them up is the #1 setup mistake.

| Task | Needs |
|---|---|
| Host / K8s agent, APM, OTel, LLM Obs | `MW_API_KEY` (ingestion) + `MW_TARGET` |
| DB integrations / any REST API call (`mw-integrate-db`) | `MW_PUBLIC_API_KEY` + `MW_UID` |
| Browser / mobile RUM | RUM account token + `MW_TARGET` |
| Verifying data arrived | Middleware MCP server (OAuth in the agent client; no key) |

## Workflow

### 1. Discover

Run the loader in `references/discovery.md`. Shell state doesn't persist between commands, so repeat the loader at the top of any later command that needs the values. Precedence, first match wins:

1. Shell environment (`MW_API_KEY`, `MW_TARGET`, `MW_UID`, `MW_PUBLIC_API_KEY`, `MW_RUM_TOKEN`)
2. Project `.env.local`, then `.env`
3. User file `~/.config/middleware/credentials.env`
4. Ingestion key + target only, read in place on the machine being set up: installed agent (`/etc/mw-agent/mw-supervisor.env` for managed/OpAMP installs, `/etc/mw-agent/agent-config.yaml` or `mw-agent.env` for classic installs) or Helm values (`helm get values mw-agent -n mw-agent-ns`).

Derive `MW_UID` from `MW_TARGET` and vice versa rather than asking twice. Report each value as `set …abcd (from .env.local)` or `<missing>`.

**Headless / CI** (non-interactive request, `CI=true`, or no TTY): stop after discovery. If anything required is missing, fail with the list of missing variable names. Don't prompt.

### 2. Collect what's missing

Tell the user exactly where to get each missing value, then offer these ways to provide it, safest first:

1. **Export before starting the agent:** `export MW_API_KEY=… MW_TARGET=…`, then restart the agent session. In Claude Code, `! export …` doesn't persist between commands.
2. **Credentials file:** the user creates `~/.config/middleware/credentials.env` (or a project `.env.local`) with `KEY=value` lines and runs `chmod 600` on it. Then re-run discovery. You never see the value.
3. **Paste in chat (fallback):** accept it, write it straight to `~/.config/middleware/credentials.env` (mode 600) without echoing it, and tell the user the key is now in the chat transcript and should be rotated once setup is done.

Where to get them:
- **Ingestion key + target:** Middleware app → **Installation** → pick a platform. The commands there have the real key and target filled in. Also under **Settings → API Keys** (ingestion key).
- **Public API key:** **Settings → API Keys** → create an API key (not the ingestion key).
- **RUM token:** **Installation → RUM → (platform) → New Application**.

When writing any project file: refuse if it's tracked by git (`git ls-files --error-unmatch <file>`), and make sure it's in `.gitignore`.

### 3. Validate

Use the checks in `references/discovery.md`:
- **Format:** target is `https://<sub>.middleware.io:443` with no path. `app.middleware.io` is wrong for ingestion.
- **Connectivity** from where telemetry will be sent (host, pod, container): any HTTP response from the target means DNS/TLS/egress are fine. A timeout or TLS error means firewall/proxy: set `HTTPS_PROXY` or open egress 443.
- **Ingestion key:** send one OTLP data point. `200` = valid; `400 agent config not found` = wrong key or wrong target/project. An empty payload returns 200 even with a bad key, so it proves nothing.
- **Public API key:** `GET /api/v1/agent/hosts`. `2xx` = valid (and lists host IDs); `401 invalid API key` = wrong key, or the ingestion key was used.

### 4. MCP (recommended)

Connect the Middleware MCP server so other skills can confirm data arrived. See `references/mcp.md`. It uses OAuth inside the agent client, so no key is needed.

### 5. Hand back

Report to the calling skill/user: each value's status (`…last4`, source, validated or not), what's still missing, and where the values live. Never the values themselves.
