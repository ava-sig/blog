# Glyphic Blog

This monorepo contains:
- `apps/web`: Nuxt 3 SSR blog UI
- `apps/api`: Express API with file-backed storage (`data/` uploads)

Use the production Docker setup below to deploy quickly with Docker Hub images and Nginx.

## Governance & Ritual (public summary)
- Use feature branches and conventional commits.
- Before commit/PR:
  - Run tests and guards: `npm run test:all`
  - Ensure hidden-layer content (docs/, internal/, glyphs/) is not staged.
- Open PRs using the provided template; include governance adherence and runtime ports.

### Sprint End Ritual
- Merge the feature branch to `main` when all CI checks are green.
- Append the latest changes to the `Changelog` section in this `README.md`.
- Create and push an annotated tag for the release:
  ```bash
  VERSION=v0.2.3
  git tag -a "$VERSION" -m "release: $VERSION"
  git push origin "$VERSION"
  ```
- Delete the merged branch locally and on origin:
  ```bash
  BR=feat/v0.2.3-seo-security-editor
  git branch -d "$BR" || true
  git push origin --delete "$BR" || true
  ```
- Deploy production images (Docker Hub pull + compose up):
  ```bash
  # Ensure .env.prod is present (see .env.prod.example)
  docker compose --env-file .env.prod -f docker-compose.prod.yml pull
  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
  ```
- Post-merge smoke test: confirm `.github/workflows/post-merge-smoke.yml` passes
  against the remote API URL (checks auth, basic endpoints, and og:image).
- Governance upkeep: keep branch protection required checks in sync with
  current workflow job names to avoid stale/phantom failures.

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

---

## Production Deploy (Docker Hub + docker-compose)

We provide a production compose file: `docker-compose.prod.yml`.

### 1) Build and push images (multi-arch recommended)
Replace `DOCKER_NS` with your Docker Hub namespace.

```bash
# Web (Nuxt SSR)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t DOCKER_NS/glyph-web:vX.Y.Z \
  -t DOCKER_NS/glyph-web:latest \
  -f apps/web/Dockerfile apps/web --push

# API (Express)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t DOCKER_NS/glyph-api:vX.Y.Z \
  -t DOCKER_NS/glyph-api:latest \
  -f apps/api/Dockerfile apps/api --push
```

### 2) Server configuration
- Ensure Docker + docker compose v2, and Nginx as reverse proxy.
- DNS:
  - Web: `yourdomain.com` -> server IP
  - API: `api.yourdomain.com` -> server IP

Create `.env.prod` next to `docker-compose.prod.yml` (see `.env.prod.example`):

```bash
DOCKER_NS=your-dockerhub-user
TAG=vX.Y.Z
NUXT_PUBLIC_API_BASE=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
PUBLIC_BASE_URL=https://api.yourdomain.com
JWT_SECRET=change-me
```

### 3) Run the stack
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

The API persists uploads in the named volume `api_data` mounted at `/app/data`.

### 4) Nginx reverse proxy
Terminate TLS at Nginx and proxy to the internal ports:
- Web: `https://yourdomain.com` -> `http://127.0.0.1:5000`
- API: `https://api.yourdomain.com` -> `http://127.0.0.1:3000`

Minimal server blocks:

```nginx
server { listen 80; server_name yourdomain.com; return 301 https://$host$request_uri; }
server { listen 80; server_name api.yourdomain.com; return 301 https://$host$request_uri; }

server {
  listen 443 ssl; server_name yourdomain.com;
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  location / { proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_pass http://127.0.0.1:5000; }
}

server {
  listen 443 ssl; server_name api.yourdomain.com;
  ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
  client_max_body_size 20m;
  location / { proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_pass http://127.0.0.1:3000; }
  location /uploads/ { proxy_pass http://127.0.0.1:3000; expires 7d; add_header Cache-Control "public, max-age=604800, immutable"; }
}
```

### 5) Social card check
Set `NUXT_PUBLIC_API_BASE` and `PUBLIC_BASE_URL` to the public API domain so `og:image` uses absolute URLs. Validate a post URL with Twitter Card Validator after deployment.

---

## Local development

```bash
# From repo root
npm run test:all

# Web dev
cd apps/web && npm i && npm run dev

# API dev
cd ../api && npm i && npm run dev
```

---

## E2E Testing (Playwright)

The E2E tests run the Nuxt app locally and target the API running in Docker.

- The frontend server runs on `FRONTEND_PORT` (default `5999`).
- The tests and the Nuxt app talk to the Docker-exposed API via `API_BASE` (default `http://localhost:3388`).
- Real JWT tokens are generated in tests using `JWT_SECRET` (HS256).

### Required environment variables
Add these to your `.env` (see `.env.example`):

```ini
JWT_SECRET=change_me_in_local_env
API_BASE=http://localhost:3388
FRONTEND_PORT=5999
# Optional: used by Nuxt runtime as well
NUXT_PUBLIC_API_BASE=http://localhost:3388
```

### Run E2E locally

```bash
# 1) Start API + DB (in another terminal)
docker compose up -d db api

# 2) From repo root, run Playwright tests
cd apps/web
npm i
npx playwright install --with-deps
npm run test:e2e
```

Notes:
- Tests will skip if `JWT_SECRET` is missing.
- The Playwright config loads env from the repo root `.env` and starts only Nuxt.
- If port 5999 is busy, set `FRONTEND_PORT` to another free port in `.env`.

### CI behavior
- `.github/workflows/ci.yml` defines an `e2e` job that:
  - Brings up `db` + `api` via `docker compose` (API exposed on host `:3388`).
  - Seeds a CI `.env` with `JWT_SECRET` (from `E2E_JWT_SECRET` secret), `API_BASE`, and `NUXT_PUBLIC_API_BASE`.
  - Installs Playwright browsers and runs the E2E suite with the frontend on `FRONTEND_PORT=5999`.
  - Tears down Docker after completion.

---

## Changelog

### v0.2.3 — 2025-08-31
- CI/Vitest: remove unsupported CLI flags; scope via `apps/web/vitest.config.ts` `test.include`.
- CI: run `web-build` inside `apps/web`; add diagnostics (commit SHA, scripts, Vitest version).
- E2E: Dockerized API healthchecks and health wait loop for stable Playwright runs.
- Workflows: `Glyph & Docs Guard` installs `apps/api` deps and adds diagnostics; root `test:all` installs API deps.
- Post-merge smoke workflow added to validate prod-like API URL.
- Docs: add Sprint End Ritual and changelog.
