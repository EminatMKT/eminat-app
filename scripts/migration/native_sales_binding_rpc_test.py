import io
import json
import os
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import native_sales_binding_rpc as binding


class BindingRpcTest(unittest.TestCase):
    def run_binding(self, response, binding_name='seller', phase='check', key='eyJ.test-only-key'):
        with patch.dict(os.environ, {'LILLY_SUPABASE_SERVICE_ROLE_KEY': key}), \
             patch.object(sys, 'argv', ['binding', '--binding', binding_name, '--phase', phase]), \
             patch.object(binding.request, 'urlopen', return_value=io.BytesIO(json.dumps(response).encode())) as open_url:
            binding.main()
        req = open_url.call_args.args[0]
        self.assertEqual(req.full_url, binding.URL)
        self.assertEqual(json.loads(req.data), {'requested_binding': binding_name, 'action': phase})
        self.assertEqual(req.get_header('Apikey'), key)
        self.assertEqual(req.get_header('Authorization'), None if key.startswith('sb_secret_') else f'Bearer {key}')

    def test_only_exact_result_is_accepted(self):
        self.run_binding('NATIVE_SALES_BINDING_CHECK_PASS')
        self.run_binding('NATIVE_SALES_BINDING_CHECK_PASS', key='sb_secret_test-only-key')
        with self.assertRaisesRegex(ValueError, 'RESULT_INVALID'):
            self.run_binding('NATIVE_SALES_BINDING_APPLY_PASS')

    def test_upstream_error_is_sanitized(self):
        body = io.BytesIO(b'{"code":"55000","message":"sensitive upstream detail"}')
        with patch.dict(os.environ, {'LILLY_SUPABASE_SERVICE_ROLE_KEY': 'eyJ.test-only-key'}), \
             patch.object(sys, 'argv', ['binding', '--binding', 'superadmin', '--phase', 'verify']), \
             patch.object(binding.request, 'urlopen', side_effect=HTTPError(binding.URL, 400, 'sensitive upstream detail', {}, body)):
            with self.assertRaisesRegex(binding.BindingFailure, '^NATIVE_SALES_BINDING_RPC_HTTP_400_CODE_55000$') as raised:
                binding.main()
        self.assertNotIn('sensitive', str(raised.exception))

    def test_untrusted_error_code_is_not_logged(self):
        body = io.BytesIO(b'{"code":"SECRET_123","message":"sensitive upstream detail"}')
        exc = HTTPError(binding.URL, 401, 'sensitive upstream detail', {}, body)
        self.assertEqual(binding.http_diagnostic(exc), 'NATIVE_SALES_BINDING_RPC_HTTP_401_CODE_UNKNOWN')

    def test_unsupported_key_type_fails_before_network(self):
        with patch.dict(os.environ, {'LILLY_SUPABASE_SERVICE_ROLE_KEY': 'sb_publishable_test'}), \
             patch.object(sys, 'argv', ['binding', '--binding', 'seller', '--phase', 'check']), \
             patch.object(binding.request, 'urlopen') as open_url:
            with self.assertRaisesRegex(binding.BindingFailure, 'UNSUPPORTED_PROTECTED_SERVICE_KEY_TYPE'):
                binding.main()
        open_url.assert_not_called()

    def test_missing_secret_fails_before_network(self):
        with patch.dict(os.environ, {'LILLY_SUPABASE_SERVICE_ROLE_KEY': ''}), \
             patch.object(sys, 'argv', ['binding', '--binding', 'seller', '--phase', 'check']), \
             patch.object(binding.request, 'urlopen') as open_url:
            with self.assertRaisesRegex(ValueError, 'MISSING_PROTECTED_SERVICE_KEY'):
                binding.main()
        open_url.assert_not_called()


if __name__ == '__main__':
    unittest.main()
