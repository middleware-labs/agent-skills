---
name: mw-instrument-rum
description: Add Middleware Real User Monitoring (RUM) to browser and mobile apps — the Middleware browser SDK (CDN script + Middleware.track) for React, Next.js App/Pages Router, Angular, Vue, Svelte, vanilla HTML and SPAs; Android (io.github.middleware-labs:android-sdk), iOS (MiddlewareRum), React Native (@middleware.io/middleware-react-native) and Flutter (middleware_flutter_opentelemetry). Covers session replay privacy, user attributes, sampling, trace propagation to backends, CSP, and source-map / ProGuard / dSYM upload. Use when asked to add, set up, repair or verify Middleware RUM, frontend monitoring, session recording, or mobile monitoring.
metadata:
  version: "0.1.1"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,rum,browser,session-replay,react,nextjs,angular,vue,android,ios,react-native,flutter,sourcemaps
  alwaysApply: "false"
---

# Middleware RUM instrumentation

Instrument only the client app(s) in scope. Backend APM is `mw-instrument-apm`.

## Ground rules

- **Browser RUM ships via CDN only.** There is no published npm package for the browser SDK — do not `npm install @middleware.io/browser*` or invent imports. Use the script tag + `Middleware.track(...)` from `references/browser.md`.
- Copy script URLs, package names, builder methods and option keys exactly from `references/`. Never recreate the SDK API from memory.
- Initialize exactly once, as early as possible (in `<head>` / root layout / `Application.onCreate` / app launch). Never inside a component render, effect that re-runs, or route handler.
- If a valid `Middleware.track(...)` / builder init already exists, keep its credentials and options; only add what's missing. Never create a second init.
- RUM credentials are the **RUM account token** + endpoint from Installation → RUM → New Application (see `mw-setup`). `projectName`/`serviceName` must match the application name exactly — that's how the UI matches data. Don't use the ingestion `MW_API_KEY` here.
- Session replay is on by default (`recording: "1"`). Ask about privacy requirements; default to masking inputs for apps handling PII (`references/browser.md#privacy`).
- Use the project's package manager / Gradle / SPM / CocoaPods; never hand-edit lockfiles.
- Run a terminating build before reporting success. Never claim sessions arrived unless observed.
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Phase 1: Analyze

1. Locate the client app actually built and deployed (monorepo: check workspace config, Dockerfiles, CI). Ask if several are plausible.
2. Detect platform/framework in this order: `next` → Next.js (App vs Pages Router by `app/` vs `pages/`), `nuxt`, `@angular/core`, `vue`, `svelte`/`@sveltejs/kit`, `react` (Vite/CRA), `react-native` (+ `expo`), `flutter` (`pubspec.yaml`), Android (`build.gradle*` with `com.android.application`), iOS (`*.xcodeproj`, `Package.swift`, `Podfile`), else plain HTML.
3. Find the HTML shell / root entry: `index.html`, `public/index.html`, `src/index.html` (Angular), `app/layout.tsx`, `pages/_document.tsx`, `app.html` (SvelteKit), `nuxt.config` `app.head`.
4. Search for existing RUM: `middleware-rum.min.js`, `Middleware.track`, `MiddlewareRumBuilder`, `Middleware.builder()`, `MiddlewareWrapper`, `FlutterOTel.initialize`. Also note other RUM vendors (Datadog, Sentry…) — don't remove them unless asked.
5. Check for a CSP (meta tag, `next.config` headers, nginx/helmet config) — it will need `cdnjs.middleware.io` and `<MW_UID>.middleware.io`.
6. Identify backend API origins the app calls — candidates for `tracePropagationTargets`.
7. Resolve credentials (`mw-setup`). Prefer build-time env vars (`NEXT_PUBLIC_MW_RUM_KEY`, `VITE_MW_RUM_KEY`, Angular `environment.ts`, `BuildConfig` fields) when the project already uses that pattern; RUM tokens are public-by-design but shouldn't be duplicated across files.

## Phase 2: Instrument

| Platform | Reference |
|---|---|
| Browser (all web frameworks) | `references/browser.md` |
| Android | `references/android.md` |
| iOS | `references/ios.md` |
| React Native / Expo | `references/react-native.md` |
| Flutter | `references/flutter.md` |
| Source maps, ProGuard/R8, dSYM | `references/sourcemaps.md` |

Always set `env` / `deploymentEnvironment` and an app version (`defaultAttributes: {"app.version": ...}` / global attributes) — the version is required for source-map resolution.

For backend correlation set `tracePropagationTargets` to the app's API origins (regex, no scheme) and make sure those backends (a) accept the `b3` / `traceparent` headers in CORS `Access-Control-Allow-Headers`, and (b) use a propagator that reads them (`OTEL_PROPAGATORS=b3,tracecontext`).

## Phase 3: Verify & report

1. Diff: exactly one init, loaded before app code, existing values unchanged.
2. Build: `npm run build` / `ng build` / `./gradlew assembleDebug` / `xcodebuild build` / `flutter build` — must terminate successfully.
3. Ask the user to load the app in a real browser (not headless — bots are blocked by default) with ad-blockers off, click around, then check RUM → Applications. With MCP: `list_rum_applications`, then `list_rum_sessions`. Data typically appears within a minute.
4. Report files changed, credentials/env vars to set, privacy settings chosen, CSP/CORS changes the user must deploy, and the source-map upload step for CI. On failure → `mw-troubleshoot` (coming soon).
