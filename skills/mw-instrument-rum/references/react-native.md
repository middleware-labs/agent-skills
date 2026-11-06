# React Native RUM

Source: https://docs.middleware.io/get-started/rum/react.md · `@middleware.io/middleware-react-native` 2.3.2 (latest on npm, *verified* 2026-11-06; the docs page still pins 2.3.1) · RN 0.68+

2.3.2 pulls in `android-sdk` 3.2.2 and needs `MiddlewareRum` 2.3.1+ on iOS, which isn't on CocoaPods trunk. Before `pod install`, add both sources at the top of `ios/Podfile`:
```ruby
source 'https://github.com/middleware-labs/cocoapods-specs.git'
source 'https://cdn.cocoapods.org/'
```
If pods build as static libraries (the default, no `use_frameworks!`), also add `pod 'Reachability', :modular_headers => true` inside the app target.

```bash
npm install @middleware.io/middleware-react-native@2.3.2   # or yarn add
cd ios && pod install --repo-update   # upgrading an existing install: pod update MiddlewareRum
```
Android also needs core library desugaring (see `android.md`).

**Expo:** requires a dev build (not Expo Go). `expo prebuild` regenerates `ios/Podfile`, and the SDK's config plugin (as of 2.3.2) has three iOS gaps (*verified* 2026-11-06, Expo SDK 58 / RN 0.88: `pod install` with and without each fix, then a simulator build with all three):
- It doesn't add the specs-repo sources, so `pod install` fails with `could not find compatible versions for pod "MiddlewareRum"`.
- It skips `pod 'Reachability', :modular_headers => true` because the Expo Podfile always contains conditional `use_frameworks!` lines. `pod install` then fails with `Swift pod MiddlewareRum depends upon Reachability, which does not define modules`.
- When `ios.deploymentTarget` isn't set, it writes `13.0`, below Expo's default. Expo modules aren't linked and `pod install` fails with `required a higher minimum deployment target`. Pass `iosDeploymentTarget` set to the default in the generated Podfile's `platform :ios, podfile_properties['ios.deploymentTarget'] || '<default>'` line (16.4 on SDK 58), unless the app already sets a higher target (e.g. via `expo-build-properties`).

Add a local config plugin, `plugins/with-middleware-pod-sources.js`:
```js
const { withPodfile } = require('expo/config-plugins');

const SOURCES =
  "source 'https://github.com/middleware-labs/cocoapods-specs.git'\n" +
  "source 'https://cdn.cocoapods.org/'\n";

module.exports = (config) =>
  withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents;
    if (!podfile.includes('middleware-labs/cocoapods-specs')) {
      podfile = SOURCES + podfile;
    }
    if (!/pod ['"]Reachability['"]/.test(podfile)) {
      podfile = podfile.replace(
        /^(\s*)use_expo_modules!/m,
        "$1pod 'Reachability', :modular_headers => true\n$1use_expo_modules!"
      );
    }
    cfg.modResults.contents = podfile;
    return cfg;
  });
```
`app.json`:
```json
"plugins": [
  ["@middleware.io/middleware-react-native", { "iosDeploymentTarget": "16.4" }],
  "./plugins/with-middleware-pod-sources"
]
```
Then `npx expo prebuild --clean`. Re-apply desugaring after every prebuild (or via a config plugin).

## Init

```tsx
import { MiddlewareWrapper } from '@middleware.io/middleware-react-native';

const config = {
  serviceName: '<service-name>',
  projectName: '<project-name>',
  accountKey: '<rum-token>',
  target: '<target>',
  deploymentEnvironment: 'production',
  globalAttributes: { 'app.version': '1.0.0' },
};

export default function App() {
  return (
    <MiddlewareWrapper configuration={config}>
      {/* app */}
    </MiddlewareWrapper>
  );
}
```
Optional config: `appStartEnabled`, `debug`, `sessionRecording`, `recordingOptions`, `disableSessionRecordingV3`, `sessionSamplingRatio`, `networkInstrumentation`, `tracePropagationTargets`, `tracePropagationFormat`, `ignoreUrls`, `captureNetworkHeaders`, `captureResponseBodies`, `ignoreHeaders`.

Navigation: `startNavigationTracking(navigationRef)` with React Navigation's `NavigationContainer ref`.
Runtime: `MiddlewareRum.setGlobalAttributes`, `reportError`, `updateLocation`, `debug/info/warn/error`.

Changes need a **native rebuild** — a Metro reload is not enough.
