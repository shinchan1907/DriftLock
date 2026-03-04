from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

# Auth
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# Config
class CloudflareSetupRequest(BaseModel):
    api_token: str

class CloudflareStatusResponse(BaseModel):
    configured: bool
    zones_count: int
    verified_at: Optional[datetime]
    zones: Optional[List[dict]] = []

# Service
class ServiceBase(BaseModel):
    name: str
    subdomain: str = Field(..., pattern=r"^[a-zA-Z0-9-]{1,63}$")
    zone_id: str
    zone_name: str
    record_type: str = "A"
    port: Optional[int] = None
    proxied: bool = False
    check_interval: int = 300

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    port: Optional[int] = None
    proxied: Optional[bool] = None
    check_interval: Optional[int] = None

class ServiceResponse(ServiceBase):
    id: int
    current_ip: Optional[str]
    api_key: str
    created_at: datetime
    updated_at: Optional[datetime]
    # Tunnel fields (token is never exposed to frontend)
    tunnel_mode: bool = False
    tunnel_id: Optional[str] = None
    local_service_url: Optional[str] = None

    class Config:
        from_attributes = True

# Update API (from agents)
class UpdateRequest(BaseModel):
    ip: Optional[str] = None

class UpdateResponse(BaseModel):
    status: str
    current_ip: Optional[str]
    hostname: str
    message: str

# Logs
class UpdateLogResponse(BaseModel):
    id: int
    service_id: int
    old_ip: Optional[str]
    new_ip: Optional[str]
    status: str
    error_msg: Optional[str]
    source: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics
class AnalyticsSummary(BaseModel):
    total_updates: int
    successful: int
    no_change: int
    errors: int
    success_rate: float
    active_services: int
    services_online: int

class TimeseriesData(BaseModel):
    date: str
    success: int
    error: int
    no_change: int

class TimeseriesResponse(BaseModel):
    days: List[TimeseriesData]

# Tunnel
class TunnelCreateRequest(BaseModel):
    local_service_url: str  # e.g. http://localhost:3001

class TunnelResponse(BaseModel):
    tunnel_id: str
    hostname: str
    status: str
    message: str

class CloudflareStatusResponse(BaseModel):
    configured: bool
    zones_count: int
    verified_at: Optional[datetime]
    zones: Optional[List[dict]] = []
    account_id: Optional[str] = None
    has_tunnel_support: bool = False
