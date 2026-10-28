---
name: mw-instrument-apm
description: Instrument backend applications with Middleware APM (traces, metrics, logs, profiling). Detects language, framework, runtime version, package manager, entrypoint and deployment shape (bare host, Docker, Kubernetes, Vercel; AWS Lambda is handled by mw-instrument-lambda), picks host-agent mode or agentless mode, and adds the official Middleware SDK for Node.js, NestJS, Next.js, Python, Java, Go, .NET, PHP or Ruby. Use when asked to add, set up, instrument, fix, or verify Middleware APM, distributed tracing, or application monitoring in a codebase.
metadata:
  version: "0.1.2"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,apm,tracing,opentelemetry,nodejs,python,java,go,dotnet,php,ruby,nextjs
  alwaysApply: "false"
---

# Middleware APM instrumentation

Instrument only the application(s) in scope. Do not install the host agent, RUM, or LLM Observability unless the user asks. Use `mw-instrument-host` / `mw-instrument-k8s` for agents and `mw-instrument-rum` for browsers.

## Ground rules

- Inspect before editing. Base every language, framework, version, entrypoint and command decision on project files (manifests, lockfiles, Dockerfiles, Procfiles, Helm charts, CI config).
- Copy package names, imports, function names, option keys and env vars **exactly** from `references/<language>.md`. Never recreate the SDK API from memory.
- Post a short checklist before changing anything and update it as you go.
- Initialize the tracker exactly once, as the **first** thing the process does (before importing frameworks/HTTP/DB clients). Never inside a request handler or a function that runs repeatedly.
- If a valid Middleware init already exists, keep its credentials and options and only fix what's broken or missing. Never add a second init.
- Never hard-code `MW_API_KEY` in source that gets committed. Prefer env vars / secrets (`.env` that is gitignored, K8s Secret, cloud secret manager). If the user gives you a key, only put it in an untracked or secret location, and say where.
- Use the project's own package manager and lockfile (`package-lock.json`→npm, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lock*`→bun, `poetry.lock`→poetry, `uv.lock`→uv, `Pipfile.lock`→pipenv). Never hand-edit lockfiles.
- Check the runtime meets the minimum version in `references/support-matrix.md`. If it doesn't, stop and explain the options (upgrade, legacy package, or OBI/eBPF).
- Don't write credentials, account UIDs or project details to persistent memory.
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Phase 1: Analyze

1. **Find the service(s).** In a monorepo, locate each deployable backend (look at Dockerfiles, `Procfile`, compose files, K8s manifests, CI deploy jobs). If several services are plausible and the user didn't pick, ask which ones.
2. **Detect language & framework** from manifests: `package.json` (check for `next`, `@nestjs/core`, `express`, `fastify`…), `pyproject.toml`/`requirements*.txt` (`django`, `flask`, `fastapi`, `celery`), `pom.xml`/`build.gradle*`, `go.mod`, `*.csproj`, `composer.json` (`laravel/framework`, WordPress), `Gemfile` (`rails`).
3. **Detect module system / entrypoint** (Node: `"type": "module"`, `main`, `start` script; Python: how the app is launched — gunicorn, uvicorn, manage.py, celery).
4. **Search for existing instrumentation**: `@middleware.io/`, `middleware-io`, `middleware-run`, `mw_tracker`, `middleware-javaagent`, `golang-apm`, `MW.APM`, `MwTracker`, `middleware_apm`, and plain OpenTelemetry (`@opentelemetry/`, `opentelemetry-instrument`, `-javaagent:` otel jar). Skip `node_modules`, `.venv`, `vendor`, `dist`, `build`, `target`.
   - Existing plain-OTel setup → prefer pointing it at Middleware (see `mw-instrument-otel`) rather than layering a second SDK on top.
5. **Choose the mode** (see `references/modes.md`):
   - **Host mode** — a Middleware host agent or K8s agent runs alongside the app. SDK sends OTLP to the agent (`localhost:9319` gRPC / `9320` HTTP, or `MW_AGENT_SERVICE`). Only the API key (some SDKs) and service name are needed.
   - **Agentless ("serverless") mode** — no agent. Needs `MW_API_KEY` **and** `MW_TARGET=https://<MW_UID>.middleware.io:443`.
   - If unclear, ask the user: "Is a Middleware agent running on the hosts/cluster where this service runs?"
6. **Resolve credentials** via `mw-setup` rules: env vars, existing config, or ask. Don't invent a target URL.

## Phase 2: Instrument

Open the matching reference and follow it exactly:

| Language / framework | Reference |
|---|---|
| Node.js (Express, Fastify, Koa, plain) | `references/nodejs.md` |
| NestJS | `references/nodejs.md#nestjs` |
| Next.js / Vercel | `references/nextjs.md` |
| Python (Django, Flask, FastAPI, Celery) | `references/python.md` |
| Java (Spring Boot, any JVM) | `references/java.md` |
| Go | `references/go.md` |
| .NET / ASP.NET Core / IIS | `references/dotnet.md` |
| PHP / Laravel / WordPress | `references/php.md` |
| Ruby / Rails / Heroku | `references/ruby.md` |
| AWS Lambda (any language) | Use the `mw-instrument-lambda` skill (layers, AWS CLI, IaC) |

Then wire the deployment:

- **Dockerfile** — add the install/bootstrap step (e.g. `RUN middleware-bootstrap -a install`) and change the `CMD`/`ENTRYPOINT` to the instrumented launcher (`middleware-run …`, `-javaagent:…`, `. $HOME/.mw-dotnet-auto/instrument.sh && …`). For host mode in Docker set `MW_AGENT_SERVICE=172.17.0.1` (default bridge) or the agent container name.
- **Kubernetes** — set `MW_AGENT_SERVICE=mw-service.mw-agent-ns.svc.cluster.local` when the K8s agent is installed, inject `MW_API_KEY` from a Secret, and set `MW_SERVICE_NAME`/`OTEL_SERVICE_NAME`. If the cluster has Middleware auto-instrumentation, an annotation may be all that's needed — see `mw-instrument-k8s`.
- **Service name** — always set it explicitly (`MW_SERVICE_NAME` or `OTEL_SERVICE_NAME`); default to the repo/service directory name and tell the user.
- **Trace correlation with RUM** — if the frontend uses Middleware RUM, set propagators to include `b3` (Python default is `b3`; others: `OTEL_PROPAGATORS=b3,tracecontext,baggage`).

## Phase 3: Verify & report

1. Show the diff of every changed file. Confirm there's exactly one tracker init and it runs first.
2. Install dependencies with the project's package manager and run a terminating build/compile/type-check (`npm run build`, `python -c "import middleware"`, `mvn -q package -DskipTests`, `go build ./...`, `dotnet build`). Don't start long-running servers unless asked.
3. If the user can run the app: tell them to start it, generate a few requests, and wait **3–5 minutes**. If the Middleware MCP server is connected, check for the service with `get_resources` / `query` (traces for `service.name`). Never claim data arrived unless you saw it.
4. Report: mode chosen, files changed, env vars the user must set (and where), how to verify in the UI (APM → Services), and next steps (logs correlation, custom spans, RUM). If anything fails, hand off to `mw-troubleshoot`.
