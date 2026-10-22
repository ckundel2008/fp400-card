"""Set up the isolated FP400 controller without changing existing Matter pairings."""

from __future__ import annotations

import asyncio
import contextlib
from typing import Any

from homeassistant.components.matter.helpers import get_matter
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.exceptions import ConfigEntryNotReady
import voluptuous as vol

from .const import DOMAIN, PRODUCT_ID_FP400, VENDOR_ID
from .separate_controller import (
    CONF_CONTROLLER_URL,
    connect_controller,
    original_node_for,
    validate_controller_url,
)

DEFAULT_CONTROLLER_URL = "ws://127.0.0.1:5581/ws"
CONF_USE_SECONDARY_CONTROLLER = "use_secondary_controller"


def _is_fp400(node) -> bool:
    attrs = node.node_data.attributes
    return attrs.get("0/40/2") == VENDOR_ID and attrs.get("0/40/4") == PRODUCT_ID_FP400


async def async_validate_controller(hass, value: str) -> str | None:
    """Read both controllers and accept only the same physical FP400 on each."""
    try:
        url = validate_controller_url(value)
    except (TypeError, ValueError, AttributeError):
        return "invalid_controller_url"
    if not url:
        return None  # Explicit legacy main-controller mode in the options flow only.
    if not hass.config_entries.async_loaded_entries("matter"):
        return "matter_not_loaded"
    originals = [node for node in get_matter(hass).matter_client.get_nodes() if _is_fp400(node)]
    if not originals:
        return "fp400_not_in_matter"
    client = listener = None
    try:
        client, listener = await connect_controller(hass, url)
        nodes = [node for node in client.get_nodes() if _is_fp400(node)]
        if not nodes:
            return "fp400_not_paired"
        matching = [node for node in nodes if original_node_for(node, originals) is not None]
        if not matching:
            return "fp400_mismatch"
        if not any(node.node_data.available for node in matching):
            return "fp400_unavailable"
    except (ConfigEntryNotReady, ConnectionError, OSError, TimeoutError):
        return "cannot_connect"
    finally:
        if listener is not None:
            listener.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await listener
        if client is not None:
            with contextlib.suppress(Exception):
                async with asyncio.timeout(5):
                    await client.disconnect()
    return None


class FP400ConfigFlow(ConfigFlow, domain=DOMAIN):
    """Validate the dedicated controller before creating a single entry."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return FP400OptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Keep the address out of the first-run dialog; the app uses a fixed local port."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if not self.hass.config_entries.async_loaded_entries("matter"):
            return self.async_abort(reason="matter_not_loaded")
        errors = {}
        if user_input is not None:
            error = await async_validate_controller(self.hass, DEFAULT_CONTROLLER_URL)
            if error is None:
                return self.async_create_entry(
                    title="Aqara FP400 – Zusatzcontroller",
                    data={CONF_CONTROLLER_URL: DEFAULT_CONTROLLER_URL},
                )
            errors["base"] = error
        return self.async_show_form(step_id="user", errors=errors)


class FP400OptionsFlow(OptionsFlow):
    """Optionally use the isolated local FP400 controller."""

    async def async_step_init(self, user_input=None):
        errors = {}
        saved_url = self.config_entry.options.get(
            CONF_CONTROLLER_URL, self.config_entry.data.get(CONF_CONTROLLER_URL, DEFAULT_CONTROLLER_URL)
        )
        use_secondary = bool(saved_url)
        if user_input is not None:
            # Retain API compatibility for clients that still submit the old URL field.
            if CONF_USE_SECONDARY_CONTROLLER in user_input:
                use_secondary = user_input[CONF_USE_SECONDARY_CONTROLLER]
                url = DEFAULT_CONTROLLER_URL if use_secondary else ""
            else:
                url = user_input.get(CONF_CONTROLLER_URL, saved_url)
                use_secondary = bool(url)
            error = await async_validate_controller(self.hass, url)
            if error is None:
                return self.async_create_entry(title="", data={CONF_CONTROLLER_URL: url})
            errors["base"] = error
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({vol.Optional(
                CONF_USE_SECONDARY_CONTROLLER, default=use_secondary,
            ): bool}),
            errors=errors,
        )
