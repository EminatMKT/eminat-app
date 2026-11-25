import json
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import collect_iteration as tool


class IterationTests(unittest.TestCase):
    def test_reuses_only_unchanged_success(self):
        with patch.object(tool, 'fingerprint', return_value='same'):
            result = tool.local_validation(Path('.'), [['node', 'test']],
                                           {'fingerprint': 'same', 'status': 'PASS'},
                                           execute=lambda *a, **kw: self.fail('Unchanged check was repeated'))
        self.assertTrue(result['reused'])

    def test_failure_is_not_reused(self):
        calls = []
        def execute(argv, **kwargs):
            calls.append(argv)
            return subprocess.CompletedProcess(argv, 0, b'pass', b'')
        with patch.object(tool, 'fingerprint', return_value='same'):
            result = tool.local_validation(Path('.'), [['node', 'test']],
                                          {'fingerprint': 'same', 'status': 'BLOCKED'}, execute)
        self.assertEqual(len(calls), 1)
        self.assertFalse(result['reused'])
        self.assertEqual(result['status'], 'PASS')

    def test_changed_input_requires_new_validation(self):
        with patch.object(tool, 'fingerprint', return_value='new'):
            result = tool.local_validation(Path('.'), [['node', 'test']],
                                          {'fingerprint': 'old', 'status': 'PASS'},
                                          lambda argv, **kw: subprocess.CompletedProcess(argv, 1, b'', b'failure'))
        self.assertEqual(result['status'], 'BLOCKED')
        self.assertFalse(result['reused'])

    def test_source_mutated_during_validation_cannot_pass(self):
        with patch.object(tool, 'fingerprint', side_effect=['before', 'after']):
            result = tool.local_validation(Path('.'), [['node', 'test']], {},
                                          lambda argv, **kw: subprocess.CompletedProcess(argv, 0, b'pass', b''))
        self.assertEqual(result['status'], 'BLOCKED')

    def fixture(self, changed=False, context='checks', integration=15368, conclusion='success'):
        calls = []
        def get(endpoint, root):
            calls.append(endpoint)
            if endpoint.endswith('/pulls/210'):
                return [{'head': {'sha': 'other' if changed and len(calls) > 1 else 'head'},
                         'base': {'sha': 'base', 'ref': 'main'}, 'draft': False, 'merged': False}]
            if '/check-runs?' in endpoint:
                return [{'check_runs': [{'id': 1, 'head_sha': 'head', 'name': context,
                                        'app': {'id': integration}, 'status': 'completed', 'conclusion': conclusion}]}]
            if '/rules/branches/' in endpoint:
                return [[{'type': 'required_status_checks', 'parameters': {
                    'required_status_checks': [{'context': 'checks', 'integration_id': 15368}]}}]]
            if '/reviews?' in endpoint:
                return [[]]
            self.fail('Unexpected endpoint: ' + endpoint)
        return get

    def test_live_evidence_is_bound_to_head_and_required_application(self):
        valid = tool.github_evidence('Example/project', 210, Path('.'), self.fixture())
        self.assertEqual(valid['requiredCI'], 'PASS')
        self.assertFalse(valid['integrationAuthorized'])
        for fixture in [self.fixture(changed=True), self.fixture(integration=99),
                        self.fixture(context='unrelated'), self.fixture(conclusion='failure')]:
            with self.subTest(fixture=fixture):
                self.assertEqual(tool.github_evidence('Example/project', 210, Path('.'), fixture)['requiredCI'], 'BLOCKED')

    def test_rejects_github_endpoint_injection(self):
        for repository, number in [('Example/project/../../other', 210), ('Example/project', -1), ('Example/project', True)]:
            with self.assertRaises(ValueError):
                tool.github_evidence(repository, number, Path('.'), lambda *a: self.fail('Network called'))

    def test_online_probe_allows_only_passive_explicit_nonproduction_pages(self):
        target = {'url': 'https://staging.example.invalid/login', 'nonProduction': True}
        self.assertEqual(tool.validate_target(target), target['url'])
        for url in ['https://example.invalid/login', 'http://staging.example.invalid/login',
                    'https://staging.example.invalid/api/worker', 'https://staging.example.invalid/login?token=secret',
                    'https://user:pass@staging.example.invalid/login', 'https://staging.example.invalid/login#token']:
            with self.subTest(url=url), self.assertRaises(ValueError):
                tool.validate_target({'url': url, 'nonProduction': True})
        with self.assertRaises(ValueError):
            tool.validate_target({'url': target['url'], 'nonProduction': False})
        self.assertIsNone(tool.NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_private_write_preserves_decisions_and_restricts_permissions(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'record.json'
            original = {'humanDecisions': [{'status': 'BLOCKED'}], 'classification': 'PRIVATE'}
            tool.private_write(path, original)
            self.assertEqual(json.loads(path.read_text()), original)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)


if __name__ == '__main__':
    unittest.main()
