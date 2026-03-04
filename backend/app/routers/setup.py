from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import json
from ..database import get_db
from ..models import CloudflareConfig
from ..schemas import CloudflareSetupRequest, CloudflareStatusResponse
from ..security import encrypt_token, decrypt_token
from ..cloudflare import CloudflareClient
from ..deps import get_current_user

router = APIRouter(prefix="/api/setup", tags=["setup"])

@router.post("/cloudflare")
async def setup_cloudflare(request: CloudflareSetupRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    client = CloudflareClient(request.api_token)
    if not await client.verify_token():
        raise HTTPException(status_code=400, detail="Invalid Cloudflare API token")
    
    zones = await client.get_zones()
    encrypted_token = encrypt_token(request.api_token)
    
    # Clear old config
    await db.execute(delete(CloudflareConfig))
    
    from datetime import datetime
    config = CloudflareConfig(
        api_token=encrypted_token,
        zone_cache=json.dumps([{"id": z["id"], "name": z["name"]} for z in zones]),
        verified_at=datetime.utcnow()
    )
    db.add(config)
    await db.commit()
    
    return {"zones": zones}

@router.get("/status", response_model=CloudflareStatusResponse)
async def get_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CloudflareConfig))
    config = result.scalar_one_or_none()
    
    if not config:
        return {"configured": False, "zones_count": 0, "verified_at": None}
    
    zones_count = len(json.loads(config.zone_cache)) if config.zone_cache else 0
    return {
        "configured": True,
        "zones_count": zones_count,
        "verified_at": config.verified_at,
        "zones": json.loads(config.zone_cache) if config.zone_cache else []
    }
