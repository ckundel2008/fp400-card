"""Run the real node logic with stubbed HA framework and Matter transport."""
import asyncio
import importlib
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock
from datetime import datetime, timezone


def module(name, **attrs):
    result = types.ModuleType(name)
    result.__dict__.update(attrs)
    sys.modules[name] = result
    return result


for name in ('homeassistant', 'homeassistant.components', 'homeassistant.components.matter',
             'homeassistant.helpers', 'homeassistant.util', 'matter_server',
             'matter_server.client', 'matter_server.client.models', 'matter_server.common'):
    module(name)
module('homeassistant.components.matter.helpers', get_node_device_identifier=lambda *a: ('matter', '1'))
module('homeassistant.core', HomeAssistant=object, callback=lambda f: f)
module('homeassistant.exceptions', HomeAssistantError=RuntimeError)
module('homeassistant.helpers.device_registry', DeviceInfo=dict)
module('homeassistant.util.dt', utcnow=lambda: datetime.now(timezone.utc))
module('matter_server.client.models.node', MatterNode=object)
events = types.SimpleNamespace(NODE_EVENT='node_event', ATTRIBUTE_UPDATED='attribute_updated', NODE_UPDATED='node_updated')
module('matter_server.common.models', APICommand=types.SimpleNamespace(DEVICE_COMMAND='device_command'), EventType=events, MatterNodeEvent=object)
pkg = module('fp400_test')
pkg.__path__ = [str(Path(__file__).resolve().parents[1] / 'custom_components/aqara_fp400')]
n = importlib.import_module('fp400_test.node')
c = importlib.import_module('fp400_test.const')


class NodeUpdates(unittest.IsolatedAsyncioTestCase):
    def node(self):
        cache = {'1/%s/%s' % (c.CLUSTER_RADAR, c.ATTR_HUMAN_COUNT): 1}
        transport = Mock()
        obj = n.FP400Node(Mock(), types.SimpleNamespace(node_id=4, available=True, node_data=types.SimpleNamespace(attributes=cache)), transport)
        obj._notify = Mock()
        obj._notify_targets = Mock()
        return obj

    async def test_real_subscriptions_receive_scalar_values(self):
        obj = self.node()
        obj._refresh_zones = Mock(); obj._refresh_regions = Mock()
        obj._async_initial_zones = AsyncMock(); obj._zone_poll_loop = AsyncMock()
        tasks = []
        obj.hass.async_create_background_task = lambda coro, name: tasks.append(asyncio.create_task(coro)) or tasks[-1]
        await obj.async_start()
        subscriptions = [call.kwargs for call in obj.matter_client.subscribe_events.call_args_list if call.kwargs['event_filter'] == events.ATTRIBUTE_UPDATED]
        self.assertEqual(len(subscriptions), len(c.WATCHED_ATTRIBUTES))
        self.assertTrue(all(s['node_filter'] == 4 for s in subscriptions))
        obj.targets = [types.SimpleNamespace(target_id=1)]
        path = f'1/{c.CLUSTER_RADAR}/{c.ATTR_HUMAN_COUNT}'
        obj.node.node_data.attributes[path] = 0
        next(s for s in subscriptions if s['attr_path_filter'] == path)['callback'](events.ATTRIBUTE_UPDATED, 0)
        self.assertEqual(obj.targets, [])
        obj._notify.assert_called()
        await asyncio.gather(*tasks)

    async def test_zone_and_region_pending_writes_are_preserved(self):
        obj = self.node(); obj._refresh_zones = Mock()
        obj.zones_pending = True
        obj._handle_attribute_updated(c.CLUSTER_CONFIG, c.ATTR_ZONES)
        obj._refresh_zones.assert_not_called()
        obj.zones_pending = False
        obj._handle_attribute_updated(c.CLUSTER_CONFIG, c.ATTR_ZONES)
        obj._refresh_zones.assert_called_once()
        key, attr = next(iter(c.REGIONS.items()))
        obj.regions[key] = [[1, 2]]; obj.regions_pending[key] = True
        obj._handle_attribute_updated(c.CLUSTER_CONFIG, attr)
        self.assertEqual(obj.regions[key], [[1, 2]])
        obj.regions_pending[key] = False
        obj._handle_attribute_updated(c.CLUSTER_CONFIG, attr)
        self.assertEqual(obj.regions[key], [])

    async def test_callback_error_does_not_break_connection(self):
        obj = self.node(); obj._handle_attribute_updated = Mock(side_effect=ValueError('bad payload'))
        with self.assertLogs(c.LOGGER, level='ERROR'):
            obj._on_attribute_updated(c.CLUSTER_CONFIG, c.ATTR_ZONES, events.ATTRIBUTE_UPDATED, None)

    async def test_remove_success_updates_only_selected_target(self):
        obj = self.node(); obj._command = AsyncMock(return_value={'status': 0})
        obj.targets = [types.SimpleNamespace(target_id=x) for x in [1, 2]]
        await obj.async_remove_target(1)
        obj._command.assert_awaited_once_with(c.CLUSTER_LOCATION, 'RemoveDetectionTarget', {'targetId': 1})
        self.assertEqual([t.target_id for t in obj.targets], [2])
        obj._notify_targets.assert_called_once()

    async def test_remove_rejection_or_timeout_preserves_targets(self):
        for result in ({'status': 4}, TimeoutError('offline')):
            obj = self.node(); obj.targets = [types.SimpleNamespace(target_id=1)]
            obj._command = AsyncMock(**({'side_effect': result} if isinstance(result, Exception) else {'return_value': result}))
            with self.assertRaises(Exception): await obj.async_remove_target(1)
            self.assertEqual(len(obj.targets), 1)
            obj._notify_targets.assert_not_called()

    async def test_invalid_target_never_sent(self):
        for target in (-1, 256, True, '1'):
            obj = self.node(); obj._command = AsyncMock()
            with self.assertRaises(RuntimeError): await obj.async_remove_target(target)
            obj._command.assert_not_called()


if __name__ == '__main__': unittest.main()
