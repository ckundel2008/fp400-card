"""Persistent, HA-local names; never writes names to the Matter sensor."""

from __future__ import annotations

import asyncio
from copy import deepcopy

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import ATTR_ZONE_ID, CLUSTER_RADAR, DOMAIN, SENSOR_ENDPOINT
from .device_lookup import node_device

_UNSET = object()


def zone_entities(hass, fp, zones):
    """Read user-assigned HA names only with an exact Matter occupancy identity.

    HA's matter/helpers.py get_entity_unique_id uses the complete device identifier,
    endpoint, description key and primary attribute. Never infer zones from names,
    entity_id suffixes, endpoint ordering or generated original_name values.
    """
    identifier = fp.device_identifier
    if identifier[0] != "matter" or not identifier[1].startswith("deviceid_"):
        return {}
    device = node_device(hass, fp, matter=True)
    if device is None:
        return {}
    endpoints = {}
    for path, value in fp.node.node_data.attributes.items():
        try:
            endpoint, cluster, attribute = (int(part) for part in path.split("/"))
            if cluster == CLUSTER_RADAR and attribute == ATTR_ZONE_ID and endpoint != SENSOR_ENDPOINT:
                endpoints.setdefault(int(value), []).append(endpoint)
        except (ValueError, TypeError):
            continue
    entries = er.async_entries_for_device(er.async_get(hass), device.id)
    result = {}
    for zone in zones:
        mapped = endpoints.get(zone.zone_id, [])
        if len(mapped) != 1:
            continue
        unique_id = f"{identifier[1][len('deviceid_'):]}-{mapped[0]}-OccupancySensor-1030-0"
        matching = [entry for entry in entries if entry.platform == "matter"
                    and entry.config_entry_id == fp.matter_config_entry_id
                    and entry.domain == "binary_sensor" and entry.unique_id == unique_id]
        if len(matching) != 1:
            continue
        result[str(zone.zone_id)] = matching[0]
    return result


def existing_zone_names(hass, fp, zones):
    return {key: entry.name.strip() for key, entry in zone_entities(hass, fp, zones).items()
            if isinstance(entry.name, str) and entry.name.strip() and len(entry.name.strip()) <= 80}


class ZoneNames:
    """Serialize saves and publish only successfully persisted changes."""

    def __init__(self, hass):
        self.hass = hass
        self.store = Store(hass, 1, f"{DOMAIN}.zone_names")
        self.names: dict[str, dict[str, str]] = {}
        self.lock = asyncio.Lock()

    async def async_load(self):
        self.names = (await self.store.async_load()) or {}

    def device_id(self, fp):
        device = node_device(self.hass, fp)
        return device.id if device else None

    def for_node(self, fp):
        # Empty values are intentional reset/deletion tombstones, not display names.
        return {key: name for key, name in self.names.get(self.device_id(fp), {}).items() if name}

    def entity_names(self, fp):
        result = {}
        for key, entry in zone_entities(self.hass, fp, fp.zones).items():
            state = self.hass.states.get(entry.entity_id)
            result[key] = {"entity_id": entry.entity_id, "name": entry.name,
                           "display_name": state.attributes.get("friendly_name", entry.name or entry.original_name or entry.entity_id)
                           if state else entry.name or entry.original_name or entry.entity_id}
        return result

    def _rename_entry(self, fp, zone_id, expected_entity_id, expected_entity_name):
        entry = zone_entities(self.hass, fp, fp.zones).get(str(zone_id))
        if entry is None:
            raise HomeAssistantError("No unambiguous Matter occupancy entity exists for this zone")
        if entry.entity_id != expected_entity_id or entry.name != expected_entity_name:
            raise HomeAssistantError("The entity or its name changed. Reload the preview and try again")
        return entry

    async def async_set(self, fp, zone_id, name, *, rename_entity=False,
                        expected_entity_id=_UNSET, expected_entity_name=_UNSET, user_id=None):
        name = name.strip()
        if len(name) > 80:
            raise HomeAssistantError("Zone names must contain at most 80 characters")
        if rename_entity:
            user = await self.hass.auth.async_get_user(user_id) if user_id else None
            if user is None or not user.is_admin or not user.is_active:
                raise HomeAssistantError("Only an authenticated administrator can rename the HA entity")
            if not name:
                raise HomeAssistantError("An entity rename requires a nonempty name; reset the zone name without renaming the entity")
            if expected_entity_id is _UNSET or expected_entity_name is _UNSET:
                raise HomeAssistantError("Review the entity name preview before renaming")
        async with self.lock:
            device_id = self.device_id(fp)
            if not device_id or not fp.node.available or fp.zones_pending or fp.zones_error:
                raise HomeAssistantError("Wait until the FP400 zone list is available and confirmed")
            if zone_id not in {zone.zone_id for zone in fp.zones}:
                raise HomeAssistantError("This zone does not exist on the FP400")
            if rename_entity:
                self._rename_entry(fp, zone_id, expected_entity_id, expected_entity_name)
            updated = deepcopy(self.names)
            names = updated.setdefault(device_id, {})
            names[str(zone_id)] = name
            await self.store.async_save(updated)
            self.names = updated
            fp._notify()
            if rename_entity:
                try:
                    entry = self._rename_entry(fp, zone_id, expected_entity_id, expected_entity_name)
                    # Change only the display name. Entity ID, unique ID and device are immutable here.
                    er.async_get(self.hass).async_update_entity(entry.entity_id, name=name)
                except Exception as err:
                    raise HomeAssistantError(
                        f"Zone name saved, but the HA entity name was not changed: {err}"
                    ) from err
                fp._notify()

    async def async_confirm(self, fp, zones):
        """Remove names only after a successful explicit device read, never cache loss."""
        async with self.lock:
            device_id = self.device_id(fp)
            if not device_id or not fp.node.available or fp.zones_pending:
                return
            current = self.names.get(device_id, {})
            active = {str(z.zone_id) for z in zones}
            retained = {key: value if key in active else "" for key, value in current.items()}
            for key, value in existing_zone_names(self.hass, fp, zones).items():
                if key not in retained:
                    retained[key] = value
            if retained == current:
                return
            updated = deepcopy(self.names)
            updated[device_id] = retained
            await self.store.async_save(updated)
            self.names = updated
            fp._notify()
