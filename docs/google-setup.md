# Google integration setup (private, not activated)

The public demo is independent of any Google account. The OAuth and read-only
Sheets integration is implemented behind `GOOGLE_INTEGRATION_ENABLED=false`
and has **not** been exercised with real credentials or a live spreadsheet.
No real data, Google client ID, refresh token or workbook identifier is in Git.

## Private test environment

1. Create or choose your own Google Cloud project. Enable **Google Sheets API**
   and configure the OAuth consent screen with an explicitly allowed test user.
2. Create a Google OAuth **Web application** client. Set the exact redirect URI
   `https://your-host.example/api/auth/google/callback`. Its origin must equal
   `APP_ORIGIN`. Use a private HTTPS environment for tests.
3. Create a separate **Upstash Redis** database for session records. Store its
   HTTPS REST URL and server-only REST token in your hosting environment.
4. Generate a fresh 32-byte key with `openssl rand -base64 32`. Keep this
   `SESSION_ENCRYPTION_KEY` and all other secrets out of Git, CI logs, browser
   variables and public screenshots.
5. Configure these **server-only** environment variables:
   `GOOGLE_INTEGRATION_ENABLED=true`, `APP_ORIGIN`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `ALLOWED_GOOGLE_EMAIL`,
   `FINANCE_SPREADSHEET_ID`, `SESSION_ENCRYPTION_KEY`,
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
6. Run the app privately. Open **Configurações → Entrar com Google**, sign in
   using the exact approved account, and choose **Carregar planilha (leitura)**.
   Review mapping warnings against a synthetic test workbook first.

OAuth requests `openid email spreadsheets.readonly` only, with state, signed
short-lived cookies and PKCE S256. The approved Google email must be verified
and exactly match `ALLOWED_GOOGLE_EMAIL`. The server stores access/refresh
tokens as AES-256-GCM ciphertext in Redis, keyed by a hash of the opaque
browser session handle. Tokens are refreshed server-side and sessions expire
within seven days. Logout removes the server session. Browser cookies are
HttpOnly, SameSite=Lax and Secure on HTTPS.

## Boundaries and gates

The app does not expose a Google Sheets write endpoint or Calendar writes.
The browser does not receive OAuth tokens or the private spreadsheet ID.
Only a user-initiated, authenticated `GET /api/finance/snapshot` returns
normalized finance rows. It uses private no-store responses. Browser state is
ephemeral and PWA caches only public static assets.

Do **not** enable this on a public deployment before verifying real Google
consent, token revocation, quotas, provider errors, access controls,
financial mapping, Redis availability and mobile privacy. Google OAuth
publishing and verification requirements depend on audience and sensitive
scopes. Live spreadsheet, Calendar and personal reminders were not changed.
