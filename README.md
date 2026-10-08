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
