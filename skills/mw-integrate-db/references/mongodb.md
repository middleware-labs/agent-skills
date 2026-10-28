# MongoDB (unverified)

Sources: https://docs.middleware.io/integrations/mongodb-integration.md ; payload shape as saved by the Middleware UI. **Not yet tested via the API.**

Config key: `mongodb_config`.

## Prepare

```js
use admin
db.createUser({
  user: "mw_monitor",
  pwd: passwordPrompt(),
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }   // only needed for profiling / query monitoring
  ]
})
```
Test: `mongosh "mongodb://localhost:27017" -u mw_monitor -p --authenticationDatabase admin --eval 'db.serverStatus().ok'`.

## Integration block (host mode)

As with MySQL, the UI saves only a path to a credentials YAML on the agent host:

```json
{"path": "/etc/mw-agent/mongodb-creds.yaml"}
```

```yaml
mongodb:
  hosts:
    - endpoint: localhost:27017
  username: mw_monitor
  password: <generated>
  profiling_level: 1   # 0 off, 1 = slower than slow_ms, 2 = all
  slow_ms: 10
```

**Always set `profiling_level`.** The agent applies it to your databases on every collection, and if it's missing the agent turns profiling **off**. Ask the user before choosing `2`, which has a performance cost.

## Unknowns

- Whether host mode also accepts inline `settings[]` (`endpoints[]`, `username`, `password`, `profiling_level`, `slow_ms`, `collection_interval`) like k8s mode.
- Replica sets and Docker-hosted mongod (the detected-integrations list may show several ports, e.g. 27017–27019): one entry per member, or one with all hosts?
