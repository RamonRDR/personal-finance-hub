# Security and release gates

The app is an **isolated public synthetic demo**. All Google writes are disabled.
A read-only Google API client exists but is not bound to a real OAuth session.

Before handling any live financial data:
1. Configure Google OAuth consent with minimum read-only Sheets scope.
2. Restrict access to one approved Google identity.
3. Add durable server-side encrypted token storage, expiry, revocation and CSRF protection.
4. Add production throttling, error handling and log redaction.
5. Validate row/column mapping and formulas against an isolated test spreadsheet.
6. Back up the real spreadsheet, preview changes and obtain fresh owner consent.
7. Introduce immutable IDs, idempotent operations and conflict detection before writing.
8. Verify no duplicate reminders, then use a separately approved financial calendar.
9. Test a real installed PWA via HTTPS on both iOS and Android.
10. Preserve existing automations, reminders and sheets without modification.

Do not commit private spreadsheet IDs, transaction values, names,
account/card numbers, credentials, access tokens, screenshots of live
financial data or AI prompts containing user financial details.
