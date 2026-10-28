# Lambda troubleshooting

Start with `aws logs tail /aws/lambda/<name> --since 15m` after an invocation. For collector problems, set `OPENTELEMETRY_EXTENSION_LOG_LEVEL=debug` first; at `info` it hides config errors.

| Symptom / log line | Cause | Fix |
|---|---|---|
| No traces at all, no OTel lines in logs | `AWS_LAMBDA_EXEC_WRAPPER` missing or wrong | `/opt/otel-handler` (Node, Java) or `/opt/otel-instrument` (Python) |
| `exec wrapper … no such file` | Language layer not attached, or wrong order | Re-check `Layers`; Collector first, then language |
| Layer rejected on update: incompatible runtime/architecture | Layer doesn't list the function's runtime or arch | `get-layer-version-by-arn` → pick a compatible release; collector arch must match (`amd64`/`arm64`) |
| `AccessDeniedException … GetLayerVersion` when checking an ARN | ARN doesn't exist (wrong version, name or region) | Resolve the version from releases again (`layers.md`) |
| `Cannot find module './lambda-config.js'` | File not in the package (or bundler dropped it) | Include it at the package root; CDK `NodejsFunction` needs a bundling hook |
| ESM handler, instrumentation not loading | `--require` used with ESM | `NODE_OPTIONS=--import ./lambda-config.mjs` |
| `Extension.InitError`; log only says `unable to start, otelcol state is Closed` | Collector config failed to load; the real reason is hidden at `info` | Set `OPENTELEMETRY_EXTENSION_LOG_LEVEL=debug`, invoke again, and read the `failed to get config: …` line |
| `failed to get config: … yaml: line N: did not find expected ',' or '}'` | `${env:VAR}` inside an inline `{ … }` YAML mapping | Use block-style YAML or quote the value (`"${env:MW_API_KEY}"`) |
| Collector `failed to get config` / exits at start | `OPENTELEMETRY_COLLECTOR_CONFIG_URI` wrong or file missing | `/var/task/collector.yaml` must be in the package root (or valid `s3://`/`https://`) |
| Collector `401`/`400` from Middleware | Wrong key or target; key not in env for `${env:MW_API_KEY}` | Check `MW_API_KEY` env and endpoint `https://<MW_UID>.middleware.io:443` |
| Logs missing, traces fine | Logs only flush on the next invocation (`decouple`), missing `service.name`, or no logs pipeline | Invoke again; keep `resource` with `service.name`; add the `telemetryapi` logs pipeline |
| Python logs duplicated | Both Telemetry API stdout copy and OTel logging copy are shipped | `telemetryapi: types: [platform]` in `collector.yaml` (don't use `logger.propagate = False`) |
| Python app logs missing (traces fine), OTel logging enabled | `logger.propagate = False` stops records reaching the root OTLP handler; or `types: [platform]` without logging instrumentation | Remove `propagate = False`; set `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` + `OTEL_LOGS_EXPORTER=otlp` |
| Logs in Middleware have no `traceId` | Logs came from the Telemetry API (stdout copies) | Python: OTel logging instrumentation over OTLP. Node.js: needs an OTel logs bridge (pino/winston) |
| Python: `Failed to export metrics batch code: 404, reason: Not Found` | `collector.yaml` has no `metrics` pipeline | Add `metrics: {receivers: [otlp], processors: [resource, decouple], exporters: [otlp]}` |
| Outbound HTTP call has no span (Python) | `urllib`, `urllib3`, `httpx` aren't instrumented by the layer | Add the matching `opentelemetry-instrumentation-*` package, or use `requests` |
| Spans missing or partial | Freeze before export | Node: `SimpleSpanProcessor` via `lambda-config.js`; Python: `OTEL_BSP_SCHEDULE_DELAY=500`; Go: `otellambda.WithFlusher(tp)`; enough `Timeout` |
| Timeouts or slow cold starts after enabling | Agent/collector start-up (Java especially), remote collector config | Raise `Timeout`/memory; load config from `/var/task` instead of S3/HTTPS |
| Collector warns `grpc: addrConn.createTransport failed to connect to {Addr: "[2606:…]:443"…` | gRPC also tries the endpoint's IPv6 addresses; Lambda outside a VPC has no IPv6 egress | Harmless if there are no `Exporting failed` lines (exports go over IPv4). Check with `aws logs tail … \| grep -c 'Exporting failed'` |
| Connection timeouts to `*.middleware.io` | Function in a VPC without egress | NAT gateway (or egress path); security group/NACL allow outbound 443 |
| Warning: `otlp` exporter deprecated | Collector ≥ contrib v0.145.0 | Rename the exporter to `otlp_grpc` in `exporters` and pipelines |
| Traces not connected across services | Mixed propagation formats | Same `OTEL_PROPAGATORS` everywhere; `tracecontext,xray` if upstream uses X-Ray headers |
| Change disappeared after a deploy | Function is IaC-managed, change was made via CLI | Put the change in the template |
| Python: `Failed to export spans batch code: 400, reason: Bad Request` | Wrong key, or the `authorization` header is missing (direct export) | `OTEL_EXPORTER_OTLP_HEADERS=authorization=<MW_API_KEY>`; check the endpoint is `https://<MW_UID>.middleware.io:443` |
| Node: `metrics export failed (error OTLPExporterError: Bad Request)` | Wrong `mw.account_key` or endpoint | Check `OTEL_RESOURCE_ATTRIBUTES=mw.account_key=<key>` and `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `WARN: AWS Lambda has removed support for callback-based function handlers starting with Node.js 24` | The OTel Node.js wrapper uses a callback-style signature | Harmless on Node.js 20/22; test before upgrading an instrumented function to `nodejs24.x` |
