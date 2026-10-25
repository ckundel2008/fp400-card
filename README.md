# fp400-card

**Aqara FP400: Zonenkarte und Live-Positionen in Home Assistant – mit zusätzlichem Controller und Einrichtungsdialog. Bestehende Matter-Geräte bleiben auf ihrem bisherigen Server.**

Ein experimenteller Fork von [RAR/ha-aqara-fp400](https://github.com/RAR/ha-aqara-fp400). Kein offizielles Aqara-, Home-Assistant- oder HACS-Produkt.

> **Teststand:** Auf HA OS 18.3 / Core 2026.10.2 (amd64) mit echtem FP400 1.2.0.0 zusätzlich gekoppelt. Vier Zonen, zwei Bereiche, frische Leermeldungen und Wiederverbindung nach App-Neustart geprüft. **Sitztest bestanden:** Eine tatsächlich sitzende Person wird mit Live-Position, Zustand „still“ und passender Sofa-Belegung erkannt. Alle 16 vorhandenen Matter-Geräteregister-IDs und 23 Radar-Entitäts-IDs blieben erhalten. **Gangtest bestanden laut Nutzerbestätigung vom 23.10.2026.** ARM64 und eine reale Anlage mit 32 Geräten wurden nicht getestet. [Vollständiger Prüfstand](PRUEFSTAND.md).

## Vorschau

**Neu in 1.4.0:** Grundrisskarte mit mehreren FP400, Bild-Upload, Kalibrierung und Spiegelung. Die bisherige Radar-Karte bietet einen einstellbaren Raumausschnitt und eine freie Sensorposition. Beide Karten stehen nach demselben Update unter „Karte hinzufügen“ bereit. [Grundriss einrichten](docs/grundriss.md) · [Raumausschnitt und Montagebeispiele](docs/radar-raumausschnitt.md).

### Echte Radar-Karte

![Echte Home-Assistant-Radarkarte: vier Zonen und eine tatsächlich sitzende Person mit aktiver Live-Position](docs/images/04-radar-sitztest-echt.jpg)

*Aufnahme aus dem echten HA-Betrieb mit FP400: eine Person, Zustand „still“, Live-Tracking eingeschaltet. Keine simulierten Personenpositionen.*

### Echte Personenerkennung und Sofa-Belegung

![Echte HA-Zustände: Live-Positionen eingeschaltet, eine Person und Sofa als belegt erkannt](docs/images/05-sofa-belegung-echt.jpg)

*Die Bilder stammen aus dem bestandenen Sitztest. Den später abgeschlossenen Gangtest bestätigte der Nutzer am 23.10.2026; die Bilder zeigen weiterhin den Sitztest. Die Ausschnitte enthalten keine HA-Adresse, Zugangsdaten oder persönlichen Profilangaben.*

## Bedienupdate 1.3.0

- Live-Ansicht als Standard: auf dem Handy scrollen, ohne Zellen zu zeichnen.
- **Bereiche bearbeiten** aktiviert Änderungen an Zonen, Ein-/Ausgängen, Monitoring und Interferenzflächen. Entwürfe werden bewusst gespeichert oder verworfen.
- **Zonen benennen:** Namen wie „Sofa“ zentral für alle unsere Karten speichern. HA-Anzeigenamen bleiben standardmäßig erhalten; Administratoren können sie pro Speicherung ausdrücklich mitändern. Entitäts-IDs bleiben unverändert.
- **Geistererkennung auswählen:** deutliche Markierung mit Kennung, Position und Zonen vor dem Verwerfen.
- **Kartendrehung:** im visuellen Editor oder mit `map_rotation` von −180° bis 180° drehen. Das verändert nur die Darstellung.
- **Störfläche vorbereiten:** **Stelle als Interferenz markieren** erstellt einen Entwurf um eine aktuelle Erkennung. Erst **Speichern** überträgt ihn an den Sensor.
- **Aktualität erkennen:** fehlende oder veraltete Positionsmeldungen werden von ausgeschaltetem Live-Tracking und einer unterbrochenen Verbindung unterschieden.
- **Controller-App:** **Übersicht** zeigt Kopplungs- und Versionsstand; **Einrichtung** enthält die bewusst auszuführenden Installationsschritte. Neuere Integrationsdateien werden nicht durch eine ältere mitgelieferte Version ersetzt.

Die [Bedienanleitung](ANLEITUNG.md#zonen-und-bereiche-bewusst-bearbeiten-ab-130) beschreibt die Schritte. Version 1.4.0 enthält Integration 1.4.0 / App 0.2.1; Downloads stehen unter [Releases](https://github.com/ckundel2008/fp400-card/releases). Der [Prüfstand](PRUEFSTAND.md) trennt neue Prüfungen von historischen Hardwaretests. Die Bilder oben zeigen den historischen Sitztest, nicht die Grundrisskarte.

## Was das Projekt macht

Die Integration liefert eine interaktive Zonenkarte, Radar-Sensoren und Einstellungen. Für die herstellerspezifischen Zusatzfunktionen läuft eine eigene HA-App **FP400 Controller** mit einem lokalen Matter-Controller. Ausschließlich der bereits in HA vorhandene FP400 wird zusätzlich verbunden. Er wird anhand von Seriennummer, Hersteller und Produkt seinem bestehenden HA-Gerät zugeordnet.

Der bisherige Matter-Server wird nicht ersetzt oder umkonfiguriert. Die zusätzliche App hat eigene gespeicherte Kopplungsdaten; es werden keine bisherigen Geräte oder Fabrics entfernt. Der Controller muss für die Zusatzfunktionen weiterlaufen.

## Voraussetzungen

- Home Assistant OS, Core 2026.9+, 64 Bit (amd64 oder ARM64; letzteres noch ohne Hardwaretest).
- FP400 direkt über die bestehende HA-Matter-Integration vorhanden und erreichbar.
- HA und FP400 können sich lokal erreichen. Der Browser darf aus der Ferne über Nabu Casa zugreifen; die Erkennung läuft auf HA zu Hause.
- Vollständige abgeschlossene Sicherung einschließlich bestehendem Matter-Server; bei externem Server dessen Daten separat sichern.

## Empfohlene Installation über den HA-App-Store

Für den kompletten Einrichtungsdialog ist HACS nicht erforderlich:

### Schritt 1: Bestehendes HA sichern

Öffne **Einstellungen → System → Backups** und erstelle eine vollständige Sicherung einschließlich deines bisherigen Matter-Servers. Warte auf den Abschluss. Läuft der Server außerhalb von HA, sichere seine Daten zusätzlich dort. Prüfe, dass dein FP400 schon in HA über Matter erreichbar ist.

### Schritt 2: App-Quelle hinzufügen und installieren

1. **Einstellungen → Apps → App-Store → Menü → Repositorys** öffnen.
2. `https://github.com/ckundel2008/fp400-card` hinzufügen und die Store-Seite neu laden.
3. Unter **FP400 Card & Controller** die App **FP400 Controller** installieren. Der lokale Build kann mehrere Minuten dauern.

### Schritt 3: Einrichtungsdialog öffnen

Aktiviere **Beim Systemstart starten**, starte die App und wähle **Benutzeroberfläche öffnen**. Lass den Schutzmodus eingeschaltet. Öffne **Einrichtung** und bestätige deine abgeschlossene Sicherung. Bei einer bereits gespeicherten Kopplung zeigt die App zunächst **Übersicht**; ein vorübergehend nicht erreichbarer FP400 muss nicht neu gekoppelt werden.

### Schritt 4: FP400-Integration vorbereiten

Installiere die Integration bevorzugt über HACS. Alternativ wähle unter **Einrichtung → Mitgelieferte Integration installieren**. Eine ersetzte FP400-Version wird vorher gesichert; neuere oder nicht sicher vergleichbare Versionen werden nicht überschrieben. Ist die mitgelieferte Ausgabe bereits installiert, ist kein erneutes Installieren nötig. Starte nach einer Installation **Home Assistant einmal neu** und öffne die App wieder. Der bestehende Matter-Server bleibt eingerichtet.

### Schritt 5: Nur den FP400 zusätzlich verbinden

1. Öffne **Einstellungen → Geräte & Dienste → Matter → deinen FP400**.
2. Wähle **Gerät teilen** beziehungsweise **Mit anderem Ökosystem verbinden**.
3. Kopiere den frisch erzeugten Freigabecode in den Assistenten und bestätige, dass er zu deinem FP400 gehört.
4. Klicke **FP400 zusätzlich verbinden** und warte auf die Bestätigung.

**Keinen Code vom Aufkleber verwenden, keinen Werksreset durchführen, keine bestehenden Geräte entfernen und den bisherigen Matter-Server nicht umstellen.**

### Schritt 6: Integration in HA aktivieren

Öffne **Einstellungen → Geräte & Dienste → Integration hinzufügen**, suche **Aqara FP400 (Zusatzcontroller)** und bestätige den Dialog. Eine Serveradresse musst du nicht eingeben.

**Bereits ein FP400-Integrationseintrag vorhanden?** Öffne dessen **Konfigurieren**-Dialog, aktiviere **Zusätzlichen FP400-Controller verwenden (empfohlen)** und speichere. Keinen zweiten Eintrag anlegen und das bestehende Matter-Gerät behalten.

### Schritt 7: Karte und Live-Positionen prüfen

Öffne das Radar-Gerät und schalte **Live-Positionen** ein. Füge die Karte wie unter [Karte anzeigen](#karte-anzeigen) beschrieben hinzu. Bewege dich vor dem Sensor: Die Personenanzahl und Positionen sollen sich verändern. Bei Fernzugriff muss dafür jemand zu Hause sein.

Prüfe anschließend einige deiner bisherigen Matter-Geräte und eine bestehende Automation. Sichere den fertigen Zustand **einschließlich FP400 Controller**. Die App bleibt für die Zusatzfunktionen eingeschaltet.

Wenn HA beim Hinzufügen der Repository-Adresse einen Fehler wie `required key not provided ... repository` meldet, den ZIP-Weg unten verwenden. Diese Meldung trat im getesteten HA-Dialog auf; über die Supervisor-Schnittstelle wurde dieselbe Quelle akzeptiert und die App korrekt im Katalog erkannt. Dafür müssen keine bestehenden Matter-Einstellungen geändert werden.

**Schon die lokale App aus dem ZIP installiert?** Für ein Kartenupdate diese weiterverwenden. Die Repository-App hat einen anderen internen Namen und eigene Kopplungsdaten. Nicht beide gleichzeitig starten (Port 5581), die lokale App nicht einfach deinstallieren. Für einen späteren Wechsel gibt es die [Export-/Import-Anleitung](ANLEITUNG.md#wechsel-der-lokalen-app-zur-github-app-ab-017).

## Optional: Integration mit HACS verwalten

**Spätere Updates:** HACS kann veröffentlichte Versionen dieses Repositorys als Update anbieten; die Installation bestätigst du selbst. Für Vorabversionen muss deren Anzeige aktiviert sein. ZIP-Installation und Controller-App haben eigene Updatewege. Die [Update-Anleitung](ANLEITUNG.md#update-einer-bestehenden-installation) erklärt die Schritte ohne erneutes Koppeln.

Das Repository ist für **HACS → Benutzerdefinierte Repositories → Typ Integration** aufgebaut. Die Karte wird mit dieser Integration geliefert; nicht zusätzlich als Dashboard-Repository eintragen. Die Controller-App wird weiterhin über den HA-App-Store installiert: HACS installiert keine HA-Apps.

1. HACS öffnen, oben im Menü **Benutzerdefinierte Repositories** wählen.
2. `https://github.com/ckundel2008/fp400-card` eintragen, Typ **Integration** auswählen und hinzufügen.
3. **FP400 Card & Controller** herunterladen. Danach HA neu starten.
4. Controller-App wie oben einrichten; danach den vorhandenen FP400-Eintrag konfigurieren bzw. den Erstinstallationsdialog abschließen.

**Wechsel vom Original RAR:** Beide Projekte verwenden bewusst die Domain `aqara_fp400`, damit Geräte- und Entitäts-IDs erhalten bleiben. Sie dürfen denselben Ordner nicht parallel aktualisieren. Zuerst HA sichern und diese Fork-Quelle in HACS hinzufügen. Den ursprünglichen Download in HACS deinstallieren, unmittelbar anschließend diese Fork herunterladen und erst danach HA neu starten. **Den bestehenden Eintrag unter Geräte & Dienste und das Matter-Gerät nicht löschen.** Kann HACS die neue Quelle nicht anbieten, den bisherigen Stand beibehalten und die Paketinstallation verwenden. Automatische Updates des Originalprojekts dürfen die Fork nicht überschreiben.

Die Aufnahme in den allgemeinen HACS-Katalog wurde mit [Antrag #12425](https://github.com/hacs/default/pull/12425) eingereicht. Sie ist noch nicht angenommen; bis dahin erfolgt die Installation als benutzerdefinierte Quelle. [Offizielle Anforderungen](https://www.hacs.xyz/docs/publish/integration/), [benutzerdefinierte Quellen](https://www.hacs.xyz/docs/faq/custom_repositories/).

**Zusätzlich geprüft:** Das echte HA akzeptiert die Quelle als benutzerdefinierte HACS-Integration und erkennt die Controller-App im App-Katalog. Der Release-Workflow prüft Paketbau, Regressionstests, HACS und Hassfest vor der Veröffentlichung. Der Projektinhaber bestätigt außerdem einen erfolgreichen Praxistest einer Vorgängerausgabe bei einem Kollegen. Einzelheiten und Grenzen stehen im [Prüfstand](PRUEFSTAND.md).

## Karte anzeigen

Ab Version **1.1.4**: **Dashboard bearbeiten → Karte hinzufügen → Nach Karte**, nach **FP400** suchen und **FP400 Radar – Zonen und Personen** auswählen. Im visuellen Editor **Zonen**, **Verfolgte Personen** und **Bereiche** auswählen; Titel und Sensorausrichtung sind ebenfalls einstellbar. Nach Auswahl der Zonen werden eindeutig zugehörige Personen- und Bereiche-Sensoren desselben Geräts vorausgewählt. Bei mehreren FP400 zuerst das gewünschte Gerät anhand seiner Zonen wählen. Die Vorschau schreibt keine Änderungen an den Sensor.

Nach dem Integrationsupdate HA neu starten und die Browserseite vollständig neu laden, damit die neue Kartenressource geladen wird. Für eine bestehende ZIP-/App-Installation siehe den Updatehinweis in der [Anleitung](ANLEITUNG.md#update-einer-bestehenden-installation). Falls die Karte fehlt, prüfen, ob die FP400-Integration eingerichtet und ihre Kartenressource geladen ist. Bei YAML-Ressourcenverwaltung muss die Ressource manuell eingetragen werden.

Die [sieben Einrichtungsschritte](ANLEITUNG.md#9-zonen-und-live-positionen-anzeigen) führen vom Dashboard bis **Speichern → Fertig**. Bei „Visueller Editor wird nicht unterstützt“ hilft die [Update- und Cache-Prüfung](ANLEITUNG.md#wenn-etwas-nicht-klappt). Ein Update erfordert kein erneutes Anlernen deiner Matter-Geräte.

Alternativ **Manuell** auswählen und YAML verwenden:

```yaml
type: custom:aqara-fp400-zone-card
entity: sensor.DEINE_FP400_RADAR_ZONES
targets_entity: sensor.DEINE_VERFOLGTE_PERSONEN_ENTITAET
regions_entity: sensor.DEINE_BEREICHE_ENTITAET
title: FP400
sensor_at: top
```

Alle drei Platzhalter durch die vollständigen Entitäts-IDs desselben FP400-Radar-Geräts ersetzen. Unter **Einstellungen → Geräte & Dienste → Entitäten** die jeweilige Entität öffnen und in ihren Einstellungen die **Entitäts-ID** mit dem Kopiersymbol kopieren. Dafür keine Entitäts-IDs ändern und keine Entitäten neu anlegen. Die optionale Anzeigenamensänderung beim Benennen einer Zone ändert keine ID.

| Karten-Eintrag | Entität (Deutsch / Englisch) | Liefert |
| --- | --- | --- |
| `entity` | Zonen / Zones | Zonenkarte; erforderlich |
| `targets_entity` | Verfolgte Personen / Tracked people | Personenpositionen und Live-Tracking-Zustand |
| `regions_entity` | Bereiche / Regions | Entry/Exit, Monitoring und Interference gemeinsam |

Ab 1.1.4 erkennt die Karte zugehörige Sensoren anhand ihrer Attribute und der HA-Gerätezuordnung, unabhängig von deutschen oder umbenannten IDs. Bei mehrdeutiger Zuordnung die drei Entitäten ausdrücklich auswählen. „Personenanzahl“ ist kein Ersatz für „Verfolgte Personen“. Die aktuelle Karte unterscheidet fehlende Positionsmeldungen, ausgeschaltetes Live-Tracking, veraltete Daten und eine unterbrochene Verbindung. In älteren Versionen erwartet die automatische Zuordnung englische Endungen; dort alle drei IDs ausdrücklich in YAML angeben.

Für Entry/Exit, Monitoring und Interference gibt es keine separaten YAML-Einträge. Bleiben sie nach korrekter Zuordnung leer, unter **Entwicklerwerkzeuge → Zustände** bei der Bereiche-Entität das Attribut `regions` prüfen. `title` setzt den Kartentitel; `sensor_at` erlaubt `top` oder `bottom`. `map_rotation` dreht die Darstellung um −180 bis 180 Grad, ohne Sensorflächen zu verändern. Positive Winkel drehen im Uhrzeigersinn; der Standard ist 0°.

Beim Benennen einer Zone ist **Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)** standardmäßig aus. Nur Administratoren können diese Option für eine eindeutig zugeordnete Entität aktivieren und die Vorschau bestätigen. Namen in Aqara oder Apple werden nicht geändert.

Die Integration registriert die Kartenressource automatisch. Bei „Custom element doesn't exist“ den Browser vollständig neu laden. Nach einem vollständigen HA-Neustart den Schalter **Live-Positionen** prüfen und bei Bedarf einschalten.

## ZIP für die manuelle Installation

Das Paket 1.4.0 enthält die aktuelle Schritt-für-Schritt-Anleitung, die Grundriss- und Ausschnittanleitung, den Prüfstand und beide echten Bilder des historischen Sitztests. Diese Bilder sind keine Grundriss- oder Mehrsensor-Abnahme.

[Zuletzt veröffentlichtes Startpaket herunterladen](https://github.com/ckundel2008/fp400-card/releases/latest/download/FP400-Startpaket.zip) · [Schritt-für-Schritt-Anleitung](ANLEITUNG.md) · [Alle Downloads und Versionsstände](https://github.com/ckundel2008/fp400-card/releases)

Das Startpaket 1.4.0 bündelt FP400 Controller 0.2.1 und Integration 1.4.0. Die Versionsnummer steht auf der Release-Seite. App-Slug, Ports und Kopplungsdaten bleiben unverändert.

Dieser alternative Ablauf nutzt File editor und Terminal & SSH, prüft die ZIP-Prüfsumme und legt eine lokale App an. Das ist dieselbe Controller-Lösung, aber ein anderer Installationsweg. Für eine neue Installation nur einen der beiden App-Wege wählen.

## Fehler und Rückweg

- **Kein FP400 gefunden:** frisches Freigabefenster öffnen, Netzwerk/IPv6 prüfen. Bei mehreren Netzwerkkarten kann in der App-Konfiguration `network_interface` gesetzt werden; normalerweise leer lassen.
- **Port 5581 belegt:** bestehenden Zusatzcontroller identifizieren. Den normalen Matter-Server nicht verändern.
- **Kopplung unklar:** eine Minute warten; anschließend nur diese App stoppen/starten. Gespeicherten, aber vorübergehend nicht erreichbaren FP400 nicht erneut anlernen.
- **Keine bewegten Punkte:** Live-Positionen einschalten und tatsächlich vor dem Sensor bewegen. Null Personen allein ist kein Bewegungstest.
- **Abschalten:** zuerst FP400-Zusatzintegration deaktivieren, danach nur diese App stoppen. Keine Fabrics löschen. Private App-Daten und vollständiges HA-Backup aufbewahren.

Die Weboberfläche läuft ausschließlich hinter HA-Ingress. Der Matter-WebSocket ist an `127.0.0.1:5581` gebunden. Die App benötigt Host-Netzwerk und einen beschreibbaren HA-Konfigurationsordner für Integration/Sicherungen, aber keine HA-Steuerungs-API und keinen Docker-Socket. [Berechtigungen und Details](fp400_setup/DOCS.md).

## Entwicklung und Herkunft

`custom_components/aqara_fp400` ist die maßgebliche Integration. `fp400_setup/integration` ist die identische erzeugte Kopie für den isolierten App-Build. `python3.13 tools/build_package.py` synchronisiert sie und baut das ZIP; die Tests prüfen die Gleichheit. Node 22+ und Python 3.13 erforderlich.

```sh
python3.13 tools/build_package.py
node --test tests/addon.test.mjs tests/package.test.mjs tests/file-preview.test.mjs tests/repository.test.mjs
python3.13 tests/test_config_flow.py
python3.13 -m compileall -q custom_components
```

MIT-Lizenz; ursprüngliche Integration und Karte © 2026 Andrew Rankin. OHF Matter Server 1.5.2 unter Apache-2.0, festgelegtes Basis-Image. Änderungen: separater Controller, sichere Zuordnung/Wiederverbindung, Installer und Dialog. [Lizenz](LICENSE) · [Drittanbieter](THIRD-PARTY.md). Bei Fehlerberichten keine Freigabecodes, Tokens oder Matter-Schlüssel veröffentlichen.

## Neu in 1.2.0

Live-Attributmeldungen aktualisieren den Zustand zuverlässig auch bei einzelnen Zahlenwerten. Falsche Personenpunkte lassen sich nach Anklicken und ausdrücklicher Bestätigung verwerfen. Die Vorschau bleibt schreibgeschützt. [Bedienung und Update](ANLEITUNG.md). Die neuen Funktionen wurden automatisiert geprüft; die bisherigen echten Sitz- und Gangtests sind im Prüfstand separat dokumentiert.

## Migration seit Paket 1.2.1 / App 0.1.7

Der Wechsel einer lokalen App zur GitHub-App kann jetzt ihre Kopplungsdaten mit geprüftem Export/Import erhalten. [Migrationsanleitung](ANLEITUNG.md#wechsel-der-lokalen-app-zur-github-app-ab-017). Die Übernahme wird ausdrücklich aktiviert; normale Updates verändern keine Kopplungsdaten. HACS verwaltet Integration und Karte, der HA-App-Katalog die Repository-App.
