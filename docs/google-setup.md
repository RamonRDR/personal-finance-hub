# Google Cloud private integration: staging checklist

**Current state:** the GitHub repository contains only synthetic finance data.
The optional Google OAuth + Sheets reader is implemented, but **no private
environment, credentials, Redis database, Google test workbook or deployment has
been provisioned or authorized by the repository changes**.
`GOOGLE_INTEGRATION_ENABLED=false` remains the default.

## Stage A: automated contract tests (no credentials)

The repository runs OAuth state/PKCE, owner-identity, server-session, mocked
Sheets read, permissions, header-drift and partial-read tests in GitHub Actions.
These tests simulate Google responses without contacting Google or Redis.

- `npm ci`
- `npm run test:google`
- `npm run lint && npm run typecheck && npm run build`

These tests do not prove a live connection.

## Stage B: create a private Google test environment (owner action)

1. Choose a **private HTTPS test URL** for the app. Do not publish the
   financial dashboard or grant anonymous access to Google data.
2. In the [Google Cloud console](https://console.cloud.google.com/),
   select a dedicated project for testing. Enable the **Google Sheets API**.
3. In **Google Auth Platform**, configure the app audience and consent
   screen. Keep it in **Testing** and add only the exact approved test account.
4. Create an OAuth client of type **Web application**. Register the exact
   redirect URI: `https://YOUR_TEST_HOST/api/auth/google/callback`.
   The value must exactly match `APP_ORIGIN` plus
   `/api/auth/google/callback`. No wildcard, mismatched port or extra slash.
5. Create an **isolated synthetic Google Sheet**, not a copy of personal
   transactions. It should contain the expected tab names and header positions
   from `docs/sheets-mapping.md`, with only fictional descriptions/amounts.
   Include one installment, one pending bill and one paid bill. Do not alter
   the existing household workbook.
6. Create a separate **Upstash Redis** database for encrypted sessions.
   Store credentials as **private hosting environment variables**, never in
   GitHub public files or client-side `NEXT_PUBLIC_*` values.
7. Generate a random encryption key using `openssl rand -base64 32`.
   Keep it private and stable for the test environment. Rotation requires a
   migration plan or session invalidation.

## Required server-side variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_INTEGRATION_ENABLED` | Set `true` only in approved private staging |
| `APP_ORIGIN` | Exact HTTPS origin of the private test host |
| `GOOGLE_CLIENT_ID` | OAuth Web application client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Web application client secret |
| `ALLOWED_GOOGLE_EMAIL` | Only verified account allowed to sign in |
| `FINANCE_SPREADSHEET_ID` | **Synthetic test workbook** ID, never the household workbook during initial tests |
| `SESSION_ENCRYPTION_KEY` | Private base64-encoded 32-byte AES key |
| `UPSTASH_REDIS_REST_URL` | HTTPS endpoint for isolated Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Redis REST token |

Do not send these secrets in chat, PR comments, issues or screenshots.
Keep them in the private host's **encrypted environment settings**.

## Stage C: browser acceptance tests (after owner approval)

1. Confirm that anonymous `GET /api/finance/snapshot` returns **401**.
2. Open **Configurações → Entrar com Google** in the private environment.
3. Sign in with the approved test user; another account must be rejected.
4. Confirm that the consent screen only requests identity plus **Google Sheets
   read-only** access. No write or Calendar scope is authorized.
5. Select **Carregar planilha (leitura)**. Verify synthetic totals, invoices,
   installment month and statuses against the test sheet.
6. Change a synthetic header or revoke Sheets access and verify that the app
   **does not display incomplete totals as validated**. Restore the fixture.
7. Wait for access-token renewal (or simulate expiration using test tooling).
   Then revoke Google permission and verify reconnect/error handling.
8. Disconnect. Verify browser and server session invalidation and that the
   private read route requires authorization again.
9. Check HTTPS, no-store cache headers, no OAuth tokens in browser storage,
   access logs or JavaScript bundles. Validate iPhone/Android separately.
10. Record findings without inserting real transaction details or credentials
    into GitHub.

**Important:** Google's external OAuth applications in **Testing** status can
issue refresh tokens that expire after seven days when requesting the Sheets
scope. This is expected in staging and must not be confused with an
application outage. See Google's
[OAuth token lifecycle](https://developers.google.com/identity/protocols/oauth2/).

## Safety gates

- The initial consent grants `openid email spreadsheets.readonly`, not write.
- The Google workbook client uses GET, `cache: no-store`, an opaque server-side
  token and validated range/tab names.
- Incomplete or suspicious imports do not replace the demo dashboard.
- There is no live Google Sheets write route or enabled Calendar write route.
- Do not move from synthetic sheet to personal data until mapping, security,
  privacy and retention review are complete and the owner approves explicitly.
- No deployment, OAuth client, database or external workbook was created by
  this commit; the provided instructions are not an activation claim.

Official references:
[Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server),
[Sheets values.get](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get),
[Google OAuth consent](https://support.google.com/cloud/answer/15549945).
