"""
Shared SSRF guard utilities.

Resolves a hostname via getaddrinfo (both A and AAAA records) and raises
ValueError if any returned address is non-global (private, loopback, link-local,
or link-local multicast). Used at webhook registration time and at delivery time.
"""
import ipaddress
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as _FTE


def assert_all_addresses_public(hostname: str, timeout: float = 3.0) -> None:
    """Raise ValueError if hostname resolves to any non-public IP address."""
    if not hostname:
        raise ValueError("Missing hostname")

    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(socket.getaddrinfo, hostname, None)
        try:
            results = future.result(timeout=timeout)
        except socket.gaierror as exc:
            raise ValueError(f"Webhook hostname {hostname!r} could not be resolved: {exc}")
        except _FTE:
            raise ValueError(f"Webhook hostname {hostname!r} DNS resolution timed out")

    for *_, addr in results:
        ip = ipaddress.ip_address(addr[0])
        if not ip.is_global:
            raise ValueError(
                f"Webhook URL {hostname!r} resolves to non-public address {ip} — "
                "delivery to private/loopback/link-local addresses is blocked"
            )
