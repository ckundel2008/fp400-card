"""Connect to a local secondary controller without moving the HA Matter fabric."""

from __future__ import annotations

import asyncio
import contextlib
from urllib.parse import urlsplit

from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later
from matter_server.client import MatterClient

CONF_CONTROLLER_URL = "controller_url"


def schedule_reload(hass, entry_id):
    """Keep the reconnect callback on HA's event loop, never its executor."""
    @callback
    def reload_controller(_):
        hass.config_entries.async_schedule_reload(entry_id)

    return async_call_later(hass, 5, reload_controller)


def validate_controller_url(value: str) -> str:
    """Only accept the dedicated local controller; never send home data elsewhere."""
    if value == "":
        return value
    parsed = urlsplit(value)
    if (
        parsed.scheme != "ws"
        or parsed.hostname != "127.0.0.1"
        or parsed.port != 5581
        or parsed.path != "/ws"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("Use ws://127.0.0.1:5581/ws or leave empty")
    return value


def original_node_for(node, original_nodes):
    """Match a secondary node to exactly one original node by device serial number."""
    serial = node.node_data.attributes.get("0/40/15")
    if not isinstance(serial, str) or not serial.strip():
        return None
    matches = [
        original for original in original_nodes
        if original.node_data.attributes.get("0/40/15") == serial
        and original.node_data.attributes.get("0/40/2") == node.node_data.attributes.get("0/40/2")
        and original.node_data.attributes.get("0/40/4") == node.node_data.attributes.get("0/40/4")
    ]
    return matches[0] if len(matches) == 1 else None


async def connect_controller(hass, url):
    """Create an owned listener, with bounded startup and cleanup on every failure."""
    client = MatterClient(validate_controller_url(url), async_get_clientsession(hass))
    listener = None
    ready_task = None
    try:
        async with asyncio.timeout(15):
            await client.connect()
            ready = asyncio.Event()
            listener = hass.async_create_background_task(client.start_listening(ready), "FP400 controller")
            ready_task = asyncio.create_task(ready.wait())
            done, _ = await asyncio.wait((ready_task, listener), return_when=asyncio.FIRST_COMPLETED)
            if listener in done:
                await listener
                raise ConnectionError("FP400 controller closed before initialization")
            return client, listener
    except (Exception, asyncio.CancelledError) as err:
        if listener is not None:
            listener.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await listener
        with contextlib.suppress(Exception):
            await client.disconnect()
        if isinstance(err, asyncio.CancelledError):
            raise
        raise ConfigEntryNotReady("The separate FP400 controller is not ready") from err
    finally:
        if ready_task is not None:
            ready_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await ready_task
