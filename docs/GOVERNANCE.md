# Anti-Drift Governance

CODENAME: GOV-CORE-008 — Single Source of Truth
Contracts (Zod) are truth. DB schema and routes must align to contracts or the PR fails.

CODENAME: GOV-CORE-009 — Change Couple
Any PR that changes contracts must include:
- DB migration (or explicit “no-migration” note)
- Updated tests
- Changelog line

CODENAME: GOV-CORE-010 — Naming & Mesh Integrity
All glyph files must match the pattern (e.g. BLG-001.md) and be referenced in the mesh MSH-000.md. Mesh PRs must remain alphabetical in each section.

CODENAME: GOV-CORE-011 — Stability Window
From tag → tag, freeze glyph names/codenames. Use deprecation notes; don’t rewrite history.

CODENAME: GOV-CORE-012 — ADRs (tiny)
If a decision changes intent (not just code), add a 10–15 line ADR under internal/adr/ and reference it in the PR.
