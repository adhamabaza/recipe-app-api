from unittest.mock import patch
from psycopg2 import OperationalError as Psycopg2Error

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.utils import OperationalError
from django.test import SimpleTestCase


class commandTests(SimpleTestCase):
    """Test commands."""

    @patch('time.sleep')
    @patch('core.management.commands.wait_for_db.Command.check')
    def test_wait_for_db_configuration_error(
        self, patched_check, patched_sleep
    ):
        """Invalid credentials and missing databases must not retry forever."""
        for message in (
            'password authentication failed for user "rootuser"',
            'role "rootuser" does not exist',
            'database "dbname" does not exist',
            'fe_sendauth: no password supplied',
            'no pg_hba.conf entry for host',
        ):
            with self.subTest(message=message):
                patched_check.reset_mock()
                patched_check.side_effect = OperationalError(message)
                with self.assertRaisesMessage(
                    CommandError, 'existing database'
                ):
                    call_command('wait_for_db')
                patched_check.assert_called_once_with(databases=['default'])
                patched_sleep.assert_not_called()

    @patch('time.sleep')
    @patch('core.management.commands.wait_for_db.Command.check')
    def test_wait_for_db_wrapped_authentication_error(
        self, patched_check, patched_sleep
    ):
        """Use the original driver's SQLSTATE when Django wraps an error."""
        class AuthenticationError(Psycopg2Error):
            pgcode = '28P01'

        error = OperationalError('Connection failed')
        error.__cause__ = AuthenticationError()
        patched_check.side_effect = error
        with self.assertRaisesMessage(CommandError, 'existing database'):
            call_command('wait_for_db')
        patched_check.assert_called_once_with(databases=['default'])
        patched_sleep.assert_not_called()

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
