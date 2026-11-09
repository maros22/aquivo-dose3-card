# Aquivo Dose 3 Card · 1.5.4

Card-only update 1.5.4 simplifies calibration and adds editable HASS fertilizer labels. Firmware remains 1.5.3; no device update is required. Existing entity IDs and the native device-web link are retained.

## New in 1.5.4

- Measurement is fixed at 4 seconds. Both intermediate calibration buttons say **Save**; the time/flow proposal row is removed. The 4 ml verification and final confirmation are still required.
- Use **Edit name** beneath a pump name. Without the optional Zigbee converter, the label is stored on the HASS server for this device and your HASS user account, so it survives reloads and is shared by the browser and app signed into the same account. It does not change the device-web name. A failed save is shown and is not treated as success.
- When a writable device-name entity is present, the same control edits the actual device name and waits for its confirmation. Device names then take precedence over HASS aliases. The optional converter remains opt-in.

## New in 1.5.3

Time fields use plain text instead of the native macOS time picker. Enter `20:00`, `2000` or `20`; all save as 20:00. Time fields stay within their columns in the macOS app.


- Enabling AUTO catches up today’s missed schedule doses, including after calibration or schedule edits. Earlier days are not replayed. Existing volume and daily limits still apply.
- Today’s dose is shown as the scheduled amount plus a red **+ X ml** for manual doses. The total entity still includes both; calibration and tubing priming are excluded. Missing or unavailable manual-dose sensors fall back to the existing total without guessing.
- Each positive refill amount becomes the new full reference: 500 ml = 500/500 ml (100%); a later 750 ml = 750/750 ml (100%). Zero empties the reservoir and retains its last full reference. Real daily/total dosing and calibration are preserved.
- The calibration tab shows the firmware cooldown and waits for a fresh device acknowledgement. Failures appear next to the controls. Returning to the macOS app or reconnecting does not repeat a command.
- Device names can be edited on the web. Bidirectional HASS name editing is prepared through the optional [Aquivo Zigbee2MQTT converter](./aquivo-dose3.mjs). It requires explicit permission to enable external JavaScript in Zigbee2MQTT; without it, editable HASS labels remain available for the signed-in user.

The two standard cooldown/acknowledgement entities do not need an external converter. After firmware installation refresh the existing Dose 3 interview and reconfigure only that device, keeping it paired.

## Guided calibration

Use SERVICE and collect liquid outside the aquarium. Select the pump, prime the tubing, release a little liquid, and prepare an empty 5 ml measuring cylinder. The measurement runs for a fixed 4 seconds; stop early if the 5 ml cylinder is approaching full. Enter the measured volume, empty the cylinder, then run **4 ml verification**. Wait for automatic stop, enter the actual verification volume, and confirm save only if it is **3.9–4.1 ml (±2.5%)**. A failed check requires another calibration measurement. Stopping verification early invalidates that check.

The firmware enforces the sequence, including completion of the verification run; hiding a button is not the only protection. The previous saved flow remains unchanged until final confirmation. Pending calibration blocks AUTO and manual doses on that channel. Cancel/reboot drops provisional results. Changing tab, pump or language never starts a pump. Calibration liquid is collected outside the aquarium and is excluded from aquarium daily/total dose counters; reservoir use is estimated, so check the actual stock afterward.

Firmware 1.4.0 or newer and the new Zigbee entities are required for the tab controls. Refresh the existing Dose 3 interview/configuration in Zigbee2MQTT after the firmware update; do not remove/re-pair the device. Existing endpoint IDs, device IDs, plans and previous saved calibrations are preserved. On older firmware the tab explains the missing support and keeps calibration controls disabled.

Home Assistant dashboard card for **Aquivo Dose 3**, using existing Zigbee2MQTT entities. Three pump channels, reservoir levels, daily totals, manual dosing, refill and daily/weekday schedules. No external libraries, CDN, account or device password required.

## HACS (custom repository)

1. In HACS open the menu → **Custom repositories**.
2. Add `https://github.com/maros22/aquivo-dose3-card`, category **Dashboard**.
3. Find **Aquivo Dose 3 Card**, download it, then refresh your browser.
4. Add a custom card. Select your device in the visual editor if more than one is present.

If HACS does not register the resource automatically, add `/hacsfiles/aquivo-dose3-card/aquivo-dose3-card.js` as a **JavaScript module** under Settings → Dashboards → Resources. Load exactly one copy: remove the previous manually registered resource when moving to HACS. This repository can be added as a custom repository; inclusion in HACS’s default catalogue is a separate process.

```yaml
type: custom:aquivo-dose3-card
language: auto
# Optional card title:
# name: My aquarium

```

The existing `custom:aquivo-dose3-card` type is retained for compatibility. Keep your current device_id; no new device or dashboard is needed.

## Seven offline languages

Slovenčina (`sk`), Čeština (`cs`), Magyar (`hu`), Polski (`pl`), English (`en`), Deutsch (`de`), Français (`fr`). Default `language: auto` follows Home Assistant. Choose another language in the visual editor or YAML, e.g. `language: de`. Regional variants are accepted; unsupported languages fall back to English.

Language changes preserve your names, inputs, open forms and command targets and send no device commands. Number formatting follows the selected language. Schedule times remain **Europe/Bratislava**, including daylight saving time.

- **SK:** V HACS pridaj tento repozitár ako Dashboard, stiahni Aquivo Dose 3 Card a obnov prehliadač. Jazyk sa preberie z HASS alebo ho vyber v editore.
- **CS:** V HACS přidej tento repozitář jako Dashboard, stáhni Aquivo Dose 3 Card a obnov prohlížeč. Jazyk přebírá HASS nebo ho vyber v editoru.
- **HU:** Add hozzá ezt az adattárat a HACS-hoz Dashboard típussal, töltsd le az Aquivo Dose 3 Card kártyát, majd frissítsd a böngészőt. A nyelv követi a HASS-t, vagy kiválasztható a szerkesztőben.
- **PL:** Dodaj to repozytorium w HACS jako Dashboard, pobierz Aquivo Dose 3 Card i odśwież przeglądarkę. Język pochodzi z HASS lub wybierz go w edytorze.
- **EN:** Add this repository in HACS as Dashboard, download Aquivo Dose 3 Card and refresh your browser. Language follows HASS or can be selected in the editor.
- **DE:** Dieses Repository in HACS als Dashboard hinzufügen, Aquivo Dose 3 Card herunterladen und Browser neu laden. Die Sprache folgt HASS oder wird im Editor gewählt.
- **FR:** Ajoutez ce dépôt dans HACS comme Dashboard, téléchargez Aquivo Dose 3 Card et actualisez le navigateur. La langue suit HASS ou se choisit dans l’éditeur.

## Manual installation / offline

Download `aquivo-dose3-card.js` from the GitHub release and copy it to your Home Assistant `www` directory. Add `/local/aquivo-dose3-card.js?v=1.5.4` as a JavaScript module and refresh the browser. Firmware 1.5.3 contains the earlier card 1.5.3. Install this card-only update through HACS or manually; the device-hosted package changes with a future firmware update. The device also serves an offline ZIP with the card and optional helper integration at `/hass`; in that package the compatible filename is `aquivo-dose3-card.js`, so its resource is `/local/aquivo-dose3-card.js?v=1.5.3`.

The optional helper integration is named **Aquivo Dose 3 · Karta**. Its technical folder remains `custom_components/aquivo_dose3`; it registers the resource automatically and requires a Home Assistant restart. Use one loading method only.

## Operation and compatibility

Pair Dose 3 with Zigbee2MQTT first. The card maps stable channel properties within the selected device, independently of entity names. It does not select an ambiguous entity or control an ATO device. Firmware 1.2.0 or later supports separate weekdays and the automatic DHCP web link; if those entities are already present, no new interview is required for this language update.

SERVICE pauses automatic dosing and stops the running pump. A manual dose requires stopped pumps, verified time, valid calibration, sufficient remaining volume and daily allowance, but does not require the pump’s automatic schedule to be enabled. The card first writes and waits for confirmation of the chosen volume, then sends a single dose command. It never automatically retries a dose. If a result is uncertain, check the actual state and dosed amount before trying again.

Refill sets the **total amount currently in the reservoir** and does not reset daily consumption. Scheduling is edited in SERVICE; each Zigbee write is confirmed. A partial failure may leave some settings changed: reload from the device and inspect them. Saving a schedule does not enable AUTO. Enabling AUTO includes today’s missed scheduled doses, including after plan edits or calibration. Current-day recovery also applies after a power interruption. Past days are never replayed.

Offline values are not presented as current; AUTO is blocked, while SERVICE remains available for a stop attempt. Calibration, hardware output timing, inter-pump pauses and limits are enforced by the firmware. The web link tracks the selected device’s current IP address.

## Validation

The release uses the actual card code in tests for three separate channels, device isolation, entity renaming/ambiguity, offline guards, volume bounds, confirmed writes before dosing, cancellation by SERVICE/device changes, weekday schedules and partial failures. DOM tests cover all seven languages, editor selection, locale fallback, forbidden storage, preserved user data and unsaved forms, with zero real device commands.

## Existing installations

When upgrading from an older card type, change the existing card to `type: custom:aquivo-dose3-card` and keep its `device_id`, pump names and other settings. Keep one Aquivo JavaScript resource. Disable the previous card helper before moving to HACS so it cannot restore a duplicate resource after a restart. The Zigbee device stays paired; do not remove it or delete its entities.

Pri prechode zo staršej karty zmeň typ existujúcej karty na `custom:aquivo-dose3-card`. Zachovaj `device_id`, názvy púmp a ostatné nastavenia. Ponechaj jeden zdroj Aquivo; pred prechodom na HACS vypni pôvodného pomocníka karty. Zigbee zariadenie neodstraňuj a nemaž jeho entity.
