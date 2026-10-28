# Middleware credential types

| Credential | Used by | Where it comes from | Where it goes |
|---|---|---|---|
| Ingestion API key | Host/K8s/Docker/Windows agents, APM SDKs, OTLP, Lambda | In-app Installation pages; project Settings → API Keys (ingestion key) | `MW_API_KEY`, `api-key:` in `/etc/mw-agent/agent-config.yaml`, `global.mw.apiKey` (Helm), OTLP header `authorization=<key>`, Lambda resource attr `mw.account_key=<key>` |
| Target / UID | Same as above | Same pages; your UID is the subdomain in `https://<MW_UID>.middleware.io` | `MW_TARGET=https://<MW_UID>.middleware.io:443`, `target:` (agent), `global.mw.target` (Helm), `OTEL_EXPORTER_OTLP_ENDPOINT` |
| RUM account token | Browser RUM (`accountKey`), Android/iOS (`rumAccessToken`), React Native/Flutter, sourcemap uploader `--apiKey` | Installation → RUM → (platform) → New Application | RUM init only; it's shipped to browsers so it's not secret, but don't reuse the ingestion key there |
| Public API key (`MW_PUBLIC_API_KEY`) | REST API (`/api/v1/builder/...`, `/synthetics`, `/agent/setting/...` for DB integrations, ...) | Settings → API Keys (`https://app.middleware.io/settings/api-keys`). Spec: "Do not use the project API key that is used for agent installation." | Header `ApiKey: <token>` or `Authorization: ApiKey <token>` against `https://<project_domain>/api/v1` |

## Environment variables used by the skills

| Variable | Credential |
|---|---|
| `MW_API_KEY` | Ingestion API key |
| `MW_TARGET` | `https://<MW_UID>.middleware.io:443` |
| `MW_UID` | Project subdomain (derived from `MW_TARGET` if unset) |
| `MW_PUBLIC_API_KEY` | Public API key (REST API, DB integrations) |
| `MW_RUM_TOKEN` | RUM account token |

Lookup order: shell env > `.env.local` > `.env` > `~/.config/middleware/credentials.env` (mode 600). See `discovery.md`.

## Common mistakes

- Using `app.middleware.io` as the ingestion target → use `https://<MW_UID>.middleware.io:443`.
- OTLP HTTP exporter pointed at the root URL → needs `/v1/traces` etc. (gRPC uses the root).
- `Authorization: Bearer <key>` for OTLP → Middleware expects the raw key: `authorization=<MW_API_KEY>`.
- Ingestion key used for the REST API → 401. Bare `Authorization: <token>` for the REST API → 401.
- Ingestion API returns **400** for a missing or invalid API key on OTLP/HTTP.
