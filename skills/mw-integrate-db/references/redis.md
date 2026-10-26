# Redis / Valkey (unverified)

Sources: https://docs.middleware.io/integrations/redis-integration ; bifrost `adapters/redis.ts`, `database/utils.ts` (`RedisSetting`). **Not yet tested via the API.**

Config key: `redis_config`.

## Prepare

Check reachability from the agent host: `redis-cli -h 127.0.0.1 -p 6379 PING` → `PONG` (add `--tls --cacert <ca>` for TLS, `--user/--pass` for ACLs). No special grants are needed. With ACLs, a read-only user with `+info +ping +config|get` is enough.

## Integration block (host mode)

Host mode connects **by port on the local host**. `username` and `password` are optional and independent:

```json
{"settings": [{"port": "6379", "service_name": "<redis-service-name>", "username": "", "password": ""}]}
```

- `port` is a string and is required.
- `service_name` is shown in the UI. The detected-integrations list provides one (e.g. a docker container name).

## Unknowns

- Whether empty `username`/`password` strings are fine or should be omitted (the UI says the backend "emits only the ones provided").
- TLS options for host mode.
- Redis reachable only on a docker network (not published on the host): host mode may not reach it.
