# macOS agent

Source: https://docs.middleware.io/agent-installation/macos

```bash
MW_API_KEY="<MW_API_KEY>" MW_TARGET="https://<MW_UID>.middleware.io:443" \
bash -c "$(curl -L https://install.middleware.io/scripts/mw-macos-agent-install.sh)"
```
Alternative: `.pkg` installers `mw-macos-agent-setup-arm64.pkg` / `mw-macos-agent-setup-amd64.pkg` from the mw-agent GitHub releases.

| Item | Value |
|---|---|
| Binaries | `/opt/mw-agent` |
| Config | `/etc/mw-agent/mw-agent.yaml`, `/etc/mw-agent/conf.d/` |
| Logs | `/var/log/mw-agent/`, install log `/var/log/mw-agent/install.log` |
| Verify | `sudo launchctl list \| grep mw-agent` → `io.middleware.mw-agent` |
| Uninstall | `sudo /opt/mw-agent/uninstall.sh` |
