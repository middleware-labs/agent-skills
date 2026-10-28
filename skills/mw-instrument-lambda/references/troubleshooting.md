# Lambda troubleshooting

Start with `aws logs tail /aws/lambda/<name> --since 15m` after an invocation.

| Symptom / log line | Cause | Fix |
|---|---|---|
| No traces at all, no OTel lines in logs | `AWS_LAMBDA_EXEC_WRAPPER` missing or wrong | `/opt/otel-handler` (Node, Java) or `/opt/otel-instrument` (Python) |
| `exec wrapper … no such file` | Language layer not attached, or wrong order | Re-check `Layers`; Collector first, then language |
| Layer rejected on update: incompatible runtime/architecture | Layer doesn't list the function's runtime or arch | `get-layer-version-by-arn` → pick a compatible release; collector arch must match (`amd64`/`arm64`) |
| `AccessDeniedException … GetLayerVersion` when checking an ARN | ARN doesn't exist (wrong version, name or region) | Resolve the version from releases again (`layers.md`) |
| `Cannot find module './lambda-config.js'` | File not in the package (or bundler dropped it) | Include it at the package root; CDK `NodejsFunction` needs a bundling hook |
| ESM handler, instrumentation not loading | `--require` used with ESM | `NODE_OPTIONS=--import ./lambda-config.mjs` |
| Collector `failed to get config` / exits at start | `OPENTELEMETRY_COLLECTOR_CONFIG_URI` wrong or file missing | `/var/task/collector.yaml` must be in the package root (or valid `s3://`/`https://`) |
| Collector `401`/`400` from Middleware | Wrong key or target; key not in env for `${env:MW_API_KEY}` | Check `MW_API_KEY` env and endpoint `https://<MW_UID>.middleware.io:443` |
| Logs missing, traces fine | Logs only flush on the next invocation (`decouple`), missing `service.name`, or no logs pipeline | Invoke again; keep `resource` with `service.name`; add the `telemetryapi` logs pipeline |
| Python logs duplicated | Logger propagates to root | `logger.propagate = False` |
| Spans missing or partial | Freeze before export | Node: `SimpleSpanProcessor` via `lambda-config.js`; Python: `OTEL_BSP_SCHEDULE_DELAY=500`; Go: `otellambda.WithFlusher(tp)`; enough `Timeout` |
| Timeouts or slow cold starts after enabling | Agent/collector start-up (Java especially), remote collector config | Raise `Timeout`/memory; load config from `/var/task` instead of S3/HTTPS |
| Connection timeouts to `*.middleware.io` | Function in a VPC without egress | NAT gateway (or egress path); security group/NACL allow outbound 443 |
| Warning: `otlp` exporter deprecated | Collector ≥ contrib v0.145.0 | Rename the exporter to `otlp_grpc` in `exporters` and pipelines |
| Traces not connected across services | Mixed propagation formats | Same `OTEL_PROPAGATORS` everywhere; `tracecontext,xray` if upstream uses X-Ray headers |
| Change disappeared after a deploy | Function is IaC-managed, change was made via CLI | Put the change in the template |
