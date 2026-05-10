"""Project structure and setup documentation."""

# CreatorOS - Backend Structure
## Directory Organization

```
backend/
├── alembic/                    # Database migrations
│   ├── versions/               # Migration scripts
│   ├── env.py                  # Alembic environment config
│   └── script.py.mako          # Migration template
├── app/
│   ├── __init__.py
│   ├── api/                    # API routes
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── analytics.py        # Analytics/metrics endpoints
│   │   └── workspace.py        # Project management endpoints
│   ├── core/                   # Core configuration
│   │   ├── config.py           # Settings (Pydantic)
│   │   └── database.py         # AsyncSession factory
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── base.py             # DeclarativeBase
│   │   ├── enums.py            # Python enums (platform, status, etc)
│   │   ├── profile.py          # User profiles
│   │   ├── social_account.py   # Social platform accounts
│   │   ├── daily_metric.py     # Time-series analytics
│   │   ├── project.py          # Content projects (Kanban)
│   │   ├── ai_knowledge_base.py # RAG vector store
│   │   └── chat.py             # Chat history
│   ├── schemas/                # Pydantic request/response models
│   │   ├── base.py             # ORM base config
│   │   ├── types.py            # Complex JSONB types
│   │   ├── profile.py
│   │   ├── social_account.py
│   │   ├── daily_metric.py
│   │   ├── project.py
│   │   ├── ai_knowledge_base.py
│   │   └── chat.py
│   ├── repositories/           # CRUD operations
│   │   └── base.py             # BaseRepository generic class
│   ├── services/               # Business logic layer
│   ├── workers/                # Celery async tasks
│   │   └── celery_app.py       # Celery configuration & tasks
│   └── agents/                 # LangGraph AI workflows
├── main.py                     # FastAPI app entry point
├── requirements.txt            # Python dependencies
├── alembic.ini                 # Alembic config
└── README.md

database/
├── schema.sql                  # PostgreSQL DDL
├── migrations/                 # SQL migration scripts
└── seed.sql                    # Test data
```

## Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Create Initial Migration
```bash
alembic revision --autogenerate -m "Initial schema"
```

### 3. Apply Migrations
```bash
alembic upgrade head
```

### 4. Run Development Server
```bash
python main.py
# or
uvicorn main:app --reload
```

### 5. Create Background Workers
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

## Architecture Highlights

### **Medallion Pattern (Analytics)**
- **Bronze**: Raw API data in `daily_metrics.bronze_raw`
- **Silver**: Normalized/aggregated in `daily_metrics.silver_normalized`
- **Gold**: Business metrics (future)

### **Async-First**
- `AsyncSession` for non-blocking DB queries
- `async def` routes for concurrent request handling
- Redis + Celery for task queuing

### **Type Safety**
- SQLAlchemy 2.0 `Mapped` type hints
- Pydantic v2 full validation
- Python enums for constraints

### **Vector Search (RAG)**
- pgvector extension for embeddings
- `ai_knowledge_base.embedding` (1536-dim)
- Similarity search for semantic content retrieval

### **Supabase Ready**
- `profiles.user_id` references `users.id` (when integrated with Supabase Auth, that `users.id` comes from the auth schema)
- JSONB for encrypted credential storage
- PostgreSQL compatible

Notes specific to current project state
- JWT validation: backend supports JWKS discovery via `SUPABASE_JWKS_URL` (recommended), static `SUPABASE_JWT_PUBLIC_KEY`, and legacy `SUPABASE_JWT_SECRET` (HS256). Set `JWT_ALGORITHM` accordingly (e.g., `ES256` for Supabase's ECC keys).
- Migrations: Alembic migrations were adapted to avoid creating Supabase-managed `auth` schema objects. When deploying to Supabase, ensure ENUMs and extensions (like `pgvector`) are created or available in the target DB.
- Environment: backend reads `.env` (project root `creator-os/.env`) and normalizes `DATABASE_URL` to `postgresql+asyncpg://...` and converts `sslmode=require` to `?ssl=require` for asyncpg compatibility.
