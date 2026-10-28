# Ruby

Source: https://docs.middleware.io/get-started/apm/ruby.md · Ruby 3.0+. Traces + profiling only (no metrics/logs).

## Gemfile

```ruby
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
gem 'pyroscope'
gem 'middleware_apm_linux', '~> 2.1.0'   # on Windows: middleware_apm_windows
```
```bash
bundle install
```

## Init

```ruby
require 'middleware/ruby_gem_linux'
Middleware::RubyGem.init
```
Rails: put it in `config/environment.rb` **before** `Rails.application.initialize!`.

## Run (host mode, agent HTTP on 9320)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9320 \
OTEL_SERVICE_NAME="<svc>" \
OTEL_RESOURCE_ATTRIBUTES=project.name="<proj>" \
MW_API_KEY="<MW_API_KEY>" \
bundle exec puma -C config/puma.rb
```

## Heroku

Add the Middleware buildpack **before** the app's language buildpack, then:
```bash
heroku config:add MW_API_KEY=<MW_API_KEY>
heroku config:add MW_TARGET=https://<MW_UID>.middleware.io:443
heroku labs:enable runtime-dyno-metadata
```
Agent log on the dyno: `/app/mw-agent/mw-agent.log`.
