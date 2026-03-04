from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from ..database import get_db
from ..models import UpdateLog
from ..schemas import UpdateLogResponse
from ..deps import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"])

@router.get("", response_model=dict)
async def get_logs(
    service_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    query = select(UpdateLog)
    
    if service_id:
        query = query.where(UpdateLog.service_id == service_id)
    if status:
        query = query.where(UpdateLog.status == status)
        
    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Pagination
    query = query.order_by(desc(UpdateLog.created_at)).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + per_page - 1) // per_page
    }
