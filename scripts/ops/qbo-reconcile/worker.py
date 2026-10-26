#!/usr/bin/env python3
"""Dedicated trigger/watchdog. Financial processing remains exclusively in LILLY."""
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import urllib.request

ORIGIN = 'https://app.stratixsolutions.us'
STALE_SECONDS = 600


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(path, secret, payload=None):
    headers = {'Authorization': 'Bearer ' + secret, 'Accept': 'application/json'}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(ORIGIN + path, data=data, headers=headers,
                                 method='POST' if data is not None else 'GET')
    # One request only; queue retry/idempotency lives in the existing server worker.
    with urllib.request.build_opener(NoRedirect).open(req, timeout=55) as response:
        raw = response.read(4097)
        if len(raw) > 4096:
            raise ValueError('RESPONSE_TOO_LARGE')
        return json.loads(raw)


def read_state(path):
    try:
        value = json.loads(path.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError, UnicodeError):
        return {}


def write_state(path, value):
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def tick(directory, secret, call=request, clock=time.time):
    result = call('/api/sales-native/quickbooks/reconcile', secret)
    if not isinstance(result, dict) or any(type(result.get(k)) is not int or result[k] < 0
                                         for k in ('processed', 'retry', 'ignored')):
        raise ValueError('INCOMPLETE_WORKER_RESULT')
    counts = {k: result[k] for k in ('processed', 'retry', 'ignored')}
    write_state(directory / 'heartbeat.json', {'last_success': int(clock()), **counts})
    return counts


def health(directory, clock=time.time):
    last = read_state(directory / 'heartbeat.json').get('last_success', 0)
    if type(last) is not int or last < 0:
        last = 0
    age = int(clock()) - last
    return {'last_success': last, 'age_seconds': age,
            'stale': not last or age < 0 or age > STALE_SECONDS}


def watch(directory, secret, call=request, clock=time.time):
    status = health(directory, clock)
    path = directory / 'monitor.json'
    previous = read_state(path)
    if status['stale']:
        # Keep the incident stable across repeated failures/restarts.
        incident = previous.get('incident', status['last_success'])
        if not previous.get('notified'):
            result = call('/api/sales-native/quickbooks/worker-alert', secret,
                          {'state': 'STALE', 'incident': incident})
            if result.get('sent') is not True:
                raise ValueError('ALERT_NOT_CONFIRMED')
            write_state(path, {'incident': incident, 'notified': True})
    elif previous.get('notified'):
        result = call('/api/sales-native/quickbooks/worker-alert', secret,
                      {'state': 'RECOVERED', 'incident': previous['incident']})
        if result.get('sent') is not True:
            raise ValueError('RECOVERY_NOT_CONFIRMED')
        write_state(path, {})
    return status


def main():
    mode = sys.argv[1]
    directory = Path(os.environ.get('STATE_DIRECTORY', '/var/lib/lilly-qbo-reconcile'))
    if mode == 'status':
        print(json.dumps(health(directory)))
        return
    secret = (Path(os.environ['CREDENTIALS_DIRECTORY']) / 'cron_secret').read_text().strip()
    if not secret or '\n' in secret:
        raise ValueError('INVALID_CREDENTIAL')
    if mode == 'tick':
        print(json.dumps({'event': 'qbo_worker_completed', **tick(directory, secret)}))
    elif mode == 'watch':
        status = watch(directory, secret)
        print(json.dumps({'event': 'qbo_worker_health', **status}),
              file=sys.stderr if status['stale'] else sys.stdout)
        if status['stale']:
            raise ValueError('WORKER_STALE')
    elif mode == 'test-alert':
        result = request('/api/sales-native/quickbooks/worker-alert', secret,
                         {'state': 'TEST', 'incident': int(time.time())})
        if result.get('sent') is not True:
            raise ValueError('TEST_ALERT_NOT_CONFIRMED')
        print('QBO_MONITOR_TEST_SENT')
    else:
        raise ValueError('INVALID_MODE')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never print exceptions: HTTP/credential/provider details may be sensitive.
        print('{"event":"qbo_worker_failed","action":"inspect dedicated timer and LILLY logs"}',
              file=sys.stderr)
        sys.exit(1)
