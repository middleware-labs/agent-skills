# Docker host agent

Source: https://docs.middleware.io/get-started/agent/docker.md · image `ghcr.io/middleware-labs/mw-host-agent:master`

## Install script (recommended)

```bash
MW_API_KEY="<MW_API_KEY>" \
MW_TARGET="https://<MW_UID>.middleware.io:443" \
bash -c "$(curl -fsSL https://install.middleware.io/scripts/docker-install.sh)"
```
It prompts for extra log paths to mount. On Linux it effectively runs:
```bash
docker run -d --name mw-agent-<first5ofkey> --pid host --restart always \
  -e MW_API_KEY=<MW_API_KEY> -e MW_TARGET=https://<MW_UID>.middleware.io:443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/log:/var/log \
  -v /var/lib/docker/containers:/var/lib/docker/containers \
  -v /tmp:/tmp \
  --privileged --network=host \
  ghcr.io/middleware-labs/mw-host-agent:master
```
On macOS hosts it publishes `-p 9319:9319 -p 9320:9320 -p 8006:8006` instead of `--network=host`.

## docker-compose

```yaml
services:
  mw-host-agent:
    image: ghcr.io/middleware-labs/mw-host-agent:master
    restart: unless-stopped
    pid: host
    privileged: true
    network_mode: host          # or publish 9319/9320 and attach apps to the same network
    environment:
      MW_API_KEY: ${MW_API_KEY}
      MW_TARGET: ${MW_TARGET}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys/fs/cgroup:/host/sys/fs/cgroup:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
```
App containers then use `MW_AGENT_SERVICE=172.17.0.1` (default bridge gateway), `host.docker.internal` (Docker Desktop), or `mw-host-agent` (same compose network, when not using host networking).

Docker Desktop container logs → fluentd log driver: `--log-driver fluentd --log-opt fluentd-address=host.docker.internal:8006 --log-opt fluentd-async=true`.

## Verify / uninstall

```bash
docker ps -a --filter ancestor=ghcr.io/middleware-labs/mw-host-agent:master
docker logs <container-id>
docker stop `docker ps -a -q --filter ancestor=ghcr.io/middleware-labs/mw-host-agent:master`
docker rm   `docker ps -a -q --filter ancestor=ghcr.io/middleware-labs/mw-host-agent:master`
```

## Gotchas

- `no such file or directory: /var/run/docker.sock` → check `DOCKER_HOST` / rootless Docker socket path.
- Permission denied → run with sudo or add the user to the `docker` group.
- Custom log paths set in the UI don't apply to the Docker agent (mounts are fixed) — re-create the container with extra `-v` mounts.
