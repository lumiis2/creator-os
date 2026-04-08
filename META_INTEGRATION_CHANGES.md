# Meta Integration Change Log

Last updated: 2026-04-08

## 1) Why this was added

This integration adds a **separate Meta connection flow** (Facebook + Instagram) for analytics ingestion.

Important distinction:
- **NextAuth Facebook provider** is for app login/authentication.
- **`/api/connect/meta` flow** is for platform analytics permissions and data sync.

---

## 2) High-level architecture changes

### New backend flow
1. User clicks **Connect Instagram & Facebook** in Profile.
2. App redirects to Meta OAuth dialog with required scopes.
3. Callback exchanges token(s), discovers Pages + linked IG business account.
4. App persists Meta connections in `platform_connections`.
5. User can run **Sync Meta**, which fetches insights and stores snapshots.

### What this enables
- Separate storage for `facebook` and `instagram` connections.
- Manual Meta sync endpoint.
- Snapshot persistence in existing analytics snapshot pipeline.
- Profile UI feedback for connected / partial / error states.

---

## 3) Database changes

File changed: `packages/db/src/schema/connections.ts`

### Added columns on `platform_connections`
- `tokenType` (`text`): stores token type returned by Meta (ex: `bearer`).
- `meta` (`jsonb`): stores Meta-specific structured metadata.

### Typical `meta` values now used
- Facebook record:
  - `primary_page_id`
  - `pages[]` (`page_id`, `page_name`)
- Instagram record:
  - `page_id`
  - `ig_user_id`

### Migration action done
- Executed: `pnpm --filter @creator-os/db exec drizzle-kit push`
- Result: schema changes applied to local DB.

---

## 4) New API routes

### `GET /api/connect/meta`
File: `apps/web/src/app/api/connect/meta/route.ts`

- Requires authenticated user.
- Builds signed `state` using HMAC + `AUTH_SECRET`.
- Redirects to Meta OAuth dialog with scopes:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_insights`

### `GET /api/connect/meta/callback`
File: `apps/web/src/app/api/connect/meta/callback/route.ts`

Responsibilities:
- Validate signed `state` (anti-tampering + 15-minute TTL).
- Exchange OAuth `code` for short-lived token.
- Exchange short-lived token for long-lived token.
- Fetch user pages (`/me/accounts`).
- Get linked IG business account from page (`instagram_business_account`).
- Upsert `platform_connections` rows for:
  - `platform = "facebook"`
  - `platform = "instagram"` (when discovered)
- Store token and metadata fields.
- Redirect to profile with status query params:
  - `?meta=connected`
  - `?meta=facebook_only`
  - `?meta=error&reason=...`

### `POST /api/sync/meta`
File: `apps/web/src/app/api/sync/meta/route.ts`

- Requires authenticated user.
- Accepts optional `connectionId`.
- Loads Meta connections (`facebook` and/or `instagram`).
- Marks connection `syncStatus` as `syncing`.
- Fetches platform insights.
- Upserts into `analytics_snapshots`.
- Updates `lastSyncedAt`, `syncStatus`, `syncError`.
- Best-effort cache invalidation in Redis.

---

## 5) New Meta service layer

File: `apps/web/src/services/meta/fetchAnalytics.ts`

Added reusable fetchers:
- `fetchFacebookPageInsights(pageId, token)`
  - currently reads: `page_impressions`, `page_post_engagements`, `page_fans`
- `fetchInstagramInsights(igUserId, token)`
  - currently reads: `reach`, `impressions`, `profile_views`

Includes generic Graph API request helper + metric extraction.

---

## 6) Profile UI/UX changes

### Connected Accounts panel
File: `apps/web/src/components/profile/connected-accounts.tsx`

New actions:
- **Connect Instagram & Facebook** → starts `/api/connect/meta`
- **Sync Meta** → calls `POST /api/sync/meta`

Also improved card display:
- shows `displayName` (when available)
- shows connection status + last sync date

### Profile status banners
File: `apps/web/src/app/(app)/profile/page.tsx`

Reads query params and displays banners for:
- success (`meta=connected`)
- partial connect (`meta=facebook_only`)
- error (`meta=error`)

### Profile connection typing/API response update
- `apps/web/src/app/api/profile/connections/route.ts` now returns `displayName`
- `apps/web/src/hooks/use-profile.ts` `Connection` type now includes `displayName`

---

## 7) Existing auth-side context (related)

File: `apps/web/src/auth.ts`

- Facebook provider exists in NextAuth for **login**.
- This remains separate from the Meta analytics connect flow above.

---

## 8) Known limitations and next improvements

Current implementation is functional but can be improved:

1. **Token storage encryption**
   - `accessTokenEnc` currently stores raw token value in DB fields named "Enc".
   - Recommended: encrypt at rest before insert/update.

2. **Stronger state verification**
   - Current approach is signed + TTL.
   - Optional: nonce persistence in DB/Redis for one-time use state.

3. **More complete Meta metrics**
   - Add reels/media-level insights where needed.

4. **Worker integration for Meta sync**
   - Sync runs inline now.
   - Optional: queue-based Meta jobs for large scale.

5. **Error reason normalization**
   - callback currently forwards short reason text in query string.
   - Recommended: map to fixed error codes for cleaner UX.

---

## 9) Quick verification checklist

- [x] DB schema push applied successfully.
- [x] `tsc --noEmit` passes.
- [x] Connect button exists in Profile.
- [x] Callback writes Facebook connection.
- [x] Callback writes Instagram connection when linked.
- [x] Sync endpoint stores snapshot rows.
- [x] Profile UI shows status banners after callback.

---

## 10) Files touched by this integration

- `packages/db/src/schema/connections.ts`
- `apps/web/src/app/api/connect/meta/route.ts`
- `apps/web/src/app/api/connect/meta/callback/route.ts`
- `apps/web/src/app/api/sync/meta/route.ts`
- `apps/web/src/services/meta/fetchAnalytics.ts`
- `apps/web/src/app/api/profile/connections/route.ts`
- `apps/web/src/hooks/use-profile.ts`
- `apps/web/src/components/profile/connected-accounts.tsx`
- `apps/web/src/app/(app)/profile/page.tsx`
