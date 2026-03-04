from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Service, CloudflareConfig
from ..schemas import TunnelCreateRequest, TunnelResponse
from ..security import encrypt_token, decrypt_token
from ..cloudflare import CloudflareClient
from ..deps import get_current_user

router = APIRouter(prefix="/api/tunnels", tags=["tunnels"])


@router.post("/{service_id}", response_model=TunnelResponse)
async def create_tunnel(
    service_id: int,
    request: TunnelCreateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Create a Cloudflare Tunnel for a service.
    - Creates the tunnel in CF
    - Configures ingress rules (hostname → local_service_url)
    - Replaces the DNS A record with a proxied CNAME pointing to the tunnel
    - Stores the encrypted tunnel token in the DB
    """
    # Fetch service
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(404, "Service not found")

    # Fetch Cloudflare config
    cf_result = await db.execute(select(CloudflareConfig))
    cf_config = cf_result.scalar_one_or_none()
    if not cf_config:
        raise HTTPException(400, "Cloudflare is not configured. Go to Setup first.")
    if not cf_config.account_id:
        raise HTTPException(
            400,
            "Tunnel support requires account-level access. "
            "Re-save your Cloudflare token in Setup to enable it."
        )

    cf_token = decrypt_token(cf_config.api_token)
    cf = CloudflareClient(cf_token)
    account_id = cf_config.account_id
    hostname = f"{service.subdomain}.{service.zone_name}"
    tunnel_name = f"driftlock-{service.name.lower().replace(' ', '-')[:28]}"

    # If there's already a tunnel for this service, delete it first
    if service.tunnel_id and service.tunnel_account_id:
        await cf.delete_tunnel(service.tunnel_account_id, service.tunnel_id)

    # 1. Create tunnel
    tunnel_data = await cf.create_tunnel(account_id, tunnel_name)
    tunnel_id = tunnel_data.get("id")
    if not tunnel_id:
        raise HTTPException(500, "Failed to create Cloudflare Tunnel. Check your token permissions.")

    # 2. Configure ingress rules (pushed to CF — agent doesn't need a config file)
    await cf.configure_tunnel_ingress(account_id, tunnel_id, hostname, request.local_service_url)

    # 3. Create CNAME DNS record (replaces any existing A record)
    await cf.create_tunnel_cname(service.zone_id, hostname, tunnel_id)

    # 4. Get the installation token for the agent
    tunnel_token_raw = await cf.get_tunnel_token(account_id, tunnel_id)
    if not tunnel_token_raw:
        raise HTTPException(500, "Could not retrieve tunnel installation token.")

    # 5. Persist tunnel metadata to service
    service.tunnel_mode = True
    service.tunnel_id = tunnel_id
    service.tunnel_token = encrypt_token(tunnel_token_raw)
    service.tunnel_account_id = account_id
    service.local_service_url = request.local_service_url
    service.proxied = True  # CNAME tunnels are always proxied
    await db.commit()

    return {
        "tunnel_id": tunnel_id,
        "hostname": hostname,
        "status": "created",
        "message": (
            f"Tunnel '{tunnel_name}' created. "
            f"Download the agent to install cloudflared — no port forwarding needed!"
        ),
    }


@router.delete("/{service_id}")
async def delete_tunnel(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete the Cloudflare Tunnel linked to a service and revert DNS to DDNS mode."""
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_result.scalar_one_or_none()
    if not service or not service.tunnel_id:
        raise HTTPException(404, "No tunnel found for this service.")

    cf_result = await db.execute(select(CloudflareConfig))
    cf_config = cf_result.scalar_one_or_none()
    if cf_config:
        cf_token = decrypt_token(cf_config.api_token)
        cf = CloudflareClient(cf_token)
        await cf.delete_tunnel(service.tunnel_account_id, service.tunnel_id)

    # Revert service to DDNS mode
    service.tunnel_mode = False
    service.tunnel_id = None
    service.tunnel_token = None
    service.tunnel_account_id = None
    service.local_service_url = None
    service.proxied = False
    await db.commit()

    return {"status": "deleted", "message": "Tunnel deleted. Service reverted to DDNS mode."}


@router.get("/{service_id}/token")
async def get_tunnel_agent_token(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Return the decrypted tunnel token for embedding in the agent script.
    Used internally by the agent download endpoint.
    """
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_result.scalar_one_or_none()
    if not service or not service.tunnel_token:
        raise HTTPException(404, "Tunnel not configured for this service.")
    return {"token": decrypt_token(service.tunnel_token)}
