---
name: mw-instrument-llmo
description: Instrument LLM and AI-agent applications with Middleware LLM Observability — the first-party Python SDK middleware-llmobs (OpenInference instrumentors for OpenAI, Anthropic, LangChain, LlamaIndex, Bedrock, etc.), or Traceloop/OpenLLMetry and OpenLIT for Node.js, Next.js, Go, Ruby — capturing prompts, completions, token usage, cost, latency, sessions, users, RAG steps and evaluations. Use when asked to monitor, trace, or debug LLM calls, AI agents, RAG pipelines, or GenAI apps in Middleware.
metadata:
  version: "0.1.1"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,llm-observability,llmobs,genai,openai,anthropic,langchain,openinference,traceloop,openlit
  alwaysApply: "false"
---

# Middleware LLM Observability

## Ground rules

- Copy package names, import paths, function names and headers exactly from `references/llmobs.md`.
- Initialize once, at process start, **before** importing LLM client libraries (OpenAI, Anthropic, LangChain…).
- Only install instrumentors for libraries the project actually uses (read the manifest).
- Prompts and completions are captured by default. Ask whether prompts contain PII/secrets; if so, discuss disabling content capture (OpenInference: `OPENINFERENCE_HIDE_INPUTS=true` / `OPENINFERENCE_HIDE_OUTPUTS=true`; Traceloop: `TRACELOOP_TRACE_CONTENT=false`) before enabling in production.
- Keep `MW_API_KEY` in env/secrets, never in code.
- If the service already has Middleware APM, LLM spans join the same traces — don't add a second, competing global TracerProvider. Check for an existing provider and use the SDK's `set_global_*` options accordingly.
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Workflow

1. **Analyze**: language/runtime (Python ≥3.10,<3.15 for `middleware-llmobs`), LLM libraries in use (`openai`, `anthropic`, `langchain*`, `llama-index*`, `boto3` Bedrock, `google-genai`, `@ai-sdk/*`…), entrypoint, existing OTel/APM init, short-lived scripts vs servers.
2. **Pick the SDK**:
   - Python → `middleware-llmobs` + `openinference-instrumentation-<lib>` (preferred).
   - Node.js / Next.js / Go / Ruby → Traceloop SDK with Middleware endpoint + headers.
   - Already using OpenLIT → point it at Middleware.
3. **Instrument** following `references/llmobs.md`. Add session/user context (`using_session`, `using_user`) at request boundaries for chat apps; decorate RAG steps (`@retriever`, `@embedding`, `@task`) when the user wants pipeline visibility.
4. **Short-lived processes** (scripts, CLIs, Lambdas, notebooks): flush before exit (`providers.tracer.force_flush()`, or Traceloop `disableBatch: true`).
5. **Verify**: install deps, import-check / build, run one LLM call if the user allows (it costs tokens — ask), then check LLM Observability in the UI or `query` traces for `service.name` via MCP. Report what's captured, privacy settings, env vars to set.
