from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid
from typing import List
from ..database import get_db
from ..models import Service
from ..schemas import ServiceCreate, ServiceResponse, ServiceUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/api/services", tags=["services"])

@router.get("", response_model=List[ServiceResponse])
async def get_services(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Service))
    return result.scalars().all()

@router.post("", response_model=ServiceResponse)
async def create_service(request: ServiceCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    service = Service(
        **request.dict(),
        api_key=str(uuid.uuid4())
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service

@router.get("/{id}", response_model=ServiceResponse)
async def get_service(id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Service).where(Service.id == id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.delete("/{id}")
async def delete_service(id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await db.execute(delete(Service).where(Service.id == id))
    await db.commit()
    return {"status": "success"}

@router.post("/{id}/rotate-key")
async def rotate_key(id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Service).where(Service.id == id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.api_key = str(uuid.uuid4())
    await db.commit()
    return {"api_key": service.api_key}
