"""Exercise first-run/options behavior without a live Home Assistant or Matter device.

Only framework services are stubbed; the actual flow, URL restriction and physical
device matching code are imported from the distributable integration.
"""

import asyncio
import importlib
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch


def stub(name):
    module = types.ModuleType(name)
    sys.modules[name] = module
    return module


for name in (
    "homeassistant", "homeassistant.components", "homeassistant.components.matter",
    "homeassistant.helpers", "matter_server",
):
    stub(name)


class NotReady(Exception):
    pass


stub("homeassistant.exceptions").ConfigEntryNotReady = NotReady
stub("homeassistant.core").callback = lambda callback: callback
stub("homeassistant.components.matter.helpers").get_matter = lambda hass: hass.matter
stub("homeassistant.helpers.aiohttp_client").async_get_clientsession = lambda hass: object()
stub("homeassistant.helpers.event").async_call_later = lambda *args: None
stub("matter_server.client").MatterClient = object


class Flow:
    def __init_subclass__(cls, **kwargs):
        pass

    def _async_current_entries(self):
        return getattr(self, "entries", [])

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}


entries_module = stub("homeassistant.config_entries")
entries_module.ConfigFlow = Flow
entries_module.OptionsFlow = Flow
entries_module.ConfigFlowResult = dict


class OptionalKey:
    def __init__(self, key, default=None):
        self.key = key
        self.default = default


vol = stub("voluptuous")
vol.Schema = lambda schema: schema
vol.Optional = OptionalKey

package = stub("aqara_fp400")
package.__path__ = [str(Path(__file__).resolve().parents[1] / "custom_components/aqara_fp400")]
module = importlib.import_module("aqara_fp400.config_flow")


def node(node_id, serial="FP400-SERIAL", vendor=module.VENDOR_ID, product=module.PRODUCT_ID_FP400, available=True):
    return types.SimpleNamespace(node_id=node_id, node_data=types.SimpleNamespace(available=available, attributes={
        "0/40/15": serial, "0/40/2": vendor, "0/40/4": product,
    }))


class ReadOnlyClient:
    """There is deliberately no write/commission/remove API in the fake client."""

    def __init__(self, nodes):
        self.nodes = nodes
        self.disconnected = False

    def get_nodes(self):
        return self.nodes

    async def disconnect(self):
        self.disconnected = True


class FlowTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = types.SimpleNamespace(
            config_entries=types.SimpleNamespace(async_loaded_entries=lambda domain: [object()]),
            matter=types.SimpleNamespace(matter_client=ReadOnlyClient([node(32)])),
        )
        self.flow = module.FP400ConfigFlow()
        self.flow.hass = self.hass

    async def connection(self, nodes):
        client = ReadOnlyClient(nodes)
        listener = asyncio.create_task(asyncio.Event().wait())
        return client, listener

    async def test_initial_dialog_has_no_technical_address_field_or_connection_side_effect(self):
        with patch.object(module, "connect_controller", new_callable=AsyncMock) as connect:
            result = await self.flow.async_step_user()
        self.assertEqual(result["type"], "form")
        self.assertEqual(result["errors"], {})
        self.assertNotIn("data_schema", result)
        connect.assert_not_called()

    async def test_success_uses_secondary_controller_and_releases_probe_connection(self):
        client, listener = await self.connection([node(1)])
        with patch.object(module, "connect_controller", new_callable=AsyncMock,
                          return_value=(client, listener)) as connect:
            result = await self.flow.async_step_user({})
        self.assertEqual(result["type"], "create_entry")
        self.assertEqual(result["data"], {"controller_url": module.DEFAULT_CONTROLLER_URL})
        connect.assert_awaited_once_with(self.hass, module.DEFAULT_CONTROLLER_URL)
        self.assertTrue(client.disconnected)
        self.assertTrue(listener.cancelled())

    async def test_existing_entry_is_not_duplicated(self):
        self.flow.entries = [object()]
        result = await self.flow.async_step_user({})
        self.assertEqual(result["reason"], "single_instance_allowed")

    async def test_missing_main_matter_aborts_without_creating_entry(self):
        self.hass.config_entries.async_loaded_entries = lambda _: []
        result = await self.flow.async_step_user({})
        self.assertEqual(result["reason"], "matter_not_loaded")

    async def test_main_controller_without_fp400_gives_actionable_error(self):
        self.hass.matter.matter_client.nodes = [node(32, vendor=123)]
        with patch.object(module, "connect_controller", new_callable=AsyncMock) as connect:
            result = await self.flow.async_step_user({})
        self.assertEqual(result["errors"], {"base": "fp400_not_in_matter"})
        connect.assert_not_called()

    async def test_unreachable_secondary_controller_keeps_dialog_open(self):
        with patch.object(module, "connect_controller", new_callable=AsyncMock,
                          side_effect=NotReady("not started")):
            result = await self.flow.async_step_user({})
        self.assertEqual(result["errors"], {"base": "cannot_connect"})
        self.assertEqual(result["type"], "form")

    async def test_no_secondary_fp400_requires_pairing_and_cleans_up(self):
        for nodes in ([], [node(1, vendor=123)], [node(1, product=123)]):
            client, listener = await self.connection(nodes)
            with patch.object(module, "connect_controller", new_callable=AsyncMock,
                              return_value=(client, listener)):
                result = await self.flow.async_step_user({})
            self.assertEqual(result["errors"], {"base": "fp400_not_paired"})
            self.assertTrue(client.disconnected)
            self.assertTrue(listener.cancelled())

    async def test_wrong_serial_or_ambiguous_original_never_accepts(self):
        for nodes, originals in (
            ([node(1, serial="OTHER")], [node(32)]),
            ([node(1, serial="")], [node(32, serial="")]),
            ([node(1)], [node(32), node(33)]),
        ):
            self.hass.matter.matter_client.nodes = originals
            client, listener = await self.connection(nodes)
            with patch.object(module, "connect_controller", new_callable=AsyncMock,
                              return_value=(client, listener)):
                result = await self.flow.async_step_user({})
            self.assertEqual(result["errors"], {"base": "fp400_mismatch"})
            self.assertTrue(client.disconnected)

    async def test_physical_identity_requires_vendor_and_product_as_well_as_serial(self):
        for original in (node(32, vendor=123), node(32, product=123)):
            self.assertIsNone(module.original_node_for(node(1), [original]))

    async def test_stored_offline_pairing_does_not_count_as_successful_setup(self):
        client, listener = await self.connection([node(1, available=False)])
        with patch.object(module, "connect_controller", new_callable=AsyncMock,
                          return_value=(client, listener)):
            result = await self.flow.async_step_user({})
        self.assertEqual(result["errors"], {"base": "fp400_unavailable"})
        self.assertEqual(result["type"], "form")
        self.assertTrue(client.disconnected)

    async def test_cancelled_validation_releases_probe(self):
        client = ReadOnlyClient([])
        listener = asyncio.create_task(asyncio.Event().wait())
        entered = asyncio.Event()

        def get_nodes():
            entered.set()
            raise asyncio.CancelledError

        client.get_nodes = get_nodes
        with patch.object(module, "connect_controller", new_callable=AsyncMock,
                          return_value=(client, listener)):
            with self.assertRaises(asyncio.CancelledError):
                await module.async_validate_controller(self.hass, module.DEFAULT_CONTROLLER_URL)
        self.assertTrue(client.disconnected)
        self.assertTrue(listener.cancelled())

    async def test_options_blank_keeps_legacy_mode_without_probing(self):
        flow = module.FP400OptionsFlow()
        flow.hass = self.hass
        flow.config_entry = types.SimpleNamespace(data={}, options={})
        with patch.object(module, "connect_controller", new_callable=AsyncMock) as connect:
            result = await flow.async_step_init({"controller_url": ""})
        self.assertEqual(result["data"], {"controller_url": ""})
        connect.assert_not_called()

    async def test_options_default_reads_new_data_and_old_options(self):
        for data, options, expected in (
            ({"controller_url": module.DEFAULT_CONTROLLER_URL}, {}, True),
            ({"controller_url": module.DEFAULT_CONTROLLER_URL}, {"controller_url": ""}, False),
            ({}, {"controller_url": module.DEFAULT_CONTROLLER_URL}, True),
            ({}, {}, True),
        ):
            flow = module.FP400OptionsFlow()
            flow.hass = self.hass
            flow.config_entry = types.SimpleNamespace(data=data, options=options)
            result = await flow.async_step_init()
            key = next(iter(result["data_schema"]))
            self.assertEqual(key.key, "use_secondary_controller")
            self.assertEqual(key.default, expected)

    async def test_invalid_legacy_api_addresses_never_connect(self):
        for value in ("ws://example.com:5581/ws", "ws://127.0.0.1:5580/ws",
                      "ws://127.0.0.1:5581/ws?token=secret"):
            flow = module.FP400OptionsFlow()
            flow.hass = self.hass
            flow.config_entry = types.SimpleNamespace(data={}, options={})
            with patch.object(module, "connect_controller", new_callable=AsyncMock) as connect:
                result = await flow.async_step_init({"controller_url": value})
            self.assertEqual(result["errors"], {"base": "invalid_controller_url"})
            self.assertTrue(next(iter(result["data_schema"])).default)
            connect.assert_not_called()

    async def test_options_checkbox_off_explicitly_persists_blank_legacy_mode(self):
        flow = module.FP400OptionsFlow()
        flow.hass = self.hass
        flow.config_entry = types.SimpleNamespace(data={}, options={})
        with patch.object(module, "connect_controller", new_callable=AsyncMock) as connect:
            result = await flow.async_step_init({"use_secondary_controller": False})
        self.assertEqual(result["data"], {"controller_url": ""})
        connect.assert_not_called()

    async def test_options_checkbox_on_validates_and_persists_fixed_local_url(self):
        flow = module.FP400OptionsFlow()
        flow.hass = self.hass
        flow.config_entry = types.SimpleNamespace(data={}, options={"controller_url": ""})
        client, listener = await self.connection([node(1)])
        with patch.object(module, "connect_controller", new_callable=AsyncMock,
                          return_value=(client, listener)):
            result = await flow.async_step_init({"use_secondary_controller": True})
        self.assertEqual(result["data"], {"controller_url": module.DEFAULT_CONTROLLER_URL})
        self.assertTrue(client.disconnected)


if __name__ == "__main__":
    unittest.main()
