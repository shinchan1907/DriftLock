from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
from .config import settings
from .routers import auth, setup, services, update, agents, logs, analytics, tunnels
from .database import engine, Base, SessionLocal
from .models import User
from .security import get_password_hash
from .scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed admin user. Shutdown: nothing needed for SQLite."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-Migration: Ensure new columns exist for existing installations
    async with engine.connect() as conn:
        def run_migrations(connection):
            cursor = connection.connection.cursor()
            # Add CloudflareConfig.account_id
            try: cursor.execute("ALTER TABLE cloudflare_config ADD COLUMN account_id TEXT")
            except: pass
            # Add Service tunnel columns
            cols = ["tunnel_mode BOOLEAN DEFAULT 0", "tunnel_id TEXT", "tunnel_token TEXT", "tunnel_account_id TEXT", "local_service_url TEXT"]
            for col in cols:
                try: cursor.execute(f"ALTER TABLE services ADD COLUMN {col}")
                except: pass
        await conn.run_sync(run_migrations)

    async with SessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == settings.ADMIN_USERNAME))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD[:72])
            )
            db.add(admin)
            await db.commit()

    start_scheduler()
    yield
    # Shutdown cleanup (if needed in future)


app = FastAPI(title="Driftlock API", version=settings.AGENT_VERSION, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Routes
app.include_router(auth.router)
app.include_router(setup.router)
app.include_router(services.router)
app.include_router(update.router)
app.include_router(agents.router)
app.include_router(logs.router)
app.include_router(analytics.router)
app.include_router(tunnels.router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": settings.AGENT_VERSION,
        "database": "connected",
        "uptime_seconds": int(time.time()),
    }
