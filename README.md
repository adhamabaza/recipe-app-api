# Recipe App API

A Django REST Framework project with a custom email-based user model and
interactive API documentation. The development environment uses Docker Compose
and PostgreSQL.

## Features

- Use a custom email-based Django user model.
- Browse the OpenAPI schema and interactive Swagger UI.
- Run the app and PostgreSQL database together using Docker Compose.

## Requirements

- Docker Desktop (or Docker Engine) with the Docker Compose plugin.
- Git, to clone the repository.

## Run locally with Docker Compose

Clone the repository and start the services from the project root:

```sh
git clone https://github.com/adhamabaza/recipe-app-api.git
cd recipe-app-api
docker compose up --build
```

Compose builds the Django image, starts PostgreSQL, waits for the database,
applies migrations, and starts the development server at
<http://localhost:8000/>.

The database connection is configured through these environment variables in
the `app` service:

| Variable | Development value |
| --- | --- |
| `DB_HOST` | `db` |
| `DB_NAME` | `Devdb` |
| `DB_USER` | `devuser` |
| `DB_PASSWORD` | `changeme` |

These values, Django's development settings, and the Compose configuration are
for local development only. Do not use the development credentials or the
project's current Django settings in a production deployment.

To stop the services, press `Ctrl+C`, then run:

```sh
docker compose down
```

The PostgreSQL data is stored in the `dev-db-data` named volume and remains
available after stopping the containers.

## Deployment and database troubleshooting

Run deployment with its own Compose file (do not merge it with the development
file, which mounts a different database volume and uses development credentials):

```sh
docker compose -f docker-compose-deploy.yml up -d --build
```

Copy `.env.example` to `.env` for a new deployment and set the values before
starting it. For an existing database, keep the credentials that were used when
its volume was first initialized.

`Role "rootuser" does not exist` means PostgreSQL is reachable, but the database
does not contain the user requested by the app. The deployment passes the same
credentials to both services. PostgreSQL's `POSTGRES_USER`, `POSTGRES_PASSWORD`
and `POSTGRES_DB` settings only apply to an empty data directory; changing `.env`
does not change users, passwords or databases already stored in `postgres-data`.
The `wait_for_db` command stops with a configuration error for these failures.

To repair an existing deployment without deleting data:

1. Stop the app's connection attempts:
   `docker compose -f docker-compose-deploy.yml stop app`.
2. Connect with the original database administrator, replacing `ORIGINAL_USER`:
   `docker compose -f docker-compose-deploy.yml exec db psql -U ORIGINAL_USER -d postgres`.
   If the volume was initialized with this project's development settings,
   the original user may be `devuser`. In psql, use `\du` to list roles and
   `\l` to list databases, then `\q` to exit.
3. Set `DB_USER`, `DB_NAME` and `DB_PASS` in `.env` to the existing database's
   login, database name and password. If you need a new login instead, have the
   existing database administrator create it and grant access to the intended
   database and schema. Changing Django's user model will not create a
   PostgreSQL login.
4. Recreate the services with
   `docker compose -f docker-compose-deploy.yml up -d --build`, then check
   `docker compose -f docker-compose-deploy.yml logs --tail=100 app db`.

Do not remove the database volume to fix credentials: that deletes stored data.
If you intentionally need a separate empty installation, use a new Compose
project, for example
`docker compose -p recipe-fresh -f docker-compose-deploy.yml up -d --build`.
Stop the old stack first to free port 8000. The new project has its own empty
database and static/media volumes; it does not recover existing records or files.

### Nginx returns 502 Bad Gateway

The deployment proxy speaks uWSGI to `app:9000`. The app starts that listener
after database checks, static file collection and migrations succeed. A failure
in any of those steps leaves nginx without a running backend.

```sh
docker compose -f docker-compose-deploy.yml ps -a
docker compose -f docker-compose-deploy.yml logs --tail=80 app proxy db
```

Fix the first app startup error in these logs. For authentication failures, use
the database recovery steps above. The proxy now waits for the app's port to be
available during Compose startup, and resolves the app's address again after
container replacements. A failed app health check still requires fixing the
underlying startup failure.

After applying configuration changes, rebuild both images and recreate the proxy:

```sh
docker compose -f docker-compose-deploy.yml up -d --build
docker compose -f docker-compose-deploy.yml up -d --force-recreate proxy
```

## API documentation

| URL | Description |
| --- | --- |
| `/api/docs/` | Interactive Swagger UI |
| `/api/schema/` | OpenAPI schema |
| `/admin/` | Django administration |

The current default branch exposes the API schema and documentation; recipe
resource endpoints are not yet available.

## Administration

With the app running, create a Django administrator account:

```sh
docker compose exec app python manage.py createsuperuser
```

Then sign in at <http://localhost:8000/admin/>.

## Tests and lint

Run the Django test suite in a one-off Compose container:

```sh
docker compose run --rm app sh -c "python manage.py wait_for_db && python manage.py test"
```

Run Flake8:

```sh
docker compose run --rm app sh -c "flake8"
```

The same test and lint checks are configured in the GitHub Actions workflow.

---

*Project by Adham Abaza*
