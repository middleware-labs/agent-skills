# MySQL / MariaDB (unverified)

Sources: https://docs.middleware.io/integrations/mysql-integration.md ; bifrost `adapters/mysql.ts`. **Not yet tested via the API.** Confirm with a read-back and agent verification.

Config key: `mysql_config`.

## Prepare

```sql
CREATE USER 'mw'@'localhost' IDENTIFIED BY '<generated>';
ALTER USER 'mw'@'localhost' WITH MAX_USER_CONNECTIONS 5;
GRANT REPLICATION CLIENT, PROCESS ON *.* TO 'mw'@'localhost';
GRANT SELECT ON performance_schema.* TO 'mw'@'localhost';
-- MariaDB only:
GRANT SLAVE MONITOR ON *.* TO 'mw'@'localhost';
```
Use `'mw'@'%'` only if the agent connects from another host. Test with `mysql -h 127.0.0.1 -P 3306 -u mw -p -e 'SHOW STATUS' | grep Uptime`.

## Integration block (host mode)

For hosts, the UI saves only a **path to a credentials YAML on the agent host**, with no settings:

```json
{"path": "/etc/mw-agent/mysql-creds.yaml", "settings": []}
```

Credentials file (mode `600`, readable by the agent; Docker-agent users: put it under `/var/log`):
```yaml
mysql:               # MariaDB: use `mysql/mariadb:` as the top key
  endpoint: localhost:3306
  username: mw
  password: <generated>
```

## Unknowns

- Whether host mode also accepts inline `settings[]` (`endpoints[{endpoint, username, password}]`, `collection_interval`) the way k8s mode does.
- Ownership/permissions the agent needs on the creds file (the agent runs as root in standard installs).
- The docs disagree on whether the file must live under `/var/log` for non-Docker installs.
