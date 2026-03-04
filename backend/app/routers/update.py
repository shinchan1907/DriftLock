from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import time
from ..database import get_db
from ..models import Service, UpdateLog, CloudflareConfig
from ..schemas import UpdateRequest, UpdateResponse
from ..security import decrypt_token
from ..cloudflare import CloudflareClient

router = APIRouter(prefix="/api/update", tags=["agent"])

@router.post("", response_model=UpdateResponse)
async def update_ip(
    request: Request,
    payload: UpdateRequest,
    x_api_key: str = Header(...),
    x_agent_version: str = Header("unknown"),
    x_agent_platform: str = Header("unknown"),
    db: AsyncSession = Depends(get_db)
):
    start_time = time.time()
    
    # Verify API key
    result = await db.execute(select(Service).where(Service.api_key == x_api_key))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    client_ip = payload.ip or request.client.host
    hostname = f"{service.subdomain}.{service.zone_name}"
    
    # Check if IP changed
    if service.current_ip == client_ip:
        # Log "no_change"
        log = UpdateLog(
            service_id=service.id,
            old_ip=service.current_ip,
            new_ip=client_ip,
            status="no_change",
            source=f"{x_agent_platform} {x_agent_version}",
            duration_ms=int((time.time() - start_time) * 1000)
        )
        db.add(log)
        await db.commit()
        return {
            "status": "no_change",
            "current_ip": client_ip,
            "hostname": hostname,
            "message": "IP has not changed"
        }

    # Update Cloudflare
    cf_config_result = await db.execute(select(CloudflareConfig))
    cf_config = cf_config_result.scalar_one_or_none()
    if not cf_config:
        raise HTTPException(status_code=500, detail="Cloudflare not configured")
    
    cf_token = decrypt_token(cf_config.api_token)
    cf_client = CloudflareClient(cf_token)
    
    try:
        if service.cf_record_id:
            await cf_client.update_dns_record(
                service.zone_id, service.cf_record_id, hostname, client_ip, 
                service.record_type, service.proxied
            )
        else:
            # First time creation or find existing by name
            existing_records = await cf_client.get_dns_records(service.zone_id, hostname)
            if existing_records:
                record = existing_records[0]
                service.cf_record_id = record["id"]
                await cf_client.update_dns_record(
                    service.zone_id, service.cf_record_id, hostname, client_ip, 
                    service.record_type, service.proxied
                )
            else:
                new_record = await cf_client.create_dns_record(
                    service.zone_id, hostname, client_ip, 
                    service.record_type, service.proxied
                )
                service.cf_record_id = new_record["id"]

        old_ip = service.current_ip
        service.current_ip = client_ip
        
        log = UpdateLog(
            service_id=service.id,
            old_ip=old_ip,
            new_ip=client_ip,
            status="success",
            source=f"{x_agent_platform} {x_agent_version}",
            duration_ms=int((time.time() - start_time) * 1000)
        )
        db.add(log)
        await db.commit()
        
        return {
            "status": "updated",
            "current_ip": client_ip,
            "hostname": hostname,
            "message": "DNS record updated successfully"
        }
    except Exception as e:
        log = UpdateLog(
            service_id=service.id,
            old_ip=service.current_ip,
            new_ip=client_ip,
            status="error",
            error_msg=str(e),
            source=f"{x_agent_platform} {x_agent_version}",
            duration_ms=int((time.time() - start_time) * 1000)
        )
        db.add(log)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Cloudflare update failed: {str(e)}")
