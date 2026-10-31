from django.core.management.base import BaseCommand, CommandError
import time
from psycopg2 import OperationalError as Psycopg2Error
from django.db.utils import OperationalError


class Command(BaseCommand):
    """Wait for database to be available"""

    def handle(self, *args, **options):
        """Wait until the database is available."""
        self.stdout.write("Waiting for database...")
        db_up = False
        while not db_up:
            try:
                self.check(databases=["default"])
                db_up = True
            except (Psycopg2Error, OperationalError) as exc:
                # Connection failures may have no SQLSTATE, so also inspect
                # libpq's message (Django wraps the original exception).
                cause = exc.__cause__ or exc
                code = getattr(cause, 'pgcode', None)
                message = str(exc).lower()
                if code in {'28000', '28P01', '3D000'} or any(
                    error in message for error in (
                        'password authentication failed',
                        'no password supplied',
                        'no pg_hba.conf entry',
                    )
                ) or ('does not exist' in message and any(
                    name in message for name in ('role ', 'database ')
                )):
                    raise CommandError(
                        'Database authentication or configuration failed. '
                        'Check DB_NAME, DB_USER and DB_PASSWORD against the '
                        'existing database. POSTGRES_* variables only '
                        'initialize an empty volume; changing .env does not '
                        'update existing roles or passwords. See the database '
                        'troubleshooting section in README.md.'
                    ) from None
                self.stdout.write("Database unavailable, waiting 1 second...")
                time.sleep(1)

        self.stdout.write(self.style.SUCCESS("Database available!"))
