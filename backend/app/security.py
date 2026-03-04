import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

# Encryption (AES-256-GCM)
def _get_encryption_key():
    salt = settings.ENCRYPTION_SALT.encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(settings.SECRET_KEY.encode())

def encrypt_token(token: str) -> str:
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = hashlib.sha256(settings.ENCRYPTION_SALT.encode()).digest()[:12] # Using salt to derive a stable nonce for this simple setup, though usually nonces should be random. 
    # Actually, for DDNS where token doesn't change often, random nonce + prepending is better.
    import os
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, token.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_token(encrypted_token: str) -> str:
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    data = base64.b64decode(encrypted_token)
    nonce = data[:12]
    ciphertext = data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode()
