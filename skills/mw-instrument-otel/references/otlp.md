# OTLP to Middleware

Source: https://docs.middleware.io/get-started/agent/otel.md · https://docs.middleware.io/get-started/agent/otel-logs.md

## Endpoints

| Protocol | Endpoint |
|---|---|
| gRPC (all signals) | `https://<MW_UID>.middleware.io:443` (no path) |
| HTTP/protobuf | `https://<MW_UID>.middleware.io:443/v1/traces`, `/v1/metrics`, `/v1/logs` |
| Local host agent | gRPC `localhost:9319`, HTTP `http://localhost:9320` |
| K8s agent | `mw-service.mw-agent-ns.svc.cluster.local:9319` / `:9320` |

Auth header (lowercase key, raw value — no `Bearer`): `authorization: <MW_API_KEY>`. Missing/invalid key on OTLP/HTTP → **400**.
Optional resource attribute: `mw.resource.type=custom`.

## SDK environment variables (any language)

```bash
OTEL_SERVICE_NAME=<service-name>
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_EXPORTER_OTLP_HEADERS=authorization=<MW_API_KEY>
OTEL_EXPORTER_OTLP_PROTOCOL=grpc            # or http/protobuf (SDK appends /v1/<signal> to the base endpoint)
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_PROPAGATORS=b3,tracecontext,baggage    # b3 for Middleware RUM correlation
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=prod,service.version=1.2.3
```
Note: with `OTEL_EXPORTER_OTLP_ENDPOINT` (base) the SDK appends `/v1/traces` for HTTP. With the per-signal vars (`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`) you must include the full path yourself.

Quick test without sending: `OTEL_TRACES_EXPORTER=console`.

## OpenTelemetry Collector

```yaml
exporters:
  otlp/middleware:
    endpoint: https://<MW_UID>.middleware.io:443
    headers:
      authorization: ${env:MW_API_KEY}
  # or HTTP:
  otlphttp/middleware:
    endpoint: https://<MW_UID>.middleware.io:443   # otlphttp appends /v1/<signal> itself
    headers:
      authorization: ${env:MW_API_KEY}

processors:
  batch: {}

service:
  pipelines:
    traces:  { receivers: [otlp], processors: [batch], exporters: [otlp/middleware] }
    metrics: { receivers: [otlp], processors: [batch], exporters: [otlp/middleware] }
    logs:    { receivers: [otlp], processors: [batch], exporters: [otlp/middleware] }
```
(Middleware's doc example sets `otlphttp.endpoint` to `.../v1/traces`; that works for a traces-only pipeline. For multi-signal pipelines use the base URL, or per-signal `traces_endpoint`/`metrics_endpoint`/`logs_endpoint`.)

## Raw OTLP/HTTP JSON (logs)

`POST https://<MW_UID>.middleware.io:443/v1/logs`, header `Authorization: <MW_API_KEY>`, `Content-Type: application/json`. Include resource attributes `mw.account_key=<MW_API_KEY>` and `mw.resource_type=custom`.

## Other log shippers

Fluent Bit, Fluentd, Logstash, Datadog dual shipping and other log shippers have dedicated pages. Find them in the **Third Party Agents** section of https://docs.middleware.io/llms.txt (e.g. https://docs.middleware.io/get-started/agent/fluent-bit.md, https://docs.middleware.io/get-started/agent/fluentd.md). Fetch the page before configuring a shipper; the snippet below is a generic fallback using Fluent Bit's `opentelemetry` output plugin:
```ini
[OUTPUT]
    Name        opentelemetry
    Match       *
    Host        <MW_UID>.middleware.io
    Port        443
    Logs_uri    /v1/logs
    Tls         On
    Header      authorization ${MW_API_KEY}
```
Or forward to a local Middleware agent's Fluent Forward port `127.0.0.1:8006` (`Name forward`).
Verify the plugin keys against the Fluent Bit version in use.
