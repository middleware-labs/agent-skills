# AWS ECS

Source: https://docs.middleware.io/integrations/aws-ecs-monitoring

## ECS on EC2

Run the Middleware agent as a **Daemon** service (one task per container instance) using image `ghcr.io/middleware-labs/mw-host-agent:master` with env `MW_API_KEY` and `MW_TARGET` (pull the key from Secrets Manager / SSM via `secrets`, not `environment`). Supported network modes: host, bridge, awsvpc (awsvpc requires service discovery so app tasks can reach the agent).

```bash
aws ecs register-task-definition --cli-input-json file://mw-ecs-agent.json
aws ecs create-service --cluster <cluster> --service-name mw-agent \
  --task-definition <family> --scheduling-strategy DAEMON
```
App tasks set `MW_AGENT_SERVICE` to the instance IP (bridge/host) or the service-discovery name (awsvpc).

## Fargate

Add a sidecar container to each task:
```json
{
  "name": "mw-agent",
  "image": "ghcr.io/middleware-labs/mw-host-agent:master",
  "essential": false,
  "portMappings": [{ "containerPort": 8006 }, { "containerPort": 9319 }, { "containerPort": 9320 }],
  "environment": [{ "name": "MW_TARGET", "value": "https://<MW_UID>.middleware.io:443" }],
  "secrets": [{ "name": "MW_API_KEY", "valueFrom": "<secrets-manager-or-ssm-arn>" }]
}
```
App containers in the same task reach it on `localhost:9319` / `9320`; FireLens/fluentd logs to `localhost:8006`.

The exact full task-definition JSON the in-app installer generates isn't in the public docs — prefer the copy from Installation → ECS in the Middleware app when the user has access, and treat the above as a template.

A missing Installation/Integrations menu means the user's role lacks the `Installation` permission.
