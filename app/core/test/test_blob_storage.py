"""Tests for the optional Vercel storage and upload limit."""
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import ValidationError

from core.blob_storage import VercelBlobStorage
from recipe.serializers import RecipeImageSerializer


@override_settings(
    BLOB_PUBLIC_BASE_URL='https://test.public.blob.vercel-storage.com',
)
class BlobStorageTests(SimpleTestCase):
    """Check the Django storage contract without contacting a real store."""

    def setUp(self):
        self.storage = VercelBlobStorage()
        self.client = Mock()
        self.client.BlobNotFoundError = FileNotFoundError
        self.mock_client = patch(
            'core.blob_storage.blob_client', return_value=self.client,
        )
        self.mock_client.start()
        self.addCleanup(self.mock_client.stop)

    def test_save_keeps_short_pathname_and_uploads_public_image(self):
        self.client.put_blob.return_value = SimpleNamespace(
            pathname='uploads/recipe/photo.png',
        )
        result = self.storage._save(
            'uploads/recipe/photo.png', ContentFile(b'image'),
        )
        self.assertEqual(result, 'uploads/recipe/photo.png')
        self.client.put_blob.assert_called_once_with(
            'uploads/recipe/photo.png', b'image',
            access='public', content_type='image/png',
        )

    def test_url_uses_public_store_origin(self):
        self.assertEqual(
            self.storage.url('uploads/recipe/my photo.png'),
            'https://test.public.blob.vercel-storage.com/'
            'uploads/recipe/my%20photo.png',
        )

    def test_read_returns_downloaded_bytes(self):
        self.client.get_blob.return_value = SimpleNamespace(body=b'image')
        self.assertEqual(self.storage.open('photo.png').read(), b'image')

    def test_exists_handles_missing_object(self):
        self.client.head_blob.side_effect = FileNotFoundError('missing')
        self.assertFalse(self.storage.exists('missing.png'))

    def test_exists_propagates_connection_failures(self):
        self.client.head_blob.side_effect = ConnectionError('unavailable')
        with self.assertRaises(ConnectionError):
            self.storage.exists('photo.png')

    def test_size_and_delete_use_store_url(self):
        self.client.head_blob.return_value = SimpleNamespace(size=123)
        self.assertEqual(self.storage.size('photo.png'), 123)
        self.storage.delete('photo.png')
        self.client.delete_blob.assert_called_once_with(
            'https://test.public.blob.vercel-storage.com/photo.png',
        )


class ImageLimitTests(SimpleTestCase):
    """Only the cloud settings opt in to a serverless upload limit."""

    @override_settings(MAX_RECIPE_IMAGE_BYTES=3)
    def test_cloud_upload_limit_rejects_large_file(self):
        image = SimpleUploadedFile('photo.png', b'1234')
        with self.assertRaises(ValidationError):
            RecipeImageSerializer().validate_image(image)

    @override_settings(MAX_RECIPE_IMAGE_BYTES=None)
    def test_local_upload_behavior_is_unchanged(self):
        image = SimpleUploadedFile('photo.png', b'1234')
        self.assertIs(
            RecipeImageSerializer().validate_image(image), image,
        )
