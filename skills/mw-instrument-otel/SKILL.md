---
name: mw-instrument-otel
description: Send existing OpenTelemetry data (traces, metrics, logs) to Middleware — configure OTel SDK env vars, OpenTelemetry Collector exporters, or agents like Fluent Bit/Fluentd to export OTLP to the Middleware OTLP endpoint (your-uid.middleware.io:443) with the authorization header, or route through a local Middleware agent on ports 9319/9320. Use when a project already uses OpenTelemetry or an OTel Collector, when a language has no Middleware SDK, or when asked to "point OTel at Middleware", add a Middleware exporter, or ship logs via OTLP.
metadata:
  version: "0.1.1"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,opentelemetry,otlp,collector,traces,metrics,logs,fluent-bit
  alwaysApply: "false"
---

# OpenTelemetry → Middleware

Use this when the app already emits OTel (or should use vanilla OTel). Don't replace a working OTel setup with a Middleware SDK unless the user asks — just change where it exports.

## Ground rules

- Copy endpoints, header names and exporter keys exactly from `references/otlp.md`.
- Keep the API key out of committed config: use `${env:MW_API_KEY}` in Collector YAML, Secrets in K8s, and env vars for SDKs.
- Change one thing: the exporter destination/auth. Preserve existing processors, sampling, resource attributes and other exporters (fan-out is fine).
- Make sure `service.name` is set on every service (`OTEL_SERVICE_NAME`).
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Workflow

1. **Find the current OTel setup**: `OTEL_*` env in Dockerfiles/manifests/compose/.env, SDK init code (`NodeSDK`, `TracerProvider`, `opentelemetry-instrument`, `-javaagent:opentelemetry-javaagent.jar`), Collector configs (`otelcol*.yaml`, `opentelemetry-collector` Helm values), Fluent Bit/Fluentd configs.
2. **Choose the route**:
   - **Via the local Middleware agent** (agent already on host/cluster): export OTLP to `localhost:9319` (gRPC) / `http://localhost:9320` (HTTP) or `mw-service.mw-agent-ns.svc.cluster.local`. No key needed in the app. ⚠️ Not 4317/4318.
   - **Direct to Middleware**: `https://<MW_UID>.middleware.io:443` with header `authorization=<MW_API_KEY>`.
   - **Via your own Collector**: add an `otlp`/`otlphttp` exporter for Middleware to the existing pipelines.
3. **Apply** the matching snippet from `references/otlp.md` (SDK env vars, Collector exporter, Fluent Bit output).
4. **Propagation**: if Middleware browser RUM calls this backend, include `b3` (`OTEL_PROPAGATORS=b3,tracecontext,baggage`) — RUM sends B3 by default.
5. **Verify**: validate Collector config (`otelcol validate --config=...` or `otelcol-contrib validate`), check connectivity (`curl -sv https://<MW_UID>.middleware.io:443/health`), run with `OTEL_LOG_LEVEL=debug`, and confirm data with the MCP `query` tool / APM → Services. Report changes and what the user must set.
