# Linux host agent

Source: https://docs.middleware.io/agent-installation/linux · scripts at install.middleware.io · repo github.com/middleware-labs/mw-agent

## Install

Debian / Ubuntu:
```bash
MW_API_KEY="<MW_API_KEY>" \
MW_TARGET="https://<MW_UID>.middleware.io:443" \
bash -c "$(curl -L https://install.middleware.io/scripts/deb-install.sh)"
```
RHEL / CentOS / Amazon Linux:
```bash
MW_API_KEY="<MW_API_KEY>" \
MW_TARGET="https://<MW_UID>.middleware.io:443" \
bash -c "$(curl -L https://install.middleware.io/scripts/rpm-install.sh)"
```
The script exits with an error if `MW_API_KEY` or `MW_TARGET` is missing. Install log: `/var/log/mw-agent/apt-installation-<epoch>.log`.

Optional installer env vars (prefix the command):

| Var | Effect |
|---|---|
| `MW_HOST_TAGS="env:prod,role:web"` | Host tags |
| `MW_VERSION=<x.y.z>` | Pin version (default latest release) |
| `MW_AUTO_START=false` | Don't start after install |
| `MW_AGENT_HOME` | Install dir (default `/opt/mw-agent`) |
| `MW_ENABLE_OBI=false` | Skip OBI (eBPF instrumentation) |
| `MW_ENABLE_INJECTOR=false` | Skip OpenTelemetry injector |
| `HTTP_PROXY` / `HTTPS_PROXY` (and lowercase) | Proxy |
| `MW_REMOTE_MANAGEMENT=true` | OpAMP mode (agent ≥2.0.0, service `mw-agent-opamp`, conflicts with `mw-agent`) |

APT repo: `deb [...] https://apt.middleware.io/public stable main`, key `https://apt.middleware.io/gpg-keys/mw-agent-apt-public.key`.

## Files & service

| Item | Value |
|---|---|
| systemd unit | `mw-agent` — `ExecStart=/opt/mw-agent/bin/mw-agent start --config-file=/etc/mw-agent/agent-config.yaml`, `EnvironmentFile=/etc/mw-agent/mw-agent.env`, `MemoryMax=1G`, `User=root` |
| Config | `/etc/mw-agent/agent-config.yaml` — keys `api-key`, `target`, `config-check-interval` (e.g. `"5m"`), `host-tags`, `agent-internal-metrics-port` (8888), `logfile`, `fetch-account-otel-config`, `agent-features.{metric-collection,log-collection,service-reporting}` |
| OpAMP mode config | `/etc/mw-agent/supervisor-config.yaml`, `/etc/mw-agent/mw-supervisor.env` |
| Logs | `journalctl -u mw-agent -f`, `/var/log/mw-agent/mw-agent.log` |

Fix key/target after install: edit `api-key` / `target` in `agent-config.yaml`, then `sudo systemctl restart mw-agent`.

## Ports

| Port | Purpose | Override env |
|---|---|---|
| 9319 | OTLP gRPC (`[::]:9319`) | `MW_AGENT_GRPC_PORT` |
| 9320 | OTLP HTTP (`[::]:9320`) | `MW_AGENT_HTTP_PORT` |
| 8006 | Fluent Forward (`127.0.0.1:8006`) | `MW_AGENT_FLUENT_PORT` |
| 8888 | Agent internal metrics | config `agent-internal-metrics-port` |

⚠️ Not 4317/4318. Apps sending to the default OTel ports won't reach the agent. Outbound: HTTPS 443 to the target.

## Manage

```bash
sudo systemctl status|start|stop|restart mw-agent
```
Upgrade: re-run the install script (existing config is kept: "Configuration file(s) already exist. Not modifying them."). Legacy `mwservice` units (≤1.5) are migrated automatically.

## Uninstall

```bash
bash -c "$(curl -L https://install.middleware.io/scripts/deb-uninstall.sh)"   # Debian/Ubuntu
bash -c "$(curl -L https://install.middleware.io/scripts/rpm-uninstall.sh)"   # RHEL family
```
