---
name: mw-instrument-lambda
description: Instrument AWS Lambda functions with Middleware (traces and logs via OpenTelemetry Lambda layers, the OTel Go SDK, or MW.APM for .NET). Inspects the live function with the AWS CLI (runtime, architecture, region, existing layers and env), detects whether it's managed by SAM, Serverless Framework, CDK or Terraform, resolves current layer ARNs, and applies the change in IaC or — for unmanaged functions — with a merge-safe aws lambda update-function-configuration; then invokes and verifies. Use when asked to monitor, trace, instrument, or fix Middleware on Lambda / serverless functions.
metadata:
  version: "0.1.0"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,aws,lambda,serverless,opentelemetry,apm,logs,sam,serverless-framework,cdk,terraform
  alwaysApply: "false"
---

# Middleware on AWS Lambda

Instruments Lambda functions for traces and logs. No profiling on Lambda. For containers, VMs or Kubernetes, use `mw-instrument-apm`.

## Ground rules

- **Read-only until confirmed.** Inspecting with `aws lambda get-*` / `list-*` and `aws sts get-caller-identity` is fine. Any `update-*`, deploy or `invoke` needs the user's OK. Show the exact before/after first.
- **Confirm the AWS target** before anything else: account, region and profile from `aws sts get-caller-identity` and `aws configure get region`. Ask if more than one account or profile could be meant.
- **Respect the source of truth.** If the function is defined in IaC (SAM, Serverless, CDK, Terraform), change the IaC and let the user deploy. A CLI change to an IaC-managed function is overwritten on the next deploy. Use the CLI only for functions not managed by IaC, or when the user explicitly wants a quick test.
- **`update-function-configuration` replaces whole lists.** `--layers` and `--environment` overwrite everything. Always merge with the current values (see `references/deploy.md`).
- **Never guess layer ARNs.** Resolve them from the OpenTelemetry Lambda releases and verify each one in the function's region (`references/layers.md`).
- Credentials come from `mw-setup` (`MW_API_KEY`, `MW_TARGET`). Lambda env vars are visible to anyone who can read the function config: say so, and offer Secrets Manager / SSM where the runtime allows it. Never print the key.
- One function at a time unless the user asks for a batch. For batches, show the full plan first.

## Phase 1: Inspect

1. Target: `aws sts get-caller-identity`, region (function ARN, `AWS_REGION`, or `aws configure get region`).
2. Function: `aws lambda get-function-configuration --function-name <name>` → `Runtime`, `Architectures`, `Handler`, `PackageType` (Zip vs Image), `Layers`, `Environment.Variables`, `Timeout`, `VpcConfig`, `TracingConfig`. Save it to a local file as a backup.
3. Ownership. Check the repo for:
   - `template.yaml`/`template.yml` with `AWS::Serverless::Function` → SAM;
   - `serverless.yml` → Serverless Framework;
   - `cdk.json` and `lambda.Function` / `NodejsFunction` → CDK;
   - `*.tf` with `aws_lambda_function` → Terraform.

   Function tags `aws:cloudformation:stack-name` (`aws lambda list-tags --resource <arn>`) also mean CloudFormation/SAM/CDK ownership.
4. Existing instrumentation:
   - OTel or Middleware layers already in `Layers`;
   - `AWS_LAMBDA_EXEC_WRAPPER`, `OTEL_*` env vars;
   - `@opentelemetry/*`, `opentelemetry-*`, `otellambda`, `MW.APM` in the code.

   Fix or replace what's there rather than stacking a second setup.
5. `PackageType: Image` → layers don't apply. Add the OTel layer contents or SDK to the image (see `references/runtimes.md#container-images`).

## Phase 2: Plan

Pick the method from the runtime (`references/runtimes.md`). For Node.js, Python and Java, **recommend the Collector layer, but let the user opt out**:

| Runtime | Recommended: with Collector | Opt-out: direct to Middleware |
|---|---|---|
| Node.js | Collector + Node.js layer + `lambda-config.js` + logs `collector.yaml`: traces **and** Lambda logs | Node.js layer + `lambda-config.js` only: traces (and runtime metrics); logs stay in CloudWatch |
| Python | Collector + Python layer + `collector.yaml`: traces and logs | Python layer only, OTLP/HTTP with the `authorization` header: traces and app logs |
| Java | Collector + Java agent layer + logs `collector.yaml`: traces and Lambda logs | Java agent layer only: traces |
| Go (`provided.al2`/`al2023`) | — | OTel Go SDK + `otellambda` wrapper (code change, no layer) |
| .NET | — | `MW.APM` (code change) |
| Any (logs only) | Collector + `collector.yaml` with `telemetryapi` (required) | — |

Ask once, with the recommendation first: *"Use the OpenTelemetry Collector layer (recommended: also ships Lambda stdout/stderr and platform logs, buffers exports off the request path), or export directly to Middleware (one less layer and faster cold start, but no Lambda platform logs)?"* Default to the Collector if the user has no preference. In testing, dropping the Collector cut Node.js cold-start init from ~815 ms to ~440 ms. If the function already has a Collector layer with its own config, extend that config instead of replacing it.

Resolve layer ARNs for the region and architecture, and check runtime compatibility (`references/layers.md`). Post a checklist with:
- the layers to add, in order;
- env vars to add or change, with the key masked;
- files to add to the package;
- where the change goes (IaC file or CLI).

Wait for the user's OK.

## Phase 3: Apply

- **Code / package files** (`lambda-config.js`, `collector.yaml`, Go/.NET code): edit them in the repo. For CLI-only functions with no repo, see `references/deploy.md#no-source`.
- **IaC:** edit the template, following `references/deploy.md`. Don't deploy unless asked. Show the user the deploy command (`sam deploy`, `serverless deploy`, `cdk deploy`, `terraform apply`).
- **CLI (unmanaged):** use the merge-safe update in `references/deploy.md#cli`, then `aws lambda wait function-updated`. If the function uses versions or aliases, ask whether to publish a version or move an alias.

## Phase 4: Verify & report

1. With confirmation, invoke once: `aws lambda invoke --function-name <name> --payload '{}' --cli-binary-format raw-in-base64-out /tmp/out.json`. Use a realistic test event if the handler needs one, and ask the user for it.
2. Check the CloudWatch logs for wrapper, exporter or collector errors: `aws logs tail /aws/lambda/<name> --since 10m | grep -iE 'Failed to export|OTLPExporterError|Exporting failed|Extension.InitError'`. Export failures are logged (e.g. Python `Failed to export spans batch code: 400`, Node `OTLPExporterError: Bad Request`, Collector `Exporting failed`), so no matches after a few invocations means exports are succeeding. `Extension.InitError` means the collector didn't start: set `OPENTELEMETRY_EXTENSION_LOG_LEVEL=debug` to see why. See `references/troubleshooting.md`.
3. Logs from the Collector `decouple` processor are sent on the *next* invocation, so invoke twice when verifying logs.
4. If the Middleware MCP server is connected, `query` traces for `service.name=<OTEL_SERVICE_NAME>` and logs for that service. Otherwise point to APM → Services and Logs. Never claim data arrived unless you saw it.
5. Report:
   - account, region and function;
   - method used;
   - layers added (with versions);
   - env vars changed (key masked);
   - files changed;
   - where the change lives (IaC vs CLI);
   - the backup file and how to roll back (re-apply the saved layers and env).
