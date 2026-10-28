# Kubernetes auto-instrumentation

Source: https://docs.middleware.io/get-started/agent/kubernetes/kubernetes-agent.md (auto-instrumentation section)

Built on the OpenTelemetry Operator. Languages: Java, Node.js, Python, .NET, Go, Ruby, Apache HTTPD, Nginx.
Requires `mw-autoinstrumentation.enabled=true` and cert-manager (or the cert-manager-disable flags).

## Modes

- `auto` (default): `mw-lang-detector` finds languages; enable/disable instrumentation per workload in the Middleware UI.
- `manual`: `--set mw-autoinstrumentation.mode=manual`; add annotations yourself.

## Annotations

Add to the **pod template** (`spec.template.metadata.annotations`), not the Deployment's own metadata:
```yaml
spec:
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-java: "mw-agent-ns/mw-autoinstrumentation"
```
Middleware documents only `inject-java` explicitly. Other languages use the standard OpenTelemetry Operator keys with the same value `"mw-agent-ns/mw-autoinstrumentation"`:

| Language | Annotation key |
|---|---|
| Java | `instrumentation.opentelemetry.io/inject-java` (documented) |
| Node.js | `instrumentation.opentelemetry.io/inject-nodejs` |
| Python | `instrumentation.opentelemetry.io/inject-python` |
| .NET | `instrumentation.opentelemetry.io/inject-dotnet` |
| Go | `instrumentation.opentelemetry.io/inject-go` |
| Apache HTTPD | `instrumentation.opentelemetry.io/inject-apache-httpd` |
| Nginx | `instrumentation.opentelemetry.io/inject-nginx` |

Before relying on a non-Java key, confirm the language is configured: `kubectl get instrumentation mw-autoinstrumentation -n mw-agent-ns -o yaml` lists a section per supported language. Ruby injection is Middleware-specific (not in upstream OTel Operator) — in `auto` mode enable it from the UI rather than guessing an annotation. Tell the user when you used a standard-but-undocumented key.

Multi-container pods: `instrumentation.opentelemetry.io/<lang>-container-names: "app,worker"` (e.g. `java-container-names`).

Go (eBPF-based) additionally needs:
```yaml
annotations:
  instrumentation.opentelemetry.io/inject-go: "mw-agent-ns/mw-autoinstrumentation"
  instrumentation.opentelemetry.io/otel-go-auto-target-exe: "/path/to/binary/in/container"
```
and the injected sidecar requires `privileged: true` and `runAsUser: 0` (check PodSecurity admission on the namespace).

Python on Alpine (musl) images may need `instrumentation.opentelemetry.io/otel-python-platform: "musl"` (operator ≥0.112).

## Apply

```bash
kubectl patch deployment <name> -n <ns> --type merge -p \
  '{"spec":{"template":{"metadata":{"annotations":{"instrumentation.opentelemetry.io/inject-java":"mw-agent-ns/mw-autoinstrumentation"}}}}}'
```
Patching the pod template triggers a rollout. If you edited manifests in Git instead, the sync triggers it. Annotations on existing pods do nothing until pods are recreated.

## Verify

```bash
kubectl describe pod <pod> -n <ns> | grep -iE 'opentelemetry|OTEL_|init'
kubectl logs deploy/mw-auto-injector -n mw-agent-ns
kubectl logs deploy/mw-agent-opentelemetry-operator -n mw-agent-ns
kubectl exec -it <pod> -n <ns> -- curl -s http://mw-service.mw-agent-ns:9320
```
