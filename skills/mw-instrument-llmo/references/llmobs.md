# LLM Observability SDKs

Sources: https://docs.middleware.io/features/llm.md · /llm-observability/middleware-llmobs/python · /llm-observability/traceloop/python · /llm-observability/traceloop/nodejs · /llm-observability/openlit/python

All exports are OTLP/HTTP to `https://<MW_UID>.middleware.io:443` with headers `Authorization=<MW_API_KEY>` and `X-Trace-Source=<sdk>`.

## Python — `middleware-llmobs` (first-party)

PyPI `middleware-llmobs` (0.1.x), Python `>=3.10,<3.15`, OTLP/HTTP only.
```bash
pip install middleware-llmobs openinference-instrumentation-openai   # + -anthropic, -langchain, -llama-index, -bedrock, ... as used
```
Env:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT="https://<MW_UID>.middleware.io:443"
OTEL_EXPORTER_OTLP_HEADERS="Authorization=<MW_API_KEY>,X-Trace-Source=openinference"
OTEL_SERVICE_NAME="my-llm-app"
MW_PROJECT_NAME="my-project"   # optional
```
Init (top of entrypoint, before LLM imports):
```python
from middleware.llmobs import register
providers = register(auto_instrument=True)
```
`register()` kwargs: `endpoint`, `headers`, `service_name`, `project_name`, `batch`, `verbose`, `set_global_*`.

Context & helpers (import from `middleware.llmobs`):
- `using_session(session_id)`, `using_user(user_id)`, `using_attributes(...)`, `using_metadata(...)`, `using_tags(...)`, `using_prompt_template(...)` — context managers.
- `suppress_tracing()` — skip spans in a block.
- Decorators `@task`, `@retriever`, `@embedding`; `annotate_rag(...)`.
- Evaluations: `submit_evaluation(...)`, `LLMJudge`.
- Short scripts: `providers.tracer.force_flush()` before exit.

Check the docs page for exact helper signatures before using them.

## Traceloop / OpenLLMetry (Python, Node.js, Next.js, Go, Ruby)

Python:
```bash
pip install traceloop-sdk
```
```python
from traceloop.sdk import Traceloop
Traceloop.init(
    app_name="my-llm-app",
    api_endpoint="https://<MW_UID>.middleware.io:443",
    headers={"Authorization": "<MW_API_KEY>", "X-Trace-Source": "traceloop"},
)
```
Node.js (initialize before importing LLM SDKs):
```bash
npm install @traceloop/node-server-sdk
```
```js
const traceloop = require("@traceloop/node-server-sdk");
traceloop.initialize({
  appName: "my-llm-app",
  apiEndpoint: "https://<MW_UID>.middleware.io:443",
  headers: { Authorization: process.env.MW_API_KEY, "X-Trace-Source": "traceloop" },
  disableBatch: true, // dev / short-lived only
});
```
Next.js: initialize in `instrumentation.ts` `register()` (nodejs runtime) — combine with `@middleware.io/agent-apm-nextjs` carefully; only one should own the global provider.
Go / Ruby: see the Traceloop pages under /llm-observability/traceloop/.

## OpenLIT

```python
import openlit
openlit.init(
    otlp_endpoint="https://<MW_UID>.middleware.io:443",
    application_name="my-llm-app",
    otlp_headers={"Authorization": "<MW_API_KEY>", "X-Trace-Source": "openlit"},
)
```

## No data?

- Init ran after the LLM client was imported → move it to the very top.
- Missing `X-Trace-Source` header → spans may land as plain APM traces, not in LLM Observability.
- Process exited before batch export → flush / `disableBatch`.
- gRPC exporter configured → `middleware-llmobs` requires OTLP/HTTP.
