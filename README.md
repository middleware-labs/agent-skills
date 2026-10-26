# Middleware Skills for AI Agents

[Agent Skills](https://agentskills.io) that teach coding agents (Claude Code, Cursor, Codex, Copilot, Gemini CLI, …) how to instrument infrastructure and applications with [Middleware](https://middleware.io) and verify that telemetry arrives.

> **Status: v0.1 preview.** Instrumentation skills are in place; the `mw-troubleshoot` skill is coming next. See [ROADMAP.md](ROADMAP.md) for design decisions, open questions and next steps.

## Skills

| Skill | What it does |
|---|---|
| [`mw-setup`](skills/mw-setup) | Resolve & validate credentials (ingestion key, target, RUM token, API key), check connectivity, connect the Middleware MCP server |
| [`mw-instrument-host`](skills/mw-instrument-host) | Host agent on Linux (deb/rpm), Docker, Windows, macOS, AWS ECS; log collection; OBI/eBPF via `mw-agent instrument` |
| [`mw-instrument-k8s`](skills/mw-instrument-k8s) | Helm chart `mw-kube-agent-v3`, cert-manager, auto-instrumentation annotations, Argo CD / Flux / Terraform |
| [`mw-instrument-apm`](skills/mw-instrument-apm) | APM SDKs for Node.js, NestJS, Next.js/Vercel, Python, Java, Go, .NET, PHP, Ruby, AWS Lambda |
| [`mw-instrument-otel`](skills/mw-instrument-otel) | Point existing OpenTelemetry SDKs / Collectors / Fluent Bit at Middleware |
| [`mw-instrument-rum`](skills/mw-instrument-rum) | Browser RUM (React, Next.js, Angular, Vue, Svelte, HTML), Android, iOS, React Native, Flutter, source maps |
| [`mw-instrument-llmo`](skills/mw-instrument-llmo) | LLM Observability via `middleware-llmobs`, Traceloop, OpenLIT |
| [`mw-integrate-db`](skills/mw-integrate-db) | **Experimental.** PostgreSQL, MySQL/MariaDB, MongoDB, Redis integrations on Linux hosts via the agent-settings API (no UI). Needs a public API key |

Each skill is a `SKILL.md` (workflow + guardrails) plus `references/` (exact commands, package names, options) that the agent loads only when needed.

## Install

With the [`skills`](https://www.npmjs.com/package/skills) CLI:

```bash
# list what's available
npx skills add middleware-labs/agent-skills --list

# install everything (prompts for agents & scope)
npx skills add middleware-labs/agent-skills

# install specific skills for Claude Code, globally
npx skills add middleware-labs/agent-skills --skill mw-setup --skill mw-instrument-k8s --agent claude-code -g -y
```

While the repo is private, the CLI clones with your local git credentials — make sure `git clone https://github.com/middleware-labs/agent-skills` works for you first.

Manual install: copy a skill folder into your agent's skills dir, e.g. `cp -r skills/mw-instrument-apm ~/.claude/skills/`.

Local development (test un-pushed changes):

```bash
npx skills add ./ --skill '*' --agent claude-code -y
```

## First run: credentials

Skills discover credentials, in order, from:
1. the shell environment;
2. the project's `.env.local`, then `.env`;
3. `~/.config/middleware/credentials.env`;
4. an installed Middleware agent.

They ask only for what the task needs, and never echo secrets. The easiest setup is to export credentials before starting your agent:

```bash
export MW_TARGET=https://<your-uid>.middleware.io:443   # Installation page
export MW_API_KEY=<ingestion key>                        # Installation page / Settings → API Keys
export MW_PUBLIC_API_KEY=<public API key>                # Settings → API Keys (only for mw-integrate-db / REST)
claude   # or codex, cursor, …
```

Or keep them in `~/.config/middleware/credentials.env` (`KEY=value` lines, `chmod 600`). Pasting a key into chat works as a fallback; the skill saves it to that file, and you should rotate the key afterwards. In CI, set the env vars; skills don't prompt there.

## Recommended: connect the Middleware MCP server

Skills use it to confirm hosts, services and RUM sessions are actually reporting.

```bash
claude mcp add --transport http middleware https://mcp.middleware.io/mcp
# then in Claude Code: /mcp → middleware → Authenticate
```

## Usage examples

- "Install the Middleware agent on this EKS cluster with auto-instrumentation."
- "Add Middleware APM to this FastAPI service and update the Dockerfile."
- "Set up Middleware RUM in our Next.js app and upload source maps in CI."
- "We already use an OTel Collector — send our traces to Middleware too."

## Contributing

- One skill per directory under `skills/`; directory name == frontmatter `name` (kebab-case, `mw-` prefix).
- `description` ≤ 1024 chars, no `<` or `>`; say *what* it does and *when* to use it.
- Keep `SKILL.md` about workflow and judgement; put exact facts in `references/` with a source URL.
- Run `node scripts/validate-skills.mjs` before opening a PR (CI runs it plus an install smoke test).

## License

MIT
