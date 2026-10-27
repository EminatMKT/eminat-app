# Approved implementation brief (English)

Correct only the Patient Portal language switch and login branding. Replace the native language dropdown with a compact ES/EN segmented pill modeled on the public corazonsalud.health homepage. Place it at the top-right corner of Login/Create Account, separate from all headings. Use the same control at the far-right of the authenticated Portal header, with a responsive layout that avoids overlapping the logo, patient name or content. Preserve the existing locale cookie, router refresh, translated content and metadata behavior. Keep keyboard access, clear focus and accessible selection states.

Add the existing official Eminat Medical Center (EMC) logo and the Portal's existing bilingual program/not-insurance footer text to the public login footer. Reuse the current asset, branding and official destination; preserve Privacy/Terms links and all form structure and behavior.

Verify ES/EN, Login/Create Account, authenticated header, desktop and mobile. No changes to authentication rules, patient workflows, membership/pricing, QBO, payments, backend, database, LILLY or the public homepage. Run tests, typecheck and production build; validate the UI in Preview before the controlled release, preserving rollback.
