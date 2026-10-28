# Windows agent

Source: https://docs.middleware.io/get-started/agent/windows.md
Installer is an **EXE** (not MSI): `https://github.com/middleware-labs/mw-agent/releases/latest/download/mw-windows-agent-setup.exe`

## Silent install (elevated PowerShell)

```powershell
Invoke-WebRequest -Uri https://github.com/middleware-labs/mw-agent/releases/latest/download/mw-windows-agent-setup.exe -OutFile mw-windows-agent-setup.exe
Start-Process -FilePath .\mw-windows-agent-setup.exe -Wait -ArgumentList "/S /MW_API_KEY='<MW_API_KEY>' /MW_TARGET='https://<MW_UID>.middleware.io:443'"
```
GUI: run as Administrator and enter key + target.

## Details

| Item | Value |
|---|---|
| Service | `mw-windows-agent` (`Get-Service -Name mw-windows-agent`, `Restart-Service mw-windows-agent`) |
| Install dir | `C:\Program Files\Middleware Agent\` |
| Config | `C:\Program Files\Middleware Agent\agent-config.yaml` |
| Log | `C:\Program Files\Middleware Agent\mw-agent.log`; Event Viewer → Applications and Services Logs → Middleware Agent |
| OTLP for apps | `http://localhost:9320` (HTTP), `localhost:9319` (gRPC) |
| Uninstall | Settings → Apps → Middleware Agent → Uninstall, or `"C:\Program Files\Middleware Agent\uninstall.exe" /S` |

For .NET on IIS use `iis-full-instrumentation.ps1` (see `mw-instrument-apm/references/dotnet.md`).
