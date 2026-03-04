from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time
from .config import settings
from .routers import auth, setup, services, update, agents, logs, analytics
from .database import engine, Base, SessionLocal
from .models import User
from .security import get_password_hash

app = FastAPI(title="Driftlock API", version=settings.AGENT_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(setup.router)
app.include_router(services.router)
app.include_router(update.router)
app.include_router(agents.router)
app.include_router(logs.router)
app.include_router(analytics.router)

@app.on_event("startup")
async def startup():
    # In production, we'd use Alembic. 
    # For initial run, we ensure the admin user exists.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
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

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": settings.AGENT_VERSION,
        "database": "connected", # Simplification
        "uptime_seconds": int(time.time()), # Placeholder
    }
