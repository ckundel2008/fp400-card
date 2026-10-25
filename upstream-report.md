# FP400 upstream report

Checked: 2026-10-23T21:39:25.590653+00:00
Source: https://github.com/RAR/ha-aqara-fp400

Commits since observation baseline: 0
Compare: https://github.com/RAR/ha-aqara-fp400/compare/87d41d8d3ff534d0f92c4021d90a9a39c060333e...87d41d8d3ff534d0f92c4021d90a9a39c060333e

## Reviewed changes in our fork

Local review decisions updated: 2026-10-25. The Checked timestamp above remains the historical GitHub fetch time; the releases, commits and open-PR snapshot below have not been fetched again.

- Upstream v1.1.1 callback fix: adopted in fork v1.2.0 with regression tests.
- Upstream v1.2.0 remove_target: adopted in fork v1.2.0 with confirmation, preview guard and error tests.
- Upstream PR #6 (native activity/human-count refresh): not adopted. The corrected per-attribute subscriptions already receive these values; no additional periodic polling of activity or human count is added. Existing zone/region polling is unchanged.
- New upstream changes still require individual review. Adoption does not imply installation in HA; see PRUEFSTAND.md for live verification.

## Releases

### v1.2.0
https://github.com/RAR/ha-aqara-fp400/releases/tag/v1.2.0
Published: 2026-10-23T14:48:55Z; prerelease: False
- New service `aqara_fp400.remove_target` (device_id, target_id): makes the sensor drop one tracked target, e.g. a ghost from a fan or curtain; a real person is picked up again within seconds. (#8) - Zone card: click a dot on the map to forget that target. - README: how to remove the integration (delete the config entry; deleting just the device is refused while the FP400 is still on the server).

### v1.1.1
https://github.com/RAR/ha-aqara-fp400/releases/tag/v1.1.1
Published: 2026-10-22T18:42:42Z; prerelease: False
### Fixed - Pushed attribute updates were dropped: the handler expected a tuple the Matter client never sends, so it had never run. Tracked people now clear when the room empties, and zone/region/setting changes, activity state and human count refresh immediately instead of waiting for the next poll. Thanks @giunatale (#7).

### v1.1.0
https://github.com/RAR/ha-aqara-fp400/releases/tag/v1.1.0
Published: 2026-10-06T14:34:13Z; prerelease: False
Robustness release, both changes contributed by @dustinreed-info (#2, #3). ## Fixed - Live tracking no longer turns itself off after a Matter server reload or reconnect (the switch restored as off). (#2) - Tracked people are cleared when live tracking is turned off or the device reports an empty room, instead of keeping the last positions forever. (#2) - Pushed region changes show up immediately instead of waiting for the 2-minute poll; a pushed zone list no longer overwrites a write that is still being verified. (#2) - Commands and writes that fail (old Matter server without the vendor clusters, offline device, device rejection) show a readable error instead of "Unknown error". (#3) - A failing location subscription logs one warning instead of one per minute. (#3) ## Changed - Position events (~7/s) only update the tracked-people and per-target x/y sensors; the `targets`, `zones` and `regions` attributes are excluded from the recorder. (#2) - Radar entities follow the Matter node's availability. (#3) - Removing the FP400 from the Matter server removes the radar device; orphaned radar devices can be deleted from the UI. (#3) Requires the OHF Matter Server with matter-js/matterjs-server#1079 for zone commands and the position stream.

### v1.0.0
https://github.com/RAR/ha-aqara-fp400/releases/tag/v1.0.0
Published: 2026-09-21T17:49:03Z; prerelease: False
First release of the Aqara FP400 (Matter) integration for Home Assistant. **What you get** - Detection zones, entry/exit, interference and monitoring regions, readable and editable from Home Assistant - Live positions of tracked people (x/y in cm), activity state, human count and motion events - Install settings (mount mode, side position, height, coordinate reverse, detection direction, proximity level) as entities - Background learning and clear-zones buttons - A Lovelace zone card: paint zones and regions on the sensor's grid, sensor at the top like the Aqara app, tracked people drawn live **Requirements** - Home Assistant 2026.9 or newer with the Matter integration and the FP400 commissioned - A Matter server that knows the FP400 vendor clusters (OHF Matter Server built from matter-js/matterjs-server#1079 until it is released) Verified against firmware 1.1.8.2 and 1.1.9.6.

## Recent commits

- README: point Zigbee users to bobtekkk/aqara-fp400-zone-card — https://github.com/RAR/ha-aqara-fp400/commit/87d41d8d3ff534d0f92c4021d90a9a39c060333e
- Add remove_target service and a Forget action on the card (#8) — https://github.com/RAR/ha-aqara-fp400/commit/3ca4207bd1e133542f8f822c030334412a13b56d
- README: how to remove the integration (#8) — https://github.com/RAR/ha-aqara-fp400/commit/8f82ec9a6e3b9949c229365a3b47d7c41806dbb0
- 1.1.1 — https://github.com/RAR/ha-aqara-fp400/commit/bcd850262fa111142431ea1262562cb2d35d1466
- Subscribe to attribute updates per path; the client passes only the value (#7) — https://github.com/RAR/ha-aqara-fp400/commit/51d08955084f13e86b1d1f6e0362ccfc67351fb2
- README: the add-on can set the vendor ID via matter_server_args (#4) — https://github.com/RAR/ha-aqara-fp400/commit/305bccb79a6288633af98f9b6a62b077a6dab01b
- README: document the fabric vendor-ID gate (#4) — https://github.com/RAR/ha-aqara-fp400/commit/41bb35e546634e51d1d8a4671e388ffc0aa3105f
- 1.1.0 — https://github.com/RAR/ha-aqara-fp400/commit/7d53574e404edb9e4fff592cf8f34332103f50a8
- Merge pull request #3 from dustinreed-info/robustness-availability-errors — https://github.com/RAR/ha-aqara-fp400/commit/dec1df2f2ddfce4d3031ecad8667ddd6e6e35431
- Merge pull request #2 from dustinreed-info/fix-live-tracking-reload — https://github.com/RAR/ha-aqara-fp400/commit/62e4d5ad19c09d635071b58828365203ef87f0a9

## Open pull requests (first 30)

- #6 Refresh FP400 native activity and human-count values — https://github.com/RAR/ha-aqara-fp400/pull/6

Read-only report. No automatic merge, release, HA update or notification message.
GitHub schedules can be delayed; consult the latest successful run timestamp.
