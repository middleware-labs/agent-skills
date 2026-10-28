# PHP

Source: https://docs.middleware.io/get-started/apm/php.md · PHP 8.0+, Composer, PECL, Debian-based Linux. No profiling. CakePHP unsupported. Host mode (agent on `localhost:9320`). Agentless mode is not documented.

## OpenTelemetry extension

```bash
sudo pecl install channel://pecl.php.net/opentelemetry-1.0.3
# add to php.ini (both CLI and FPM ini if both are used):
extension=opentelemetry.so
php -m | grep opentelemetry   # verify
```
Errors: `pecl: command not found` → `apt-get install php-pear php8.1-dev`; `phpize` failed → `apt-get install php8.1-dev`; broken deps → `sudo apt --fix-broken install`. Adjust `8.1` to the installed PHP version (`php -v`).

## Generic PHP

```bash
composer require middleware/agent-apm-php
```
```php
require 'vendor/autoload.php';
use Middleware\AgentApmPhp\MwTracker;

$tracker = new MwTracker('<PROJECT-NAME>', '<SERVICE-NAME>');
$tracker->preTrack();
$tracker->registerHook('<CLASS-NAME-1>', '<FUNCTION-NAME-1>', ['custom.attr1' => 'value1']);
// ... app ...
$tracker->postTrack();
```
Logs: `$tracker->info/warn/debug/error('msg')`.

## Laravel

```bash
curl -O https://install.middleware.io/apm/php/laravel-instrument.php && sudo php laravel-instrument.php install
```
`.env` / process env:
```
OTEL_PHP_AUTOLOAD_ENABLED=true
OTEL_SERVICE_NAME=<service-name>
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9320
OTEL_PROPAGATORS=baggage,tracecontext,b3multi
```
Metrics: register `Middleware\LaravelApm\LaravelApmServiceProvider`.
With PHP-FPM, env vars must reach FPM workers (`env[...]` in the pool config or `clear_env = no`).

## WordPress

```bash
curl -O https://install.middleware.io/apm/php/wp-instrument.php
sudo -E MW_SERVICE_NAME=<svc> php wp-instrument.php
```
