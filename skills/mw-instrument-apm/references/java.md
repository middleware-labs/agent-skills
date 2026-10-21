# Java

Source: https://docs.middleware.io/apm-configuration/java
Agent releases: https://github.com/middleware-labs/opentelemetry-java-instrumentation/releases (assets `middleware-javaagent-<version>.jar`, `middleware-javaagent.jar`). Java 8+.

## Get the agent

Pin a version (check the releases page for the latest; v1.8.1 at time of writing):
```bash
curl -L -o middleware-javaagent.jar \
  https://github.com/middleware-labs/opentelemetry-java-instrumentation/releases/download/v1.8.1/middleware-javaagent-1.8.1.jar
```
Don't commit the jar unless the repo already vendors agents; prefer downloading it in the Dockerfile / build.

## Run

Host mode:
```bash
MW_API_KEY="<MW_API_KEY>" \
java -javaagent:/PATH/TO/middleware-javaagent-{version}.jar \
  -Dotel.service.name={APM-SERVICE-NAME} \
  -Dotel.resource.attributes=project.name={APM-PROJECT-NAME} \
  -jar {JAR-NAME}.jar
```
Agentless: also `export MW_TARGET="https://<MW_UID>.middleware.io:443"`.

Where to put `-javaagent`:
- Dockerfile: `ENTRYPOINT ["java","-javaagent:/app/middleware-javaagent.jar","-jar","/app/app.jar"]`, or `ENV JAVA_TOOL_OPTIONS="-javaagent:/app/middleware-javaagent.jar"` when the entrypoint is a script.
- Spring Boot Maven/Gradle run: `JAVA_TOOL_OPTIONS` env, or `jvmArguments` in the plugin config.
- Tomcat: `CATALINA_OPTS="$CATALINA_OPTS -javaagent:..."` in `bin/setenv.sh`.

## Env vars

`MW_API_KEY`, `MW_TARGET`, `MW_SERVICE_NAME`, `MW_AGENT_SERVICE` (default localhost → `localhost:9319`), `MW_APM_COLLECT_PROFILING` (default true), `MW_AUTH_URL` (default `https://app.middleware.io/api/v1/auth`), `MW_PROFILING_SERVER_URL`, `MW_PROFILING_ALLOC` (`512k`), `MW_PROFILING_LOCK` (`10ms`).
Standard OTel: `OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` (e.g. `-Dotel.traces.sampler=parentbased_traceidratio -Dotel.traces.sampler.arg=0.25`), `OTEL_JAVAAGENT_CONFIGURATION_FILE`.

## Custom logs

Maven:
```xml
<dependency>
  <groupId>io.github.middleware-labs</groupId>
  <artifactId>agent-apm-java</artifactId>
  <version>0.0.16</version>
</dependency>
```
```java
import io.github.middlewarelabs.agentapmjava.Logger;
Logger.info("msg"); Logger.warn("msg"); Logger.debug("msg"); Logger.error("msg");
Logger.recordError(e);
```
Standard logging frameworks (logback/log4j2) are captured by the agent automatically.

## Kubernetes

With `mw-autoinstrumentation` enabled, annotate the pod template instead of adding the jar:
`instrumentation.opentelemetry.io/inject-java: "mw-agent-ns/mw-autoinstrumentation"` (see `mw-instrument-k8s`).

## Debug

```bash
OTEL_TRACES_EXPORTER=logging OTEL_METRICS_EXPORTER=logging OTEL_LOGS_EXPORTER=logging OTEL_JAVAAGENT_DEBUG=true
```
