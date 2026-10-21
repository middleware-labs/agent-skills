# GitOps / IaC templates

Translate the same values as `helm.md`. Keep the API key out of Git.

## Secret (create out-of-band or via External Secrets / SOPS)

```bash
kubectl create namespace mw-agent-ns
kubectl create secret generic mw-api-key -n mw-agent-ns --from-literal=api-key="$MW_API_KEY"
```
Wire it with the chart's existing-secret option (`mw.apiKeyFromExistingSecret.*` — read the exact keys from `helm show values middleware-labs/mw-kube-agent-v3` before using).

## Argo CD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mw-agent
  namespace: argocd
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: mw-agent-ns
  source:
    repoURL: https://helm.middleware.io
    chart: mw-kube-agent-v3
    targetRevision: <pin-a-chart-version>
    helm:
      valuesObject:
        global:
          mw:
            target: https://<MW_UID>.middleware.io:443
          clusterMetadata:
            name: <cluster-name>
        mw-autoinstrumentation:
          enabled: true
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true, ServerSideApply=true]
```
(See also https://docs.middleware.io/agent-installation/kubernetes/kubernetes-argocd.)

## Flux HelmRelease

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata: { name: middleware-labs, namespace: flux-system }
spec: { interval: 1h, url: https://helm.middleware.io }
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: { name: mw-agent, namespace: mw-agent-ns }
spec:
  interval: 30m
  chart:
    spec:
      chart: mw-kube-agent-v3
      version: "<pin>"
      sourceRef: { kind: HelmRepository, name: middleware-labs, namespace: flux-system }
  values:
    global:
      mw: { target: https://<MW_UID>.middleware.io:443 }
      clusterMetadata: { name: <cluster-name> }
  valuesFrom:
    - kind: Secret
      name: mw-api-key
      valuesKey: api-key
      targetPath: global.mw.apiKey
```

## Terraform

```hcl
resource "helm_release" "mw_agent" {
  name             = "mw-agent"
  repository       = "https://helm.middleware.io"
  chart            = "mw-kube-agent-v3"
  namespace        = "mw-agent-ns"
  create_namespace = true

  set { name = "global.mw.target"              value = "https://${var.mw_uid}.middleware.io:443" }
  set { name = "global.clusterMetadata.name"   value = var.cluster_name }
  set_sensitive { name = "global.mw.apiKey"    value = var.mw_api_key }
}
```
