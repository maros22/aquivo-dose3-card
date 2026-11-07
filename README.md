# Aquivo Dose 3 Card

Karta pre trojpumpový dávkovač Aquivo Dose 3 a Home Assistant. Verzia 1.2.0. Komunikácia cez Zigbee2MQTT; odkaz na web zariadenia sleduje jeho aktuálnu DHCP adresu.

## Inštalácia cez HACS

1. Otvor HACS → menu → Vlastné repozitáre.
2. Pridaj `https://github.com/maros22/aquivo-dose3-card`, kategória **Dashboard**.
3. Vyhľadaj **Aquivo Dose 3 Card**, stiahni a obnov prehliadač.
4. Pridaj kartu do dashboardu podľa konfigurácie nižšie.

Ak zdroj nevznikne automaticky, v Nastavenia → Ovládacie panely → Zdroje pridaj `/hacsfiles/aquivo-dose3-card/aquivo-dose3-card.js` ako Modul JavaScriptu. Pri prechode z ručnej inštalácie odstráň starý zdroj tejto karty zo zoznamu zdrojov, aby sa nenačítala dvakrát. Existujúcu kartu v dashboarde môžeš zachovať.

```yaml
type: custom:net4u-fert3-card
name: Hnojenie
pump_names:
  - Makro
  - Mikro
  - Draslík
```

Pri jednej Dose 3 sa zariadenie vyberie automaticky. Pri viacerých ho vyber v editore. Dávkovač musí byť spárovaný so Zigbee2MQTT a jeho entity dostupné v HASS.

## Ručná inštalácia

Stiahni `aquivo-dose3-card.js`, skopíruj do `/config/www/` a pridaj `/local/aquivo-dose3-card.js?v=1.2.0` ako Modul JavaScriptu. Použi iba jeden spôsob načítania karty. Kompletný ZIP s lokálnym návodom je vo vydaniach a na webe dávkovača v sekcii Karta pre Home Assistant.

## Aktualizácie

HACS spravuje aktualizácie karty. Firmvér zariadenia sa aktualizuje samostatne na jeho webe: https://github.com/maros22/aquivo-dose3-updates . GitHub kľúč výrobcu zákazník nepotrebuje.

Karta zobrazuje potvrdené stavy zariadenia; zmenu považuje za vykonanú až po hlásení zo Zigbee. Inštalácia karty nespúšťa pumpy ani nemení kalibrácie.
