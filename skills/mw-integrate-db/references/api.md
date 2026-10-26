# Agent settings API (host integrations)

Source: middleware-labs/bifrost, `app/cmd/mwcore/routes/handlers/agent.handler.go` and `app/internal/store/agent/group.service.go`; spec at `https://app.middleware.io/swagger.json`. Verified against a live project on 2026-10-26 (PostgreSQL).

## Base URL and auth

- Base: `https://<MW_UID>.middleware.io/api/v1`
- Auth: `Authorization: ApiKey <MW_PUBLIC_API_KEY>` (or header `ApiKey: <key>`). A **public API key** from Settings → API Keys, not the ingestion key. The ingestion key gets an error on these routes.
- `{hostId}` is the agent host's hostname, URL-encoded.

Keep the key out of command lines that get echoed and out of chat, for example by reading it from a mode-600 file: `-H "Authorization: ApiKey $(cat "$KEYFILE")"`.

## Endpoints

| Call | Purpose |
|---|---|
| `GET /agent/setting/{hostId}` | Full host setting. `setting.config.linux` holds `<db>_config` keys and `integrations` (databases detected by the agent). |
| `POST /agent/setting/{hostId}?agent_type=host` | Save. Body: `{"value": "<base64 of JSON config>", "meta_data": {}}`. **Not in the published swagger yet.** |
| `GET /agent/setting/{hostId}/detected-integrations?platform=linux` | Detected databases only. |
| `GET /agent/setting/db/hosts/{configKey}/false` | Every host in the project that has `{configKey}`, with its settings. Use it to see what a change could affect. |
| `DELETE /agent/setting/rm/{platform}/{configKey}` | **Do not use.** Removes the key from *all hosts in the project*. |

The GET response also contains `setting.token` (the host's ingestion key) and stored DB passwords. Don't print the raw response; mask `password` and `token` fields.

## Save semantics

The JSON inside `value` is `{"<platform>": {"<key>": <value>, ...}}`. The server merges at the second level:
- every key you send under `linux` **replaces** the stored value for that key;
- every key you don't send is kept.

So:
- **Add or replace one integration:** `{"linux": {"postgres_config": {...}, "agent_restart_status": true}}`.
- **Remove one integration from one host:** `{"linux": {"postgres_config": {}, "agent_restart_status": true}}`.
- Never send other `*_config` keys unless you mean to overwrite them.

`agent_restart_status: true` matches what the UI and the remove endpoint set when config changes.

## Example (bash + python3)

```bash
BASE="https://$MW_UID.middleware.io/api/v1"; HOST="$(hostname)"   # or the target host's name
AUTH="Authorization: ApiKey $MW_PUBLIC_API_KEY"

# 1. Backup
umask 077; curl -sf -H "$AUTH" "$BASE/agent/setting/$HOST" > mw-setting-backup.json

# 2. Build body from a JSON file holding {"linux": {...}} (contains the DB password; mode 600)
python3 -c 'import base64,json,sys; print(json.dumps({"value": base64.b64encode(open(sys.argv[1],"rb").read()).decode(), "meta_data": {}}))' cfg.json > body.json

# 3. Save, then read back
curl -sf -X POST -H "$AUTH" -H 'Content-Type: application/json' "$BASE/agent/setting/$HOST?agent_type=host" --data-binary @body.json
curl -sf -H "$AUTH" "$BASE/agent/setting/$HOST" | python3 -c 'import json,sys; c=json.load(sys.stdin)["setting"]["config"]["linux"]; print(json.dumps(c.get("postgres_config"))[:300])' | sed -E 's/("password": )"[^"]*"/\1"****"/g'
```

Success responses are HTTP 200 with `"status": true`. Errors are often HTTP 200 with `"status": false` and a `message`, so check the body, not just the status code.

## Timing

The agent picks up changes on its config check (`MW_CONFIG_CHECK_INTERVAL`, default `5m`). In testing, removal applied after ~3 min and addition after ~5 min.
