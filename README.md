# Bundle

See docs and glyphs. Run docker compose.

## Governance & Ritual (public summary)
- Use feature branches and conventional commits.
- Before commit/PR:
  - Run tests and guards: `npm run test:all`
  - Ensure hidden-layer content (docs/, internal/, glyphs/) is not staged.
- Open PRs using the provided template; include governance adherence and runtime ports.

### Optional local pre-commit hook
Create a local git hook to block commits if checks fail:

```bash
mkdir -p .githooks
cat > .githooks/pre-commit <<'SH'
#!/usr/bin/env bash
set -euo pipefail
npm run test:all
SH
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

This repository avoids committing private governance/glyph content; CI enforces guards.
