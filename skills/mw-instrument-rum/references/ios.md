# iOS RUM

Source: https://docs.middleware.io/rum/rum-ios · MiddlewareRum 2.3.0 · iOS 13+, macOS 10.15+, tvOS 13+

## Install

SPM: `https://github.com/middleware-labs/middleware-ios`, product `MiddlewareRum`.
CocoaPods: `pod 'MiddlewareRum', '~> 2.3.0'` (static framework) then `pod install`.

## Init (App init / `application(_:didFinishLaunchingWithOptions:)`)

```swift
import MiddlewareRum

_ = MiddlewareRumBuilder()
    .globalAttributes(["app.version": "1.0.0"])
    .target("<target>")
    .serviceName("<service-name>")
    .projectName("<project-name>")
    .rumAccessToken("<rum-token>")
    .deploymentEnvironment("PROD")
    .build()
```
`build()` returns `false` and logs the reason when a required value is missing. SwiftUI: call from the `App` struct's `init()`.

URLSession is traced automatically.

Options: `.tracePropagationTargets([...])`, `.captureNetworkHeaders(...)`, `.captureResponseBodies(...)`, `.ignoreHeaders(...)`, `.disableRecording()`, `.disableRecordingV3()`, `.recordingOptions(RecordingOptions()...)`, `.disableNetworkMonitoring()`.
Runtime: `MiddlewareRum.info/debug/trace/warning/error/critical(...)`, `addError`, `addException`, `setScreenName`, `setGlobalAttributes`, `integrateWebViewWithBrowserRum(view:)`.

dSYM upload → `sourcemaps.md`.
