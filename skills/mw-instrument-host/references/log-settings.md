# Log settings API (config group + pipeline)

Source: https://docs.middleware.io/public-api/api.md and the spec https://app.middleware.io/swagger.json.

**Experimental.** This flow comes from the Middleware backend and UI source (2026-11-02) and hasn't been tested against a live project. Tell the user this before making changes. The `/pipeline` routes are being added to the spec, so check it first and let it win on endpoint shape.

## When to use it

| To set up | Use |
|---|---|
| Log paths, data masking, attributes extracted from the log body, and other log settings | This flow |
| Database integrations | `mw-integrate-db`, which saves on the host |

## Rules

- **Never create a config group without a pipeline.** The platform has no config group UI, so a group without a pipeline can't be seen or managed there. Use this file's order of calls, and finish the flow or clean up if a step fails.
- **Don't save log settings with `POST /agent/setting/{hostId}`.** Host settings override the group, key by key.
- **Confirm before each write.** Saving a group restarts its agents. Show the settings and the hosts first.
- **Don't send `hostIds` when updating a group unless it's the full list.** A non-empty `hostIds` detaches every other host, and they fall back to the default group.
- **Never delete or edit a default pipeline or the `default` group.** `DELETE /pipeline/{pipelineId}` also deletes the linked group, agent filters and backend controls.

## Create

Auth is `Authorization: ApiKey $MW_PUBLIC_API_KEY`, and the base URL is `https://$MW_UID.middleware.io/api/v1`.

1. **Check for overrides.** For each host, run `GET /agent/setting/{hostId}`, then mask `password` and `token` fields before showing anything. If `setting.config.<platform>` already has a key you plan to set, that value will win over the group. Tell the user.
2. **Check for existing groups and pipelines.** Run `GET /pipeline/list` and `GET /agent/setting/config-groups?agent_type=host&fetchHostIds=true`. A host can only be in one group, so attaching it moves it out of its current one. Ask before moving hosts.
3. **Create the pipeline.** `POST /pipeline/default` takes no body. Keep `id`.
4. **Read the defaults.** Run `GET /agent/setting/config-groups/{groupName}?agent_type=host` with `default` as the group name. A new group holds only the keys you send, so start from `setting.config` and change only the keys you need.
5. **Save the group.** Run `POST /agent/setting/config-groups/{groupName}`, then keep `setting.id`. The name can be up to 30 characters. The body is:
   ```json
   {"agent_type": "host", "value": "<base64 of {\"linux\": {...}}>", "hostIds": ["<host id>"], "meta_data": {}}
   ```
6. **Link them.** `PUT /pipeline/{pipelineId}`:
   ```json
   {"name": "<name>", "pipeline_ingestion_group_id": <setting.id>, "source_type": "host", "sources": ["<host id>"]}
   ```
   For Kubernetes, use `agent_type: k8s` and `source_type: cluster`, and list cluster names in `hostIds` and `sources`.

**If a step fails:** check the body as well as the status code, because some errors return HTTP 200 with `"status": false`. If step 5 fails, delete the empty pipeline from step 3. If step 6 fails, retry it, and tell the user if the group is still unlinked.

## Update

1. Find the pipeline with `GET /pipeline/list`, then read its group with `GET /agent/setting/config-groups/{id}?agent_type=host`.
2. Save with `POST /agent/setting/config-groups/{groupName}`, sending only the keys you're changing. Keys you send replace the stored value, and keys you don't send are kept.
3. To add hosts, call `PUT /agent/setting/config-groups/{groupName}?agent_type=host` with `{"hostIds": [...]}`. Then send the full host list as `sources` in `PUT /pipeline/{pipelineId}`, because neither call updates the other.

## Settings

Put these keys under the platform (`linux`, `windows`, `darwin` or `k8s`) in `value`:

| Key | Purpose | Example |
|---|---|---|
| `middleware_agent_log_paths` | Files to collect. Each item is a path, or an object with `path`, `labels` and `line_start_pattern` | `["/var/log/app/*.log"]` |
| `regexes_to_filter_logs` | Regexes matched against the log body. Named capture groups become attributes | `["user=(?P<user>\\w+)"]` |
| `data_masking_settings` | Replace matching text | `[{"regex": "\\d{16}", "mask": "****"}]` |
| `clone_log_attributes_settings` | Copy an attribute to a new key | `[{"sourceAttributeKey": "a", "newAttributeKey": "b"}]` |
| `max_log_size` | Largest log entry | `"1MiB"` |
| `enhance_json_logs`, `json_log_glob_patterns` | JSON log handling, optionally limited to matching files | `true`, `["/var/log/app/*.json"]` |
| `clusters` | Kubernetes settings by cluster name | |

Docker agents can't pick up new paths this way. They need volume mounts at install time (see `docker.md`).

## Verify

1. Read back with `GET /pipeline/{pipelineId}` and confirm `pipeline_ingestion_group_id` and `sources`.
2. Check what the agent receives: `GET /agent/ingestion-rules?host_id=<host>&platform=linux`. This call uses the ingestion key in the `mw-api-key` header, not the public API key.
3. The agent applies changes on its config check (`MW_CONFIG_CHECK_INTERVAL`, default `5m`). Then confirm new logs arrive. Never claim they did unless you saw them.
4. Report the pipeline name and ID, the group name and ID, the hosts, and the keys changed. Tell the user they can manage it in the Middleware pipeline settings (`/settings/pipeline`).
