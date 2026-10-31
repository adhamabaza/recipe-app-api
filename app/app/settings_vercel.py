"""Settings for the public Vercel test site."""
import os
from urllib.parse import urlparse

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from . import settings as base


for setting_name in dir(base):
    if setting_name.isupper():
        globals()[setting_name] = getattr(base, setting_name)

DEBUG = False
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
if len(SECRET_KEY) < 32:
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY must be at least 32 characters.'
    )

ALLOWED_HOSTS = list(filter(None, [
    os.environ.get('VERCEL_URL', ''),
    os.environ.get('VERCEL_PROJECT_PRODUCTION_URL', ''),
    *os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(','),
]))
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS if host.strip()]
CSRF_TRUSTED_ORIGINS = [f'https://{host}' for host in ALLOWED_HOSTS]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

DATABASES = {
    'default': dj_database_url.parse(
        os.environ['DATABASE_URL'],
        conn_max_age=0,
        ssl_require=True,
    ),
}
if DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
    raise ImproperlyConfigured('Vercel requires a PostgreSQL DATABASE_URL.')
DATABASES['default'].setdefault('OPTIONS', {}).setdefault(
    'connect_timeout', 10,
)

STATIC_ROOT = base.BASE_DIR / 'staticfiles'
BLOB_PUBLIC_BASE_URL = os.environ['BLOB_PUBLIC_BASE_URL'].rstrip('/')
blob_origin = urlparse(BLOB_PUBLIC_BASE_URL)
if (
    blob_origin.scheme != 'https'
    or not blob_origin.hostname
    or not blob_origin.hostname.endswith('.public.blob.vercel-storage.com')
    or blob_origin.path not in ('', '/')
    or blob_origin.username
    or blob_origin.password
    or blob_origin.query
    or blob_origin.fragment
):
    raise ImproperlyConfigured(
        'BLOB_PUBLIC_BASE_URL must be a public Blob store HTTPS origin.'
    )

STORAGES = {
    'default': {'BACKEND': 'core.blob_storage.VercelBlobStorage'},
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}
MAX_RECIPE_IMAGE_BYTES = 4 * 1024 * 1024
