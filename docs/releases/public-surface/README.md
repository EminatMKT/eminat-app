# Corazón Salud public surface release

Only the public homepage starting-price qualifier and language metadata, public robots/sitemap files, and Portal login/account-creation legal navigation and metadata change. The public pricing table and every other homepage section remain byte-for-byte unchanged. The Portal patch is based on 2253a66e3e81bf5a415baea84cd0f38a1caeb645; source commit 6841c01667d163692f645fd6ecc25ee49b70dcaa. LILLY runtime files do not change and must not be deployed for this artifact-only release.

## Security audit / deferred Security-HIPAA hardening

See security-headers.json for live observations. Both hosts redirect HTTP to HTTPS. Public hosting currently has CSP `upgrade-insecure-requests`; HSTS, nosniff, Referrer-Policy and frame protection are not present in the audited response. Portal has HSTS (31536000), nosniff and strict-origin-when-cross-origin. CSP/frame protection is absent there. Preserve all existing headers for this release. A future targeted security audit should inventory resources and embedding requirements, trial a report-only CSP, and then validate a restrictive CSP/frame-ancestors policy; do not enable an untested broad CSP or framing restriction here.

Portal already globally renders `noindex,nofollow`; preserve it and do not include the Portal anywhere in the public sitemap. Its absent robots.txt can be considered separately; no authenticated indexing controls are relaxed. Only homepage, official Privacy and official Terms are public sitemap entries.

## Release / rollback

Build the exact Portal source commit with its existing Production mode and API destination. Validate the production build before replacing only the active Portal container on its existing loopback port. Retain the previous Portal container/image for rollback. Upload only public/index.html, public/robots.txt and public/sitemap.xml to the existing public hosting directory; retain the previous homepage outside the web root. No environment values, backend, database, auth actions, QBO, Agreement, renewal or family logic change. No registration, record, invoice or payment is created for this UI-only verification.
