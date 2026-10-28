# Node.js

Source: https://docs.middleware.io/get-started/apm/nodejs.md · Repo: https://github.com/middleware-labs/node-apm

## Install

```bash
npm install @middleware.io/node-apm --save
```
Windows PowerShell: `npm i "@middleware.io/node-apm"` (quotes required, `@` is splatting).
Native profiling (Pyroscope) is an optional dependency; on Alpine install `build-base python3` or profiling is skipped ("Pyroscope profiling is not available").

## Init — must be the first line executed

CommonJS entrypoint (or a dedicated `instrumentation.js` required on line 1):
```js
const tracker = require('@middleware.io/node-apm');
tracker.track({
    serviceName: "your-service-name",
    accessToken: "<MW_API_KEY>",
    // agentless mode only:
    // target: "https://<MW_UID>.middleware.io:443",
});
```
Prefer reading values from env rather than literals: `serviceName: process.env.MW_SERVICE_NAME, accessToken: process.env.MW_API_KEY`. Env vars override code options anyway.

Preload alternative: `node --require ./instrument.js app.js`.
⚠️ With worker threads, cluster mode, pino transports or BullMQ, `--require`/`--import` loads instrumentation multiple times (2–3× memory). In that case put `require('./instrumentation');` as the first line of the entry file instead.

ESM (`"type": "module"`):
```bash
npm i @opentelemetry/instrumentation@0.54.1
node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./instrument.js app.js
```

TypeScript: put the init in its own module and make it the first import of the compiled entry; make sure the compiler doesn't reorder it below framework imports.

## `track()` options

`target`, `accessToken`, `projectName`, `serviceName`, `pauseTraces`, `pauseMetrics`, `consoleExporter`, `customResourceAttributes` (e.g. `{ "app.version": "1.2.0" }`), `disabledInstrumentations`, `consoleLog`, `consoleError`, `enableSelfInstrumentation`, `enableProfiling` (default `true`), `excludeHttpTraces: { incoming: { urls, methods }, outgoing: { urls, methods } }`, `DEBUG` (`true` for debug output).

## Env vars

`MW_TARGET`, `MW_API_KEY`, `MW_PROJECT_NAME`, `MW_SERVICE_NAME`, `MW_APM_TRACES_ENABLED`, `MW_APM_METRICS_ENABLED`, `MW_CONSOLE_EXPORTER`, `MW_AGENT_SERVICE`,
`OTEL_NODE_RESOURCE_DETECTORS` (default `env,process,host,os,container,serviceinstance`; also `aws,azure,gcp,none,all`),
`MW_NODE_DISABLED_INSTRUMENTATIONS` (e.g. `dns,net`; `fs` always disabled),
`MW_EXCLUDE_INCOMING_HTTP_URLS`, `MW_EXCLUDE_INCOMING_HTTP_METHODS`, `MW_EXCLUDE_OUTGOING_HTTP_URLS`, `MW_EXCLUDE_OUTGOING_HTTP_METHODS`.

## Custom telemetry

```js
tracker.info("msg"); tracker.warn("msg"); tracker.debug("msg"); tracker.error(new Error("boom")); // logs (error includes stack)
tracker.setAttribute("email", email);                // attribute on current span
const tracer = tracker.getTracer();                  // custom spans
tracer.startActiveSpan("randInt", span => { /* ... */ span.end(); });
const meter = tracker.getMeter();                    // custom metrics
tracker.errorRecord(e);                              // record exception (docs show `track.errorRecord` — typo)
await tracker.sdkShutdown();                         // flush on exit
```

## Legacy

Node 10–18.16: `npm install @middleware.io/node-apm-legacy` — same API, no profiling.

## Troubleshooting

- Debug: `tracker.track({ ..., DEBUG: true })` and/or `MW_CONSOLE_EXPORTER=true`.
- "agent health check failed" at startup → wrong `MW_AGENT_SERVICE` / no agent.
- `@opentelemetry/api: Registration of version vX for trace does not match previously registered API` → duplicate `@opentelemetry/api` versions; align with `npm i @opentelemetry/api@<version the SDK uses>` (check `npm ls @opentelemetry/api`). Blocks all data until fixed.
- Docker host mode: agent must expose 9319.

<a id="nestjs"></a>
## NestJS

Source: https://docs.middleware.io/get-started/apm/nestjs.md

```bash
npm install @middleware.io/nestjs-apm
```
`app.module.ts`:
```ts
import { MiddlewareApmModule } from '@middleware.io/nestjs-apm';
@Module({
  imports: [
    MiddlewareApmModule.forRoot({ projectName: '<PROJECT>', serviceName: '<SERVICE>' }),
    // ...
  ],
})
export class AppModule {}
```
`main.ts` (after `NestFactory.create`):
```ts
import { Reflector } from '@nestjs/core';
import { MiddlewareApmInterceptor } from '@middleware.io/nestjs-apm';
app.useGlobalInterceptors(new MiddlewareApmInterceptor(app.get(Reflector)));
```
Decorators: `@IgnoreApmTrace()`, `@WithAttributes(...)`.
