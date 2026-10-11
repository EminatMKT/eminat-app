# Meet inside LILLY — Phase 1

`meet.stratixsolutions.us` remains the functional reference until a separate cutover. The new `/meetings` route in LILLY ports its list, creation, detail, participants, topics, linked Tasks, history, finalization, and report flows. The existing `/reuniones` page and its tables remain available as legacy code.

## Data and identity

- Meetings read and write `public.meetings` directly; topics and explicit participants use `public.topics` and `public.meeting_participants`.
- Tasks read and write `public.actividades` through LILLY's same-origin `/api/integrations/meet` endpoints. A meeting activity is linked through a topic; no task or meeting copy is created during integration.
- The existing LILLY Supabase browser client, session, active profile, and `reuniones` module grant protect the new route. There is no second login or Meet auth storage.
- The Meet participant SELECT policy from Meet PR #2 is required before any production cutover. Its explicit participant rule permits valid cross-company history while denying unrelated users. This PR does not apply that policy or change Production.

## Review and release gate

The PR contains no data migration, DNS change, or deployment configuration change. LILLY's `vercel.json` keeps auto-deployment disabled for this branch and `main`. Before a later release, verify that LILLY and Meet point to the same intended Supabase project, apply the already reviewed participant read policy in a controlled database change, and repeat the 9 Meetings / 47 Tasks QA scenario against the deployed preview. Do not use `delete + recreate` for historical records.
