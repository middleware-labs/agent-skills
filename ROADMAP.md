# Roadmap & handoff notes

This document captures the current state of the Middleware agent skills, the design decisions made so far, and the work still to do, so anyone on the team can pick it up.

## Current state (v0.1 preview)

| Skill | Status |
|---|---|
| `mw-setup` | ✅ Done |
| `mw-instrument-host` | ✅ Done (Linux, Docker, Windows, macOS, ECS) |
| `mw-instrument-k8s` | ✅ Done (Helm v3 chart, auto-instrumentation, GitOps) |
| `mw-instrument-apm` | ✅ Done (Node, NestJS, Next.js, Python, Java, Go, .NET, PHP, Ruby) |
| `mw-instrument-lambda` | ✅ Done: Node.js and Python verified end-to-end on real AWS + Middleware (CLI path, with and without Collector). Java, Go, .NET and IaC paths written but untested; see section 1b |
| `mw-instrument-otel` | ✅ Done |
| `mw-instrument-rum` | ✅ Done (Browser, Android, iOS, React Native, Flutter, source maps) |
| `mw-instrument-llmo` | ✅ Done |
| `mw-integrate-db` | 🧪 Experimental: PostgreSQL verified via API; MySQL, MongoDB, Redis unverified |
| `mw-troubleshoot` | ❌ Not started — **top priority** |

- CI (`.github/workflows/validate.yml`): lints frontmatter + reference links (`scripts/validate-skills.mjs`) and smoke-tests `npx skills add` installation.
- Skills were written from docs.middleware.io, middleware-labs GitHub repos, install scripts and package registries as of **2026-10-21**. They have **not yet been tested end-to-end with real agents** on real hosts/clusters/apps.

## Design decisions

1. **Layout follows [datadog-labs/agent-skills](https://github.com/datadog-labs/agent-skills):** one `SKILL.md` per skill (frontmatter: `name`, `description`, `metadata`) + a `references/` folder loaded on demand.
2. **`SKILL.md` = workflow and judgement** (detect → choose mode → instrument → verify), plus guardrails:
   - Confirm before running `sudo`, `helm` or `kubectl apply`.
   - Never commit API keys.
   - Exactly one SDK init.
   - Copy names exactly from references.
   - Never claim data arrived unless it was observed.
3. **`references/` = exact facts** (package names, commands, env vars, ports, known traps), each with a source URL. We vendor these instead of telling agents to "read the docs" because:
   - docs.middleware.io is client-rendered, so agents' fetches often return almost nothing.
   - There is no `llms.txt` on docs.middleware.io. The mirror at mw-docs.middleware.io is stale (e.g. old `middleware-apm` Python package).
   - Several doc snippets contain typos (see "Docs issues found" below).
   - Without exact facts, agents invent package names and APIs.
4. **Verification uses the Middleware MCP server** (`https://mcp.middleware.io/mcp`): `get_resources`, `query`, `list_rum_applications`, `list_rum_sessions`, etc.
5. **Credential types are kept strictly separate** (ingestion key vs target vs RUM token vs public API key). Mixing them up is the #1 setup mistake. See `skills/mw-setup/references/credentials.md`.

## Next steps (in priority order)

### 1. Write `mw-troubleshoot`

This is the second half of the original goal ("instrument … and then troubleshoot for any configurations").

**Unblocked (2026-10-29):** the revamped docs are live with `llms.txt`, `.md` pages and `llms-full.txt`. There are no standalone troubleshooting pages, but **~100 pages have a "Troubleshooting" section**. Plan: the skill owns the triage workflow and read-only diagnostics. For causes and fixes it greps `llms-full.txt` for the exact error string or symptom and routes to the page's Troubleshooting section, instead of vendoring tables. It keeps only verified traps the docs lack (e.g. from the Lambda E2E tests). See `mw-setup/references/docs.md`.

Proposed structure:
```
skills/mw-troubleshoot/
  SKILL.md                 # triage flow: what's missing (host? pods? traces? sessions?) → collect evidence → route
  references/
    host.md                # agent not running, no host in UI, proxy/egress, port conflicts, duplicate agents
    kubernetes.md          # CrashLoop/OOM, DaemonSet not on all nodes, CRD conflicts, webhook/cert-manager, injection not happening
    apm.md                 # StatusCode.UNAVAILABLE :9319, wrong MW_AGENT_SERVICE, missing service name, OTel API version clash, reloaders
    otel.md                # 400 bad key, gRPC vs HTTP path mismatch, Bearer prefix, 4317 vs 9319
    rum.md                 # no sessions (projectName mismatch, ad blockers, CSP, bots), CORS on propagation, source maps not resolving
    llmo.md                # init order, missing X-Trace-Source, unflushed short-lived processes
    diagnostics.md         # copy-paste evidence-collection commands per platform (read-only)
```
Principles:
- Diagnostics must be **read-only** by default.
- Every fix gets confirmation before it's applied.
- Use MCP tools to check what Middleware actually received.

Most of the raw material is already in the existing references; the "Troubleshooting" sections and the research notes below are the starting point.

### 1b. Finish `mw-instrument-lambda`

Verified so far (2026-10-28, eu-north-1, arm64): Node.js 22 and Python 3.13, CLI path, with and without the Collector. Traces, trace-linked Python logs and the negative wrong-key check were confirmed in Middleware via MCP.

**Test the remaining paths.** Throwaway function → apply the skill → invoke → MCP check → wrong-key negative test → delete:
- [ ] Java (`opentelemetry-javaagent` layer), with and without the Collector for logs. Check cold-start impact and whether `Timeout` needs raising.
- [ ] Go (`provided.al2023`, `otellambda` + OTLP/HTTP direct).
- [ ] .NET: `MW.APM` on a plain handler-style Lambda. The docs only show ASP.NET Core; find the right init point or document a plain OTel .NET SDK alternative.
- [ ] IaC paths: SAM, Serverless Framework, CDK (`NodejsFunction` bundling hook for `lambda-config.js`) and Terraform. So far only the snippets are written.
- [ ] Container-image functions (copy layer contents into `/opt`).
- [ ] x86_64 (`amd64` collector layer). Only arm64 was tested.
- [ ] The "no source" path (collector config from `s3://`).

**Skill gaps.**
- [ ] Go and .NET: add the Collector-recommended option (SDK → `localhost:9320` → `collector.yaml` → Middleware) to match the other runtimes. Upstream publishes no Go or .NET language layer, only the Collector.
- [ ] Ruby: upstream has an `opentelemetry-ruby` layer, but neither the skill nor the Middleware docs cover it. Add it (unverified until tested) and tell the docs team.
- [ ] Node.js trace-linked logs: document or automate an OTel logs bridge (`@opentelemetry/instrumentation-pino` / `-winston` + OTLP log exporter). `console.log` via the Telemetry API has no `traceId`.
- [ ] Python: test adding `opentelemetry-instrumentation-httpx` / `-urllib` / `-urllib3` to the package for functions that use them (not bundled in the layer).
- [ ] Node.js 24: the OTel Node wrapper triggers AWS's "callback-based handlers removed" warning. Verify an instrumented function actually works on `nodejs24.x`.
- [ ] Secrets: the key currently lives in plain Lambda env vars. Evaluate Secrets Manager / SSM for the collector (e.g. a `${secretsmanager:…}` provider, if the layer supports it) and the SDK paths.
- [ ] Python direct export: check whether app logs can be lost at freeze (batch log processor), as with spans.
- [ ] Troubleshooting table: several log-line wordings (wrapper not found, layer incompatibility, `Cannot find module`) were written from docs, not observed. Confirm or adjust.
- [ ] Batch mode (several functions at once): written as guidance only.

### 2. Slim references to "facts cards"

Now that skills fetch the live `.md` page first (rule added to every SKILL.md), references can shrink to: the `Source:` page URL, items **verified** in tests, known doc errors/traps, and agent-only workflow. Cut content that only restates the docs. Do it skill by skill, re-testing each.

Current size is ~4k words in SKILL.md files and ~7k in references. Target ~3k words of references. Keep:
- exact install commands, package names, imports, option keys, env vars, ports, paths;
- known traps and doc typos;
- a source URL at the top of each file.

Cut generic explanation that agents already know (e.g. most of `mw-instrument-k8s/references/gitops.md`: standard Argo CD / Flux / Terraform patterns). Do this **after** a round of real-agent testing, so we know which content agents actually rely on.

### 3. Test with real agents and add evals

- Build a small matrix of target projects/environments: kind cluster, Ubuntu VM, Docker host, Express app, FastAPI app, Spring Boot app, Next.js app (App + Pages Router), React (Vite) app.
- For each, run the skill via Claude Code (`/mw-instrument-…`) and record:
  - did it trigger;
  - did it pick the right mode;
  - did it build;
  - did data arrive;
  - did it hallucinate anything.
- Also test plain-language triggering ("Install the Middleware agent on this server") to tune `description` fields.
- Consider adding an eval suite (e.g. `claude plugin eval` or the skill-creator eval flow) and running it in CI.

### 4. Middleware-side docs improvements (lets references shrink over time)

- [x] Publish Markdown versions of the docs pages and a current `llms.txt` on docs.middleware.io. Live 2026-10-29: `llms.txt` (288 pages), `<page>.md`, `llms-full.txt`. Skills use them via `mw-setup/references/docs.md`; CI (`docs-links` job, weekly too) checks every cited page is still listed.
- [ ] Retire or redirect the stale mw-docs.middleware.io mirror.
- [ ] Fix the doc typos listed below.
- [ ] Add a docs-search tool to the Middleware MCP server, similar to Datadog's `dd-docs`.
- [ ] Long term: generate `references/` facts cards from the docs source in CI so they never drift.
- [ ] **Agent-settings API / swagger (unblocks `mw-integrate-db` leaving experimental).** Spec: `https://app.middleware.io/swagger.json`, generated from bifrost godoc.
  1. `POST /agent/setting/{hostId}` (the save call) is missing from the spec: its godoc in `agent.handler.go` is separated from `SaveHostSpecificSetting` by `const` declarations, so swag drops it.
  2. Document `value` (base64 of `{"linux": {"<db>_config": {...}}}`), or accept the plain `config` JSON field that the request struct already has.
  3. Add per-integration schemas (`postgres_config`, `mysql_config`, `mongodb_config`, `redis_config`, ...) with defaults. Today `config` is `additionalProperties: true` all the way down.
  4. Document merge semantics (keys sent under a platform replace; others are kept; `{}` removes one integration from one host).
  5. `DELETE /agent/setting/rm/{platform}/{configKey}` removes the integration from **all hosts in the project**: add a bold warning and a per-host delete.
  6. `GET /agent/setting/{hostId}` returns `token` (the host's ingestion key) and DB passwords: redact or mark them sensitive.
  7. Add `operationId`s (all 73 operations lack them), rename the `AGENT PRIVATE ROUTES` tag, merge `BUILDER`/`Builder`, and give the ingestion-token routes their own security scheme or hide them.
  8. Document `Authorization: ApiKey <key>`, the base URL `https://<project_uid>.middleware.io/api/v1`, and that hostId = agent hostname. Type `isKubeAgent`, `platform` and `configKey` with enums. Give detected-integrations a real response schema.
  9. Trim the ~19k-character `info.description`, link `swagger.json` from the docs page as a plain link, and publish `llms.txt`.
  10. Ideally add MCP tools (`list_detected_integrations`, `configure_db_integration`) that validate payloads server-side.

### 5. Packaging & distribution

- [ ] Add a Claude Code plugin manifest (`.claude-plugin/plugin.json` + `marketplace.json`), so users can `/plugin marketplace add middleware-labs/agent-skills`. The empty `.claude-plugin/` dir was planned for this.
- [ ] Decide public vs private. `npx skills add middleware-labs/agent-skills` only works for people with repo access while it's private.
- [ ] Confirm the license (MIT chosen as a placeholder, matching Datadog).
- [ ] Add version tags/releases and a CHANGELOG; bump `metadata.version` per skill on change.

### 5b. Credentials: browser sign-in (later; needs backend work)

Today `mw-setup` uses env/file discovery plus manual entry (v0.2.0). The target state is Datadog-style browser sign-in: OAuth PKCE with a loopback redirect, then fetch the target and ingestion key, then write a mode-600 file. bifrost already has DCR, PKCE and refresh. Missing:
- [ ] Enforce OAuth scopes on API routes (granted scopes are stored but not checked today). Prerequisite for anything below.
- [ ] Scope allowlist + new scopes `credentials:read`, `agent_settings:read`, `agent_settings:write`.
- [ ] `GET /api/v1/onboarding/credentials` (project UID, target, ingestion key) instead of the UI-internal `/account/init`.
- [ ] Pre-registered public client `mw-agent-skills` (PKCE, no secret, any loopback port).
- [ ] MCP tools `get_ingestion_credentials`, `list_detected_integrations`, `configure_db_integration`, so skills can use MCP as the primary path.

Estimate ~5–8 backend engineer-days for the must-haves, plus ~2 days on the skills side.

### 6. Cross-agent compatibility (TODO)

The skills follow the open [Agent Skills](https://agentskills.io) format (`SKILL.md` + `references/`), so they aren't Claude-only. Claude Code, OpenAI Codex, Cursor, GitHub Copilot and Gemini CLI read them natively, and `npx skills add` installs into each. A few parts still lean on Claude Code, and quality varies by model, so:

- [ ] **Test across agents.** Run the same prompts in Codex, Cursor and Copilot alongside Claude Code; record triggering, guardrail-following and hallucinations in the test matrix (section 3).
- [ ] **Vendor-neutral README.** Show Middleware MCP setup for several clients (Claude Code, Cursor, Codex, VS Code/Copilot), not only `claude mcp add`. Describe invocation as "name the skill or describe the task", with `/skill-name` as the Claude Code shortcut.
- [ ] **Multi-agent CI smoke test.** Extend `.github/workflows/validate.yml` to install with `--agent claude-code,codex,cursor` (or similar) and check each agent's skills directory.
- [ ] **`AGENTS.md` index (optional).** Add a root `AGENTS.md` that lists the skills and when to use each, for tools without native skill support.
- [ ] **Review frontmatter.** `metadata.alwaysApply` was copied from Datadog's format and is ignored by most tools; keep or drop it.

### 7. More skills (later)

- `mw-synthetics`: create/update HTTP and browser checks via MCP (`create_synthetic_check`, `create_browser_test`).
- `mw-dashboards` / `mw-alerts`: dashboards, widgets, alert rules via MCP or the public API.
- `mw-logs`: log pipelines, custom log paths, parsing (currently split across host/otel skills).
- `mw-setup/references/mcp.md`: check tool names against the live Middleware MCP server (connected 2026-10-28; actual tools include `query`, `get_resources`, `get_metrics`, `list_errors`, `get_error_details`, `list_rum_*`, synthetics and dashboards/widgets). Also document the workflow `get_resources` → `get_metrics(filters/metrics)` → `query`.
- `mw-integrate-db`: verify MySQL, MongoDB and Redis via the API; add SQL Server, Oracle, ClickHouse, Kafka and other integrations; Kubernetes-agent integrations (`config.k8s`).
- Cloud integrations (AWS/Azure/GCP), `mw-onboarding` orchestrator that chains setup → host/k8s → APM → RUM.

## Unverified facts — confirm with product/eng

These are used or mentioned in the skills but could not be confirmed from public docs:

| Item | Where used | Note |
|---|---|---|
| K8s inject annotations other than `inject-java` (`inject-nodejs`, `inject-python`, `inject-dotnet`, `inject-go`, …) | `mw-instrument-k8s/references/auto-instrumentation.md` | Standard OTel Operator keys; Middleware documents only Java. Ruby key unknown. |
| `mw.apiKeyFromExistingSecret.*` Helm sub-keys | `mw-instrument-k8s/references/helm.md`, `gitops.md` | Need the exact keys from `helm show values`. |
| Helm values for agent resources/tolerations | `helm.md#platform-notes` | Skill tells agents to read `helm show values`. |
| Full ECS task-definition JSON and the "mw-ecs CLI" | `mw-instrument-host/references/ecs.md` | Only fragments in the docs; current JSON is a template. |
| Where the ingestion key lives in the UI | `mw-setup` | Only a community answer (Settings → API Keys → Ingestion key). |
| Regions / non-`middleware.io` domains | `mw-setup` | Not documented. |
| Custom host log paths via local YAML | `mw-instrument-host` | Docs only show UI (Log Ingestion Control). |
| Upgrade procedure for the Linux agent | `mw-instrument-host/references/linux.md` | Re-running the installer appears to work (based on reading the scripts); not documented. |
| Agentless mode for PHP / Ruby (outside Heroku) | `mw-instrument-apm` | Not documented. |
| Browser RUM `identify()` API | `mw-instrument-rum` | Docs only show `setAttributes`. |
| Browser RUM: Angular / Vue / Nuxt / SvelteKit snippets | `mw-instrument-rum/references/browser.md` | Written from generic patterns (script in HTML shell). |
| RUM trace propagation default (`b3` vs W3C, "every origin") | `mw-instrument-rum` | Docs pages conflict. |
| Next.js 15+ config keys (`serverExternalPackages`) | `mw-instrument-apm/references/nextjs.md` | Docs target Next 13/14. |
| Fluent Bit `opentelemetry` output to Middleware | `mw-instrument-otel/references/otlp.md` | Docs now have a Fluent Bit page (`get-started/agent/fluent-bit.md`); the skill points to it. Fold its exact config into the reference. |
| OpenInference content-hiding env vars | `mw-instrument-llmo` | From OpenInference, not Middleware docs. |

## Docs issues found (report to docs team)

- Node.js docs: `track.errorRecord(e)` should be `tracker.errorRecord(e)`.
- Java docs: `-Dotel.traces.sampler=otel.traces.sampler=parentbased_traceidratio` should be `-Dotel.traces.sampler=parentbased_traceidratio`.
- Lambda Java docs: `mw.account_key==<KEY>` has a double `=`.
- Lambda Python docs (revamp): the `collector.yaml` example has no `metrics` pipeline, so the SDK logs `Failed to export metrics batch code: 404` on every invocation. The `logger.propagate = False` advice also breaks trace-linked OTel logs; recommend `telemetryapi: types: [platform]` + `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` instead (verified 2026-10-28).
- Node.js docs say Node 18.17.1+, but the npm `engines` field says `^18.19.0 || >=20.6.0`.
- Python docs say 3.9+, but PyPI `requires_python` says `>=3.8`.
- RUM docs disagree on the default propagation format (b3 vs W3C).
- mw-docs.middleware.io (and its `llms.txt`) still documents the old Python `middleware-apm` / `middleware.ini` flow.
- The browser RUM source repo is private and there's no npm package. If an npm package is planned, the RUM skill should add a bundler path.

## How to contribute

1. Edit or add `skills/<name>/SKILL.md` and `skills/<name>/references/*.md`.
2. Run `node scripts/validate-skills.mjs`.
3. Test locally with `npx skills add ./ --skill <name> --agent claude-code -y`, then try it in Claude Code with `/<name>` and with a plain-language prompt.
4. Open a PR; CI validates and smoke-tests installation.
