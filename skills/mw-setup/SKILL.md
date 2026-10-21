---
name: mw-setup
description: Resolve and validate Middleware credentials and connectivity before any instrumentation — the ingestion API key (MW_API_KEY), the account target URL (MW_TARGET, https://your-uid.middleware.io:443), RUM account tokens, and public-API keys — and connect the Middleware MCP server so the agent can verify that data is arriving. Use when a user starts with Middleware, asks where to find their API key or target, wants to connect Claude/agents to Middleware, or when another mw-* skill needs credentials.
metadata:
  version: "0.1.0"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,setup,credentials,api-key,mcp,onboarding
  alwaysApply: "false"
---

# Middleware setup: credentials, connectivity, MCP

Other `mw-*` skills call into this one when they need credentials or a way to verify data. Keep it short: resolve, validate, hand back.

## Ground rules

- Never invent an API key, UID or target URL. If you can't resolve one, ask the user.
- Never print a full key back to the user or write it into tracked files, commit messages, or persistent memory. Refer to it as `MW_API_KEY`, and when you must show it, mask everything but the last 4 characters.
- Treat the four credential types as distinct (see `references/credentials.md`). Mixing them up is the #1 setup mistake:
  1. **Ingestion API key** (`MW_API_KEY`) → agents, APM SDKs, OTLP.
  2. **Target** (`MW_TARGET`) → `https://<MW_UID>.middleware.io:443`.
  3. **RUM account token** (`accountKey` / `rumAccessToken`) → browser & mobile RUM, source-map upload.
  4. **Public API key** (Settings → API Keys) → REST API at `https://<MW_UID>.middleware.io/api/v1`. *Not* the ingestion key.

## Workflow

1. **Look for existing values** (don't read secret files the user hasn't pointed you at beyond what's needed):
   - Env: `MW_API_KEY`, `MW_TARGET`, `MW_UID`.
   - Host agent: `/etc/mw-agent/agent-config.yaml` (`api-key`, `target`), `/etc/mw-agent/mw-agent.env`.
   - Kubernetes: `helm get values mw-agent -n mw-agent-ns` (`global.mw.apiKey`, `global.mw.target`).
   - Project: `.env*`, Helm values, Terraform vars, CI secrets *names* (not values).
2. **If missing, tell the user where to get them:** in the Middleware app, **Installation** pages (e.g. `https://app.middleware.io/installation/...`) show copy-ready commands with the real key and UID already filled in. The key is also under the project's **Settings → API Keys** (the ingestion key). For RUM: **Installation → RUM → Browser/Android/iOS → New Application** gives the `accountKey` and endpoint.
3. **Validate the format:** target must be `https://<uid>.middleware.io:443` (gRPC/agents) — no trailing path. HTTP OTLP exporters append `/v1/traces|metrics|logs`. A target of `app.middleware.io` is wrong for ingestion.
4. **Check connectivity** from where telemetry will be sent (host, pod, container):
   ```bash
   curl -sv https://<MW_UID>.middleware.io:443/health -o /dev/null
   ```
   Any HTTP response (even 404) means DNS/TLS/egress are fine. A timeout or TLS error means firewall/proxy/NAT — set `HTTPS_PROXY` or open egress 443.
5. **Connect the Middleware MCP server** (optional but strongly recommended — lets you confirm data arrived instead of guessing). See `references/mcp.md`.
6. Hand back to the calling skill with: which values were found, where they live, and what the user still has to provide.
