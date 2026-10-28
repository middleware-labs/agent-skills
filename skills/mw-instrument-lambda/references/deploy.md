# Applying the change

Pick the path that owns the function (SKILL.md Phase 1). Examples use Node.js; swap in the layers and env for other runtimes from `runtimes.md`. Keep the key out of committed files (parameter, SSM or Secrets Manager reference, or CI secret).

## SAM / CloudFormation

```yaml
Parameters:
  MwApiKey: { Type: String, NoEcho: true }
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:184161586896:layer:opentelemetry-collector-arm64-0_24_0:1
        - !Sub arn:aws:lambda:${AWS::Region}:184161586896:layer:opentelemetry-nodejs-0_24_0:1
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
          NODE_OPTIONS: --require ./lambda-config.js
          OTEL_SERVICE_NAME: my-service
          OTEL_EXPORTER_OTLP_ENDPOINT: https://<MW_UID>.middleware.io:443
          OTEL_RESOURCE_ATTRIBUTES: !Sub mw.account_key=${MwApiKey}
          OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION: "true"
          OTEL_PROPAGATORS: tracecontext
```
Merge into existing `Layers` and `Environment.Variables` (including `Globals.Function`). Deploy: `sam deploy --parameter-overrides MwApiKey=$MW_API_KEY`. Match the collector arch to `Architectures`.

## Serverless Framework

```yaml
provider:
  environment:
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OTEL_EXPORTER_OTLP_ENDPOINT: https://<MW_UID>.middleware.io:443
    OTEL_RESOURCE_ATTRIBUTES: mw.account_key=${env:MW_API_KEY}   # or ${ssm:/mw/api-key}
    OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION: "true"
    OTEL_PROPAGATORS: tracecontext
functions:
  api:
    layers:
      - arn:aws:lambda:${aws:region}:184161586896:layer:opentelemetry-collector-arm64-0_24_0:1
      - arn:aws:lambda:${aws:region}:184161586896:layer:opentelemetry-nodejs-0_24_0:1
    environment:
      NODE_OPTIONS: --require ./lambda-config.js
      OTEL_SERVICE_NAME: api
```
Ensure `lambda-config.js` / `collector.yaml` aren't excluded by `package.patterns`. Deploy: `serverless deploy`.

## CDK (TypeScript)

```ts
const region = cdk.Stack.of(this).region;
fn.addLayers(
  lambda.LayerVersion.fromLayerVersionArn(this, 'OtelCollector', `arn:aws:lambda:${region}:184161586896:layer:opentelemetry-collector-arm64-0_24_0:1`),
  lambda.LayerVersion.fromLayerVersionArn(this, 'OtelNode', `arn:aws:lambda:${region}:184161586896:layer:opentelemetry-nodejs-0_24_0:1`),
);
fn.addEnvironment('AWS_LAMBDA_EXEC_WRAPPER', '/opt/otel-handler');
fn.addEnvironment('NODE_OPTIONS', '--require ./lambda-config.js');
fn.addEnvironment('OTEL_SERVICE_NAME', 'my-service');
fn.addEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT', 'https://<MW_UID>.middleware.io:443');
fn.addEnvironment('OTEL_RESOURCE_ATTRIBUTES', `mw.account_key=${mwApiKey}`); // from SSM/Secrets Manager or context, not a literal
fn.addEnvironment('OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION', 'true');
fn.addEnvironment('OTEL_PROPAGATORS', 'tracecontext');
```
With `NodejsFunction` (esbuild), the bundle doesn't include `lambda-config.js` by default. Add it via `bundling.commandHooks.afterBundling` (copy the file into `outputDir`). Deploy: `cdk deploy`.

## Terraform

```hcl
resource "aws_lambda_function" "fn" {
  # ...existing...
  layers = concat(
    [
      "arn:aws:lambda:${data.aws_region.current.name}:184161586896:layer:opentelemetry-collector-arm64-0_24_0:1",
      "arn:aws:lambda:${data.aws_region.current.name}:184161586896:layer:opentelemetry-nodejs-0_24_0:1",
    ],
    var.existing_layers, # keep layers that were already there
  )
  environment {
    variables = merge(var.existing_env, {
      AWS_LAMBDA_EXEC_WRAPPER                     = "/opt/otel-handler"
      NODE_OPTIONS                                = "--require ./lambda-config.js"
      OTEL_SERVICE_NAME                           = "my-service"
      OTEL_EXPORTER_OTLP_ENDPOINT                 = "https://<MW_UID>.middleware.io:443"
      OTEL_RESOURCE_ATTRIBUTES                    = "mw.account_key=${var.mw_api_key}" # sensitive var
      OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION = "true"
      OTEL_PROPAGATORS                            = "tracecontext"
    })
  }
}
```
Edit the existing `layers`/`environment` in place; the `concat`/`merge` above is illustrative. Declare `mw_api_key` with `sensitive = true`. Run `terraform plan` and show it before `apply`.

## CLI (functions not managed by IaC) {#cli}

`update-function-configuration` **replaces** the whole layer list and env map, so always merge.

```bash
FN=<name>; REGION=<region>
umask 077
aws lambda get-function-configuration --function-name "$FN" --region "$REGION" > lambda-backup.json   # rollback copy

# Build merged layers + env (python3; never prints the key)
python3 - lambda-backup.json "$COLLECTOR_ARN" "$LANG_ARN" > lambda-new.json <<'PY'
import json, os, sys
cur = json.load(open(sys.argv[1])); collector, lang = sys.argv[2], sys.argv[3]
keep = [l["Arn"] for l in cur.get("Layers", []) if ":184161586896:layer:opentelemetry-" not in l["Arn"]]
layers = [collector, lang] + keep                      # OTel first; drop old OTel layers
env = dict((cur.get("Environment") or {}).get("Variables") or {})
attrs = [a for a in env.get("OTEL_RESOURCE_ATTRIBUTES", "").split(",") if a and not a.startswith("mw.account_key=")]
env.update({
  "AWS_LAMBDA_EXEC_WRAPPER": "/opt/otel-handler",
  "NODE_OPTIONS": "--require ./lambda-config.js",
  "OTEL_SERVICE_NAME": os.environ["OTEL_SERVICE_NAME"],
  "OTEL_EXPORTER_OTLP_ENDPOINT": os.environ["MW_TARGET"].rstrip("/"),
  "OTEL_RESOURCE_ATTRIBUTES": ",".join(attrs + ["mw.account_key=" + os.environ["MW_API_KEY"]]),
  "OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION": "true",
  "OTEL_PROPAGATORS": "tracecontext",
})
assert len(layers) <= 5, "Lambda allows at most 5 layers"
json.dump({"Layers": layers, "Environment": {"Variables": env}}, sys.stdout)
PY

# Show the diff with the key masked, then (after confirmation):
aws lambda update-function-configuration --function-name "$FN" --region "$REGION" --cli-input-json file://lambda-new.json
aws lambda wait function-updated --function-name "$FN" --region "$REGION"
```
`--cli-input-json` with `Layers` + `Environment` keeps the key off the command line. Existing `OTEL_RESOURCE_ATTRIBUTES` entries are kept, and `mw.account_key` is replaced or appended. **Rollback:** re-apply `Layers` and `Environment` from `lambda-backup.json` the same way. Delete `lambda-new.json` afterwards: it contains the key.

## No source code available {#no-source}

If you can change config but not the package:
- **Collector config:** host `collector.yaml` in S3 and set `OPENTELEMETRY_COLLECTOR_CONFIG_URI=s3://<bucket>.s3.<region>.amazonaws.com/collector.yaml`. The function role needs `s3:GetObject`; adds cold-start latency. Don't put the raw key in the file; use `${env:MW_API_KEY}`.
- **Node.js without `lambda-config.js`:** drop `NODE_OPTIONS`. The layer's default exporter then uses batch export, so spans can be lost at freeze. Tell the user, and recommend adding `lambda-config.js` on the next code deploy.
- Go and .NET always need a code change and a redeploy.
