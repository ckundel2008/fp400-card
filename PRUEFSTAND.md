# Prüfstand – FP400 Einrichtung 0.1.2

Stand: 22.10.2026. Experimentelle Ausgabe, kein offizielles HA-/Aqara-Paket. Technische Live-Prüfung weitgehend bestanden; Bewegungstest noch offen.

## Am echten HA und FP400 geprüft

- HA OS 18.3, Core 2026.10.2, amd64. Bisheriger Matter-Server: App 9.2.0 / Matter Server 1.5.2. FP400 Firmware 1.2.0.0.
- Vollständige HA-Sicherung einschließlich Apps vor der Änderung abgeschlossen (Recorder-DB ausgenommen).
- ZIP über File editor und mitgelieferte Terminal-Installationshilfe eingespielt; Prüfsumme, App-Katalog, echter Docker-Build und App-Start geprüft.
- Originalintegration über den Einrichtungsdialog gesichert und ersetzt. HA-Konfiguration gültig; einmaliger Core-Neustart; mitgelieferter Python-Code anhand Prüfsummen verifiziert.
- Nur den vorhandenen FP400 über ein frisches HA-Freigabefenster zusätzlich gekoppelt. Der echte Einrichtungsdialog meldet verbunden. Kein Reset, kein Entfernen eines Geräts oder einer Fabric.
- Vorhandenen Integrationseintrag über den neuen Optionsdialog bestätigt. Vier Zonen einschließlich Zellen und zwei Bereiche werden gelesen. Keine Zonen-/Bereichsdefinitionen als Test verändert.
- Alle 16 vorhandenen Matter-Geräteregister-IDs sowie Radar-Geräte-ID, Integrationseintrag und alle 23 Radar-Entitäts-IDs stimmen vorher/nachher überein.
- Nichtgeheime Hauptserver-Identitäten (Fabric-ID, komprimierte Fabric-ID, Controller-ID, SDK-Version), zehn Node-IDs und Gerätezuordnungen unverändert. Die vier vorher bereits nicht erreichbaren Nodes blieben nicht erreichbar; FP400 und die anderen fünf erreichbaren Nodes blieben erreichbar.
- Live-Positionen eingeschaltet; frische Leermeldung mit null Personen empfangen. Nach Neustart ausschließlich der neuen App kamen Zonen, Bereiche und eine neue Live-Meldung zurück; Kopplung blieb erhalten. Dabei automatische Netzwerkauswahl verwendet.
- Vorheriger zusätzlicher FP400-Controller als Rückweg gestoppt, Start manuell; Daten nicht gelöscht. Haupt-Matter-Server weder gestoppt noch umkonfiguriert.

## Beim Live-Test behobene Fehler

- 0.1.1: eigener Healthcheck beendet den zuvor dauerhaft angezeigten Supervisor-Startstatus; Link auf aktuelle HA-App-Seite korrigiert.
- 0.1.2: tatsächliches WebSocket-Erkennungsformat mit `vendor_id`, `product_id`, `long_discriminator` statt interner SDK-Feldnamen; kurzer Diskriminator aus langem abgeleitet. Echte Kopplung danach erfolgreich. Geräteprüfung nicht abgeschwächt.

## Lokale Prüfung

- 16 Node-Tests: Bereitschaft, enger Installationsumfang, 32 unveränderte simulierte Matter-Geräte, exakte Sicherung, Wiederholung, Symlink-Sperren, unterbrochene Installation, tatsächliches Erkennungsformat, falsche/mehrdeutige Geräte, doppelte Klicks, unklare Kopplung, Ingress/CSRF und bereinigte Fehler.
- 16 Python-Flow-Tests: Erstinstallation, lokale URL, physischer Gerätevergleich, Offline-Sensor, bestehende Einträge und Optionsschalter.
- Zwei Paket-/Bootstrap-Tests und ein Dateivorschau-Test, Syntax-/JSON-Prüfung. Simulierter Browserdurchlauf ergänzend; nicht als Hardwarebeweis gewertet.

## Verbleibende Grenzen

**Der Bewegungstest mit einer echten Person steht aus:** Bei der Prüfung war niemand zu Hause. Null Personen und frische Zeitstempel beweisen den Datenweg, aber keine bewegten Koordinaten. Erst nach Prüfung vor Ort vollständig als bewegungsgetestet bezeichnen.

Nicht live geprüft: ARM64-Hardware, reale Installation mit 32 Matter-Geräten, anderer Hauptserver als 1.5.2, erstmaliger Integrationseintrag auf einem frischen HA, Zonen schreiben/löschen, reale Ausführung aller bestehenden Automationen und Apple-/Aqara-App-Bedienung. Keine bestehenden Kopplungen gelöscht; deren Funktion in jeder Fremd-App nicht separat bedient. Zonenanzahl vor/nachher gleich; vollständige Zellmasken erst nach Kopplung erfasst.

## Reproduktion

Aus dem Homeassistant-Arbeitsverzeichnis:

```sh
python3.13 tools/build_package.py
node --test tests/addon.test.mjs tests/package.test.mjs tests/file-preview.test.mjs tests/repository.test.mjs
python3.13 tests/test_config_flow.py
python3.13 -m compileall -q custom_components
```

Die zusätzliche Repository-Struktur wurde mit insgesamt 20 Node- und 16 Python-Tests geprüft. Öffentliche Integrationsversion 1.1.1 unterscheidet sich vom live verwendeten Python-Code ausschließlich durch Versions-/Projektmetadaten und ein Icon; der Controller-Code entspricht der live geprüften App 0.1.2.

GitHub Actions hat Paketbau, Tests und HACS-Prüfung erfolgreich ausgeführt ([Prüflauf](https://github.com/ckundel2008/fp400-card/actions/runs/39744481406)). Der echte HA akzeptierte das öffentliche Repository als benutzerdefinierte HACS-Integration; kein HACS-Download oder Wechsel vom Original wurde auf dem bestehenden HA ausgeführt. Der App-Katalog erkannte auch die Repository-App 0.1.2 als verfügbar. Der HA-UI-Dialog zum Hinzufügen der App-Quelle meldete einen fehlenden Repository-Parameter; dieselbe Quelle wurde über die Supervisor-Schnittstelle erfolgreich hinzugefügt. Die README nennt den geprüften ZIP-Weg als Ausweichweg. Keine zweite Controller-App installiert oder gestartet.

Private Vorher-/Nachher-Daten bleiben außerhalb des weitergebbaren Pakets. Es enthält keine HA-Adressen, Kopplungscodes oder Matter-Schlüssel.

## Offizieller HACS-Antrag, 22.10.2026

Für Version 1.1.2 wurde die Manifest-Reihenfolge korrigiert und die erforderliche Hassfest-Prüfung ergänzt. HACS, Hassfest und Pakettests bestanden ohne deaktivierte Checks ([Prüflauf](https://github.com/ckundel2008/fp400-card/actions/runs/39745753481)). Danach wurde die vollständige Release v1.1.2 erstellt und [HACS-Antrag #12425](https://github.com/hacs/default/pull/12425) mit einer einzelnen alphabetisch sortierten Ergänzung eröffnet. Beantragt als Integration einschließlich Karte; die zusätzliche HA-App bleibt ein separater Installationsbestandteil. Noch keine Annahme im allgemeinen Katalog. Keine Änderung an der laufenden HA-Installation.
