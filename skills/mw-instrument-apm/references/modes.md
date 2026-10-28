# Host mode vs agentless mode

Source: https://docs.middleware.io/features/apm.md

| | Host mode | Agentless ("serverless") mode |
|---|---|---|
| Requires | Middleware host agent / K8s agent reachable from the app | Nothing but outbound HTTPS 443 |
| Exports to | `localhost:9319` (OTLP gRPC) or `:9320` (OTLP HTTP), or `MW_AGENT_SERVICE` | `MW_TARGET=https://<MW_UID>.middleware.io:443` |
| Credentials in app | `MW_API_KEY` for some SDKs (Node, Java, .NET, Ruby); Python needs none | `MW_API_KEY` **and** `MW_TARGET` |
| Extra data | Host metrics, logs, correlation to infra | App telemetry only |

## Reaching the agent

| Where the app runs | `MW_AGENT_SERVICE` |
|---|---|
| Same Linux host (systemd agent) | unset (defaults to `localhost`) |
| Docker container, agent on the host | `172.17.0.1` (default bridge gateway) or the agent container name on a shared network |
| Kubernetes with `mw-kube-agent-v3` | `mw-service.mw-agent-ns.svc.cluster.local` (confirm with `kubectl get service --all-namespaces \| grep mw-service`) |

## Most common error

`Transient error StatusCode.UNAVAILABLE encountered while exporting logs to localhost:9319`
→ SDK is in host mode but no agent is reachable. Install/fix the agent, set `MW_AGENT_SERVICE`, or switch to agentless mode (set `MW_API_KEY` + `MW_TARGET`).

Wait 3–5 minutes after starting the app before expecting data in the UI.
