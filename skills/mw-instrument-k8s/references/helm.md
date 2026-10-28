# Helm install: mw-kube-agent-v3

Source: https://docs.middleware.io/get-started/agent/kubernetes/kubernetes-agent.md · Helm repo `https://helm.middleware.io` · charts: github.com/middleware-labs/helm-charts

Charts in the repo: `mw-kube-agent-v3` (**current**), plus legacy `mw-kube-agent`, `mw-kube-agent-v2`, `kube-agent-chart`, and `mw-autoinstrumentation` (subchart). Use v3 for new installs.

## cert-manager (only needed for auto-instrumentation)

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.5 \
  --set installCRDs=true
```
Skip cert-manager (self-signed certs; restart the operator and auto-injector when they rotate):
```
--set mw-autoinstrumentation.webhook.certManager.enabled=false \
--set mw-autoinstrumentation.opentelemetry-operator.admissionWebhooks.certManager.enabled=false
```

## Install

```bash
helm repo add middleware-labs https://helm.middleware.io
helm repo update middleware-labs
helm install mw-agent middleware-labs/mw-kube-agent-v3 \
  --set global.mw.apiKey="$MW_API_KEY" \
  --set global.mw.target=https://<MW_UID>.middleware.io:443 \
  --set global.clusterMetadata.name=<your-cluster-name> \
  --set mw-autoinstrumentation.enabled=true \
  --set opsai.enabled=true \
  -n mw-agent-ns --create-namespace
```

| Value | Required | Default | Notes |
|---|---|---|---|
| `global.mw.apiKey` | yes | — | Ingestion key. Alternative: `mw.apiKeyFromExistingSecret.enabled` (confirm sub-keys with `helm show values`) |
| `global.mw.target` | yes | — | `https://<MW_UID>.middleware.io:443` |
| `global.clusterMetadata.name` | yes | — | Display name of the cluster |
| `mw-autoinstrumentation.enabled` | no | `false` | OTel Operator + language detection + injector |
| `mw-autoinstrumentation.mode` | no | `auto` | `manual` = operator only, annotations drive injection |
| `mw-autoinstrumentation.webhook.includedNamespaces` / `userExcludedNamespaces` | no | — | Scope injection |
| `mw-autoinstrumentation.opentelemetry-operator.crds.create` | no | `true` | Set `false` if OTel Operator CRDs already exist |
| `opsai.enabled` | no | `false` | Middleware OpsAI deployment |

## Resources created (namespace `mw-agent-ns`)

| Kind | Name | Role |
|---|---|---|
| DaemonSet | `mw-kube-agent` | Node/pod metrics, container logs (`/var/log/pods/*/*/*.log`), OTLP receiver |
| Deployment | `mw-kube-agent` | Cluster-level metrics/events |
| Deployment | `mw-kube-agent-config-updater` | Pulls config from Middleware |
| Service | `mw-service` | OTLP gRPC **9319**, HTTP **9320** → `mw-service.mw-agent-ns.svc.cluster.local` |
| Deployment | `mw-agent-opentelemetry-operator` | (auto-instr) OTel Operator |
| Deployment | `mw-auto-injector` | (auto-instr) Mutating webhook |
| Deployment | `mw-lang-aggregator` | (auto-instr) |
| DaemonSet | `mw-lang-detector` | (auto-instr) Detects languages per workload |
| Deployment | `opsai` | (opsai.enabled) |

## Upgrade / uninstall

```bash
helm repo update middleware-labs
helm get values mw-agent -n mw-agent-ns -o yaml > mw-values.yaml   # then strip/secret the apiKey
helm upgrade mw-agent middleware-labs/mw-kube-agent-v3 -n mw-agent-ns -f mw-values.yaml --set global.mw.apiKey="$MW_API_KEY"
kubectl rollout restart deployment mw-kube-agent-config-updater -n mw-agent-ns
```
Prefer `-f values.yaml` over `--reuse-values` (the docs warn `--reuse-values` can miss keys added in newer chart versions).
```bash
helm uninstall mw-agent -n mw-agent-ns
kubectl delete namespace mw-agent-ns
```

<a id="platform-notes"></a>
## Platform notes

- **GKE private clusters**: add a firewall rule allowing the control plane to reach nodes on TCP **9443** (webhook).
- **Karpenter / tainted nodes**: add tolerations so the DaemonSet lands on every node.
- **OOMKilled / CrashLoop**: raise the agent's requests/limits via values (check `helm show values` for the exact keys).
- **Windows / PowerShell & Argo CD** have dedicated pages: `/agent-installation/kubernetes/kubernetes-ms-powershell`, `/agent-installation/kubernetes/kubernetes-argocd`.
- **Script alternative** (no Helm): `MW_API_KEY=... MW_TARGET=https://<MW_UID>.middleware.io:443 bash -c "$(curl -L https://install.middleware.io/scripts/mw-kube-agent-install.sh)"`.
