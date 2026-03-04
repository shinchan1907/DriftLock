import os
import re
import uuid
from pathlib import Path
from typing import Literal, Optional

TEMPLATES_DIR = Path(__file__).parent.parent / "agent-builder" / "templates"
DIST_DIR = Path(os.getenv("AGENT_BUILD_DIR", str(Path(__file__).parent.parent / "agent-builder" / "dist")))

Platform = Literal["linux", "raspberry-pi", "windows-ps1", "windows-exe"]


def _load_template(filename: str) -> str:
    path = TEMPLATES_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {filename}")
    return path.read_text(encoding="utf-8")


def _substitute(template: str, tokens: dict) -> str:
    for key, value in tokens.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    # Warn about any unreplaced tokens (excluding EXE padding markers)
    remaining = [t for t in re.findall(r'\{\{[A-Z_]+\}\}', template) if "_CHARS" not in t]
    if remaining:
        raise ValueError(f"Unreplaced tokens in template: {remaining}")
    return template


# ── DDNS Agents ────────────────────────────────────────────────────────────────

def generate_linux_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
    service_port: Optional[int] = None,
    platform: str = "linux",
) -> tuple[bytes, str]:
    template = _load_template("agent_linux.sh.template")
    safe_name = re.sub(r'[^a-z0-9-]', '-', service_name.lower())[:32]
    script = _substitute(template, {
        "SERVER_URL": server_url.rstrip("/"),
        "API_KEY": api_key,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "CHECK_INTERVAL": str(check_interval),
        "AGENT_VERSION": agent_version,
        "PLATFORM": platform,
        "PORT": str(service_port) if service_port else "",
    })
    return script.encode("utf-8"), f"driftlock-agent-{safe_name}.sh"


def generate_powershell_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
    service_port: Optional[int] = None,
) -> tuple[bytes, str]:
    template = _load_template("agent_windows.ps1.template")
    safe_name = re.sub(r'[^a-zA-Z0-9-]', '-', service_name)[:32]
    script = _substitute(template, {
        "SERVER_URL": server_url.rstrip("/"),
        "API_KEY": api_key,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "CHECK_INTERVAL": str(check_interval),
        "AGENT_VERSION": agent_version,
        "PORT": str(service_port) if service_port else "",
    })
    return script.encode("utf-8"), f"driftlock-agent-{safe_name}.ps1"


def generate_exe_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
) -> tuple[bytes, str]:
    exe_path = DIST_DIR / "driftlock-agent.exe"
    if not exe_path.exists():
        raise FileNotFoundError(
            "Windows .exe not found in agent-builder/dist/. Build it using the PyInstaller workflow."
        )

    exe_bytes = bytearray(exe_path.read_bytes())
    safe_name = re.sub(r'[^a-zA-Z0-9-]', '-', service_name)[:32]

    def patch_bytes(data: bytearray, placeholder: str, value: str, width: int) -> bytearray:
        padded_value = value.ljust(width)[:width]
        placeholder_bytes = placeholder.encode("utf-8")
        value_bytes = padded_value.encode("utf-8")
        idx = data.find(placeholder_bytes)
        if idx == -1:
            raise ValueError(f"Placeholder not found in binary: {placeholder[:30]}...")
        data[idx:idx+width] = value_bytes
        return data

    SERVER_PLACEHOLDER  = "DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DR"
    APIKEY_PLACEHOLDER  = "DRIFTLOCK_PLACEHOLDER_API_KEY_DRIFTLOCK_PLACEHOLDER_API_KEY_DRIFT"
    HOST_PLACEHOLDER    = "DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLO"
    SVCNAME_PLACEHOLDER = "DRIFTLOCK_PLACEHOLDER_SERVICE_NAME_DRIFTLOCK_PLACEHOLDER_SERVIC"

    exe_bytes = patch_bytes(exe_bytes, SERVER_PLACEHOLDER,  server_url.rstrip("/"), 200)
    exe_bytes = patch_bytes(exe_bytes, APIKEY_PLACEHOLDER,  api_key, 64)
    exe_bytes = patch_bytes(exe_bytes, HOST_PLACEHOLDER,    hostname, 100)
    exe_bytes = patch_bytes(exe_bytes, SVCNAME_PLACEHOLDER, safe_name, 64)

    # Patch check interval (6-char zero-padded)
    interval_placeholder = b"000300"
    interval_value = str(check_interval).zfill(6).encode("utf-8")
    idx = bytes(exe_bytes).find(interval_placeholder)
    if idx != -1:
        exe_bytes[idx:idx+6] = interval_value

    return bytes(exe_bytes), f"driftlock-agent-{safe_name}.exe"


# ── Tunnel Agents ───────────────────────────────────────────────────────────────

def generate_tunnel_linux_agent(
    tunnel_token: str,
    hostname: str,
    service_name: str,
    local_service_url: str,
    agent_version: str,
) -> tuple[bytes, str]:
    """Generate a Linux shell script that installs cloudflared via the tunnel token."""
    template = _load_template("agent_linux_tunnel.sh.template")
    safe_name = re.sub(r'[^a-z0-9-]', '-', service_name.lower())[:32]
    script = _substitute(template, {
        "TUNNEL_TOKEN": tunnel_token,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "LOCAL_SERVICE_URL": local_service_url,
        "AGENT_VERSION": agent_version,
    })
    return script.encode("utf-8"), f"driftlock-tunnel-{safe_name}.sh"


def generate_tunnel_powershell_agent(
    tunnel_token: str,
    hostname: str,
    service_name: str,
    local_service_url: str,
    agent_version: str,
) -> tuple[bytes, str]:
    """Generate a PowerShell script that downloads cloudflared and installs it as a service."""
    template = _load_template("agent_windows_tunnel.ps1.template")
    safe_name = re.sub(r'[^a-zA-Z0-9-]', '-', service_name)[:32]
    script = _substitute(template, {
        "TUNNEL_TOKEN": tunnel_token,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "LOCAL_SERVICE_URL": local_service_url,
        "AGENT_VERSION": agent_version,
    })
    return script.encode("utf-8"), f"driftlock-tunnel-{safe_name}.ps1"


# ── Main Entry Point ────────────────────────────────────────────────────────────

def generate_agent(
    platform: Platform,
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int = 300,
    agent_version: str = "1.0.0",
    service_port: Optional[int] = None,
    # Tunnel mode params (mutually exclusive with DDNS mode)
    tunnel_mode: bool = False,
    tunnel_token: Optional[str] = None,
    local_service_url: Optional[str] = None,
) -> tuple[bytes, str, str]:
    """
    Main entry point called by the API router.
    Returns (file_bytes, filename, content_type).

    If tunnel_mode=True, generates a cloudflared installer script instead of
    a DDNS agent. The tunnel_token and local_service_url must be provided.
    """
    if tunnel_mode:
        if not tunnel_token:
            raise ValueError("tunnel_token is required in tunnel_mode")
        if not local_service_url:
            raise ValueError("local_service_url is required in tunnel_mode")

        if platform in ("linux", "raspberry-pi"):
            data, filename = generate_tunnel_linux_agent(
                tunnel_token, hostname, service_name, local_service_url, agent_version
            )
            return data, filename, "text/x-shellscript"

        elif platform in ("windows-ps1", "windows-exe"):
            # Tunnel mode uses PS1 on both — no need for a prebuilt exe
            data, filename = generate_tunnel_powershell_agent(
                tunnel_token, hostname, service_name, local_service_url, agent_version
            )
            return data, filename, "text/plain"

        else:
            raise ValueError(f"Unknown platform for tunnel mode: {platform}")

    # --- Standard DDNS agents ---
    if platform in ("linux", "raspberry-pi"):
        data, filename = generate_linux_agent(
            server_url, api_key, hostname, service_name,
            check_interval, agent_version, service_port, platform
        )
        return data, filename, "text/x-shellscript"

    elif platform == "windows-ps1":
        data, filename = generate_powershell_agent(
            server_url, api_key, hostname, service_name,
            check_interval, agent_version, service_port
        )
        return data, filename, "text/plain"

    elif platform == "windows-exe":
        data, filename = generate_exe_agent(
            server_url, api_key, hostname, service_name,
            check_interval, agent_version
        )
        return data, filename, "application/octet-stream"

    else:
        raise ValueError(f"Unknown platform: {platform}")
