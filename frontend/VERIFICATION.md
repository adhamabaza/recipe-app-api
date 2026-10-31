# Local verification — 2026-10-31

This report records the original local frontend implementation. The subsequent
public deployment under `adhamabaza` is documented in `docs/VERCEL.md` at the
repository root, including its cloud configuration and verification results.

Implemented and checked on branch `updates`, created from the existing local
`main`. The working tree was clean at the start. No commits, pushes, merges, or
deployments were performed. An unrelated `.vscode/` directory appeared during
the session and was left untouched.

## Verified behavior

The website sends real requests to Django, writes to PostgreSQL, retrieves the
saved records, and renders them in React. No application records are mocked or
stored in the browser. Unit tests use controlled responses only within tests.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | Passed | `npm.cmd run typecheck`; also runs during the production build. |
| Frontend lint | Passed | `npm.cmd run lint`. |
| Frontend unit tests | Passed | 13 tests in 3 files, using Vitest. |
| Frontend production build | Passed | Vite compiled 48 modules on Windows and inside the Linux Docker image. |
| Existing backend suite | Passed | 65 Django tests against PostgreSQL using the local backend source. |
| Compose configuration | Passed | Both development and deployment files passed `docker compose ... config --quiet`. |
| Frontend Docker build | Passed | Built `frontend/Dockerfile`, including the development, build, and production stages. |
| Proxy Docker build and nginx configuration | Passed | Built `proxy/`; `nginx -t` passed after the actual `/run.sh` template rendering. |
| Real API integration | Passed | The API test passed through Vite and again through nginx/uWSGI. |
| Real browser integration | Passed | The complete browser test passed through Vite and again through the built Docker frontend and nginx/uWSGI. |
| Mobile layout | Passed | At 390px wide, no horizontal overflow; dashboard and desktop detail screenshots were inspected. |
| Git whitespace check | Passed | `git diff --check`. |
| Runtime dependency audit | Passed | `npm.cmd audit --omit=dev` reported zero vulnerabilities. |
| Existing backend Flake8 | Failed, pre-existing | Flake8 3.9.2 reports whitespace, long lines, unused imports, and duplicate imports in unchanged backend files. |
| Complete npm dependency audit | Advisory remains | 12 moderate advisories in the development lint-tool dependency chain, originating from minimatch. No high or critical advisories were reported. |

The backend lint findings include unused `TokenAuthentication` and
`IsAuthenticated` imports and a duplicate `viewsets` import in
`app/recipe/views.py`, plus existing formatting issues across models,
serializers, views, and tests. Backend Python files were not changed as part of
this frontend task. No forced dependency downgrades or incompatible overrides
were applied to conceal the development-tool advisories.

### Real integration coverage

- Registration, login, logout, anonymous route redirects, and invalid tokens.
- Recipe creation, list, detail, update, deletion, and cancellation of deletion.
- Multipart image upload and successful image retrieval/display.
- New tags and ingredients assigned through nested recipe payloads.
- Combined tag/ingredient filters, renaming, deletion, and removal of deleted
  attributes from their recipes.
- Name, email, and password updates; rejection of the old password and login
  with the new one.
- Recipe and account persistence across page refresh and logout/login.
- Backend validation errors and unauthenticated API responses.
- Two-user isolation: the other user's recipe list, tag list, and ingredient
  list are empty; recipe read/update/delete/upload and attribute update/delete
  return 404 for another user's IDs.
- Production SPA fallback: navigating directly to protected routes and
  refreshing recipe detail pages works through both nginx layers.

Unit tests additionally check network retry without dropping a valid token,
handling of revoked tokens on startup, nested field validation messages,
multipart headers, empty deletion responses, non-JSON proxy errors, safe source
links, Docker media URL normalization, late 401 responses from an old session,
and retrying a failed image upload without creating duplicate recipes. API
requests omit cookies to avoid inheriting an unrelated Django admin session.

## Verification environment

Node 24.14.1 and npm 11.11.0 were available. PowerShell blocks `npm.ps1`, so
commands use `npm.cmd` and `npx.cmd`. The lockfile records the exact installed
versions. Docker Desktop 4.93.0 / Engine 29.8.1 was installed per-user outside
PATH at:

```text
C:\Users\NEXT STORE\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe
```

The running project already contained a deployment app, proxy, PostgreSQL
container, and database/media volumes. Its API rejected localhost requests with
HTTP 400 under its existing host configuration. This existing configuration was
not edited or restarted. Instead, verification used disposable containers:

- A local-source Django development server on `127.0.0.1:8001`, with explicit
  localhost hosts, connected to the running PostgreSQL and media volumes.
- Vite on port 5173, proxying to that temporary API.
- A separate local-source uWSGI container, the newly built frontend image, and
  the newly built proxy on `127.0.0.1:8082`, using the same PostgreSQL and media
  volumes. This verified the production routing without deploying or replacing
  the existing services.

The Django suite ran in a one-off container with local `app/` mounted read-only.
Django created and destroyed its separate test database. Flake8 was installed
only inside another disposable container because the existing image did not
contain development dependencies. Its working directory was `/app`, so the
repository's existing `app/.flake8` configuration applied.

The integration tests created unique test accounts. Successful tests deleted
their recipes, tags, and ingredients. Test accounts and uploaded image files
remain because the existing API has no account-deletion endpoint and does not
delete image files when recipes are deleted. Existing user records, local
environment files, database volumes, and media files were preserved. Temporary
verification servers and containers were stopped after testing.

## Changes and startup

No backend models, serializers, permissions, routes, or authentication behavior
changed, and no migrations were added. Integration changes are limited to:

- `docker-compose.yml`: Vite development service, separate dependency volume,
  explicit development API host allowlist, configurable `API_PORT`.
- `docker-compose-deploy.yml`: built static frontend service and proxy startup
  dependency, retaining the existing database and static/media volumes.
- `proxy/default.conf.tpl`: preserve API/admin uWSGI and static/media routing;
  send frontend routes to its static nginx server.
- `frontend/`: React application, typed API client, account/recipe/library
  pages, responsive styles, configuration examples, locked dependencies,
  Dockerfile, nginx configuration, unit tests, and real integration tests.
- `.github/workflows/checks.yml`: frontend lint, test, and build job alongside
  the existing backend checks.
- `.gitignore`, `.dockerignore`, and `README.md`: generated-file exclusions,
  backend build-context isolation, setup, configuration, and test instructions.

For this machine, the following commands start an independent development
website while preserving the deployment already using port 8000. Run from the
repository root:

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin;$env:PATH"
$env:API_PORT = '8001'
docker compose -p recipe-local up --build
```

Open <http://localhost:5173/>. This independent project starts with its own
development database; repeat the same command/project name to retain its data.
The existing deployment remains untouched. For ordinary development when port
8000 is free, `docker compose up --build` also serves the website on port 5173.
Full configuration, backend-only commands, deployment commands, frontend test
commands, and alternate-port testing are documented in the root `README.md`.
