# Android RUM

Source: https://docs.middleware.io/rum/rum-android-mobile · SDK 3.2.0 · minSdk 21, compileSdk 35+, Kotlin Gradle Plugin 2.0+, core library desugaring required.

## Gradle (app module)

```groovy
android {
    compileOptions {
        coreLibraryDesugaringEnabled true
    }
}
dependencies {
    implementation 'io.github.middleware-labs:android-sdk:3.2.0'
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'
}
```
(Kotlin DSL: `isCoreLibraryDesugaringEnabled = true`, `implementation("io.github.middleware-labs:android-sdk:3.2.0")`.)

## Init in an Application subclass

```java
public class MyApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        Middleware.builder()
            .setTarget("<target>")
            .setRumAccessToken("<rum-token>")
            .setServiceName("<service-name>")
            .setProjectName("<project-name>")
            .setDeploymentEnvironment("PROD")
            .setGlobalAttributes(Attributes.of(APP_VERSION, BuildConfig.VERSION_NAME))
            .build(this);
    }
}
```
Register it: `<application android:name=".MyApplication" ...>` in `AndroidManifest.xml` (missing registration = no data). Ensure `INTERNET` permission.

## HTTP (not automatic — OkHttp only)

```java
Call.Factory callFactory = Middleware.getInstance().createRumOkHttpCallFactory(new OkHttpClient());
Retrofit retrofit = new Retrofit.Builder().baseUrl(BASE_URL).callFactory(callFactory).build();
```

## Builder options

`disableCrashReporting()`, `disableAnrDetection()`, `disableNetworkMonitor()`, `disableSlowRenderingDetection()`, `disableSessionRecording()`, `disableSessionRecordingV3()`, `setTracePropagationTargets(List<Pattern>)`, `setCaptureNetworkHeaders(bool)`, `setCaptureResponseBodies(bool)`, `setIgnoreHeaders(...)`, `setRecordingOptions(...)`.

Runtime: `Middleware.getInstance().addEvent(...)`, `.startWorkflow(...)`, `.addException(e)`, `.setScreenName(...)`, `.addSanitizedElement(view)`; logs via `d/e/i/w`.
Masking: view tags `mw-no-capture` / `mw-no-mask`; Compose `Modifier.mwSessionReplayMask()`.

ProGuard/R8 mapping upload → `sourcemaps.md`.
