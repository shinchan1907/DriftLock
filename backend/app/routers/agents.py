from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from ..deps import get_db, get_current_user
from ..models import Service, User
from ..agent_generator import generate_agent, Platform
from ..config import settings
from sqlalchemy import select
import re

router = APIRouter(prefix="/api/agents", tags=["agents"])

@router.get("/download")
async def download_agent(
    service_id: int = Query(...),
    platform: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate platform
    valid_platforms = ["linux", "raspberry-pi", "windows-ps1", "windows-exe"]
    if platform not in valid_platforms:
        raise HTTPException(400, f"Invalid platform. Must be one of: {valid_platforms}")
    
    # Fetch service
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(404, "Service not found")
    
    # Build full hostname
    hostname = f"{service.subdomain}.{service.zone_name}"
    
    # Generate agent
    try:
        file_bytes, filename, content_type = generate_agent(
            platform=platform,
            server_url=str(settings.SERVER_URL),
            api_key=service.api_key,
            hostname=hostname,
            service_name=service.name,
            check_interval=service.check_interval,
            agent_version=settings.AGENT_VERSION,
            service_port=service.port,
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Agent generation failed: {str(e)}")
    
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(file_bytes)),
            "X-Driftlock-Agent-Version": settings.AGENT_VERSION,
            "X-Driftlock-Platform": platform,
        }
    )
