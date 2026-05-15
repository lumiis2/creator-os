import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, connect, onboarding, workspace
from app.api.v1.endpoints import auth as auth_v1
from app.core.config import settings
from app.core.database import close_db


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown."""
    # Startup
    print("Starting up CreatorOS API...")
    yield
    # Shutdown
    print("Shutting down CreatorOS API...")
    await close_db()


app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "CreatorOS API"}


# Include routers
app.include_router(auth_v1.router)
app.include_router(analytics.router)
app.include_router(connect.router)
app.include_router(onboarding.router)
app.include_router(workspace.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
