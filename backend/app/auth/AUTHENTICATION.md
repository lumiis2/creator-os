Authentication — CreatorOS

Overview
- Auth is provided by Supabase Auth; the backend validates incoming JWTs and maps them to local `User` and `Profile` records.

JWT validation modes (in order of preference)
1. JWKS discovery: set `SUPABASE_JWKS_URL` to Supabase JWKS endpoint (recommended). Backend uses PyJWT's `PyJWKClient` to fetch the right key by `kid` and validate ES256 signatures.
2. Static public key: set `SUPABASE_JWT_PUBLIC_KEY` to a PEM public key and `JWT_ALGORITHM` to `RS256` or `ES256` as appropriate.
3. Legacy shared secret: set `SUPABASE_JWT_SECRET` and `JWT_ALGORITHM=HS256` (not recommended).

Token flow
- Frontend signs in with Supabase; Supabase returns an access token (JWT). Frontend sends `Authorization: Bearer <token>` to backend.
- Backend dependency `get_current_user_claims` parses the header and calls `validate_jwt()`.
- `validate_jwt()` resolves verification via JWKS/public-key/secret and returns `TokenData(user_id, email, ...)`.

User mapping & creation
- `get_current_user` looks up `User` by `supabase_user_id` (stored on `User.supabase_user_id`). If missing, it creates a `User` and a `Profile`:
  - `User.supabase_user_id` = token `sub` (UUID from Supabase)
  - `Profile.user_id` references `users.id`

Email confirmation
- If Supabase Auth requires email confirmation, password signups will be in `unconfirmed` state until the user confirms via the link sent by Supabase. Google OAuth logins bypass email confirmation.

Common issues
- "Invalid JWT token: The specified alg value is not allowed": mismatch between `JWT_ALGORITHM` and token `alg` — use JWKS or correct algorithm.
- "Unable to load PEM file": `SUPABASE_JWT_PUBLIC_KEY` must be the full PEM, not a key id.
- Network: JWKS discovery requires outbound HTTPS access to the JWKS URL.

Configuration (important env vars)
- `SUPABASE_URL`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_PUBLIC_KEY`
- `SUPABASE_JWT_SECRET`
- `JWT_ALGORITHM`
- `SUPABASE_JWT_AUDIENCE`, `SUPABASE_JWT_ISSUER` — used for validating `aud` / `iss` claims
