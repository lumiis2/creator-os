Auth quickstart — CreatorOS

Minimal steps to get authentication running locally with Supabase (development):

1. Configure `.env` (project root `creator-os/.env`):

   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_JWKS_URL` — https://<project>.supabase.co/auth/v1/.well-known/jwks.json (recommended)
   - `JWT_ALGORITHM=ES256` (if using Supabase default)
   - `SUPABASE_JWT_SECRET` / `SUPABASE_JWT_PUBLIC_KEY` — leave empty when using JWKS
   - `DATABASE_URL` — Postgres connection (the backend will normalize to `postgresql+asyncpg://...` and convert `sslmode=require` → `?ssl=require`)

2. Activate virtualenv and install:

```bash
cd creator-os
source ../.venv/bin/activate   # or your venv path
pip install -r requirements.txt
```

3. Run migrations (local or target DB):

```bash
alembic upgrade head
```

4. Start backend:

```bash
set -a
source .env
set +a
python -m uvicorn main:app --reload
```

5. Start frontend (in `frontend/`):

```bash
npm install
npm run dev
```

6. Test auth flow:

- Use "Login with Google" via frontend to authenticate with Supabase.
- Click "Test /auth/me" to verify the backend validates the JWT (via JWKS) and creates `User` + `Profile` if missing.

Troubleshooting:
- If you see `Email not confirmed` on signup, confirm the email from Supabase or disable email confirmations in Supabase Auth settings for local testing.
- If you see `connect() got an unexpected keyword argument 'sslmode'`, update `DATABASE_URL` to include `?ssl=require` or let the backend normalize it.
