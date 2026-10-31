# Public test website

**Website:** <https://recipe-book-test-flax.vercel.app>

**Owner:** `adhamabaza` / `adhamabazas-projects`.
**Project:** `recipe-book-test`.
[Dashboard](https://vercel.com/adhamabazas-projects/recipe-book-test).

Visitors register or log in to Recipe Book; they do not need a Vercel account.
The website runs in the cloud when this computer and Docker are off. The URL
uses Vercel's assigned subdomain; no custom domain was purchased.

## Hosting

The root `vercel.json` uses Vercel Services (currently Beta) to deploy the Vite
frontend and Django API together. `/api/`, `/admin/`, and `/static/` route to
Django. Other paths go to the frontend, with a service-scoped SPA fallback for
direct navigation and refresh. API calls continue to use `/api` on the same
origin, so no CORS configuration is required.

- **Database:** Neon `recipe-book-postgres`, provisioned on the **Free** plan.
- **Images:** public Vercel Blob store `recipe-book-images`.
- **Runtime:** Node 24 for the frontend build; Python 3.12 for Django.
- **Persistence:** cloud records and images survive redeployments. The cloud
  database is separate from the local Docker database; local data was not copied,
  reset, or replaced. Register fresh accounts on the public site.

`app/pyproject.toml` pins the cloud dependencies, including Django 5.2 LTS and
psycopg2-binary. `app/app/settings_vercel.py` configures PostgreSQL/SSL, the private
signing key, deployment hosts, secure cookies, static assets, and Blob storage.
The existing root requirements and `app.settings` still configure local Docker.

`core.blob_storage.VercelBlobStorage` implements Django storage with the official
Vercel Python SDK. Short object pathnames fit the existing database image field;
the frontend displays the full public Blob URL. No model migrations were added.
The cloud upload limit is **4 MB** to allow room for multipart overhead within
Vercel's request limit. Both frontend and API enforce it. Local Docker keeps its
previous behavior and proxy limit.

Account authentication, ownership permissions, and recipe payloads are unchanged.
Neon supplied optional auth environment variables, but the application continues
to use Django token authentication. No AI functionality was added.

## Configuration and redeployment

`app/.env.vercel.example` lists the configuration names. Production and Preview
have `DJANGO_SETTINGS_MODULE=app.settings_vercel`, a generated `DJANGO_SECRET_KEY`
stored as a Secret, Neon database variables, the connected Blob token,
`BLOB_PUBLIC_BASE_URL`, `VITE_MAX_IMAGE_BYTES=4194304`, and `DEBUG=0`.
Vercel supplies the deployment/production hostnames automatically. Set
`DJANGO_ALLOWED_HOSTS` if adding a custom domain later. Never prefix credentials
with `VITE_`, which exposes values to visitors.

From the repository root in PowerShell:

```powershell
npx.cmd --yes vercel@65.9.0 whoami --format json
npx.cmd --yes vercel@65.9.0 project inspect --non-interactive --scope adhamabazas-projects
npx.cmd --yes vercel@65.9.0 deploy --prod --yes --scope adhamabazas-projects --project recipe-book-test
```

Confirm the username is `adhamabaza` and the project is `recipe-book-test`.
On a new machine, run `vercel login` and
`vercel link --yes --scope adhamabazas-projects --project recipe-book-test` first.
`deploy --dry --json` lists upload inputs without publishing. If npm's registry
is unavailable, use an already-installed Vercel CLI.

The backend build runs `python manage.py migrate --noinput`; Vercel collects
static assets automatically. Keep migrations backwards-compatible with any
previews connected to this same test database. Deployment never resets data.

The initial site deployment came from the local checkout before the frontend
was committed. The complete implementation is published on GitHub's `updates`
branch. Git auto-deployment has not been configured, so a GitHub push alone does
not redeploy the website. Use the CLI above or deliberately connect the intended
branch; the repository's `main` branch still contains the earlier backend source.

The CLI's `.vercel/` files and pulled environments are ignored and excluded from
uploads. The original root `.env` remains intact. Production Secrets cannot be
pulled back; `[SENSITIVE]` is a placeholder, not a usable secret.

## Verification on 2026-10-31

- Public `/` and `/recipes/new`: HTTP 200 without Vercel credentials. Anonymous
  recipe requests: JSON HTTP 401. The stable production URL is public; unique
  deployment/preview URLs retain Vercel protection.
- Real hosted API integration: **passed**, including registration, login, CRUD,
  persistence, Blob upload/retrieval, filters, attribute management,
  profile/password updates, validation, invalid tokens, and two-user isolation.
- Full hosted Chromium workflow: **passed**, including protected routes,
  recipe/image creation and refresh, editing, filters, profile changes,
  logout/login, confirmations, deletion, and the mobile layout.
- Frontend TypeScript, lint, 13 unit tests, and production builds: **passed**.
- Original Linux Docker/PostgreSQL backend suite: **73 passed**. The 8 new
  storage/limit tests also passed with the cloud dependencies.
- Complete cloud-dependency suite from Windows against a temporary Neon
  database: **72 passed, 1 failed**. The existing
  `test_recipe_file_name_uuid` assumes POSIX slashes while Windows
  `os.path.join` returns backslashes. The same test passed in Linux Docker;
  deployed Linux image upload also passed. This unrelated assertion was unchanged.
- Initial pooled test-database cleanup failed because a pooler connection stayed
  open. Only that uniquely named test database was subsequently removed; the
  live `neondb` was preserved. `scripts/check_vercel.py` now uses the unpooled
  connection for test-database creation/cleanup.
- Initial service ingress returned 404. Root-owned service rewrites and SPA
  fallback fixed it; hosted checks passed after redeployment.
- A browser-test checkbox assertion ran before React Router finished updating;
  the snapshot showed it had become checked. The test now clicks and waits for
  the expected checked state.

Existing backend Flake8 findings and 12 moderate development lint-tool advisories
remain as documented in `frontend/VERIFICATION.md`. Runtime frontend dependencies
previously audited clean.

Repeat the hosted integration tests from `frontend/`:

```powershell
$env:E2E_BASE_URL = 'https://recipe-book-test-flax.vercel.app'
npm.cmd run test:e2e
Remove-Item Env:E2E_BASE_URL
```

Tests create unique accounts and their own recipes. Successful runs delete their
recipes and attributes; test accounts, uploaded files, and records from failed
runs can remain. No unrelated records are removed.

For optional backend checks with the cloud dependencies in a virtual environment:

```powershell
npx.cmd --yes vercel@65.9.0 env pull .vercel/.env.production.local --environment production --yes --scope adhamabazas-projects
python scripts/check_vercel.py
```

The helper uses a unique temporary database, local temporary test media, and a
generated local-only signing key. It does not print credentials. The Windows
path assertion described above still applies; Linux avoids that platform issue.

During setup, an empty project was created through the previously connected
`khalifa-9031` account before the desired account was clarified. It has no
deployment or database and was left untouched after the switch. All resources
and deployments for the public website above belong to `adhamabaza`.

## References

- [Django on Vercel](https://vercel.com/docs/frameworks/full-stack/django)
- [Services](https://vercel.com/docs/services)
- [Blob Python SDK](https://vercel.com/docs/vercel-blob/python-sdk-reference)
