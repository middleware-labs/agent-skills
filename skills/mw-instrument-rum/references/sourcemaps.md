# Source maps, ProGuard/R8 mappings, dSYMs

Source: https://docs.middleware.io/features/rum.md · /rum/android-sourcemaps · npm `@middleware.io/sourcemap-uploader`
Uses the **RUM account key**, not the ingestion API key.

## Web

Emit maps: Webpack `devtool: "source-map"`, Next.js `productionBrowserSourceMaps: true`, Vite `build.sourcemap: true`, Angular `"sourceMap": true` in the production configuration.

CLI (CI step after build, before cleanup/deploy):
```bash
npm install -g @middleware.io/sourcemap-uploader
sourcemap-uploader upload \
  --apiKey=<rum_account_key> \
  --path="/path/to/sourcemaps" \
  --appVersion="1.0.0"
```
`--appVersion` **must equal** `defaultAttributes["app.version"]` in `Middleware.track`; omitted → "latest". Flags: `-k/--apiKey` (or env `MW_API_KEY`), `-av/--appVersion`, `-p/--path`, `-bu/--backendUrl` (`.../api/v1/rum/getSasUrl`), `-bp/--basePath`, `-d/--deleteAfterUpload` (keeps maps off the public server).

Webpack plugin:
```js
const MiddlewareWebpackPlugin = require("@middleware.io/sourcemap-uploader/dist/webpack-plugin").default;
plugins: [new MiddlewareWebpackPlugin(apiKey, appVersion, path, basePath, backendUrl, deleteAfterUpload)]
```
Vite plugin:
```js
import middlewareVitePlugin from "@middleware.io/sourcemap-uploader/dist/vite-plugin";
plugins: [middlewareVitePlugin({ apiKey, appVersion, basePath, backendUrl, deleteAfterUpload })]
```
Derive `appVersion` from one source (package.json version or git SHA) for both the upload and `defaultAttributes`.

## Android (ProGuard/R8)

```groovy
plugins { id 'io.github.middleware-labs.sourcemap' version '1.0.0' }
middlewareSourcemap {
    apiKey = '<rum_account_key>'
    backendUrl = 'https://app.middleware.io/api/v1/rum/getSasUrl'
}
```
Run `./gradlew uploadMiddlewareMappingRelease` after `assembleRelease`.

## iOS (dSYM)

```bash
npx @middleware.io/sourcemap-uploader upload-dsym -k <rum_account_key> -av <app-version> -p <path to .dSYM | .zip | dir>
```
Add as an Xcode Run Script build phase or CI step for Release builds.
