"""Synthetic security and dependency checks for the guarded Sales migration."""

import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from check_sales_database_access import validate_capabilities
from sales_migration_common import TABLES, connection_environment


ROOT = Path(__file__).resolve().parents[2]


def load_hyphenated(name):
    path = ROOT / 'scripts' / 'migration' / name
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


archive = load_hyphenated('archive-annie-membership-pdfs.py')
importer = load_hyphenated('import-annie-sales.py')


class NativeSalesSecurityTests(unittest.TestCase):
    def test_limited_username_accepted_only_at_exact_production_project(self):
        with patch.dict(os.environ, {'LILLY_SALES_TARGET_ENV': 'production'}):
            env = connection_environment(
                'postgresql://lilly_sales_migrator:test@db.ruedelunbtaomhrzgelc.supabase.co:5432/postgres')
            self.assertEqual(env['PGUSER'], 'lilly_sales_migrator')
            self.assertEqual(env['PGSSLMODE'], 'verify-full')
            for host in ('localhost', 'db.otherproject.supabase.co'):
                with self.assertRaises(ValueError):
                    connection_environment(f'postgresql://limited:test@{host}:5432/postgres')
        with patch.dict(os.environ, {'LILLY_SALES_TARGET_ENV': 'staging'}):
            with self.assertRaisesRegex(ValueError, 'PRODUCTION_ENVIRONMENT_REQUIRED'):
                connection_environment('postgresql://limited:test@db.ruedelunbtaomhrzgelc.supabase.co/postgres')

    def test_data_role_must_have_exact_target_rights_without_admin_or_unrelated_write(self):
        state = dict(production=True, migrationHistory=True, identityRead=True,
                     superuser=False, createRole=False, createDb=False, bypassRls=False,
                     publicCreate=False, usuariosOwner=False, unrelatedWrite=False,
                     targetCount=len(TABLES), targetRights=len(TABLES))
        validate_capabilities(state, 'data')
        for key, value in [('targetCount', 0), ('targetRights', len(TABLES)-1),
                           ('publicCreate', True), ('unrelatedWrite', True),
                           ('bypassRls', True), ('usuariosOwner', True)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_capabilities({**state, key: value}, 'data')
        with self.assertRaises(ValueError):
            validate_capabilities(state, 'schema')
        validate_capabilities({**state, 'usuariosOwner': True, 'publicCreate': True}, 'schema')

    def test_import_rehearsal_rolls_back_without_forged_service_claim(self):
        with tempfile.TemporaryDirectory() as temp:
            command = importer.sql(Path(temp) / 'rows.csv', len(TABLES), commit=False)
        self.assertTrue(command.rstrip().endswith('ROLLBACK;'))
        self.assertNotIn('request.jwt.claim.role', command)
        self.assertNotIn('service_role', command)

    def test_workflow_enforces_order_and_separate_credentials(self):
        schema = (ROOT / '.github/workflows/native-sales-guarded-schema.yml').read_text()
        flow = (ROOT / '.github/workflows/native-sales-guarded-import.yml').read_text()
        self.assertIn('LILLY_SALES_SCHEMA_ADMIN_DB_URL', schema)
        self.assertNotIn('LILLY_SALES_PRODUCTION_DB_URL', schema)
        self.assertIn('LILLY_SALES_PRODUCTION_DB_URL', flow)
        self.assertNotIn('LILLY_SALES_SCHEMA_ADMIN_DB_URL', flow)
        for dependency in ('needs: schema_verify', 'needs: [schema_verify, data_rehearsal]',
                           'needs: data_import', 'needs: [data_import, storage_archive]',
                           'needs: [schema_verify, data_rehearsal, data_import, storage_archive, reconciliation]'):
            self.assertIn(dependency, flow)
        self.assertIn('Native Sales isolated restore verification', flow)

    def test_storage_cleanup_only_deletes_created_keys(self):
        calls = []

        def fake_call(url, key, method='GET', body=None, extra=None):
            calls.append((url, method))
            return 204, b''

        with patch.object(archive, 'call', fake_call):
            archive.cleanup_created('https://example.test', 'private',
                                    [('https://example.test/meta/one', 'https://example.test/native-sales/one')])
        self.assertEqual(calls, [('https://example.test/meta/one', 'DELETE'),
                                 ('https://example.test/native-sales/one', 'DELETE')])
        self.assertIn('native-sales/', archive.migration_object_key('a'*64,
                       '30000000-0000-4000-8000-000000000001',
                       '40000000-0000-4000-8000-000000000001', 'membership'))


if __name__ == '__main__':
    unittest.main()
