# Flutter RUM

Source: https://docs.middleware.io/get-started/rum/flutter.md · `middleware_flutter_opentelemetry` 2.2.3 (latest on pub.dev, *verified* 2026-11-06; the docs page still shows `^1.1.1`) · Flutter/Dart 3.7+, Android minSdk 24

`pubspec.yaml`:
```yaml
dependencies:
  middleware_flutter_opentelemetry: ^2.2.3
dependency_overrides:
  path_provider_android: 2.2.12
```

iOS: 2.2.3 needs `MiddlewareRum` 2.3.1+, which isn't on CocoaPods trunk. Add both sources at the top of `ios/Podfile`:
```ruby
source 'https://github.com/middleware-labs/cocoapods-specs.git'
source 'https://cdn.cocoapods.org/'
```
If `ios/Podfile` doesn't exist yet, Flutter creates it on the first iOS build (`flutter build ios --config-only`). Add the sources, then build again. When upgrading an app that already has a `Podfile.lock`, run `pod update MiddlewareRum` in `ios/`. Plain `pod install` fails against an older pinned version, with an error that wrongly mentions the deployment target.

`main.dart` (before `runApp`):
```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FlutterOTel.initialize(
    serviceName: '<service-name>',
    endpoint: 'https://<account>.middleware.io',
    middlewareAccountKey: '<rum-token>',
    deploymentEnvironment: 'production',
  );
  runApp(const MyApp());
}
```
Navigation: `MaterialApp(navigatorObservers: [FlutterOTel.routeObserver], ...)`. HTTP is traced automatically from 2.1.3.
Flutter web: add other origins to propagation only if their CORS allows the headers.
Changes need a full rebuild — hot reload isn't enough.
