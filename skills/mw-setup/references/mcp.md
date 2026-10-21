# Middleware MCP server

Source: https://docs.middleware.io/opsai/mcp-server/setup

Remote MCP (Streamable HTTP) with OAuth sign-in: `https://mcp.middleware.io/mcp`

## Claude Code

```bash
claude mcp add --transport http middleware https://mcp.middleware.io/mcp
```
Then in Claude Code run `/mcp` → `middleware` → **Authenticate**.

## Other clients (Cursor, Claude Desktop, VS Code, ...)

```json
{ "mcpServers": { "middleware": { "type": "http", "url": "https://mcp.middleware.io/mcp" } } }
```

Read-only: append `?exclude_tools=create_dashboard,update_dashboard,delete_dashboard,create_widget,update_widget,delete_widget,...` to the URL.

## Tools useful for verifying instrumentation

| Goal | Tool |
|---|---|
| Is the host / node / pod / service reporting? | `get_resources` |
| Which metrics exist for a resource? | `get_metrics` |
| Query logs / traces / metrics (e.g. spans for `service.name`) | `query` |
| Backend errors | `list_errors`, `get_error_details` |
| RUM app exists, sessions arriving | `list_rum_applications`, `list_rum_sessions`, `get_rum_session`, `list_rum_errors` |
| Synthetics | `list_synthetic_checks`, `get_synthetic_check_results`, `get_synthetic_uptime` |

Always load tool schemas before calling them; never invent tool names. If MCP isn't connected, give the user the UI path to check instead (Infrastructure → Hosts / Kubernetes, APM → Services, RUM → Applications, Logs).
