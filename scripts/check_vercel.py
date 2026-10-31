"""Run the backend suite in a unique temporary database on the cloud server."""
import copy
import os
from pathlib import Path
import secrets
import sys
import tempfile
import uuid

from dotenv import load_dotenv


def main():
    root = Path(__file__).resolve().parents[1]
    env_file = root / '.vercel' / '.env.production.local'
    if not env_file.is_file():
        raise SystemExit(
            'Pull the project environment into '
            '.vercel/.env.production.local first.'
        )
    load_dotenv(env_file, override=True)
    os.environ['DATABASE_URL'] = os.environ.get(
        'DATABASE_URL_UNPOOLED', os.environ['DATABASE_URL'],
    )
    os.environ['DJANGO_SECRET_KEY'] = secrets.token_urlsafe(48)
    os.environ['DJANGO_SETTINGS_MODULE'] = 'app.settings_vercel'
    os.environ['DEBUG'] = '0'
    os.chdir(root / 'app')
    sys.path.insert(0, str(root / 'app'))

    import django
    django.setup()
    from django.conf import settings
    from django.test.utils import get_runner, override_settings

    settings.DATABASES['default'].setdefault('TEST', {})['NAME'] = (
        f'recipe_verify_{uuid.uuid4().hex}'
    )
    storages = copy.deepcopy(settings.STORAGES)
    storages['default'] = {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    }
    with tempfile.TemporaryDirectory(
        prefix='test-media-', dir=root / '.vercel',
    ) as media:
        expected_root = (root / '.vercel').resolve()
        if not Path(media).resolve().is_relative_to(expected_root):
            raise RuntimeError('Unexpected test media directory.')
        with override_settings(STORAGES=storages, MEDIA_ROOT=media):
            failures = get_runner(settings)(verbosity=1).run_tests([])
    return int(bool(failures))


if __name__ == '__main__':
    raise SystemExit(main())
