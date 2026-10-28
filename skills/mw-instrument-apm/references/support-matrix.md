# Minimum runtimes

Source: https://docs.middleware.io/apm/support-metrics.md

| Runtime | Minimum |
|---|---|
| Java | 8+ |
| Python | 3.9+ (pip 23.1.2+) |
| Node.js | 18.17.1+ (npm `engines`: `^18.19.0 \|\| >=20.6.0`). Node 10+ → `@middleware.io/node-apm-legacy` |
| .NET | 6.0+, or .NET Framework 4.6.2+ on IIS |
| Go | 1.17+ |
| PHP | 8.0+ (Debian-based Linux only) |
| Ruby | 3.0+ |
| Next.js | 13.4+ |

Unsupported/old runtimes or languages with no SDK: use **OBI (eBPF)** via the host agent (`sudo mw-agent instrument --type obi --language <lang> <service>`). Needs Linux kernel 5.8+ with BTF (4.18+ on RHEL). Captures protocol-level traces and RED metrics only.

## Feature gaps worth telling users

- Go: no automatic app logs (custom logs via log adapters only).
- .NET: app logs not supported (custom `Middleware.Logger` only).
- PHP: no profiling. CakePHP unsupported.
- Ruby: traces + profiling only, no metrics/logs.
- Next.js: no metrics/app logs; custom logs only. Edge runtime unsupported.
- Lambda: no profiling.
