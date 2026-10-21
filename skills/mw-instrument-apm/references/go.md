# Go

Source: https://docs.middleware.io/apm-configuration/go · Repo: https://github.com/middleware-labs/golang-apm (the older `agent-apm-go` repo is stale). Go 1.17+.

## Install

```bash
go get github.com/middleware-labs/golang-apm@latest
```

## Init (first thing in `main()`)

```go
import (
    "context"
    track "github.com/middleware-labs/golang-apm/tracker"
)

func main() {
    config, err := track.Track(
        track.WithConfigTag(track.Service, "YOUR_SERVICE_NAME"),
        track.WithConfigTag(track.Token, "<MW_API_KEY>"),
        // agentless only:
        // track.WithConfigTag("target", "https://<MW_UID>.middleware.io:443"),
    )
    if err != nil {
        panic(err)
    }
    defer func() { _ = config.Tp.Shutdown(context.Background()) }()
    // ...
}
```
Read the token/service from env (`os.Getenv("MW_API_KEY")`) rather than literals.

Options: `track.WithConfigTag(track.PauseMetrics|PauseTraces|PauseLogs|PauseProfiling|PauseDefaultMetrics, true)`, `track.Debug`, `track.DebugLogFile`.
Env vars: `MW_AGENT_SERVICE`, `MW_APM_COLLECT_METRICS`, `MW_APM_COLLECT_TRACES`, `MW_APM_COLLECT_LOGS`.

## Framework / library packages

Go needs explicit middleware per library. Install only those the project uses (all under `github.com/middleware-labs/`):

| Library | Package | Usage |
|---|---|---|
| net/http | `golang-apm-http` | `mwhttp.MiddlewareHandler(...)` |
| Gin | `golang-apm-gin` | `r.Use(mwgin.Middleware(config))` |
| Gorilla Mux | `golang-apm-mux` | router middleware |
| Chi | `agent-apm-go-chi` (`agent-apm-go-chi-legacy` for old chi) | router middleware |
| Beego | `golang-apm-beego` | filter |
| database/sql | `golang-apm-sql` | `mwsql.Open(...)` instead of `sql.Open` |
| go-pg | `golang-apm-pg` | hook |
| GORM | `go-agent-gorm` | plugin |
| MongoDB | `golang-apm-mongo` | `options.Client().SetMonitor(mwmongo.NewMonitor())` |
| gRPC | `golang-apm-grpc` | `grpc.UnaryInterceptor(mwgrpc.UnaryServerInterceptor())` |

Open each package's README for exact import paths before editing.

## Logs, errors, spans

Log adapters: `mwotelslog.NewMWOTelLogger`, `mwotelzap.NewMWOTelCore`, `mwotelzerolog.NewMWOTelHook`, `mwotellogrus.NewMWOTelHook`.
```go
track.ErrorRecording(ctx, err)
span := track.SpanFromContext(ctx)
track.SetAttribute(ctx, "key", "value")
ctx, span := config.Tp.Tracer("my-tracer").Start(ctx, "operation"); defer span.End()
```
Profiling is automatic. Request `ctx` must be propagated through calls for spans to nest.

## Kubernetes auto-instrumentation (eBPF)

Go auto-instrumentation via the operator needs the target executable path, `privileged: true` and `runAsUser: 0` — see `mw-instrument-k8s`.
