"""Resolve devices within their owning config entry, without ambiguous fallback."""
from homeassistant.helpers import device_registry as dr


def node_device(hass, fp, *, matter=False):
    """Use HA 2026.9+ identifier/config-entry lookup, never the deprecated first match."""
    entry_id = fp.matter_config_entry_id if matter else fp.config_entry_id
    if not entry_id:
        return None
    identifier = fp.device_identifier if matter else fp.own_identifier
    return dr.async_get(hass).async_get_device_by_identifier(identifier, entry_id)
