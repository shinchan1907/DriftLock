from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from datetime import datetime, timedelta
from typing import List
from ..database import get_db
from ..models import UpdateLog, Service
from ..schemas import AnalyticsSummary, TimeseriesResponse, TimeseriesData
from ..deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    # Basic counts
    total_result = await db.execute(select(func.count(UpdateLog.id)))
    total = total_result.scalar() or 0
    
    success_result = await db.execute(select(func.count(UpdateLog.id)).where(UpdateLog.status == "success"))
    successful = success_result.scalar() or 0
    
    no_change_result = await db.execute(select(func.count(UpdateLog.id)).where(UpdateLog.status == "no_change"))
    no_change = no_change_result.scalar() or 0
    
    error_result = await db.execute(select(func.count(UpdateLog.id)).where(UpdateLog.status == "error"))
    errors = error_result.scalar() or 0
    
    service_count_result = await db.execute(select(func.count(Service.id)))
    active_services = service_count_result.scalar() or 0
    
    # Simple success rate calculation
    success_rate = (successful / (successful + errors)) * 100 if (successful + errors) > 0 else 100.0
    
    return {
        "total_updates": total,
        "successful": successful,
        "no_change": no_change,
        "errors": errors,
        "success_rate": round(success_rate, 2),
        "active_services": active_services,
        "services_online": active_services # Placeholder logic
    }

@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(range: str = "7d", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    days = 7 if range == "7d" else 30
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # This is a bit complex in SQLite for grouping by date, usually handled by database-specific functions
    # Using raw SQL for date grouping in SQLite
    query = text("""
        SELECT date(created_at) as log_date, status, count(*) 
        FROM update_log 
        WHERE created_at >= :start_date 
        GROUP BY log_date, status
    """)
    result = await db.execute(query, {"start_date": start_date})
    
    data_map = {}
    for row in result:
        log_date, status, count = row
        if log_date not in data_map:
            data_map[log_date] = {"date": log_date, "success": 0, "error": 0, "no_change": 0}
        
        if status == "success":
            data_map[log_date]["success"] = count
        elif status == "error":
            data_map[log_date]["error"] = count
        elif status == "no_change":
            data_map[log_date]["no_change"] = count
            
    return {"days": sorted(data_map.values(), key=lambda x: x["date"])}
