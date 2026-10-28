# PostgreSQL (verified)

Sources: https://docs.middleware.io/integrations/postgresql-integration.md ; payload shape as saved by the Middleware UI. Tested end-to-end on Ubuntu 24.04 / PostgreSQL 16 (2026-10-26).

Config key: `postgres_config`. Receiver in agent config: `postgresql/1`.

## Prepare

1. `pg_stat_statements` must be preloaded (`SHOW shared_preload_libraries;`). If it isn't, add the following to `postgresql.conf`, then **restart PostgreSQL (ask first)**:
   ```
   shared_preload_libraries = 'pg_stat_statements'
   pg_stat_statements.track = all
   track_io_timing = on
   ```
   Then run `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` in the `postgres` database.
2. Create a monitoring role (password from a file or stdin, never inline in chat):
   ```sql
   CREATE ROLE mw_monitor LOGIN PASSWORD :'pw';   -- psql: \set pw '<generated>'
   GRANT pg_monitor TO mw_monitor;                -- includes pg_read_all_stats / pg_stat_activity
   GRANT CONNECT ON DATABASE <each_db> TO mw_monitor;
   ```
3. For explain plans and schema collection, grant read access **in every database that has workload**, not just one. In each database:
   ```sql
   GRANT USAGE ON SCHEMA public TO mw_monitor;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO mw_monitor;
   ```
   Repeat for other schemas in use. List databases with `SELECT datname FROM pg_database WHERE NOT datistemplate;`.
4. Test over TCP as the agent will connect: `PGPASSWORD=... psql -h localhost -U mw_monitor -d postgres -c 'select count(*) from pg_stat_statements;'`.

## Integration block

Defaults mirror the UI. One `settings[]` entry per instance; `endpoints[].name` must be kebab-case and unique.

```json
{"settings": [{
  "collection_interval": "10s",
  "transport": "tcp",
  "tls": {"insecure": true, "insecure_skip_verify": true, "cert_file": "", "key_file": "", "ca_file": ""},
  "endpoints": [{"name": "<host>-postgres", "endpoint": "localhost:5432", "username": "mw_monitor", "password": "<pw>"}],
  "events": {
    "db.server.query_sample": {"enabled": true},
    "db.server.top_query": {"enabled": true},
    "db.server.schema_collection": {"enabled": true},
    "db.server.extensions_collection": {"enabled": true},
    "db.server.settings_collection": {"enabled": true}
  },
  "query_sample_enabled": true,
  "query_sample_collection": {"max_rows_per_query": 1000},
  "top_query_enabled": true,
  "top_query_collection": {"top_n_query": 1000, "max_rows_per_query": 1000, "max_explain_each_interval": 1000, "query_plan_cache_size": 1000, "query_plan_cache_ttl": "1h"},
  "connection_pool_enabled": true,
  "connection_pool": {"max_idle_time": "10m", "max_lifetime": "10m", "max_idle": 10, "max_open": 10},
  "schema_collection": {"enabled": true, "exclude_schemas": []}
}]}
```

Optional keys: `databases` / `exclude_databases` (string arrays), `connection_pool.max_total_connections`, `relation_metrics.collection_interval`, `bloat_collection_interval`.

TLS: `insecure: true` means plaintext. For TLS set `insecure: false` and either `insecure_skip_verify: true` or provide `ca_file` (plus `cert_file`/`key_file` as a pair for client certs), all paths on the agent host.

The three `events` that cover schema, extensions and settings follow `schema_collection.enabled`. Query sample and top query collection power APM → Database.

## Troubleshooting

| Agent log message | Fix |
|---|---|
| `permission denied for table X` (EXPLAIN EXECUTE) | Grant `USAGE` + `SELECT` in the database/schema that owns X (step 3). |
| `password authentication failed` | Wrong password, or `pg_hba.conf` doesn't allow `md5`/`scram` for TCP from localhost. |
| `relation "pg_stat_statements" does not exist` | Run `CREATE EXTENSION pg_stat_statements` in the `postgres` DB; check the preload setting. |
| `PREPARE failed for explain … is not unique` | Harmless. The parameterized query can't be explained generically. |
| No `postgresql/1` receiver after 5+ min | Re-GET the setting; check `agent_restart_status`, hostId, and that the agent is in managed (OpAMP) mode. |
