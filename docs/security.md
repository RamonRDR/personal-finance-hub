# Security and integration gates

This public app starts in **synthetic demo mode**. Optional private Google
integration is explicitly disabled unless all server-only settings are
provided. No Google writes or Calendar mutation endpoints exist.

## Controls implemented in source

- OAuth authorization-code flow with PKCE S256, HMAC-signed 10-minute state
  cookies, fixed redirect URI and exact verified owner email allowlist.
- Minimum read-only Sheets permission plus `openid email`. No write scope.
- Private session handle cookie (HttpOnly, SameSite=Lax, Secure on HTTPS,
  host-only, path `/`). No refresh/access token in browser cookies.
- Server-side Redis sessions with random opaque handles hashed for lookup,
  AES-256-GCM encryption at rest, seven-day fixed expiry and explicit revocation.
- Server-side token refresh; authenticated read-only Sheets endpoint.
- Private no-store responses for identity and financial data; no sensitive
  PWA offline caching. Logout requires a same-origin POST.
- No Google write routes; mutations in demo mode are session-only simulations.

## Unverified and mandatory before live finance use

- Configure a private Google Cloud app, owner identity, Redis and HTTPS origin.
- Test OAuth consent, token refresh/revocation, error paths, rate limiting,
  provider outages, scopes and real Google access on an isolated test sheet.
- Review actual financial mapping. Missing/header-drifted tabs trigger
  warnings; a partial result is not a trustworthy complete ledger.
- Implement source-stable IDs, explicit diffs, backups, optimistic
  concurrency, safe retry/idempotency and a verified audit trail before
  allowing a Sheets write.
- Add protected Calendar opt-in with a dedicated calendar, stable event IDs
  and anti-duplication behavior; validate on a test calendar.
- Validate PWA installation over HTTPS on real iOS/Android devices.
- Perform privacy/security review before any owner-authorized deployment.

No credential, private spreadsheet identifier, financial row, individual
name or account number belongs in the public repository or GitHub Actions
logs. This implementation is **not a claim that live integration works**.
