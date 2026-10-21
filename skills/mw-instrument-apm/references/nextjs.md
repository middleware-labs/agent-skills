# Next.js / Vercel

Sources: https://docs.middleware.io/apm-configuration/next-js · https://docs.middleware.io/apm-configuration/vercel-integration

Requires Next.js 13.4+. Server-side only — for browser telemetry use `mw-instrument-rum`.

## Install

```bash
npm install @middleware.io/agent-apm-nextjs
npm i @opentelemetry/api@">=1.3.0 <1.5.0"
```

## next.config.js

```js
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@middleware.io/agent-apm-nextjs'],
  },
};
module.exports = nextConfig;
```
Merge into the existing config — don't replace other keys. (Next 15+ moved `instrumentationHook` to stable and `serverComponentsExternalPackages` to top-level `serverExternalPackages`; check the installed Next version and adapt.)

## instrumentation.ts

Project root, or `src/` if the project uses a `src` dir:
```ts
// @ts-ignore
import tracker from '@middleware.io/agent-apm-nextjs';

export function register() {
  tracker.track({
    serviceName: '{APM-SERVICE-NAME}',
    accessToken: '<MW_API_KEY>',
    // agentless: target: 'https://<MW_UID>.middleware.io:443',
    // Vercel:    target: 'vercel',
  });
}
```
If an `instrumentation.ts` already exists, add the tracker call inside its existing `register()` (guard with `if (process.env.NEXT_RUNTIME === 'nodejs')` when it also handles edge).

Env vars: `MW_API_KEY`, `MW_TARGET`, `MW_SERVICE_NAME`, `MW_PROJECT_NAME`, `MW_CONSOLE_EXPORTER`, `MW_AGENT_SERVICE`.
Custom logs: `tracker.info/warn/debug/error(...)`.

## Vercel

- Use `target: "vercel"`.
- Install the Middleware integration from the Vercel Marketplace (Pro/Enterprise plan) and enable traces in Vercel. Logs arrive via Vercel Log Drains.
- Edge functions are not supported.
- Apps with no API routes / serverless functions are static: `register()` never runs → no APM data (use RUM instead).
- Missing data after setup → redeploy.
