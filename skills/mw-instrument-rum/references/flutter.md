# Flutter RUM

Source: https://docs.middleware.io/rum/flutter · `middleware_flutter_opentelemetry` ^2.2.0 · Flutter/Dart 3.7+, Android minSdk 24

`pubspec.yaml`:
```yaml
dependencies:
  middleware_flutter_opentelemetry: ^2.2.0
dependency_overrides:
  path_provider_android: 2.2.12
```

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
