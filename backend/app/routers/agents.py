from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from ..deps import get_db, get_current_user
from ..models import Service, User
from ..agent_generator import generate_agent, Platform
from ..config import settings
from ..security import decrypt_token
from sqlalchemy import select

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/download")
async def download_agent(
    service_id: int = Query(...),
    platform: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_platforms = ["linux", "raspberry-pi", "windows-ps1", "windows-exe"]
    if platform not in valid_platforms:
        raise HTTPException(400, f"Invalid platform. Must be one of: {valid_platforms}")

    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(404, "Service not found")

    hostname = f"{service.subdomain}.{service.zone_name}"

    # Determine if we should generate a tunnel agent or a DDNS agent
    tunnel_token_raw = None
    if service.tunnel_mode and service.tunnel_token:
        try:
            tunnel_token_raw = decrypt_token(service.tunnel_token)
        except Exception:
            tunnel_token_raw = None  # Fall back to DDNS if decryption fails

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
            # Tunnel params
            tunnel_mode=service.tunnel_mode and tunnel_token_raw is not None,
            tunnel_token=tunnel_token_raw,
            local_service_url=service.local_service_url,
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Agent generation failed: {str(e)}")

    mode_header = "tunnel" if (service.tunnel_mode and tunnel_token_raw) else "ddns"

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(file_bytes)),
            "X-Driftlock-Agent-Version": settings.AGENT_VERSION,
            "X-Driftlock-Platform": platform,
            "X-Driftlock-Mode": mode_header,
        }
    )
