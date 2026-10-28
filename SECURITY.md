# Security

## Reporting a vulnerability

Please **don't open a public issue** for security problems in these skills or in Middleware.

Report them privately through GitHub: **Security → Report a vulnerability** on this repository. Include what you found, how to reproduce it, and the affected skill or file. We'll acknowledge the report and keep you updated.

## Handling credentials

These skills work with Middleware API keys. They are designed to:
- read keys from environment variables or a local mode-600 file, and never print them in full;
- never write keys to tracked files, commits or persistent agent memory;
- ask before running commands that change systems (`sudo`, `helm`, cloud deploys).

If you see a skill doing otherwise, please report it. **Never paste real API keys into issues or pull requests.** If you did, rotate the key in Middleware right away (Settings → API Keys).
