import os
import re
import uuid
from pathlib import Path
from typing import Literal

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "agent-builder" / "templates"
DIST_DIR = Path(os.getenv("AGENT_BUILD_DIR", str(Path(__file__).parent.parent.parent / "agent-builder" / "dist")))

Platform = Literal["linux", "raspberry-pi", "windows-ps1", "windows-exe"]

def _load_template(filename: str) -> str:
    path = TEMPLATES_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {filename}")
    return path.read_text(encoding="utf-8")

def _substitute(template: str, tokens: dict) -> str:
    for key, value in tokens.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    # Warn about any unreplaced tokens
    remaining = re.findall(r'\{\{[A-Z_]+\}\}', template)
    if remaining:
        # Filter out the special padded tokens for python agent
        remaining = [t for t in remaining if "_CHARS" not in t]
        if remaining:
            raise ValueError(f"Unreplaced tokens in template: {remaining}")
    return template

def generate_linux_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
    platform: str = "linux"
) -> tuple[bytes, str]:
    """Returns (file_bytes, suggested_filename)"""
    template = _load_template("agent_linux.sh.template")
    # Sanitize service_name for use in filenames and systemd unit names
    safe_name = re.sub(r'[^a-z0-9-]', '-', service_name.lower())[:32]
    script = _substitute(template, {
        "SERVER_URL": server_url.rstrip("/"),
        "API_KEY": api_key,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "CHECK_INTERVAL": str(check_interval),
        "AGENT_VERSION": agent_version,
        "PLATFORM": platform,
    })
    filename = f"driftlock-agent-{safe_name}.sh"
    return script.encode("utf-8"), filename

def generate_powershell_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
) -> tuple[bytes, str]:
    """Returns (file_bytes, suggested_filename)"""
    template = _load_template("agent_windows.ps1.template")
    safe_name = re.sub(r'[^a-zA-Z0-9-]', '-', service_name)[:32]
    script = _substitute(template, {
        "SERVER_URL": server_url.rstrip("/"),
        "API_KEY": api_key,
        "HOSTNAME": hostname,
        "SERVICE_NAME": safe_name,
        "CHECK_INTERVAL": str(check_interval),
        "AGENT_VERSION": agent_version,
    })
    filename = f"driftlock-agent-{safe_name}.ps1"
    return script.encode("utf-8"), filename

def generate_exe_agent(
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int,
    agent_version: str,
) -> tuple[bytes, str]:
    """
    Patches the pre-compiled .exe binary by replacing known placeholder 
    strings with actual values.
    """
    exe_path = DIST_DIR / "driftlock-agent.exe"
    if not exe_path.exists():
        # Fallback error for local dev if they haven't built the exe
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
    
    # Patch each placeholder (must match exactly what's in agent-builder/Dockerfile)
    SERVER_PLACEHOLDER  = "DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DRIFTLOCK_PLACEHOLDER_SERVER_URL_DR"
    APIKEY_PLACEHOLDER  = "DRIFTLOCK_PLACEHOLDER_API_KEY_DRIFTLOCK_PLACEHOLDER_API_KEY_DRIFT"
    HOST_PLACEHOLDER    = "DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLOCK_PLACEHOLDER_HOSTNAME_DRIFTLO"
    SVCNAME_PLACEHOLDER = "DRIFTLOCK_PLACEHOLDER_SERVICE_NAME_DRIFTLOCK_PLACEHOLDER_SERVIC"
    
    exe_bytes = patch_bytes(exe_bytes, SERVER_PLACEHOLDER,  server_url.rstrip("/"), 200)
    exe_bytes = patch_bytes(exe_bytes, APIKEY_PLACEHOLDER,  api_key, 64)
    exe_bytes = patch_bytes(exe_bytes, HOST_PLACEHOLDER,    hostname, 100)
    exe_bytes = patch_bytes(exe_bytes, SVCNAME_PLACEHOLDER, safe_name, 64)
    
    # Patch check interval (6-char zero-padded number)
    interval_placeholder = b"000300"
    interval_value = str(check_interval).zfill(6).encode("utf-8")
    idx = bytes(exe_bytes).find(interval_placeholder)
    if idx != -1:
        exe_bytes[idx:idx+6] = interval_value
    
    filename = f"driftlock-agent-{safe_name}.exe"
    return bytes(exe_bytes), filename


def generate_agent(
    platform: Platform,
    server_url: str,
    api_key: str,
    hostname: str,
    service_name: str,
    check_interval: int = 300,
    agent_version: str = "1.0.0",
) -> tuple[bytes, str, str]:
    """
    Main entry point called by the API router.
    Returns (file_bytes, filename, content_type)
    """
    if platform in ("linux", "raspberry-pi"):
        data, filename = generate_linux_agent(
            server_url, api_key, hostname, service_name, 
            check_interval, agent_version, platform
        )
        return data, filename, "text/x-shellscript"
    
    elif platform == "windows-ps1":
        data, filename = generate_powershell_agent(
            server_url, api_key, hostname, service_name,
            check_interval, agent_version
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
