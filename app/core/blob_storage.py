"""Persistent recipe image storage for the Vercel deployment."""
import mimetypes
from urllib.parse import quote

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage


def blob_client():
    """Load the optional SDK only for cloud storage operations."""
    from vercel.blob import sync
    return sync


class VercelBlobStorage(Storage):
    """Store public images in Blob while retaining short database pathnames."""

    def _save(self, name, content):
        content_type = getattr(content, 'content_type', None)
        uploaded = blob_client().put_blob(
            name,
            content.read(),
            access='public',
            content_type=content_type or mimetypes.guess_type(name)[0],
        )
        return uploaded.pathname

    def _open(self, name, mode='rb'):
        if mode not in ('r', 'rb'):
            raise ValueError('Blob files may only be opened for reading.')
        result = blob_client().get_blob(self.url(name), access='public')
        if result is None:
            raise FileNotFoundError(name)
        return ContentFile(result.body, name=name)

    def exists(self, name):
        client = blob_client()
        try:
            client.head_blob(self.url(name))
        except client.BlobNotFoundError:
            return False
        return True

    def size(self, name):
        return blob_client().head_blob(self.url(name)).size

    def delete(self, name):
        if name:
            blob_client().delete_blob(self.url(name))

    def url(self, name):
        return f'{settings.BLOB_PUBLIC_BASE_URL}/{quote(name, safe="/")}'
