#!/usr/bin/env python3
"""Collect private development evidence without approving or releasing anything.

Usage: python3 scripts/dev/collect_iteration.py --repo-dir . --config PRIVATE.json
       --record PRIVATE-record.json --validate --github --online --diagnose-ci

Config: repository (owner/name), pullRequest (positive integer), validationTests
(tracked src/**/*.test.ts[x] paths), onlineTargets (url, nonProduction=true).
Only configured staging/preview HTTPS login pages are probed; no cookies, redirects,
provider calls, deployments, database operations or GitHub writes are performed.
Local PASS results are reused only for identical source, tools and command inputs.
Existing CI, human review and protected approval remain authoritative.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone


def run(argv, cwd):
    result = subprocess.run(argv, cwd=cwd, capture_output=True, timeout=600)
    if result.returncode:
        raise RuntimeError('Read-only source/tool operation failed; details withheld')
    return result.stdout


def fingerprint(root, commands):
    names = run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], root).split(b'\0')
    digest = hashlib.sha256(json.dumps(commands, sort_keys=True).encode())
    digest.update(Path(__file__).read_bytes())
    for name in sorted(set(n for n in names if n)):
        path = root / os.fsdecode(name)
        digest.update(name + b'\0')
        if path.is_symlink():
            digest.update(os.fsencode(os.readlink(path)))
        elif path.is_file():
            with path.open('rb') as source:
                for block in iter(lambda: source.read(1024 * 1024), b''):
                    digest.update(block)
        else:
            digest.update(b'MISSING')
        digest.update(b'\0')
    digest.update(run(['node', '--version'], root))
    for package in ['typescript', 'vitest']:
        digest.update((root / 'node_modules' / package / 'package.json').read_bytes())
    return digest.hexdigest()


def validation_commands(root, tests):
    if not tests:
        raise ValueError('Select relevant tests; an empty selection is not validation')
    for name in tests:
        if not re.fullmatch(r'src/[A-Za-z0-9_./()\[\]-]+\.test\.tsx?', name) or '..' in Path(name).parts:
            raise ValueError('Only explicit source unit-test paths are accepted')
        run(['git', 'ls-files', '--error-unmatch', '--', name], root)
    return [
        ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'],
        ['node', 'node_modules/vitest/vitest.mjs', 'run', *tests],
    ]


def local_validation(root, commands, previous, execute=subprocess.run):
    key = fingerprint(root, commands)
    if previous.get('fingerprint') == key and previous.get('status') == 'PASS':
        return {**previous, 'reused': True}
    results = []
    for argv in commands:
        result = execute(argv, cwd=root, capture_output=True, timeout=600)
        results.append({'command': argv, 'exitCode': result.returncode,
                        'outputSha256': hashlib.sha256(result.stdout + result.stderr).hexdigest()})
        if result.returncode:
            break
    # A command that changes source invalidates the result instead of caching it.
    unchanged = fingerprint(root, commands) == key
    return {'fingerprint': key, 'reused': False, 'sourceUnchanged': unchanged,
            'status': 'PASS' if unchanged and len(results) == len(commands) and all(r['exitCode'] == 0 for r in results) else 'BLOCKED',
            'verifiedUTC': datetime.now(timezone.utc).isoformat(), 'results': results}


def gh_get(endpoint, root):
    return json.loads(run(['gh', 'api', '--method', 'GET', '--paginate', '--slurp', endpoint], root))


def gh_job_log(repository, job_id, root):
    # Only called after the run has been bound to this PR head and the ordinary
    # pull-request CI workflow. Never fetch protected release/Production logs.
    # GH's escape protection targets terminal rendering. Here stdout is captured
    # as bytes, parsed in memory and never printed or retained as a raw log.
    return run(['gh', 'api', '--method', 'GET', '--allow-escape-sequences',
                f'repos/{repository}/actions/jobs/{job_id}/logs'], root)


def ci_diagnostics(repository, head, root, get=gh_get, read_log=gh_job_log):
    if (not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository) or
            not re.fullmatch(r'[0-9a-f]{40}', head)):
        raise ValueError('Invalid CI source binding')
    prefix = 'repos/' + repository
    pages = get(f'{prefix}/actions/runs?head_sha={head}&event=pull_request&per_page=100', root)
    runs = [r for page in pages for r in page['workflow_runs']
            if r.get('head_sha') == head and r.get('event') == 'pull_request'
            and r.get('path') == '.github/workflows/ci.yml']
    findings = []
    for workflow in runs:
        if workflow.get('conclusion') != 'failure':
            continue
        run_id = workflow['id']
        if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id < 1:
            raise ValueError('Invalid CI run identity')
        jobs = [j for page in get(f'{prefix}/actions/runs/{run_id}/jobs?per_page=100', root)
                for j in page['jobs'] if j.get('conclusion') == 'failure' and j.get('run_id') == run_id]
        for job in jobs:
            job_id = job['id']
            if not isinstance(job_id, int) or isinstance(job_id, bool) or job_id < 1:
                raise ValueError('Invalid CI job identity')
            failed = [s['name'] for s in job.get('steps', []) if s.get('conclusion') == 'failure']
            item = {'runId': run_id, 'jobId': job_id, 'jobName': job['name'],
                    'failedSteps': failed, 'classification': 'APPLICATION_OR_OTHER_FAILURE',
                    'logsSaved': False, 'approvalOrRetryGranted': False}
            if job['name'] == 'e2e' and failed == ['Verificar shards e2e']:
                item['classification'] = 'REQUIRED_SHARD_AGGREGATE_FAILURE'
            if 'Start local Supabase' in failed:
                item['classification'] = 'DATABASE_STARTUP_FAILURE'
                try:
                    raw = read_log(repository, job_id, root)
                    if len(raw) > 8 * 1024 * 1024:
                        raise ValueError('CI log exceeds diagnostic limit')
                    text = raw.decode('utf-8', errors='replace')
                    item['logSha256'] = hashlib.sha256(raw).hexdigest()
                    if re.search(r'failed to bind host port [^\r\n]*: address already in use', text):
                        item['classification'] = 'CI_RUNNER_PORT_CONFLICT'
                    item['applicationTestsReached'] = False
                except (RuntimeError, ValueError):
                    item['logInspection'] = 'BLOCKED'
            findings.append(item)
    return {'head': head, 'observedUTC': datetime.now(timezone.utc).isoformat(),
            'eligibleRunCount': len(runs), 'failures': findings,
            'diagnosticOnly': True, 'workflowMutations': False,
            'isolatedFailureConfirmedByFreshRun': False,
            'requiredCheckWaiver': False, 'integrationAuthorized': False}


def github_evidence(repository, number, root, get=gh_get):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository) or not isinstance(number, int) or isinstance(number, bool) or number < 1:
        raise ValueError('Invalid repository or pull request')
    prefix = 'repos/' + repository
    pr = get(f'{prefix}/pulls/{number}', root)[0]
    head, base = pr['head']['sha'], pr['base']['sha']
    pages = get(f'{prefix}/commits/{head}/check-runs?per_page=100', root)
    checks = [c for page in pages for c in page['check_runs']]
    rules = [r for page in get(f'{prefix}/rules/branches/{urllib.parse.quote(pr["base"]["ref"], safe="")}', root) for r in page]
    required = [c for rule in rules if rule['type'] == 'required_status_checks' for c in rule['parameters']['required_status_checks']]
    results = []
    for context in required:
        candidates = [c for c in checks if c['name'] == context['context'] and c.get('head_sha') == head and
                      (context.get('integration_id') is None or c.get('app', {}).get('id') == context['integration_id'])]
        latest = max(candidates, key=lambda c: c['id']) if candidates else None
        results.append({'name': context['context'], 'status': 'PASS' if latest and latest['status'] == 'completed' and latest['conclusion'] == 'success' else 'BLOCKED',
                        'checkId': latest['id'] if latest else None, 'url': latest.get('html_url') if latest else None})
    reviews = [r for page in get(f'{prefix}/pulls/{number}/reviews?per_page=100', root) for r in page]
    # Read the PR again: a concurrent push/base update must not inherit these checks.
    after = get(f'{prefix}/pulls/{number}', root)[0]
    stable = after['head']['sha'] == head and after['base']['sha'] == base
    return {'head': head, 'base': base, 'draft': pr['draft'], 'merged': pr['merged'],
            'observedUTC': datetime.now(timezone.utc).isoformat(),
            'sourceStableDuringCollection': stable, 'requiredChecks': results,
            'requiredCI': 'PASS' if stable and required and all(r['status'] == 'PASS' for r in results) else 'BLOCKED',
            'reviews': [{'id': r['id'], 'login': r['user']['login'], 'state': r['state'], 'commit': r['commit_id']} for r in reviews],
            'appliedRuleTypes': sorted(set(r['type'] for r in rules)),
            'humanIndependenceAndAcceptanceVerified': False, 'integrationAuthorized': False}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def validate_target(target):
    url = target['url']
    parsed = urllib.parse.urlsplit(url)
    if (target.get('nonProduction') is not True or parsed.scheme != 'https' or
        not (parsed.hostname or '').startswith(('staging.', 'stage.', 'preview.')) or
        parsed.username or parsed.password or parsed.port not in [None, 443] or
        parsed.path not in ['/login', '/membresia'] or parsed.query or parsed.fragment):
        raise ValueError('Only explicit non-production HTTPS login-page targets are accepted')
    return url


def online_probe(target):
    url = validate_target(target)
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(urllib.request.Request(url, method='GET'), timeout=20)
    except urllib.error.HTTPError as response_error:
        response = response_error
    with response:
        body = response.read(1024 * 1024 + 1)
        return {'url': url, 'httpStatus': response.code,
                'status': 'PASS' if response.code == 200 and len(body) <= 1024 * 1024 else 'BLOCKED',
                'bodySha256': hashlib.sha256(body).hexdigest(), 'tlsVerified': True,
                'authenticatedAcceptance': False, 'redirectsFollowed': False, 'responseBodySaved': False}


def private_write(path, value):
    fd, temporary = tempfile.mkstemp(prefix='.iteration-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(value, output, indent=2, ensure_ascii=False)
            output.write('\n')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-dir', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--record', type=Path, required=True)
    for option in ['validate', 'github', 'online', 'diagnose-ci']:
        parser.add_argument('--' + option, action='store_true')
    args = parser.parse_args()
    root = args.repo_dir.resolve()
    if args.config.resolve().is_relative_to(root):
        parser.error('Keep private configuration outside the repository')
    config = json.loads(args.config.read_text())
    record_path = args.record.resolve()
    if record_path.is_relative_to(root):
        parser.error('Keep the private record outside the repository')
    record = json.loads(record_path.read_text()) if record_path.exists() else {'classification': 'PRIVATE'}
    if record.get('classification') != 'PRIVATE':
        parser.error('Only private records may be updated')
    record['iteration'] = {'head': run(['git', 'rev-parse', 'HEAD'], root).decode().strip(),
                           'observedUTC': datetime.now(timezone.utc).isoformat()}
    if args.validate:
        commands = validation_commands(root, config.get('validationTests', []))
        record['localValidation'] = local_validation(root, commands, record.get('localValidation', {}))
    if args.github or args.diagnose_ci:
        record['github'] = github_evidence(config['repository'], config['pullRequest'], root)
    if record.get('github'):
        record['github']['matchesLocalHead'] = record['github']['head'] == record['iteration']['head']
    if args.online:
        record['online'] = [online_probe(t) for t in config.get('onlineTargets', [])]
    if args.diagnose_ci:
        record['ciDiagnostics'] = ci_diagnostics(config['repository'], record['github']['head'], root)
    record['releaseAuthorized'] = False
    record['productionExecutionAuthorized'] = False
    private_write(record_path, record)
    print('Private iteration evidence updated; no release or production operation authorized.')


if __name__ == '__main__':
    main()
