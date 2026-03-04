from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timedelta
import asyncio
from .config import settings
from .database import SessionLocal, engine
from .models import Service, UpdateLog

scheduler = AsyncIOScheduler()

async def check_stale_agents():
    async with SessionLocal() as db:
        # Simple stale detection: if updated_at is older than check_interval * 3
        # In a real app, we might update a 'status' column.
        pass

async def cleanup_old_logs():
    async with SessionLocal() as db:
        limit = datetime.utcnow() - timedelta(days=90)
        await db.execute(delete(UpdateLog).where(UpdateLog.created_at < limit))
        await db.commit()

def start_scheduler():
    scheduler.add_job(cleanup_old_logs, 'cron', hour=3)
    # scheduler.add_job(check_stale_agents, 'interval', minutes=10)
    scheduler.start()
