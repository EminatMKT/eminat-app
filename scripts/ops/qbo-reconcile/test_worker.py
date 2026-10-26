import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('worker', Path(__file__).with_name('worker.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def test_only_valid_complete_worker_result_advances_heartbeat(self):
        calls = []
        def call(*args):
            calls.append(args)
            return {'processed': 1, 'retry': 2, 'ignored': 0, 'private': 'not persisted'}
        worker.tick(self.directory, 'synthetic', call, lambda: 1000)
        self.assertEqual(len(calls), 1)
        self.assertEqual(worker.health(self.directory, lambda: 1200)['age_seconds'], 200)
        self.assertNotIn('private', (self.directory / 'heartbeat.json').read_text())
        self.assertNotIn('synthetic', (self.directory / 'heartbeat.json').read_text())
        for bad in [{}, {'processed': True, 'retry': 0, 'ignored': 0},
                    {'processed': 0, 'retry': -1, 'ignored': 0}]:
            with self.assertRaises(ValueError):
                worker.tick(self.directory, 'synthetic', lambda *a: bad, lambda: 1500)
        self.assertEqual(worker.health(self.directory, lambda: 1500)['last_success'], 1000)

    def test_transport_failure_is_not_retried_or_marked_healthy(self):
        calls = []
        def fail(*args):
            calls.append(args)
            raise TimeoutError()
        with self.assertRaises(TimeoutError):
            worker.tick(self.directory, 'synthetic', fail)
        self.assertEqual(len(calls), 1)
        self.assertTrue(worker.health(self.directory)['stale'])

    def test_stale_alert_is_once_per_incident_and_recovery_is_once(self):
        calls = []
        def call(path, secret, payload):
            calls.append(payload)
            return {'sent': True}
        worker.write_state(self.directory / 'heartbeat.json', {'last_success': 1000})
        self.assertFalse(worker.watch(self.directory, 'synthetic', call, lambda: 1600)['stale'])
        self.assertTrue(worker.watch(self.directory, 'synthetic', call, lambda: 1601)['stale'])
        worker.watch(self.directory, 'synthetic', call, lambda: 1900)
        self.assertEqual(calls, [{'state': 'STALE', 'incident': 1000}])
        worker.write_state(self.directory / 'heartbeat.json', {'last_success': 2000})
        worker.watch(self.directory, 'synthetic', call, lambda: 2010)
        worker.watch(self.directory, 'synthetic', call, lambda: 2020)
        self.assertEqual(calls[-1], {'state': 'RECOVERED', 'incident': 1000})
        self.assertEqual(len(calls), 2)

    def test_alert_failure_is_not_recorded_as_delivered(self):
        with self.assertRaises(ValueError):
            worker.watch(self.directory, 'synthetic', lambda *a: {'sent': False})
        self.assertFalse((self.directory / 'monitor.json').exists())

    def test_no_redirects_and_explicit_timer_contract(self):
        self.assertIsNone(worker.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.test'))
        root = Path(__file__).parent
        self.assertIn('OnCalendar=*-*-* *:00/5:00 UTC', (root / 'lilly-qbo-reconcile.timer').read_text())
        self.assertIn('OnCalendar=*-*-* *:*:30 UTC', (root / 'lilly-qbo-watchdog.timer').read_text())
        self.assertIn('LoadCredential=cron_secret:', (root / 'lilly-qbo-reconcile.service').read_text())


if __name__ == '__main__':
    unittest.main()
