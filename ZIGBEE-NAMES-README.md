# Aquivo Dose 3 – Zigbee2MQTT 1.5.3

Firmware 1.5.3 adds device-stored fertilizer names and calibration command feedback. The existing 64 Zigbee properties, endpoints and Home Assistant unique IDs stay unchanged. Names travel over Zigbee even if the dispenser's Wi-Fi is unavailable. Web edits use the same saved device configuration.

The converter matches only `AQUIVO-DOSE3-ZB`. It does not change ATO, Homey, broker credentials, network keys, pairing or device history. Its text metadata cluster cannot start a pump. Firmware 1.5.3 reports cooldown and compact calibration acknowledgements through two additional standard Analog Input clusters on existing endpoints, so these features work without installing this converter. Existing dosing commands keep their normal firmware protections.

## Install

1. Back up the Zigbee2MQTT configuration and device database.
2. Use firmware 1.5.3 or newer. Keep Dose 3 in SERVICE during the update.
3. Zigbee2MQTT 2.11+ disables external JavaScript by default. To use this reviewed converter, explicitly allow `enable_external_js: true` at the top level of `configuration.yaml`. This is a global setting: files in the external converters directory can run as Zigbee2MQTT. Only install converters you trust.
4. Put `aquivo-dose3.mjs` in the Zigbee2MQTT data directory's `external_converters/` folder. On the Home Assistant add-on this is normally `/config/zigbee2mqtt/external_converters/` (also exposed as `/homeassistant/zigbee2mqtt/external_converters/` in Terminal).
5. Restart Zigbee2MQTT. Do not delete or re-pair the device. Reconfigure only Dose 3 if necessary.
6. Confirm the three new `text` entities `p1_name`, `p2_name`, `p3_name` and the `cooldown_remaining_s` sensor in Home Assistant. Card 1.5.3 discovers them by the selected device and unique IDs.
7. Edit a name using **Edit name** on the card or **Save name** on the dispenser's web interface. The other interface follows the device's confirmed value. Names allow 1–48 UTF-8 bytes (accented characters may use several bytes).

The converter reports errors and waits for acknowledged writes. It does not automatically retry physical commands. During a pump cooldown, the card disables prime/measurement/verification until the device reports zero seconds. Press the desired button yourself afterwards.

## Verified compatibility

Offline checks use the official `zigbee-herdsman-converters` 26.125.0 package shipped with Zigbee2MQTT 2.14.3. All 64 existing exposed property names, access types, endpoint names and units match the original generated definition. New text/feedback parsing, UTF-8 limits and rejected writes are covered by tests. Live verification is recorded separately after installation.

## Roll back the converter

Restore the backed-up converter/configuration and restart Zigbee2MQTT. Keep the device paired. Old card versions and the original 64 entities remain usable. Do not restore an old flash image without first backing up current device configuration and reviewing dosing counters.

Firmware 1.5.3 also adds the standard `analog_input_10`, `analog_input_30` and `analog_input_50` manual-dose counters without requiring this converter. Enabling AUTO restores original current-day catch-up after calibration and schedule edits.
