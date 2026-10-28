---
name: mw-instrument-k8s
description: Install, upgrade and configure the Middleware Kubernetes agent (Helm chart mw-kube-agent-v3 in namespace mw-agent-ns) and Middleware auto-instrumentation (OpenTelemetry Operator, cert-manager, per-workload inject annotations) on EKS, GKE, AKS, OpenShift, k3s, kind or any cluster; generate Helm values, Argo CD/Flux manifests or Terraform; and wire application pods to the agent service. Use when asked to monitor a Kubernetes cluster with Middleware, enable APM auto-instrumentation for pods, or fix/upgrade an existing mw-kube-agent install.
metadata:
  version: "0.1.1"
  author: middleware-labs
  repository: https://github.com/middleware-labs/agent-skills
  tags: middleware,kubernetes,helm,k8s,auto-instrumentation,opentelemetry-operator,eks,gke,aks
  alwaysApply: "false"
---

# Middleware Kubernetes agent & auto-instrumentation

## Ground rules

- `helm install/upgrade`, `kubectl apply/delete` change a live cluster. **Print the exact command and the current kube context (`kubectl config current-context`) and get the user's confirmation before running them.** In GitOps repos, write manifests/values instead of running Helm.
- Copy chart names, value keys, annotations and resource names exactly from `references/`. Don't invent Helm values — if you need one that isn't documented here, read the chart: `helm show values middleware-labs/mw-kube-agent-v3`.
- Never put the API key in a committed `values.yaml`. Use `--set` from an env var, a Kubernetes Secret, or the GitOps tool's secret mechanism (SOPS, External Secrets, Sealed Secrets).
- Only one Middleware agent install per cluster. Don't also install the Linux host agent on the nodes.
- **Check the live docs.** Before applying a setup, fetch the docs page named on the reference's `Source:` line (`.md` URL) or find it via https://docs.middleware.io/llms.txt. Items the reference marks *verified* win over the docs. Otherwise prefer the docs and tell the user about any difference. See `mw-setup/references/docs.md`.

## Phase 1: Analyze

1. `kubectl config current-context`, `kubectl version`, cloud/distribution (EKS/GKE/AKS/OpenShift/k3s), node OS/arch.
2. Existing install? `helm list -A | grep -i mw`, `kubectl get ns mw-agent-ns`, `kubectl get ds,deploy -n mw-agent-ns`. If present → upgrade/configure path, not a fresh install.
3. Existing OpenTelemetry Operator or its CRDs? `kubectl get crd | grep opentelemetry.io`. Matters for auto-instrumentation (CRD conflicts).
4. cert-manager present? `kubectl get pods -A | grep cert-manager`.
5. How the cluster is managed: plain Helm, Argo CD, Flux, Terraform (`helm_release`), Pulumi. Match it.
6. Resolve key, target and a **cluster name** (`global.clusterMetadata.name`) — ask if not obvious; it's how the cluster shows up in Middleware.
7. Ask whether the user wants APM auto-instrumentation and, if so, `auto` mode (agent detects languages, toggled from the UI) or `manual` mode (annotations only).

## Phase 2: Install / upgrade

Follow `references/helm.md`. Order:
1. (Auto-instrumentation only) cert-manager — or disable cert-manager usage with the documented flags.
2. `helm repo add middleware-labs https://helm.middleware.io && helm repo update`
3. `helm install mw-agent middleware-labs/mw-kube-agent-v3 ... -n mw-agent-ns --create-namespace`
4. For GitOps / Terraform, translate the same values — see `references/gitops.md`.

Platform specifics (GKE private clusters, Karpenter tolerations, OpenShift, resource limits) are in `references/helm.md#platform-notes`.

## Phase 3: Instrument workloads

Pick one per workload, prefer the least invasive:

1. **Auto-instrumentation (`auto` mode)** — nothing to change in manifests; enable per-workload in the Middleware UI. Restart pods to inject.
2. **Annotation (`manual` mode)** — add the inject annotation to `spec.template.metadata.annotations` of the Deployment/StatefulSet/DaemonSet. See `references/auto-instrumentation.md` for annotations, multi-container pods, Go requirements, and namespace scoping. Then `kubectl rollout restart`.
3. **SDK in the image** (`mw-instrument-apm`) — set on the container:
   ```yaml
   env:
     - name: MW_AGENT_SERVICE
       value: mw-service.mw-agent-ns.svc.cluster.local
     - name: MW_SERVICE_NAME
       value: <service-name>
     - name: MW_API_KEY            # only for SDKs that need it in host mode
       valueFrom: { secretKeyRef: { name: mw-api-key, key: api-key } }
   ```
   Never use both an inject annotation and an in-image Middleware/OTel SDK on the same container — you'll get duplicate spans.

## Phase 4: Verify & report

```bash
kubectl get daemonset mw-kube-agent -n mw-agent-ns
kubectl get deployment mw-kube-agent mw-kube-agent-config-updater -n mw-agent-ns
kubectl get pods -n mw-agent-ns -o wide
kubectl logs ds/mw-kube-agent -n mw-agent-ns --tail=100
```
DaemonSet `DESIRED == READY` on every node; no `CrashLoopBackOff`/`OOMKilled`. For auto-instrumentation also check `mw-agent-opentelemetry-operator`, `mw-auto-injector`, `mw-lang-detector`, and that an instrumented pod has an init container / `OTEL_*` env (`kubectl describe pod <pod>`).

Then confirm data: Infrastructure → Kubernetes shows the cluster name; with MCP, use `get_resources` for the cluster/nodes and `query` for traces of an instrumented service. Report the commands run, values used (key masked), how to upgrade/uninstall, and anything left for the user. On failure → `mw-troubleshoot` (coming soon) or `references/helm.md#platform-notes`.
