from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

class CloudflareConfig(Base):
    __tablename__ = "cloudflare_config"
    id = Column(Integer, primary_key=True, index=True)
    api_token = Column(Text, nullable=False)  # AES-256 encrypted
    zone_cache = Column(Text, nullable=True)  # JSON array
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subdomain = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    zone_name = Column(String, nullable=False)
    cf_record_id = Column(String, nullable=True)
    record_type = Column(String, default="A")
    port = Column(Integer, nullable=True)
    proxied = Column(Boolean, default=False)
    current_ip = Column(String, nullable=True)
    api_key = Column(String, unique=True, index=True, nullable=False)
    check_interval = Column(Integer, default=300)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UpdateLog(Base):
    __tablename__ = "update_log"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"))
    old_ip = Column(String, nullable=True)
    new_ip = Column(String, nullable=True)
    status = Column(String, nullable=False)  # success, no_change, error
    error_msg = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
