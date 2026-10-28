---
name: mw-integrate-db
description: EXPERIMENTAL. Set up Middleware database integrations (PostgreSQL, MySQL/MariaDB, MongoDB, Redis/Valkey) on a Linux host that runs the Middleware host agent, without the UI. Detects databases on the host, prepares the database (stats extensions, least-privilege monitoring user), saves the integration through the Middleware agent-settings REST API, and verifies the agent starts collecting. Use when asked to monitor, integrate, connect, or fix a database integration in Middleware on a VM or bare-metal host.
metadata:
  version: "0.1.2"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,database,integration,postgresql,mysql,mariadb,mongodb,redis,linux,experimental
  status: experimental
  alwaysApply: "false"
---

# Middleware database integrations (experimental)

Configures DB integrations for the **Linux host agent** through the same REST API the Middleware UI uses. Kubernetes, Windows and cloud-managed databases (RDS, Cloud SQL, Atlas) are out of scope.

**Experimental.** The API contract in `references/api.md` was verified end-to-end for PostgreSQL only (2026-10-26). The MySQL, MongoDB and Redis payloads come from the UI source and are unverified. Tell the user this before saving, and always read the setting back afterwards.

## Ground rules

- **Never call `DELETE /agent/setting/rm/...`.** It removes the integration from *every host in the project*. To remove an integration from one host, POST an empty object for that key (see `references/api.md`).
- **Always GET before POST.** Save the current host setting to a local backup file first. Change only the one integration key you're configuring.
- Confirm before any `sudo`, database restart, `CREATE USER`/`GRANT`, or API write. Show the planned payload with passwords masked.
- Prefer a dedicated least-privilege monitoring user with a generated password over superuser/root credentials. Generate passwords locally (`openssl rand -hex 20`), pass them via stdin or files with mode `600`, and never print them, put them in chat, or commit them.
- The public API key is not the ingestion key (see `mw-setup/references/credentials.md`). Read it from `MW_PUBLIC_API_KEY`; if the user pastes it into chat, use it and remind them to rotate it afterwards.
- Database passwords sent through the API are stored in the Middleware host setting. Say so when asking for confirmation.
- Never claim data arrived unless you saw it (agent metrics endpoint, MCP query, or the UI).
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Phase 1: Discover

1. Get `MW_PUBLIC_API_KEY` and `MW_UID` via `mw-setup` (discovery: env > `.env.local` > `.env` > `~/.config/middleware/credentials.env`; validate with `GET /agent/hosts`). That call also lists host IDs. The host ID is the agent host's `hostname`; confirm it in the GET response (`setting.host_id`).
2. Confirm the agent is running: `systemctl is-active mw-agent mw-agent-opamp`. Managed (OpAMP) installs run as `mw-agent-opamp` and render config to `/etc/mw-agent/opamp/effective.yaml`.
3. GET the host setting and save it as a backup. Read `config.linux.integrations` for the databases the agent detected (type, ports, systemd vs docker), and the existing `*_config` keys for what's already configured.
4. Cross-check on the host if you have shell access: `ss -ltnp | grep -E ':5432|:3306|:27017|:6379'`.
5. Agree with the user which database(s) and endpoint(s) to configure.

## Phase 2: Prepare the database

Open the matching reference and follow it:

| Database | Reference | Config key | Status |
|---|---|---|---|
| PostgreSQL | `references/postgresql.md` | `postgres_config` | Verified |
| MySQL / MariaDB | `references/mysql.md` | `mysql_config` | Unverified |
| MongoDB | `references/mongodb.md` | `mongodb_config` | Unverified |
| Redis / Valkey | `references/redis.md` | `redis_config` | Unverified |

Test the monitoring user's login from the agent host (over TCP, as the agent will connect) before saving anything.

## Phase 3: Save the integration

Follow `references/api.md`: build the integration block from the reference, base64-encode `{"linux": {"<key>": {...}, "agent_restart_status": true}}`, POST it, then GET again and check the stored block (passwords masked).

## Phase 4: Verify & report

1. The agent applies remote config on its config check (`MW_CONFIG_CHECK_INTERVAL`, default `5m`). Tell the user to expect up to ~5 minutes.
2. On the host, confirm the receiver appears: `grep -nE '^    (postgresql|mysql|mongodb|redis)' /etc/mw-agent/opamp/effective.yaml` (managed mode).
3. Check receiver throughput on the agent's internal metrics: `curl -s localhost:8888/metrics | grep 'receiver="postgresql/1"'`. `accepted_metric_points` should increase and `refused_*` should stay 0.
4. Check the agent log for auth or permission errors for that receiver (`/etc/mw-agent/opamp/agent.log` or `journalctl -u mw-agent-opamp`). Fix grants and re-check. See the troubleshooting table in the DB reference.
5. If the Middleware MCP server is connected, query the DB metrics (e.g. `postgresql.backends`) for the host.
6. Report: host, database(s), monitoring user (not the password), config key written, where the backup is, verification results, and how to roll back (POST the backed-up block for that key).
