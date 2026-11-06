# iOS RUM

Source: https://docs.middleware.io/get-started/rum/ios.md · MiddlewareRum 2.3.2 (latest tag, *verified* 2026-11-06) · iOS 13+, macOS 10.15+, tvOS 13+

## Install

SPM: `https://github.com/middleware-labs/middleware-ios`, product `MiddlewareRum`, "Up to Next Major Version" from `2.3.2`. In `Package.swift`: `.package(url: "https://github.com/middleware-labs/middleware-ios", from: "2.3.2")`.

CocoaPods (static framework). Add both sources at the top of the `Podfile`:
```ruby
source 'https://github.com/middleware-labs/cocoapods-specs.git'
source 'https://cdn.cocoapods.org/'

pod 'MiddlewareRum', '~> 2.3.2'
```
Then `pod install --repo-update`. Trunk's newest version is 2.3.0, so without the Middleware source CocoaPods can't find 2.3.2. Keep the trunk line: once a Podfile declares any `source`, CocoaPods no longer adds trunk by default, and the other pods come from there. If `Podfile.lock` already pins an older `MiddlewareRum`, run `pod update MiddlewareRum` instead of `pod install`.

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
