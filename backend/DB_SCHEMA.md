Database schema for CreatorOS (models-derived)

Overview
- Database: PostgreSQL (uses pgvector for embeddings, JSONB for structured fields)
- UUID primary keys (Postgres UUID type)
- Vector embeddings use `pgvector` (size 1536)
- JSON fields stored as `JSONB`
- Several ENUM types defined in Python models (mapped to Postgres ENUMs)

ENUM types
- platform_type: youtube | instagram | tiktok | facebook
- project_status: idea | drafting | production | editing | scheduled | posted
- source_type: note | document | transcript | url | other
- chat_role: user | assistant | system | tool
- media_type: video | image | text

Tables

1) users
- id: UUID, PK, default uuid_generate_v4()/uuid.uuid4
- supabase_user_id: UUID, unique, nullable, indexed
- email: varchar(255), unique, not null, indexed
- full_name: text, nullable
- avatar_url: text, nullable
- auth_provider: varchar(50), not null, default 'supabase'
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- One-to-one -> profiles (Profile.user, `profiles.user_id` FK to `users.id`)

Indexes:
- idx_users_supabase_user_id on supabase_user_id
- idx_users_email on email


2) profiles
- id: UUID, PK
- user_id: UUID, FK -> users.id (ON DELETE CASCADE), not null, indexed
- niche: varchar(255), nullable
- creator_goal: text, nullable
- posting_frequency_goal: integer, nullable
- ai_behavior: JSONB, not null, default '{}'
- ai_settings: JSONB, not null, default '{}'
- global_strategy: text, nullable
- onboarding_completed: boolean, not null, default false
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- profiles.user -> users (one-to-one)
- profiles.social_accounts -> social_accounts (one-to-many)
- profiles.projects -> projects (one-to-many)
- profiles.knowledge_entries -> ai_knowledge_base (one-to-many)
- profiles.chat_sessions -> chat_sessions (one-to-many)

Indexes:
- idx_profiles_user_id on user_id


3) social_accounts
- id: UUID, PK
- user_id: UUID, FK -> profiles.id (ON DELETE CASCADE), not null
- platform: ENUM(platform_type), not null
- platform_handle: text, not null
- platform_user_id: text, not null
- credentials: JSONB, not null, default '{}'
- niche_data: JSONB, not null, default '{}'
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- social_accounts.profile -> profiles (many-to-one)
- social_accounts.daily_metrics -> daily_metrics (one-to-many)
- social_accounts.projects -> projects (one-to-many, via projects.linked_account_id)


4) projects
- id: UUID, PK
- user_id: UUID, FK -> profiles.id (ON DELETE CASCADE), not null
- linked_account_id: UUID, FK -> social_accounts.id (ON DELETE SET NULL), nullable
- title: text, not null
- status: ENUM(project_status), not null, default 'idea'
- content_data: JSONB, not null, default '{}'
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- projects.profile -> profiles (many-to-one)
- projects.linked_account -> social_accounts (many-to-one)
- projects.creative_references -> creative_references (many-to-many via project_references)


5) creative_references
- id: UUID, PK
- user_id: UUID, FK -> profiles.id (ON DELETE CASCADE), not null
- origin_url: text, not null
- media_type: ENUM(media_type), not null
- ai_analysis: JSONB, not null, default '{}'
- metadata: JSONB, not null, default '{}'
- embedding: VECTOR(1536), not null (pgvector)
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- creative_references.projects -> projects (many-to-many via project_references)

Association table: project_references
- project_id: UUID, FK -> projects.id (ON DELETE CASCADE), PK
- reference_id: UUID, FK -> creative_references.id (ON DELETE CASCADE), PK
- linked_at: timestamptz, not null, default now()


6) daily_metrics
- id: UUID, PK
- account_id: UUID, FK -> social_accounts.id (ON DELETE CASCADE), not null
- record_date: date, not null
- bronze_raw: JSONB, not null, default '{}'
- silver_normalized: JSONB, not null, default '{}'
- created_at: timestamptz, not null, default now()
- updated_at: timestamptz, not null, default now(), on update now()

Relationships:
- daily_metrics.social_account -> social_accounts (many-to-one)


7) chat_sessions
- id: UUID, PK
- user_id: UUID, FK -> profiles.id (ON DELETE CASCADE), not null
- title: text, nullable
- created_at, updated_at timestamps

Relationships:
- chat_sessions.profile -> profiles (many-to-one)
- chat_sessions.messages -> chat_messages (one-to-many)


8) chat_messages
- id: UUID, PK
- session_id: UUID, FK -> chat_sessions.id (ON DELETE CASCADE), not null
- role: ENUM(chat_role), not null
- content: text, not null
- metadata: JSONB, not null, default '{}'
- created_at, updated_at timestamps

Relationships:
- chat_messages.session -> chat_sessions (many-to-one)


9) ai_knowledge_base
- id: UUID, PK
- user_id: UUID, FK -> profiles.id (ON DELETE CASCADE), not null
- content: text, not null
- embedding: VECTOR(1536), not null
- source_type: ENUM(source_type), not null
- metadata: JSONB, not null, default '{}'
- created_at, updated_at timestamps

Relationships:
- ai_knowledge_base.profile -> profiles (many-to-one)


Notes & Observations
- Many FKs refer to `profiles.id` (models use `user_id` naming on several tables but point to `profiles.id`). This is intentional in the model definitions but could be confusing: several models call the FK column `user_id` while linking to the `profiles` table (e.g. `Project.user_id` references `profiles.id`).
- Enums are created in DB separately (models set create_type=False). Ensure migrations create the ENUM types in DB or Supabase project.
- Embeddings require `pgvector` extension available in the database.
- JSON defaults use `server_default=text("'{}'::jsonb")` to ensure DB-level defaults.

If you want, next steps:
- Produce a PlantUML ER diagram file or a SQL `CREATE TABLE` dump generated from models.
- Export this documentation to `docs/db_schema.md` (already created here) or to your project README.

