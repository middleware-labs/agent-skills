---
name: mw-instrument-rum
description: Add Middleware Real User Monitoring (RUM) to browser and mobile apps — the Middleware browser SDK (CDN script + Middleware.track) for React, Next.js App/Pages Router, Angular, Vue, Svelte, vanilla HTML and SPAs; Android (io.github.middleware-labs:android-sdk), iOS (MiddlewareRum), React Native (@middleware.io/middleware-react-native) and Flutter (middleware_flutter_opentelemetry). Covers session replay privacy, user attributes, sampling, trace propagation to backends, CSP, and source-map / ProGuard / dSYM upload. Use when asked to add, set up, repair or verify Middleware RUM, frontend monitoring, session recording, or mobile monitoring.
metadata:
  version: "0.1.2"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,rum,browser,session-replay,react,nextjs,angular,vue,android,ios,react-native,flutter,sourcemaps
  alwaysApply: "false"
---

# Middleware RUM instrumentation

Instrument only the client app(s) in scope. Backend APM is `mw-instrument-apm`.

## Ground rules

- **Browser RUM ships via CDN only.** There is no published npm package for the browser SDK — do not `npm install @middleware.io/browser*` or invent imports. Use the script tag + `Middleware.track(...)` from `references/browser.md`.
- **Use the latest SDKs.** Browser: always `cdnjs.middleware.io/browser/libs/0.0.2/middleware-rum.min.js`. Every release overwrites that path, so it is already the latest; never change it to another version. Mobile: install at least the versions in the table under Phase 2, and a newer one if the registry has it. Never install an older version, even if a docs page shows one. When an app already has the SDK at an older version, upgrade it.
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
4. Search for existing RUM: `middleware-rum.min.js`, `Middleware.track`, `MiddlewareRumBuilder`, `Middleware.builder()`, `MiddlewareWrapper`, `FlutterOTel.initialize`. Note the installed SDK version or CDN `libs/` path; upgrade it if it's older than the Phase 2 table. Also note other RUM vendors (Datadog, Sentry…) — don't remove them unless asked.
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

### SDK versions

Latest releases, *verified* against the registries on 2026-11-06. The docs pages lag behind (see ROADMAP "Docs issues found"), so these win over the docs. Run the check before installing and use a newer version if one exists.

| SDK | Latest | Check |
|---|---|---|
| Browser | `libs/0.0.2` (fixed path) | None. The path always serves the latest release |
| Android `io.github.middleware-labs:android-sdk` | 3.2.2 | `curl -s https://repo1.maven.org/maven2/io/github/middleware-labs/android-sdk/maven-metadata.xml`: highest plain `X.Y.Z` (skip `-rn` builds) |
| iOS `MiddlewareRum` | 2.3.2 | `git ls-remote --tags https://github.com/middleware-labs/middleware-ios.git`: highest `vX.Y.Z` |
| React Native `@middleware.io/middleware-react-native` | 2.3.2 | `npm view @middleware.io/middleware-react-native version` |
| Flutter `middleware_flutter_opentelemetry` | 2.2.3 | `curl -s https://pub.dev/api/packages/middleware_flutter_opentelemetry`: `latest.version` |

**iOS pods come from Middleware's specs repo.** CocoaPods trunk's newest `MiddlewareRum` is 2.3.0, and trunk closes to new pods on 2026-12-02. New versions are published to `https://github.com/middleware-labs/cocoapods-specs`. Native iOS (CocoaPods), React Native 2.3.2 and Flutter 2.2.3 all need that repo as a Podfile `source`, or `pod install` can't find a compatible `MiddlewareRum`. Each reference shows how. CocoaPods reads a local clone of that repo and doesn't refresh it on a plain `pod install`, so a machine that cloned it earlier silently stays on an older release (*verified*: a stale clone gave 2.3.1). Run `pod repo update` (or `pod install --repo-update`) before installing, including before `expo prebuild` and `flutter build ios`, then confirm the version in `Podfile.lock`.

Always set `env` / `deploymentEnvironment` and an app version (`defaultAttributes: {"app.version": ...}` / global attributes) — the version is required for source-map resolution.

For backend correlation set `tracePropagationTargets` to the app's API origins (regex, no scheme) and make sure those backends (a) accept the `b3` / `traceparent` headers in CORS `Access-Control-Allow-Headers`, and (b) use a propagator that reads them (`OTEL_PROPAGATORS=b3,tracecontext`).

## Phase 3: Verify & report

1. Diff: exactly one init, loaded before app code, existing values unchanged.
2. Build: `npm run build` / `ng build` / `./gradlew assembleDebug` / `xcodebuild build` / `flutter build` — must terminate successfully.
3. Ask the user to load the app in a real browser (not headless — bots are blocked by default) with ad-blockers off, click around, then check RUM → Applications. With MCP: `list_rum_applications`, then `list_rum_sessions`. Data typically appears within a minute.
4. Report files changed, credentials/env vars to set, privacy settings chosen, CSP/CORS changes the user must deploy, and the source-map upload step for CI. On failure → `mw-troubleshoot` (coming soon).
