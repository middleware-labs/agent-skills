# AWS Lambda

Source: https://docs.middleware.io/cloudplatform/aws-lambda · No profiling on Lambda.

Uses the community OpenTelemetry Lambda layers (publisher account `184161586896`, region- and arch-specific). **Order matters: add the Collector layer first, then the language layer.** Copy current ARNs from https://github.com/open-telemetry/opentelemetry-lambda/releases; template:
`arn:aws:lambda:<region>:184161586896:layer:opentelemetry-collector-<amd64|arm64>-<ver>:<n>`

⚠️ On Lambda the API key is sent as resource attribute `mw.account_key`, not a header (Node/Java/Go).

## Node.js

Env vars:
```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler
NODE_OPTIONS=--require ./lambda-config.js        # ESM: --import
OTEL_SERVICE_NAME=your-service-name
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<MW_API_KEY>
OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION=true
OTEL_PROPAGATORS=tracecontext
```
`lambda-config.js`:
```js
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
global.configureTracerProvider = (tracerProvider) => {
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));
};
```

## Python

```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument
OPENTELEMETRY_COLLECTOR_CONFIG_URI=/var/task/collector.yaml
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9320
OTEL_BSP_SCHEDULE_DELAY=500
OTEL_SERVICE_NAME=your-service-name
```
`collector.yaml` (bundled in the deployment package):
```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:
exporters:
  otlp:
    endpoint: https://<MW_UID>.middleware.io:443
    headers:
      authorization: <MW_API_KEY>
service:
  pipelines:
    traces:  { receivers: [otlp], exporters: [otlp] }
    metrics: { receivers: [otlp], exporters: [otlp] }
    logs:    { receivers: [otlp], exporters: [otlp] }
```
Set `logger.propagate = False` on your app logger or logs appear twice.

## Java

```
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler
OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<MW_API_KEY>
OTEL_EXPORTER_OTLP_ENDPOINT=https://<MW_UID>.middleware.io:443
OTEL_SERVICE_NAME=your-service-name
```
(The docs show `mw.account_key==` — that's a typo; use a single `=`.)

## Go (no layer)

Wrap the handler with `go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda`:
```go
exp, _ := otlptracehttp.New(ctx, otlptracehttp.WithEndpointURL("https://<MW_UID>.middleware.io/v1/traces"))
res, _ := resource.New(ctx, resource.WithAttributes(
    attribute.String("service.name", "your-service-name"),
    attribute.String("mw.account_key", os.Getenv("MW_API_KEY")),
))
tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exp), sdktrace.WithResource(res))
lambda.Start(otellambda.InstrumentHandler(handler, otellambda.WithTracerProvider(tp), otellambda.WithFlusher(tp)))
```

## .NET

Use `MW.APM` (see `dotnet.md`, agentless section) with `MW:ApiKey`, `MW:TargetURL`, `MW:ServiceName`.

## Troubleshooting

- `AWS_LAMBDA_EXEC_WRAPPER` missing/wrong → no instrumentation.
- Layer ARN region/arch mismatch with the function.
- Function in a VPC without NAT → can't reach Middleware.
- HTTP exporters need the `/v1/traces` path; gRPC uses the root URL.
- Spans lost at freeze → lower `OTEL_BSP_SCHEDULE_DELAY` / use `SimpleSpanProcessor`.
- Check CloudWatch logs for exporter errors.
