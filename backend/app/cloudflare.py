import httpx
from typing import List, Dict, Any, Optional
import asyncio
from .config import settings

class CloudflareClient:
    BASE_URL = "https://api.cloudflare.com/client/v4"
    
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def _request(self, method: str, path: str, json: Optional[Dict] = None, params: Optional[Dict] = None):
        async with httpx.AsyncClient(timeout=10.0) as client:
            retries = 3
            for i in range(retries):
                try:
                    response = await client.request(method, f"{self.BASE_URL}{path}", headers=self.headers, json=json, params=params)
                    response.raise_for_status()
                    return response.json()
                except (httpx.HTTPStatusError, httpx.RequestError) as e:
                    if i == retries - 1:
                        raise e
                    await asyncio.sleep(2 ** i)

    async def verify_token(self) -> bool:
        try:
            result = await self._request("GET", "/user/tokens/verify")
            return result.get("result", {}).get("status") == "active"
        except:
            return False

    async def get_zones(self) -> List[Dict]:
        result = await self._request("GET", "/zones")
        return result.get("result", [])

    async def get_dns_records(self, zone_id: str, name: str) -> List[Dict]:
        params = {"name": name}
        result = await self._request("GET", f"/zones/{zone_id}/dns_records", params=params)
        return result.get("result", [])

    async def create_dns_record(self, zone_id: str, name: str, content: str, type: str = "A", proxied: bool = False):
        json = {
            "type": type,
            "name": name,
            "content": content,
            "ttl": 1 if proxied else 60,
            "proxied": proxied
        }
        result = await self._request("POST", f"/zones/{zone_id}/dns_records", json=json)
        return result.get("result", {})

    async def update_dns_record(self, zone_id: str, record_id: str, name: str, content: str, type: str = "A", proxied: bool = False):
        json = {
            "type": type,
            "name": name,
            "content": content,
            "ttl": 1 if proxied else 60,
            "proxied": proxied
        }
        result = await self._request("PUT", f"/zones/{zone_id}/dns_records/{record_id}", json=json)
        return result.get("result", {})
