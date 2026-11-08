# Google Cloud integration checklist (not yet activated)

The demo requires no Google Cloud account, scopes or API credentials.
The integration is disabled pending owner authorization and secure token storage.

For future real operation: create/select an authorized Google Cloud project;
enable the Sheets API; configure the consent screen with a restricted test user;
register precise OAuth redirects for the chosen authentication provider; start
with the spreadsheets.readonly scope and verify token expiry/revocation.
Only after a separate permission review should Calendar access be considered.
Calendar events should go to a dedicated approved calendar, never silently
to the primary calendar. OAuth publishing or verification requirements depend
on the final audience and scopes and must be rechecked before launch.
No service, deployment, consent or credential was created by this change.
