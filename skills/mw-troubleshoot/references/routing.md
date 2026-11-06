# Where to look, by area

For each area: the docs page to read first (its Troubleshooting section has the checks and fixes), and the skill reference that holds verified traps the docs lack. Fetch the page as `.md`. Checked against https://docs.middleware.io/llms.txt on 2026-11-06.

## Agents

| Area | Docs page | Skill reference |
|---|---|---|
| Linux host agent | https://docs.middleware.io/get-started/agent/linux.md | `mw-instrument-host/references/linux.md` |
| Docker host agent | https://docs.middleware.io/get-started/agent/docker.md | `mw-instrument-host/references/docker.md` |
| Windows agent | https://docs.middleware.io/get-started/agent/windows.md | `mw-instrument-host/references/windows.md` |
| macOS agent | https://docs.middleware.io/get-started/agent/macos.md | `mw-instrument-host/references/macos.md` |
| AWS ECS | https://docs.middleware.io/get-started/agent/amazon-ecs.md | `mw-instrument-host/references/ecs.md` |
| Host log collection, log paths, masking | https://docs.middleware.io/get-started/agent/linux.md | `mw-instrument-host/SKILL.md` (Phase 3) |
| Kubernetes agent | https://docs.middleware.io/get-started/agent/kubernetes/kubernetes-agent.md | `mw-instrument-k8s/references/helm.md` |
| Kubernetes auto-instrumentation | https://docs.middleware.io/get-started/agent/kubernetes/auto-instrumentation.md | `mw-instrument-k8s/references/auto-instrumentation.md` |
| AWS Lambda | https://docs.middleware.io/get-started/agent/aws-lambda.md | `mw-instrument-lambda/references/troubleshooting.md` |
| Database integrations | The integration's page in `llms.txt` | `mw-integrate-db/references/` |

## Applications

| Area | Docs page | Skill reference |
|---|---|---|
| Node.js | https://docs.middleware.io/get-started/apm/nodejs.md | `mw-instrument-apm/references/nodejs.md` |
| NestJS | https://docs.middleware.io/get-started/apm/nestjs.md | `mw-instrument-apm/references/nodejs.md` |
| Next.js | https://docs.middleware.io/get-started/apm/nextjs.md | `mw-instrument-apm/references/nextjs.md` |
| Python | https://docs.middleware.io/get-started/apm/python.md | `mw-instrument-apm/references/python.md` |
| Java | https://docs.middleware.io/get-started/apm/java.md | `mw-instrument-apm/references/java.md` |
| Go | https://docs.middleware.io/get-started/apm/go.md | `mw-instrument-apm/references/go.md` |
| .NET | https://docs.middleware.io/get-started/apm/dotnet.md | `mw-instrument-apm/references/dotnet.md` |
| PHP | https://docs.middleware.io/get-started/apm/php.md | `mw-instrument-apm/references/php.md` |
| Ruby | https://docs.middleware.io/get-started/apm/ruby.md | `mw-instrument-apm/references/ruby.md` |
| OpenTelemetry SDK or Collector | https://docs.middleware.io/get-started/agent/otel.md | `mw-instrument-otel/references/otlp.md` |
| OpenTelemetry logs | https://docs.middleware.io/get-started/agent/otel-logs.md | `mw-instrument-otel/references/otlp.md` |
| LLM Observability | https://docs.middleware.io/features/llm.md | `mw-instrument-llmo/references/llmobs.md` |

## RUM

| Area | Docs page | Skill reference |
|---|---|---|
| Browser (HTML, SPA) | https://docs.middleware.io/get-started/rum/javascript.md | `mw-instrument-rum/references/browser.md` |
| React, React Native | https://docs.middleware.io/get-started/rum/react.md | `mw-instrument-rum/references/browser.md`, `react-native.md` |
| Next.js | https://docs.middleware.io/get-started/rum/nextjs.md | `mw-instrument-rum/references/browser.md` |
| Android | https://docs.middleware.io/get-started/rum/android.md | `mw-instrument-rum/references/android.md` |
| iOS | https://docs.middleware.io/get-started/rum/ios.md | `mw-instrument-rum/references/ios.md` |
| Flutter | https://docs.middleware.io/get-started/rum/flutter.md | `mw-instrument-rum/references/flutter.md` |

## Credentials and endpoints

Wrong key type, wrong target and wrong OTLP paths apply to every area:

- Key types and where each one is used: https://docs.middleware.io/features/accounts/api-key.md
- Common mistakes, such as `app.middleware.io` as the target, a `Bearer` prefix, or a missing `/v1/traces` path: `mw-setup/references/credentials.md`
- Sending data without an agent: https://docs.middleware.io/get-started/ingestion-api.md

## Not listed here

Search `llms.txt` for the product or integration name, then read that page's Troubleshooting section. If there's no page, search `llms-full.txt` for the exact error string.
