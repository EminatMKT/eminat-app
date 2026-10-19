#!/usr/bin/env bash
set -euo pipefail
umask 077
test -n "${GH_TOKEN:-}"
test -n "${PRIVATE_KEY:-}"
test -d .local/annie-source
mkdir -p .local/annie-export
chmod 700 .local/annie-export
run_state=$(gh run view "$EXPORT_RUN" --repo EminatMKT/annie --json conclusion --jq .conclusion 2>/dev/null) || exit 1
test "$run_state" = success || { echo 'ANNIE_EXPORT_RUN_NOT_SUCCESSFUL'; exit 1; }
gh run download "$EXPORT_RUN" --repo EminatMKT/annie \
  --name "annie-commercial-encrypted-$EXPORT_RUN" --dir .local/annie-export >/dev/null 2>&1 \
  || { echo 'ANNIE_EXPORT_DOWNLOAD_FAILED'; exit 1; }
test -f .local/annie-export/commercial-export.enc
test "$(sha256sum .local/annie-export/commercial-export.enc | cut -d' ' -f1)" = "$ENCRYPTED_SHA"
printf '%s' "$PRIVATE_KEY" > .local/annie-export/private.pem
chmod 600 .local/annie-export/private.pem
node .local/annie-source/scripts/deploy/encrypt_commercial_export.mjs decrypt \
  .local/annie-export/private.pem .local/annie-export/source.ndjson \
  < .local/annie-export/commercial-export.enc >/dev/null 2>&1 \
  || { echo 'ANNIE_EXPORT_DECRYPT_FAILED'; exit 1; }
python3 scripts/migration/prepare-annie-sales.py \
  .local/annie-export/source.ndjson .local/annie-export/bundle >/dev/null \
  || { echo 'ANNIE_EXPORT_NORMALIZE_FAILED'; exit 1; }
test "$(sha256sum .local/annie-export/bundle/rows.ndjson | cut -d' ' -f1)" = "$ROWS_SHA"
test "$(sha256sum .local/annie-export/bundle/manifest.json | cut -d' ' -f1)" = "$MANIFEST_SHA"
test "$(wc -l < .local/annie-export/bundle/rows.ndjson)" -eq 334
python3 scripts/migration/import-annie-sales.py .local/annie-export/bundle \
  --expected-commit "$EXPECTED_COMMIT" --expected-bundle-sha "$ROWS_SHA" \
  --expected-manifest-sha "$MANIFEST_SHA" >/dev/null
python3 scripts/migration/reconcile-annie-sales.py .local/annie-export/bundle \
  --expected-commit "$EXPECTED_COMMIT" --expected-bundle-sha "$ROWS_SHA" \
  --expected-manifest-sha "$MANIFEST_SHA" --expected-source-release "$SOURCE_RELEASE" >/dev/null
python3 scripts/migration/archive-annie-membership-pdfs.py .local/annie-export/bundle >/dev/null
python3 scripts/migration/summarize_annie_sales_counts.py .local/annie-export/bundle \
  --expected-bundle-sha "$ROWS_SHA" --expected-manifest-sha "$MANIFEST_SHA"
echo PRIVATE_BUNDLE_PREFLIGHT_PASS
