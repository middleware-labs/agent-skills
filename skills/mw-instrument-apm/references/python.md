# Python

Source: https://docs.middleware.io/get-started/apm/python.md
⚠️ The package is `middleware-io`. Older docs/mirrors mention `middleware-apm`, `middleware.ini` and `middleware-apm run` — those are outdated; don't use them.

## Install

```bash
pip install middleware-io
pip install 'middleware-io[profiling]'   # optional, for continuous profiling
middleware-bootstrap -a install          # installs matching opentelemetry-instrumentation-* packages
```
Add `middleware-io` to the project's dependency file (`requirements.txt`, `pyproject.toml` via poetry/uv, `Pipfile`). In a Dockerfile, run `RUN middleware-bootstrap -a install` **after** app dependencies are installed (it detects installed libraries).

## Run (zero-code, preferred)

Host mode (agent on `localhost:9319`):
```bash
export MW_SERVICE_NAME='MyPythonApp'
middleware-run python app.py
```
Agentless mode:
```bash
export MW_API_KEY='<MW_API_KEY>'
export MW_TARGET='https://<MW_UID>.middleware.io:443'
export MW_SERVICE_NAME='MyPythonApp'
middleware-run python app.py
```
Framework launchers — prefix the existing command with `middleware-run`:
- Django: `DJANGO_SETTINGS_MODULE=mysite.settings middleware-run python manage.py runserver --noreload`
- Gunicorn: `middleware-run gunicorn -c gunicorn.conf.py demo.wsgi`
- Uvicorn / FastAPI: `middleware-run uvicorn main:app --host 0.0.0.0 --port 8000`
- Celery: `middleware-run celery -A proj worker`

Pitfalls (from the OTel Python guide): auto-reloaders break instrumentation — use Django `--noreload`, Flask `--no-reload`, no uvicorn `--reload`/`--workers` (use `gunicorn -k uvicorn.workers.UvicornWorker`). uWSGI needs `lazy-apps = true`. Hypercorn unsupported. Celery prefork may need init in `worker_process_init`.

## Manual init (optional, for code-level config)

```python
from middleware import mw_tracker, MWOptions, DETECT_AWS_EC2
mw_tracker(
    MWOptions(
        access_token="<MW_API_KEY>",
        target="https://<MW_UID>.middleware.io:443",
        service_name="MyPythonApp",
        detectors=[DETECT_AWS_EC2],
        otel_propagators="b3,tracecontext",
        console_exporter=True,
        log_level="DEBUG",
    )
)
```
Still launch via `middleware-run` and set `export MW_TRACKER=True` — "MW_TRACKER=True is required when you instrument using mw_tracker()."

## Options ↔ env vars

Precedence: OTel env vars > MW env vars > code options.

| Option | Env var(s) |
|---|---|
| access_token | `MW_API_KEY` |
| service_name | `MW_SERVICE_NAME` / `OTEL_SERVICE_NAME` |
| project_name | `MW_PROJECT_NAME` |
| target | `MW_TARGET` / `OTEL_EXPORTER_OTLP_ENDPOINT` |
| mw_agent_service | `MW_AGENT_SERVICE` |
| collect_traces / collect_metrics / collect_logs / collect_profiling | `MW_APM_COLLECT_TRACES` / `MW_APM_COLLECT_METRICS` / `MW_APM_COLLECT_LOGS` / `MW_APM_COLLECT_PROFILING` |
| log_level | `MW_LOG_LEVEL` / `OTEL_LOG_LEVEL` |
| custom_resource_attributes | `MW_CUSTOM_RESOURCE_ATTRIBUTES` (`k=v,k=v`) |
| otel_propagators | `MW_PROPAGATORS` / `OTEL_PROPAGATORS` (default `b3`) |
| console_exporter | `MW_CONSOLE_EXPORTER` |
| debug_log_file | `MW_DEBUG_LOG_FILE` |
| sample_rate | `MW_SAMPLE_RATE` (0..1) |
| detectors | `MW_DETECTORS` (e.g. `aws_lambda,gcp,azure,envvars`) |

## Custom telemetry

```python
from opentelemetry import trace
from opentelemetry.metrics import get_meter_provider
from middleware import record_exception

tracer = trace.get_tracer("custom_tracer")
with tracer.start_as_current_span("work"):
    ...
meter = get_meter_provider().get_meter("custom_meter")
try: ...
except Exception as e:
    record_exception(e)
```
Logs: standard `logging` is captured automatically.

## Troubleshooting

- Host mode, no data → app not launched via `middleware-run`, or agent not running (`StatusCode.UNAVAILABLE ... localhost:9319`).
- Agentless, no data → both `MW_API_KEY` and `MW_TARGET` must be set.
- Libraries not traced → re-run `middleware-bootstrap -a install` after installing deps.
- `ContextualVersionConflict` → conflicting OTel packages; use a clean venv.
- Local debugging → `MW_CONSOLE_EXPORTER=true MW_DEBUG_LOG_FILE=true`.
