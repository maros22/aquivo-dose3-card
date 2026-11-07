# Aquivo Dose 3 Card · 1.3.1

Home Assistant dashboard card for **Aquivo Dose 3**, using existing Zigbee2MQTT entities. Three pump channels, reservoir levels, daily totals, manual dosing, refill and daily/weekday schedules. No external libraries, CDN, account or device password required.

## HACS (custom repository)

1. In HACS open the menu → **Custom repositories**.
2. Add `https://github.com/maros22/aquivo-dose3-card`, category **Dashboard**.
3. Find **Aquivo Dose 3 Card**, download it, then refresh your browser.
4. Add a custom card. Select your device in the visual editor if more than one is present.

If HACS does not register the resource automatically, add `/hacsfiles/aquivo-dose3-card/aquivo-dose3-card.js` as a **JavaScript module** under Settings → Dashboards → Resources. Load exactly one copy: remove the previous manually registered resource when moving to HACS. This repository can be added as a custom repository; inclusion in HACS’s default catalogue is a separate process.

```yaml
type: custom:net4u-fert3-card
language: auto
# Optional custom names, preserved verbatim in every language:
# name: My aquarium
# pump_names: [Macro, Micro, Potassium]
```

The existing `custom:net4u-fert3-card` type is retained for compatibility. Keep your current device_id and custom names; no new device or dashboard is needed.

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

Download `aquivo-dose3-card.js` from the GitHub release and copy it to your Home Assistant `www` directory. Add `/local/aquivo-dose3-card.js?v=1.3.1` as a JavaScript module and refresh the browser. The device also serves an offline ZIP with the card and optional helper integration at `/hass`; in that package the compatible filename is `net4u-fert3-card.js`, so its resource is `/local/net4u-fert3-card.js?v=1.3.1`.

The optional helper integration is named **Aquivo Dose 3 · Karta**. Its technical folder remains `custom_components/net4u_fert3`; it registers the resource automatically and requires a Home Assistant restart. Use one loading method only.

## Operation and compatibility

Pair Dose 3 with Zigbee2MQTT first. The card maps stable channel properties within the selected device, independently of entity names. It does not select an ambiguous entity or control an ATO device. Firmware 1.2.0 or later supports separate weekdays and the automatic DHCP web link; if those entities are already present, no new interview is required for this language update.

SERVICE pauses automatic dosing and stops the running pump. A manual dose requires stopped pumps, verified time, valid calibration, sufficient remaining volume and daily allowance, but does not require the pump’s automatic schedule to be enabled. The card first writes and waits for confirmation of the chosen volume, then sends a single dose command. It never automatically retries a dose. If a result is uncertain, check the actual state and dosed amount before trying again.

Refill sets the **total amount currently in the reservoir** and does not reset daily consumption. Scheduling is edited in SERVICE; each Zigbee write is confirmed. A partial failure may leave some settings changed: reload from the device and inspect them. Saving a schedule does not enable AUTO. When enabled later, AUTO may catch up today’s missed doses within configured limits, only on a selected day; it does not catch up past days.

Offline values are not presented as current; AUTO is blocked, while SERVICE remains available for a stop attempt. Calibration, hardware output timing, inter-pump pauses and limits are enforced by the firmware. The web link tracks the selected device’s current IP address.

## Validation

The release uses the actual card code in tests for three separate channels, device isolation, entity renaming/ambiguity, offline guards, volume bounds, confirmed writes before dosing, cancellation by SERVICE/device changes, weekday schedules and partial failures. DOM tests cover all seven languages, editor selection, locale fallback, forbidden storage, preserved user data and unsaved forms, with zero real device commands.
