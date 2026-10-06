from unittest.mock import patch
from psycopg2 import OperationalError as Psycopg2Error

from django.core.management import call_command
from django.db.utils import OperationalError
from django.test import SimpleTestCase


class commandTests(SimpleTestCase):
    """Test commands."""

    def test_wait_for_db_ready(self):
        """Test waiting for db when db is available."""
        with patch(
            "core.management.commands.wait_for_db.Command.check"
        ) as patched_check:
            patched_check.return_value = True
            call_command("wait_for_db")
            patched_check.assert_called_once_with(databases=["default"])

    def test_wait_for_db_delay(self):
        """Test waiting for db when getting OperationalError."""
        with patch(
            "core.management.commands.wait_for_db.Command.check"
        ) as patched_check:
            with patch("time.sleep") as patched_sleep:
                patched_check.side_effect = (
                    [Psycopg2Error] * 2 + [OperationalError] * 3 + [True]
                )
                call_command("wait_for_db")
                self.assertEqual(patched_check.call_count, 6)
                patched_check.assert_called_with(databases=["default"])
                self.assertEqual(patched_sleep.call_count, 5)
