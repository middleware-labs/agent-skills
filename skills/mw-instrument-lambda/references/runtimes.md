# Per-runtime setup

Source: Middleware AWS Lambda docs (https://docs.middleware.io/cloudplatform/aws-lambda; revamped version at stage-docs.middleware.io), checked 2026-10-28.

Placeholders: `<MW_UID>` from `MW_TARGET`, `<MW_API_KEY>` the ingestion key. On Lambda, Node.js, Java and Go send the key as the **resource attribute `mw.account_key`**, not a header. The Collector sends it as the `authorization` header.

## Collector or direct export?

| | With Collector layer (recommended) | Direct export (opt-out) |
|---|---|---|
| Lambda stdout/stderr + platform logs | ✅ via the `telemetryapi` receiver (no `traceId`) | ❌ (CloudWatch only) |
| Trace-linked app logs (`traceId`) | ✅ Python (OTel logging over OTLP) · ❌ Node.js | ✅ Python · ❌ Node.js |
| Export off the request path | ✅ `decouple` processor | ❌ the SDK exports during the invocation |
| Cold start | Slower (Node.js test: ~815 ms init) | Faster (Node.js test: ~440 ms init) |
| Layers used | 2 of 5 | 1 of 5 |
| Failure mode | A bad `collector.yaml` fails **every invocation** (`Extension.InitError`) | Export errors are logged; invocations still succeed |
| Where the key goes | `MW_API_KEY` env var, read by `collector.yaml` (`${env:MW_API_KEY}`) | `OTEL_RESOURCE_ATTRIBUTES=mw.account_key=…` and/or `OTEL_EXPORTER_OTLP_HEADERS=authorization=…` |

## Node.js

Layers: Collector (first), then Node.js. Env:
```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler
NODE_OPTIONS=--require ./lambda-config.js          # ESM: --import ./lambda-config.mjs
OTEL_SERVICE_NAME=<service-name>
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<MW_API_KEY>
OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION=true
OTEL_PROPAGATORS=tracecontext
```
`lambda-config.js` at the package root (exports spans as they finish, so none are lost when Lambda freezes):
```js
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
global.configureTracerProvider = (tracerProvider) => {
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));
};
```
Add `@opentelemetry/sdk-trace-base` and `@opentelemetry/exporter-trace-otlp-proto` to the package (project package manager). For function logs, also add `collector.yaml` from [Logs](#logs-any-runtime) and `OPENTELEMETRY_COLLECTOR_CONFIG_URI=/var/task/collector.yaml`, plus `MW_API_KEY=<MW_API_KEY>` (read by the collector config).

**Direct export (no Collector):** attach only the Node.js layer, and use the env above plus `lambda-config.js`. Traces go straight to `OTEL_EXPORTER_OTLP_ENDPOINT`, authenticated by `mw.account_key`. Skip `collector.yaml`, `OPENTELEMETRY_COLLECTOR_CONFIG_URI` and `MW_API_KEY`. Verified on nodejs22.x/arm64 (2026-10-28).

**Logs and trace IDs (Node.js).** `console.log` output only reaches Middleware through the Collector's Telemetry API (`types` includes `function`, the default), and **it carries no `traceId`/`spanId`**: it's a copy of stdout (verified). Direct export sends no logs at all. Trace-linked Node.js logs need an OTel logs bridge, e.g. `@opentelemetry/instrumentation-pino` or `-winston` plus an OTLP log exporter. That isn't covered here, so tell the user if they ask for log↔trace correlation.

The OTel Node.js layer's wrapper triggers an AWS warning that callback-based handlers aren't supported from Node.js 24. Test before moving an instrumented function to `nodejs24.x`.

## Python

Layers: Collector (first), then Python. Env:
```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument
OPENTELEMETRY_COLLECTOR_CONFIG_URI=/var/task/collector.yaml
OPENTELEMETRY_EXTENSION_LOG_LEVEL=info
OTEL_BSP_SCHEDULE_DELAY=500
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9320
OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION=true
OTEL_PROPAGATORS=tracecontext
OTEL_SERVICE_NAME=<service-name>
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true   # app logs over OTLP, with traceId/spanId
OTEL_LOGS_EXPORTER=otlp
MW_API_KEY=<MW_API_KEY>                            # read by collector.yaml via ${env:MW_API_KEY}
```
`collector.yaml` at the package root:
```yaml
receivers:
  telemetryapi:
    types: [platform]        # START/END/INIT_REPORT only; app logs come over OTLP (no stdout duplicates)
  otlp:
    protocols:
      grpc:
        endpoint: "localhost:9319"
      http:
        endpoint: "localhost:9320"
processors:
  resource:
    attributes:
      - key: service.name
        value: "<service-name>"
        action: upsert
  decouple: {}
exporters:
  otlp:
    endpoint: "https://<MW_UID>.middleware.io:443"
    headers:
      authorization: "${env:MW_API_KEY}"
service:
  pipelines:
    traces:
      receivers: [telemetryapi, otlp]
      processors: [resource, decouple]
      exporters: [otlp]
    logs:
      receivers: [telemetryapi, otlp]
      processors: [resource, decouple]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [resource, decouple]
      exporters: [otlp]
```
Verified on python3.13/arm64 (2026-10-28): app log lines arrive once, with `traceId`/`spanId` matching the invocation's handler span; platform logs arrive without a trace ID.
- `decouple` must be the **last** processor.
- **Keep the `metrics` pipeline.** The Python SDK exports metrics to the collector too. Without the pipeline, every invocation logs `Failed to export metrics batch code: 404, reason: Not Found`. The Middleware docs' example omits it.
- **Don't set `logger.propagate = False`** when using OTel logging instrumentation. The OTLP handler sits on the root logger, so non-propagating loggers never reach Middleware (the docs' advice to set it is for the stdout-only setup). Avoid duplicates with `telemetryapi: types: [platform]` instead. Without the logging instrumentation (stdout via `types: [platform, function]`, the default), logs arrive but **without** a `traceId`.
- Optionally set the function log format to JSON (`aws lambda update-function-configuration --logging-config LogFormat=JSON`, or `LoggingConfig` in IaC) for structured logs.
- Collector builds on contrib ≥ v0.145.0 rename the gRPC exporter `otlp_grpc`. `otlp` still works as a deprecated alias, so rename it if the logs warn.

**Direct export (no Collector):** attach only the Python layer and skip `collector.yaml`. Env:
```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument
OTEL_SERVICE_NAME=<service-name>
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=authorization=<MW_API_KEY>
OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<MW_API_KEY>
OTEL_BSP_SCHEDULE_DELAY=500
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
OTEL_LOGS_EXPORTER=otlp
OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION=true
OTEL_PROPAGATORS=tracecontext
```
The SDK appends `/v1/traces`, `/v1/logs` and `/v1/metrics` to the base endpoint. App logs from Python `logging` go over OTLP **with `traceId`/`spanId`** (verified). Keep `logger.propagate` at its default (`True`). Lambda platform logs and non-`logging` stdout stay in CloudWatch. Verified on python3.13/arm64 (2026-10-28): with a wrong key the function logs `Failed to export spans batch code: 400`; with the right key, no errors.

**What the Python layer instruments.** The layer bundles instrumentations for the Lambda handler, `botocore`/`boto3` (incl. SQS), **`requests`**, `aiohttp` client, `grpc`, DB drivers (`psycopg2`, `asyncpg`, `pymysql`, `mysql`, `pymongo`, `redis`, `sqlalchemy`, `sqlite3`, `pymemcache`) and web frameworks (Django, Flask, FastAPI, Starlette, Falcon, Pyramid, Tornado, ASGI/WSGI). **Not included: `urllib`/`urllib.request`, `urllib3`, `httpx`.** Calls made with those have no child span (verified: `requests` produced a `GET` span, `urllib.request` produced none). If the function uses them, tell the user and offer to add the instrumentation package (e.g. `opentelemetry-instrumentation-httpx`, matching the layer's `0.xxb` version) to the deployment package, or switch to `requests`.

## Java

Layer: Java agent (`opentelemetry-javaagent-*`). Env:
```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION=true
OTEL_PROPAGATORS=tracecontext
OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<MW_API_KEY>
OTEL_SERVICE_NAME=<service-name>
```
Use a single `=` after `mw.account_key`; older docs showed `==`. This is already **direct export**. To also ship Lambda logs (recommended), add the Collector layer first and the logs `collector.yaml` from [Logs](#logs-any-runtime), with `OPENTELEMETRY_COLLECTOR_CONFIG_URI=/var/task/collector.yaml` and `MW_API_KEY`. Custom spans: add `io.opentelemetry:opentelemetry-api` matching the layer's agent version. The agent adds cold-start latency, so raise `Timeout` if it's tight.

## Go (no layer)

```bash
go get github.com/aws/aws-lambda-go/lambda \
  go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda \
  go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
```
```go
exp, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpointURL("https://<MW_UID>.middleware.io:443/v1/traces"))
res := resource.NewSchemaless(
    attribute.String("service.name", "<service-name>"),
    attribute.String("mw.account_key", os.Getenv("MW_API_KEY")),
    attribute.String("library.language", "go"),
)
tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exp), sdktrace.WithResource(res))
otel.SetTracerProvider(tp)
lambda.Start(otellambda.InstrumentHandler(handler, otellambda.WithFlusher(tp)))
```
`WithEndpointURL` needs the full `/v1/traces` URL. `WithFlusher` is required, or spans are lost at freeze. Set `MW_API_KEY` as a function env var; don't hard-code it.

## .NET

`dotnet add package MW.APM`, then call `builder.Services.ConfigureMWInstrumentation(configuration)` at startup (see `mw-instrument-apm/references/dotnet.md`). Config keys `MW:ApiKey`, `MW:TargetURL` (`<MW_UID>.middleware.io:443`), `MW:ServiceName`, from env vars (`MW__ApiKey` …) rather than a committed `appsettings.json`. The docs' example is ASP.NET Core minimal hosting. Plain handler-style Lambdas may need a different init point, so tell the user this path is less proven.

## Logs (any runtime)

Collector layer + `collector.yaml` + `OPENTELEMETRY_COLLECTOR_CONFIG_URI=/var/task/collector.yaml`. The extension subscribes to the Lambda Telemetry API (stdout/stderr + platform logs):
```yaml
receivers:
  telemetryapi:
processors:
  batch:
  resource:
    attributes:
      - key: mw.account_key
        value: "${env:MW_API_KEY}"
        action: upsert
      - key: service.name
        value: "<service-name>"
        action: upsert
      - key: deployment.environment
        value: "<env>"
        action: upsert
  decouple:
exporters:
  otlp:
    endpoint: https://<MW_UID>.middleware.io:443
    headers:
      authorization: ${env:MW_API_KEY}
service:
  pipelines:
    logs: { receivers: [telemetryapi], processors: [resource, batch, decouple], exporters: [otlp] }
```
- Keep `service.name`: Middleware rejects logs without a resource identity.
- Logs collected this way are stdout copies: they have **no `traceId`**. For Python, use the OTel logging setup in [Python](#python) for trace-linked logs.
- **Never put `${env:…}` inside an inline `{ … }` YAML mapping.** The braces break parsing (`yaml: … did not find expected ',' or '}'`) and the collector won't start (`Extension.InitError`). Use block style as above, or quote the value.
- Logs are delayed. Buffered logs go out at the start of the next invocation or at shutdown.
- `OPENTELEMETRY_COLLECTOR_CONFIG_URI` also accepts `s3://` and `https://` (adds cold-start latency), which is useful when you can't repackage (see `deploy.md#no-source`).

## Container images

`PackageType: Image` can't use layers. Copy the layer contents into the image, or use the language SDK directly:
- Download the layer zip with `aws lambda get-layer-version-by-arn --arn <arn> --query Content.Location --output text`, then `curl` it.
- Unzip it into `/opt` in the Dockerfile.
- Set the same env vars.

Ask the user before changing the Dockerfile.

## X-Ray (optional)

Active tracing can stay on. For W3C propagation keep `OTEL_PROPAGATORS=tracecontext`. If upstream services rely on X-Ray headers, use compatible propagators (`tracecontext,xray`) instead of disabling AWS context propagation.
