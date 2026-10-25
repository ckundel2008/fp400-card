"""Exercise real persistence logic with an in-memory HA storage boundary."""
import asyncio
from copy import deepcopy
import importlib
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, Mock


def module(name, **attrs):
    obj = types.ModuleType(name)
    obj.__dict__.update(attrs)
    sys.modules[name] = obj
    return obj


class Store:
    saved = None
    fail = False

    def __init__(self, *args):
        pass

    async def async_load(self):
        return deepcopy(Store.saved)

    async def async_save(self, value):
        await asyncio.sleep(0)
        if Store.fail:
            raise OSError("storage unavailable")
        Store.saved = deepcopy(value)


for name in ("homeassistant", "homeassistant.helpers"):
    module(name)
module("homeassistant.exceptions", HomeAssistantError=RuntimeError)
module("homeassistant.helpers.storage", Store=Store)
module("homeassistant.helpers.device_registry", async_get=lambda hass: hass.registry)
module("homeassistant.helpers.entity_registry", async_get=lambda hass: hass,
       async_entries_for_device=lambda hass, device_id: [entry for entry in hass.entities if entry.device_id == device_id])
pkg = module("fp400_names_test")
pkg.__path__ = [str(Path(__file__).resolve().parents[1] / "custom_components/aqara_fp400")]
ZoneNames = importlib.import_module("fp400_names_test.zone_names").ZoneNames
const = importlib.import_module("fp400_names_test.const")


class ZoneNamesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        Store.saved = None
        Store.fail = False
        self.hass = types.SimpleNamespace(registry=types.SimpleNamespace(
            async_get_device_by_identifier=Mock(side_effect=lambda identifier, config_entry_id: types.SimpleNamespace(id=identifier[1]))),
            entities=[], states={}, auth=types.SimpleNamespace(async_get_user=AsyncMock(return_value=types.SimpleNamespace(is_admin=True, is_active=True))))
        def update_entity(entity_id, **kwargs):
            entry = next(entry for entry in self.hass.entities if entry.entity_id == entity_id)
            for key, value in kwargs.items():
                setattr(entry, key, value)
            return entry
        self.hass.async_update_entity = Mock(side_effect=update_entity)
        self.names = ZoneNames(self.hass)
        await self.names.async_load()

    def node(self, ident="device-a"):
        return types.SimpleNamespace(own_identifier=("aqara_fp400", ident),
            config_entry_id="fp-entry", matter_config_entry_id="matter-entry",
            device_identifier=("matter", f"deviceid_fabric-{ident}-MatterNodeDevice"),
            node=types.SimpleNamespace(available=True, node_data=types.SimpleNamespace(attributes={
                f"2/{const.CLUSTER_RADAR}/{const.ATTR_ZONE_ID}": 1,
                f"3/{const.CLUSTER_RADAR}/{const.ATTR_ZONE_ID}": 2,
            })), zones_pending=False, zones_error=None,
            zones=[types.SimpleNamespace(zone_id=1), types.SimpleNamespace(zone_id=2)], _notify=Mock())

    def legacy_name(self, fp, endpoint=2, name="Altes Sofa"):
        entry = types.SimpleNamespace(device_id=fp.device_identifier[1], platform="matter", domain="binary_sensor",
            config_entry_id="matter-entry", entity_id=f"binary_sensor.zone_{endpoint}", original_name="Occupancy",
            unique_id=f"{fp.device_identifier[1][len('deviceid_'):]}-{endpoint}-OccupancySensor-1030-0", name=name)
        self.hass.entities.append(entry)
        return entry

    async def test_exact_old_ha_zone_name_import_without_changing_registry(self):
        a = self.node()
        entry = self.legacy_name(a)
        await self.names.async_confirm(a, a.zones)
        self.assertEqual(self.names.for_node(a), {"1": "Altes Sofa"})
        self.assertEqual(entry.name, "Altes Sofa")
        restored = ZoneNames(self.hass)
        await restored.async_load()
        self.assertEqual(restored.for_node(a), {"1": "Altes Sofa"})
        self.hass.registry.async_get_device_by_identifier.assert_any_call(a.device_identifier, 'matter-entry')

    async def test_rename_is_opt_in_admin_only_and_preserves_all_entity_ids(self):
        a = self.node()
        entry = self.legacy_name(a)
        await self.names.async_set(a, 1, "Nur Karte")
        self.hass.async_update_entity.assert_not_called()
        before = (entry.entity_id, entry.unique_id, entry.device_id, entry.config_entry_id)
        await self.names.async_set(a, 1, "  Beide  ", rename_entity=True,
            expected_entity_id=entry.entity_id, expected_entity_name=entry.name, user_id="admin")
        self.assertEqual(entry.name, "Beide")
        self.assertEqual((entry.entity_id, entry.unique_id, entry.device_id, entry.config_entry_id), before)
        self.hass.async_update_entity.assert_called_once_with(entry.entity_id, name="Beide")
        self.assertEqual(self.names.entity_names(a)["1"], {"entity_id":entry.entity_id,"name":"Beide","display_name":"Beide"})

    async def test_rename_rejects_nonadmin_missing_context_conflicts_and_empty_name(self):
        a = self.node()
        entry = self.legacy_name(a)
        for variation in ("no_user", "nonadmin", "inactive", "changed_name", "changed_id", "missing_expected", "empty"):
            kwargs = dict(rename_entity=True, expected_entity_id=entry.entity_id, expected_entity_name=entry.name, user_id="admin")
            self.hass.auth.async_get_user.return_value = types.SimpleNamespace(is_admin=variation != "nonadmin", is_active=variation != "inactive")
            if variation == "no_user": kwargs['user_id'] = None
            if variation == "changed_name": kwargs['expected_entity_name'] = 'different'
            if variation == "changed_id": kwargs['expected_entity_id'] = 'binary_sensor.other'
            if variation == "missing_expected": kwargs.pop('expected_entity_name')
            with self.assertRaises(RuntimeError, msg=variation):
                await self.names.async_set(a, 1, "" if variation == "empty" else "Sofa", **kwargs)
        self.assertIsNone(Store.saved)
        self.hass.async_update_entity.assert_not_called()

    async def test_missing_wrong_config_entry_or_ambiguous_entity_only_blocks_entity_rename(self):
        for mode in ('missing', 'wrong_entry', 'ambiguous'):
            self.hass.entities = []
            a = self.node(mode)
            if mode != 'missing':
                entry = self.legacy_name(a)
                if mode == 'wrong_entry': entry.config_entry_id = 'wrong-config-entry'
                else: self.legacy_name(a)
            await self.names.async_set(a, 1, 'Local')
            with self.assertRaises(RuntimeError):
                await self.names.async_set(a, 1, 'Both', rename_entity=True, user_id='admin',
                    expected_entity_id='binary_sensor.zone_2', expected_entity_name='Altes Sofa')
            self.assertEqual(self.names.for_node(a), {'1':'Local'})

    async def test_entity_failure_reports_local_save_honestly(self):
        a = self.node()
        entry = self.legacy_name(a, name=None)
        self.hass.async_update_entity.side_effect = ValueError('registry rejected update')
        with self.assertRaisesRegex(RuntimeError, 'Zone name saved, but the HA entity name was not changed'):
            await self.names.async_set(a, 1, 'Sofa', rename_entity=True, user_id='admin',
                expected_entity_id=entry.entity_id, expected_entity_name=None)
        self.assertEqual(self.names.for_node(a), {'1':'Sofa'})
        self.assertIsNone(entry.name)

    async def test_conflict_during_local_save_never_overwrites_concurrent_entity_change(self):
        a = self.node()
        entry = self.legacy_name(a)
        original_save = self.names.store.async_save
        async def raced_save(value):
            await original_save(value)
            entry.name = 'Changed elsewhere'
        self.names.store.async_save = raced_save
        with self.assertRaisesRegex(RuntimeError, 'Zone name saved, but the HA entity name was not changed'):
            await self.names.async_set(a, 1, 'Sofa', rename_entity=True, user_id='admin',
                expected_entity_id=entry.entity_id, expected_entity_name='Altes Sofa')
        self.assertEqual(entry.name, 'Changed elsewhere')
        self.assertEqual(self.names.for_node(a), {'1':'Sofa'})
        self.hass.async_update_entity.assert_not_called()

    async def test_missing_scoped_device_never_falls_back_to_another_config_entry(self):
        a = self.node()
        self.legacy_name(a)
        self.hass.registry.async_get_device_by_identifier.side_effect = lambda identifier, config_entry_id: None
        self.assertEqual(self.names.entity_names(a), {})
        with self.assertRaises(RuntimeError):
            await self.names.async_set(a, 1, 'Sofa')
        self.assertIsNone(Store.saved)

    async def test_local_storage_failure_leaves_entity_name_unchanged(self):
        a = self.node()
        entry = self.legacy_name(a)
        Store.fail = True
        with self.assertRaises(OSError):
            await self.names.async_set(a, 1, 'Sofa', rename_entity=True, user_id='admin',
                expected_entity_id=entry.entity_id, expected_entity_name=entry.name)
        self.assertEqual(entry.name, 'Altes Sofa')
        self.hass.async_update_entity.assert_not_called()

    async def test_never_overwrite_explicit_names_or_reimport_reset_and_deleted_ids(self):
        a = self.node()
        self.legacy_name(a)
        await self.names.async_set(a, 1, "Neuer Name")
        await self.names.async_confirm(a, a.zones)
        self.assertEqual(self.names.for_node(a), {"1": "Neuer Name"})
        await self.names.async_set(a, 1, "")
        await self.names.async_confirm(a, a.zones)
        self.assertEqual(self.names.for_node(a), {})
        await self.names.async_set(a, 1, "Noch ein Name")
        await self.names.async_confirm(a, [])
        await self.names.async_confirm(a, a.zones)
        self.assertEqual(self.names.for_node(a), {})

    async def test_missing_ambiguous_generated_or_other_device_names_are_not_guessed(self):
        for invalid in ("other_device", "wrong_unique_id", "duplicate_entity", "duplicate_zone", "generated", "too_long"):
            self.hass.entities = []
            a = self.node()
            entry = self.legacy_name(a)
            if invalid == "other_device":
                entry.device_id = "another device"
            elif invalid == "wrong_unique_id":
                entry.unique_id = "binary_sensor.zone_1"
            elif invalid == "duplicate_entity":
                self.legacy_name(a)
            elif invalid == "duplicate_zone":
                a.node.node_data.attributes[f"4/{const.CLUSTER_RADAR}/{const.ATTR_ZONE_ID}"] = 1
            elif invalid == "generated":
                entry.name = None
                entry.original_name = "Occupancy 2"
            elif invalid == "too_long":
                entry.name = "x" * 81
            await self.names.async_confirm(a, a.zones)
            self.assertEqual(self.names.for_node(a), {}, invalid)

    async def test_late_registry_name_can_import_on_next_confirmed_poll(self):
        a = self.node()
        await self.names.async_confirm(a, a.zones)
        self.legacy_name(a)
        await self.names.async_confirm(a, a.zones)
        self.assertEqual(self.names.for_node(a), {"1": "Altes Sofa"})

    async def test_multiple_devices_concurrent_saves_and_restart(self):
        a, b = self.node(), self.node("device-b")
        await asyncio.gather(self.names.async_set(a, 1, " Sofa "), self.names.async_set(b, 1, "Küche"))
        restored = ZoneNames(self.hass)
        await restored.async_load()
        self.assertEqual(restored.for_node(a), {"1": "Sofa"})
        self.assertEqual(restored.for_node(b), {"1": "Küche"})
        a._notify.assert_called_once()
        b._notify.assert_called_once()

    async def test_empty_resets_and_special_characters_remain_plain_data(self):
        a = self.node()
        await self.names.async_set(a, 1, '<img src="x"> Ä')
        self.assertEqual(self.names.for_node(a)["1"], '<img src="x"> Ä')
        await self.names.async_set(a, 1, "  ")
        self.assertEqual(self.names.for_node(a), {})

    async def test_invalid_unknown_pending_and_unavailable_do_not_save(self):
        a = self.node()
        for zone_id, name in ((3, "missing"), (1, "x" * 81)):
            with self.assertRaises(RuntimeError):
                await self.names.async_set(a, zone_id, name)
        a.zones_pending = True
        with self.assertRaises(RuntimeError):
            await self.names.async_set(a, 1, "pending")
        a.zones_pending = False
        a.node.available = False
        with self.assertRaises(RuntimeError):
            await self.names.async_set(a, 1, "offline")
        self.assertIsNone(Store.saved)

    async def test_confirmed_deletion_removes_name_before_id_reuse(self):
        a = self.node()
        await self.names.async_set(a, 1, "Sofa")
        await self.names.async_set(a, 2, "Table")
        await self.names.async_confirm(a, [a.zones[1]])
        self.assertEqual(self.names.for_node(a), {"2": "Table"})
        await self.names.async_confirm(a, a.zones)
        self.assertNotIn("1", self.names.for_node(a))

    async def test_offline_pending_and_missing_cached_zones_keep_names(self):
        a = self.node()
        await self.names.async_set(a, 1, "Sofa")
        a.zones = []  # A transient cache miss is not an explicit read confirmation.
        self.assertEqual(self.names.for_node(a), {"1": "Sofa"})
        a.node.available = False
        await self.names.async_confirm(a, [])
        a.node.available = True
        a.zones_pending = True
        await self.names.async_confirm(a, [])
        self.assertEqual(self.names.for_node(a), {"1": "Sofa"})

    async def test_failed_save_does_not_publish_unsaved_change(self):
        a = self.node()
        await self.names.async_set(a, 1, "Sofa")
        Store.fail = True
        with self.assertRaises(OSError):
            await self.names.async_set(a, 1, "Kitchen")
        self.assertEqual(self.names.for_node(a), {"1": "Sofa"})
        a._notify.assert_called_once()


if __name__ == "__main__":
    unittest.main()
