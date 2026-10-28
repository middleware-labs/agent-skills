# React Native RUM

Source: https://docs.middleware.io/get-started/rum/react.md · `@middleware.io/middleware-react-native` 2.3.0 · RN 0.68+

```bash
npm install @middleware.io/middleware-react-native   # or yarn add
cd ios && pod install
```
Android also needs core library desugaring (see `android.md`).

**Expo:** requires a dev build (not Expo Go). `app.json`: `"plugins": ["@middleware.io/middleware-react-native"]`, then `npx expo prebuild --clean`. Re-apply desugaring after every prebuild (or via a config plugin).

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
