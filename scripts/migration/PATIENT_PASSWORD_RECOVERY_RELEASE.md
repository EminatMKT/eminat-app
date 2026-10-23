# Patient Portal password recovery release

Apply `20261023030000_native_sales_patient_password_recovery.sql` only through the protected Production schema workflow after its read-only precheck and a current restore point are verified. The migration expands one email-kind constraint, replaces its service-only queue function, and adds one service-only patient eligibility function. It does not modify existing business rows, staff Auth identities, invoices, or payments.

Deploy the matching LILLY Patient API only after schema verification. Deploy the matching Portal `/recuperar` UI after the API is healthy. The email uses the existing encrypted Corazón Salud outbox and provider configuration. A first-party URL fragment carries the one-time recovery token; it is removed from the address bar on page load. Password submission is performed by the patient.

Verify with a controlled patient account: generic response for unknown/staff addresses, branded recovery email for an eligible patient, invalid/expired token rejection, successful owner-entered password reset, prior opaque sessions revoked, fresh login, and no duplicate patient/contact/Opportunity. Do not use another person's credentials.

Rollback: restore the prior LILLY deployment and Portal release together. The new function and expanded constraint can remain inert without the new runtime; to fully remove them in a separate approved migration, drop `native_sales_patient_can_reset_password(text)`, restore the four-kind constraint and the prior `native_sales_patient_email_queue` definition after confirming no recovery-kind outbox rows remain. Never delete recovery mail history merely to roll back the UI.
