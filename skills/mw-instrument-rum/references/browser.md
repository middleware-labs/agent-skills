# Browser RUM

Sources: https://docs.middleware.io/get-started/rum/javascript.md · /rum/installation · /rum/rum-reactjs · /rum/rum-nextjs · /rum/session-recording-privacy

## Script + init (canonical)

```html
<script
  src="https://cdnjs.middleware.io/browser/libs/0.0.2/middleware-rum.min.js"
  type="text/javascript"
  crossorigin="anonymous">
</script>
<script>
  if (window.Middleware) {
    Middleware.track({
      projectName: "my-application",
      serviceName: "mw-application",
      accountKey: "your-account-token",
      target: "https://<UID>.middleware.io",
      env: "production",
      defaultAttributes: { "app.version": "1.0.0" }
    });
  }
</script>
```
Docs: "This URL always serves the latest browser SDK release". Put both tags in `<head>`, before app bundles.

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `projectName` | string | — | **Required.** Must match the RUM application name |
| `serviceName` | string | — | **Required** |
| `accountKey` | string | — | **Required.** RUM token |
| `target` | string | — | **Required.** RUM endpoint |
| `env` | string | `"prod"` | |
| `recording` | string | `"1"` | `"1"` full replay, `"0"` traces/errors only, `"2"` disable video (if supported by account) |
| `recordingOptions` | object | — | See Privacy |
| `tracePropagationTargets` | RegExp[] | — | e.g. `[/localhost:3000/i, /api\.domain\.com/i]` — omit `http(s)://` |
| `tracePropagationFormat` | string | `"b3"` | `"b3"` or `"w3c"` |
| `tracer` | object | — | Sampling, e.g. `{ sampler: new Middleware.SessionBasedSampler({ ratio: 0.5 }) }` (also `AlwaysSampleSampler` default, `AlwaysOffSampler`, `ParentBased`) |
| `defaultAttributes` | Record<string,string> | — | Set `app.version` |
| `ignoreUrls` | array | — | |
| `ignoreHeaders` | array | — | |
| `captureNetworkHeaders` | boolean | `false` | |
| `captureResponseBodies` | boolean | `false` | |
| `console` | boolean | `true` | |
| `errors` | boolean | `true` | |
| `blockBotTraffic` | boolean | `true` | Headless browsers dropped |
| `vcsCommitSHA`, `vcsRepositoryURL` | string | — | For OpsAI code-level fixes |

Settings saved on the in-app installation page (Network, Errors, Session Recording, WebSocket, Web Vitals, Long Tasks, Console, Allowed origins) **override** values passed to `track()`.
`track()` skips init and logs `"accountKey is required"`, `"target is required"` or `"bot traffic blocked"`.

## Runtime API

```js
window.Middleware?.setAttributes({ username: "...", email: "...", user_type: "admin" }); // after track(); use for user identification
Middleware.error("msg" | new Error()); Middleware.info("msg"); Middleware.warn("msg"); Middleware.debug("msg");
```
Call `setAttributes` when the user logs in (and again on change).

<a id="privacy"></a>
## Privacy (`recordingOptions`)

| Key | Default |
|---|---|
| `maskAllInputs` | `false` |
| `maskSensitiveInputs` | `true` |
| `maskInputOptions` | `{ password: true }` |
| `maskTextSelector`, `blockSelector`, `ignoreSelector` | — |
| `blockClass` / `ignoreClass` / `maskTextClass` | `'mw-block'` / `'mw-ignore'` / `'mw-mask'` |
| `maskInputFn`, `maskTextFn`, `ignoreCSSAttributes` | — |

For PII-heavy apps: `recordingOptions: { maskAllInputs: true, maskTextSelector: "[data-private]" }` and add `class="mw-block"` to sensitive regions. Sessions end after 15 min idle / 4 h max. Cookie: `_mwRumSessionId_x`.

## CSP

```
script-src 'self' https://cdnjs.middleware.io 'unsafe-inline';
connect-src 'self' https://<UID>.middleware.io;
```
If the project uses nonces/hashes instead of `'unsafe-inline'`, add the nonce to the inline init script rather than weakening the policy.

## Framework placement

**Plain HTML / Vite / CRA / Vue / Svelte (SPA):** both tags in `index.html` `<head>` (`public/index.html` for CRA, `index.html` at root for Vite). Use `%VITE_...%` / `%REACT_APP_...%` HTML env substitution if the project already does.

**React:** as above. Set user attributes in an effect:
```jsx
useEffect(() => { if (user) window.Middleware?.setAttributes({ username: user.name, email: user.email }); }, [user]);
```
Memory routers don't change the URL → no new views.

**Next.js App Router** — `app/layout.tsx`:
```tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          id="mw-rum-sdk"
          src="https://cdnjs.middleware.io/browser/libs/0.0.2/middleware-rum.min.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script
          id="mw-rum-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `if (window.Middleware) { Middleware.track({
              projectName: "${process.env.NEXT_PUBLIC_MW_PROJECT_NAME}",
              serviceName: "${process.env.NEXT_PUBLIC_MW_SERVICE_NAME}",
              accountKey: "${process.env.NEXT_PUBLIC_MW_RUM_KEY}",
              target: "${process.env.NEXT_PUBLIC_MW_RUM_TARGET}",
              env: "${process.env.NEXT_PUBLIC_MW_ENV ?? "production"}"
            }); }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```
**Next.js Pages Router:** same two `<Script strategy="beforeInteractive">` tags inside `<Head>` of `pages/_document.tsx`. If placed in `_app.tsx`, use `strategy="afterInteractive"` (otherwise Next raises "No Before Interactive Script Outside Document").

**Angular:** add both tags to `src/index.html` `<head>`. Optionally declare `declare global { interface Window { Middleware?: any } }` in a `.d.ts` for typed `setAttributes` calls.

**Nuxt:** `nuxt.config` → `app.head.script: [{ src: "https://cdnjs.middleware.io/browser/libs/0.0.2/middleware-rum.min.js", crossorigin: "anonymous" }, { innerHTML: "if (window.Middleware) { Middleware.track({...}) }" }]`.

**SvelteKit:** `src/app.html` `<head>`, before `%sveltekit.head%`.

**Iframes / micro-frontends:** initialize once in the top-level shell only.

## Distributed tracing to backends

`tracePropagationTargets: [/api\.example\.com/i]`. Backends must allow the propagation headers in CORS (`b3`, or `traceparent`/`tracestate` for `"w3c"`) and use a matching propagator (`OTEL_PROPAGATORS=b3` or `b3,tracecontext`). Add only origins whose CORS policy allows those headers, or the browser blocks the requests.
