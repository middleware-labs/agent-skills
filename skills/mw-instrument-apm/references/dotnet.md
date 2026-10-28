# .NET

Source: https://docs.middleware.io/get-started/apm/dotnet.md · .NET 6+ (or .NET Framework 4.6.2+ on IIS). App logs not auto-captured.

## Host mode — Linux (auto-instrumentation, no code changes)

```bash
curl -sSfL https://install.middleware.io/apm/dotnet/v1.0.0-rc.1/scripts/mw-dotnet-auto-install.sh -O
sh ./mw-dotnet-auto-install.sh
chmod +x $HOME/.mw-dotnet-auto/instrument.sh
MW_API_KEY="<MW_API_KEY>" \
. $HOME/.mw-dotnet-auto/instrument.sh && \
OTEL_SERVICE_NAME="{APM-SERVICE-NAME}" \
dotnet path/to/YourApplication.dll
```
Dockerfile: run the install script in the image, then
`CMD . $HOME/.mw-dotnet-auto/instrument.sh && dotnet App.dll`. For ASP.NET in containers also set `ASPNETCORE_URLS=http://0.0.0.0:5000`.

## Host mode — Windows / IIS

Elevated PowerShell:
```powershell
Invoke-WebRequest -Uri https://install.middleware.io/apm/dotnet/iis-full-instrumentation.ps1 -OutFile iis-full-instrumentation.ps1
.\iis-full-instrumentation.ps1 -OtlpEndpoint 'http://localhost:9320' -ApiKey '<MW_API_KEY>'
```
Optional flags: `-DetectOnly` (dry run), `-AppPools <names>`, `-OtelVersion <ver>`.

## Agentless mode (NuGet)

```bash
dotnet add package MW.APM
```
`Program.cs`:
```csharp
builder.Services.ConfigureMWInstrumentation(builder.Configuration);
var app = builder.Build();
Logger.Init(app.Services.GetRequiredService<ILoggerFactory>());
```
`appsettings.json` (put the key in user-secrets / env `MW__ApiKey` in real deployments):
```json
{
  "MW": {
    "ApiKey": "<MW_API_KEY>",
    "TargetURL": "https://<MW_UID>.middleware.io:443",
    "ServiceName": "<service-name>"
  }
}
```

## Custom logs (host mode)

Reference `Middleware.dll` from https://github.com/middleware-labs/dotnet-plugin/releases:
```csharp
using Middleware.Logger;
Logger.Info("msg"); Logger.Warning("msg"); Logger.Debug("msg"); Logger.Error("msg");
```
