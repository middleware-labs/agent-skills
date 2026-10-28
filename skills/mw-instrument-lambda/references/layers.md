# OpenTelemetry Lambda layers

Source: https://github.com/open-telemetry/opentelemetry-lambda/releases. Publisher account `184161586896`. Checked 2026-10-28.

## ARN formats

| Layer | ARN | Arch-specific |
|---|---|---|
| Collector | `arn:aws:lambda:<region>:184161586896:layer:opentelemetry-collector-<amd64\|arm64>-<ver>:<n>` | **Yes**: `x86_64` → `amd64`, `arm64` → `arm64` |
| Node.js | `arn:aws:lambda:<region>:184161586896:layer:opentelemetry-nodejs-<ver>:<n>` | No |
| Python | `arn:aws:lambda:<region>:184161586896:layer:opentelemetry-python-<ver>:<n>` | No |
| Java agent | `arn:aws:lambda:<region>:184161586896:layer:opentelemetry-javaagent-<ver>:<n>` | No |
| Ruby | `arn:aws:lambda:<region>:184161586896:layer:opentelemetry-ruby-<ver>:<n>` | No (Middleware docs don't cover Ruby on Lambda) |

`<ver>` is the release version with `_` instead of `.` (e.g. `0_24_0`). **Each language has its own version line**, so the latest Node.js, Python and Collector versions differ. Latest as of 2026-10-28: collector `0.24.0`, nodejs `0.24.0`, python `0.22.0`, javaagent `0.22.0`, ruby `0.16.0`.

## Resolve the latest version

```bash
gh api repos/open-telemetry/opentelemetry-lambda/releases --jq '.[].tag_name' | grep -m1 '^layer-collector/'
gh api repos/open-telemetry/opentelemetry-lambda/releases --jq '.[].tag_name' | grep -m1 '^layer-nodejs/'   # or layer-python/, layer-javaagent/
# without gh:
curl -s https://api.github.com/repos/open-telemetry/opentelemetry-lambda/releases | grep -o '"tag_name": "layer-nodejs/[^"]*"' | head -1
```
The release body contains the exact ARN template (including the `:<n>` layer version).

## Verify in the function's region

```bash
aws lambda get-layer-version-by-arn --region <region> --arn "<arn>" \
  --query '{runtimes:CompatibleRuntimes,arch:CompatibleArchitectures}'
```
- A valid ARN returns compatible runtimes and architectures. Check that the function's `Runtime` is listed (e.g. nodejs layer 0.24.0: `nodejs20.x`, `nodejs22.x`, `nodejs24.x`; javaagent 0.22.0: `java8.al2`, `java11`, `java17`, `java21`) and that the architecture matches.
- **A wrong version, name or region returns `AccessDeniedException` ("not authorized to perform lambda:GetLayerVersion"), not "not found".** Treat it as "this ARN doesn't exist", not as a permissions problem.
- If the runtime isn't compatible with the latest layer, use an older layer release that lists it, or upgrade the runtime (ask first).

## Order

Lambda applies layers in list order. Put the **Collector layer first**, then the language layer. Keep any unrelated existing layers. Remove older OTel layers being replaced. Max 5 layers per function.
