import httpx
from typing import List, Dict, Any, Optional
import asyncio

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

    # ── Auth & Zones ───────────────────────────────────────────────────────────

    async def verify_token(self) -> bool:
        try:
            result = await self._request("GET", "/user/tokens/verify")
            return result.get("result", {}).get("status") == "active"
        except:
            return False

    async def get_accounts(self) -> List[Dict]:
        """List all CF accounts accessible by the API token."""
        try:
            result = await self._request("GET", "/accounts")
            return result.get("result", [])
        except:
            return []

    async def get_zones(self) -> List[Dict]:
        result = await self._request("GET", "/zones")
        return result.get("result", [])

    # ── DNS Records ────────────────────────────────────────────────────────────

    async def get_dns_records(self, zone_id: str, name: str) -> List[Dict]:
        params = {"name": name}
        result = await self._request("GET", f"/zones/{zone_id}/dns_records", params=params)
        return result.get("result", [])

    async def create_dns_record(self, zone_id: str, name: str, content: str, type: str = "A", proxied: bool = False):
        body = {
            "type": type,
            "name": name,
            "content": content,
            "ttl": 1 if proxied else 60,
            "proxied": proxied
        }
        result = await self._request("POST", f"/zones/{zone_id}/dns_records", json=body)
        return result.get("result", {})

    async def update_dns_record(self, zone_id: str, record_id: str, name: str, content: str, type: str = "A", proxied: bool = False):
        body = {
            "type": type,
            "name": name,
            "content": content,
            "ttl": 1 if proxied else 60,
            "proxied": proxied
        }
        result = await self._request("PUT", f"/zones/{zone_id}/dns_records/{record_id}", json=body)
        return result.get("result", {})

    async def delete_dns_record(self, zone_id: str, record_id: str) -> bool:
        try:
            await self._request("DELETE", f"/zones/{zone_id}/dns_records/{record_id}")
            return True
        except Exception:
            return False

    # ── Cloudflare Tunnel API ──────────────────────────────────────────────────

    async def create_tunnel(self, account_id: str, name: str) -> Dict:
        """Create a new named Cloudflare Tunnel. Returns tunnel metadata including id."""
        result = await self._request(
            "POST",
            f"/accounts/{account_id}/cfd_tunnel",
            json={"name": name, "config_src": "cloudflare"}
        )
        return result.get("result", {})

    async def delete_tunnel(self, account_id: str, tunnel_id: str) -> bool:
        """Delete a tunnel and cascade-remove its connections."""
        try:
            await self._request("DELETE", f"/accounts/{account_id}/cfd_tunnel/{tunnel_id}?cascade=true")
            return True
        except Exception:
            return False

    async def get_tunnel_token(self, account_id: str, tunnel_id: str) -> str:
        """Get the single-string install token for cloudflared (`cloudflared service install <token>`)."""
        result = await self._request("GET", f"/accounts/{account_id}/cfd_tunnel/{tunnel_id}/token")
        return result.get("result", "")

    async def configure_tunnel_ingress(self, account_id: str, tunnel_id: str, hostname: str, local_url: str) -> Dict:
        """
        Push ingress config to Cloudflare so cloudflared downloads it automatically.
        This means the agent script doesn't need a config file — just the token.
        """
        config = {
            "config": {
                "ingress": [
                    {
                        "hostname": hostname,
                        "service": local_url,
                        "originRequest": {"noTLSVerify": True}
                    },
                    {"service": "http_status:404"}
                ]
            }
        }
        result = await self._request(
            "PUT",
            f"/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations",
            json=config
        )
        return result.get("result", {})

    async def create_tunnel_cname(self, zone_id: str, hostname: str, tunnel_id: str) -> Dict:
        """
        Replace any existing A/CNAME record for hostname with a proxied CNAME
        pointing to {tunnel_id}.cfargotunnel.com (required for CF Tunnels).
        """
        existing = await self.get_dns_records(zone_id, hostname)
        for record in existing:
            try:
                await self.delete_dns_record(zone_id, record["id"])
            except Exception:
                pass

        body = {
            "type": "CNAME",
            "name": hostname,
            "content": f"{tunnel_id}.cfargotunnel.com",
            "ttl": 1,
            "proxied": True
        }
        result = await self._request("POST", f"/zones/{zone_id}/dns_records", json=body)
        return result.get("result", {})
