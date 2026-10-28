---
name: mw-instrument-host
description: Install, configure, upgrade or remove the Middleware infrastructure (host) agent on Linux (Debian/Ubuntu, RHEL/CentOS/Amazon Linux), Docker hosts, Windows, macOS, and AWS ECS (EC2 daemon or Fargate sidecar), including host tags, proxy settings, log collection, and OBI/eBPF service instrumentation via the mw-agent CLI. Use when asked to monitor a server, VM, EC2 instance, Docker host, Windows machine, Mac, or ECS cluster with Middleware, or to install/repair the mw-agent.
metadata:
  version: "0.1.1"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,infrastructure,host-agent,linux,docker,windows,macos,ecs,logs
  alwaysApply: "false"
---

# Middleware host agent

Kubernetes clusters use `mw-instrument-k8s` instead — never install the host agent on K8s nodes that run the K8s agent.

## Ground rules

- These commands change machines. **Show the exact command and confirm with the user before running anything with `sudo`, installing packages, or touching a remote host.** If you're only producing docs/IaC (Ansible, Terraform user-data, Dockerfiles, task definitions), write the files and don't execute.
- Copy install commands, paths, service names and ports exactly from `references/`. Never guess a URL under `install.middleware.io`.
- Resolve `MW_API_KEY` and `MW_TARGET` with `mw-setup` first. Pass them as env vars on the command line or via a secrets manager — never bake them into a committed file.
- One agent per host. Check for an existing install before installing.
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Phase 1: Analyze

1. **Identify the platform**: `cat /etc/os-release` (Debian family → `deb`, RHEL/Amazon/CentOS/Fedora → `rpm`), `uname -m`, Windows (`$PSVersionTable`), macOS (`sw_vers`), or ECS (task definitions / CDK / Terraform in the repo).
2. **Check for an existing agent**:
   - Linux: `systemctl status mw-agent` (OpAMP mode: `mw-agent-opamp`; legacy ≤1.5: `mwservice`), `ls /etc/mw-agent`.
   - Docker: `docker ps -a --filter ancestor=ghcr.io/middleware-labs/mw-host-agent:master`.
   - Windows: `Get-Service -Name mw-windows-agent`.
   - macOS: `sudo launchctl list | grep mw-agent`.
   If one exists and is healthy, don't reinstall — switch to configuring or troubleshooting.
3. **Network**: does the host need a proxy? Run the connectivity check from `mw-setup`.
4. **Decide extras**: host tags (`MW_HOST_TAGS="env:prod,role:web"`), whether to skip OBI (`MW_ENABLE_OBI=false`) or the OTel injector (`MW_ENABLE_INJECTOR=false`), pinned version (`MW_VERSION`).

## Phase 2: Install

| Platform | Reference |
|---|---|
| Linux (deb/rpm, systemd) | `references/linux.md` |
| Docker host / docker-compose | `references/docker.md` |
| Windows | `references/windows.md` |
| macOS | `references/macos.md` |
| AWS ECS (EC2 / Fargate) | `references/ecs.md` |

For fleets, generate config-management code (Ansible task, cloud-init `runcmd`, Terraform `user_data`, SSM document) that runs the same documented command with secrets pulled from the platform's secret store.

## Phase 3: Configure (optional)

- **Log collection**: by default the Linux agent tails `/var/log/**/*.log*` and Docker container logs. Custom paths are configured in the UI (Settings → Log Ingestion Control; requires Infra Log Monitoring), not in local YAML. Docker agents can't pick up new paths dynamically — they need volume mounts at install time.
- **Apps on this host** (APM): either instrument the code (`mw-instrument-apm`) and point it at `localhost:9319`/`9320`, or use zero-code instrumentation through the agent:
  ```bash
  sudo mw-agent services list [--language python] [--all]
  sudo mw-agent instrument --type obi --language python orders-api         # eBPF, RED metrics + traces
  sudo mw-agent instrument --type systemd --language java book-service-java # SDK injection into a systemd unit
  sudo mw-agent uninstrument --type obi|systemd <svc>
  ```

## Phase 4: Verify & report

1. Service is running (`systemctl is-active mw-agent` / `docker ps` / `Get-Service`), and logs show no export errors (`journalctl -u mw-agent -n 100 --no-pager`).
2. Listening ports: `sudo ss -lntp | grep -E '9319|9320|8006'`.
3. Within a few minutes the host appears under Infrastructure → Hosts. With the MCP server, call `get_resources` and look for the hostname. Don't claim success until you've seen it.
4. Report what was installed, where config lives, how to restart/uninstall, and next steps (APM, logs). On failure → `mw-troubleshoot`.
