# Phase C Contacts review slice

Contacts remain in ANNIE. LILLY reads and writes through the server-side adapter using the exact mapped Principal and Organization. ANNIE validates fields, permissions, account references, versions and archive/restore requests, and records history.

The Contact write switch `ANNIE_SALES_QA_CONTACT_WRITE_ENABLED` defaults to false. It is separate from the Lead switch. A Production deployment of this code alone grants no Contact writes. The Sales QA gate and exact-ID mapping still apply to every request. The browser receives neither ANNIE sessions nor database credentials.

The review slice covers Contact create, edit, archive/restore, primary Account selection, Leads created from a Contact, and history. ANNIE IDs and pagination cursors are passed through unchanged. No Supabase commercial table or migration is added.

Before enabling this switch in Production, validate a synthetic Contact through LILLY with an approved owner-only write window. Check create, versioned edit, stale-version rejection, account relationship, archive/restore, ANNIE history, authorization denial and Organization isolation. Return the switch to false after QA.
