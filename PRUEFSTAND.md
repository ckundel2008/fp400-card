# Prüfstand – Integration 1.4.0 / FP400 Controller 0.2.1

## Reguläre Ausgabe 1.4.0

Der geprüfte Stand wird mit derselben automatisch registrierten Ressource als Radar- und Grundrisskarte ausgeliefert. Der Grundriss hat den öffentlichen Typ `custom:aqara-fp400-floorplan-card`; die beiden früheren Testkartentypen bleiben als kompatible Aliasse vorhanden. Beim bewussten Speichern im neuen Editor wird der öffentliche Typ verwendet. Private Bilder, Ausschnitte und Sensorzuordnungen werden nicht automatisch umgeschrieben.

**149 JavaScript-Tests und 44 Python-Tests bestanden.** Dazu gehören die bisherigen Grundrissprüfungen, gemeinsame Ressource und Editorzuordnung, unveränderte alte Konfigurationen einschließlich Spiegelung/HA-Layout, die Randkorrektur auf allen vier Ebenen sowie die tatsächlichen Release-Archive. Beide Anleitungen und die aktuelle kombinierte Kartenquelle sind in den Archiven geprüft; HACS- und App-Kopie stimmen überein. Der reproduzierbare Frontend-Bau benötigt keine Dateien aus dem früheren separaten Lab-Projekt.

Die reguläre Grundrissklasse und ihr Editor wurden vor Veröffentlichung in Chrome mit drei simulierten FP400 gerendert: Badge 1.4.0, gesperrter Start, ausdrücklicher Bearbeitungsstart und Abbrechen bestanden. Die neue Klassenkennung vermeidet die stille Wiederverwendung einer schon geladenen Lab-Klasse. Die geometrische Umsetzung und der behobene Radar-Eingabepfad entsprechen dem zuvor im eigenen HA geprüften Stand; die öffentliche Ausgabe samt Manifest 1.4.0 wurde nicht mit einem erneuten HA-Neustart installiert. Reale Touch-Bedienung auf dem iPhone, mehrere physische Sensoren und räumliche Genauigkeit jeder Montage bleiben offen. Historische Sitz-/Gangtests werden dafür nicht als Ersatz gezählt.

App 0.2.1 ändert ausschließlich die gebündelte Integration; Controller, Ports, App-Slug und Kopplungsspeicher bleiben erhalten. Ein App-Update allein ersetzt die installierte Integration nicht. Update über HACS oder bewusste Installation der mitgelieferten Integration, anschließend HA neu starten und Browser vollständig neu öffnen. Keine neue Kopplung erforderlich. Die folgenden Abschnitte sind die zeitlich zugeordneten Vorprüfungen; deren damalige Testkennzeichnungen sind historische Nachweise.

## Randkorrektur behoben und lokal installiert – 25.10.2026

**Urteil: Der unten dokumentierte Fehler beim Ziehen über den Ausschnittrand ist behoben und für die lokale Vorschau geprüft.** Kombinierter Kandidat `31a635fd6a76b3a414f37ca8a269abab3b7243bb705eaf8afadc6cf28497d796`; HACS- und App-Frontendquelle sind identisch.

- Die gemeinsame Zeiger-Rückrechnung prüft den tatsächlichen Punkt gegen den sichtbaren Raum, bevor sie eine Sensorzelle zurückgibt. Fehlende, nicht invertierbare, fehlerhafte oder nicht endliche Transformationen liefern keine Zelle; im Raumausschnitt wird keine alte, durch Zeigerfang festgehaltene Zielzelle verwendet. Ein Malstrich beginnt erst auf einer gültigen Zelle. Die bisherige Vollansicht und ihre normale Rückrechnung bleiben erhalten.
- Die vier zuvor fehlgeschlagenen Gegenbeispiele bestehen jetzt. Sieben dauerhafte Regressionstests ergänzen die normale Suite: alle vier Ebenen einschließlich Wiedereintritt und Speicherauftrag, ungültiger Start, fehlerhafte Transformationen und alle vier Ausschnittränder über neun Drehwinkel und beide Sensororientierungen. Bestehende unsichtbare Originalzellen bleiben beim Speichern erhalten; nur neue unsichtbare Änderungen werden verhindert.
- Frisch ausgeführt: **101 JavaScript-Tests und 44 Python-Tests bestanden**. Die Prüfungen umfassen auch Koexistenz der kombinierten Karten und identische HACS-/App-Quellen. Die Grundrissquellen wurden nicht geändert.
- Browser-Gegenprobe über CUA in derselben lokalen Chrome-Simulation: identischer 5×4-m-Ausschnitt und derselbe Mauszug von `[1040,315]` nach `[1040,570]`. Vor Korrektur enthielt der simulierte Zonenauftrag zusätzlich `[6,12]` und `[11,12]`; danach nur `[6,12]`. Sofazellenzahl stieg korrekt von vier auf fünf statt auf sechs. Anschließendes Speichern ausschließlich in der Simulation bestätigte den bereinigten Auftrag. Keine echten Sensor-Schreibaktionen für diese Prüfung.
- Lokale HA-Vorschau aktualisiert: Ausgangs- und Kandidatenhash vor atomarem Austausch geprüft, vorherige Datei separat gesichert; auch die über die tatsächliche HA-HTTP-Route ausgelieferte Datei hat den neuen Hash. Gemeinsame Ressourcenkennung aktualisiert, keine zusätzliche Ressource. Nach vollständigem Chrome-Neuladen funktionieren Radar- und Grundrisskarte. Die veraltete Positionsmeldung wird weiterhin korrekt als veraltet angezeigt; neue Hardware-Bewegungsabnahme wurde nicht behauptet.
- Abschlussvergleich: Radar-Hash `7202134bef5f932f`, Grundriss-Hash `497e14c814acb33f` unverändert, Original-Zonenmasken und -namen identisch. Ressourcenanzahl weiterhin 40; außer der Versionskennung der gemeinsamen FP400-Ressource alle Einträge unverändert. Keine Matter-, Controller-, Backend- oder App-Änderung und kein HA-Neustart.

Gegencheck: Korrektur liegt an der gemeinsamen Eingabeschnittstelle statt in einzelnen Ebenen und schützt auch unzuverlässige Rückrechnungen. Der konkrete bestätigte Fehler ist geschlossen. Eine öffentliche Veröffentlichung, iPhone-Touch-Abnahme und mehrere physische Sensoren bleiben eigenständige offene Prüfungen. Die folgende Nachprüfung dokumentiert den früheren fehlerhaften Stand und ist kein aktuelles Freigabeurteil.

## Erneute Nachprüfung der lokalen Raumansicht – 25.10.2026

**Historisches Urteil vor der obigen Korrektur: Ausschnitt-Bearbeitung nicht freigegeben.** Ein zusätzlicher Test fand einen reproduzierbaren Fehler, der von der bisherigen Prüfung nicht abgedeckt war. Dieses Urteil betraf die neue Ausschnitt-Bearbeitung; es widerrief nicht die bestandenen Prüfungen des unveränderten Controllers oder der bisherigen Vollansicht. Damals geprüfter Kandidat: `cac3e65d6f8f6541a351518de3743b77bda66acd29fd93dc1bb6f402a9a23dd7`.

### Bestätigter Befund

**Hohe Auswirkung bei anschließendem Speichern: Ziehen außerhalb des Ausschnitts bearbeitet unsichtbare Zellen.** `_onPointer` hält den Zeiger nach Beginn eines Malstrichs fest. `_cellAtPointer` prüft anschließend nur die Grenzen des vollständigen Radarrasters, nicht die Grenzen des sichtbaren Raumausschnitts. Ein äußerer `pointerleave`-Handler reicht bei festgehaltenem Zeiger nicht als Begrenzung aus.

- In einer 5 × 4 m großen lokalen Browser-Simulation Bearbeitung gestartet und die Maus vom sichtbaren Raster über dessen unteren Rand gezogen. Die Zellenzahl der aktiven Sofazone stieg von vier auf sechs. Der anschließend ausschließlich simulierte `set_zones`-Auftrag enthielt zusätzlich `[6,12]` und `[11,12]`. Zeile 11 liegt bei 0,5 m pro Zeile außerhalb der sichtbaren 4 m. Damit ist der Fehler im echten Browser bestätigt, nicht nur durch einen direkten Methodenaufruf.
- Ein gezielter Regressionstest pro Ebene schlägt fehl: Zonen, Ein-/Ausgang, Interferenz und Überwachung. Es handelt sich um einen gemeinsamen Fehler mit vier betroffenen Ebenen. Vor explizitem Speichern ist nur der Entwurf betroffen; durch Speichern könnten die unsichtbaren Änderungen an den Sensor gesendet werden.
- Korrekturrichtung: In der gemeinsamen Zeiger-Rückrechnung den tatsächlichen Punkt zusätzlich gegen den sichtbaren Raum prüfen und außerhalb `null` zurückgeben. Bei unzuverlässiger Rückrechnung nicht auf eine alte, durch Zeigerfang festgehaltene Zielzelle ausweichen. Rand-, Drehungs- und Wiedereintrittsfälle für alle Ebenen prüfen.
- Bis zur Korrektur den Raumausschnitt als Anzeige verwenden; Flächenbearbeitung in der Vollansicht vornehmen. Die erneute Prüfung hat keinen Produktionscode korrigiert oder neu installiert.

### Frisch ausgeführte Prüfungen

- Bestehende Projektprüfungen: **94 JavaScript-Tests bestanden**. Grundriss: **46 Tests bestanden**. Backend: **44 Python-Tests unter Python 3.13 bestanden**. Ein erster Backend-Lauf unter dem macOS-System-Python 3.9 schlug bei sechs Verbindungsfreigabe-Tests fehl, weil dort `asyncio.timeout` fehlt; der vollständige Lauf unter vorhandenem Python 3.13 bestand. Dieser Lauf ersetzt keine Prüfung unter jeder möglichen HA-Python-Version.
- Zusätzliche neue Gegenbeispiele: **vier fehlgeschlagene Tests** zu dem oben beschriebenen Ausschnittfehler. Reproduktion separat unter `output/fp400-floorplan-deployment/room-review-regression.test.mjs` gespeichert; aus dem Projektordner mit `node --test ../fp400-floorplan-deployment/room-review-regression.test.mjs` ausführbar. Die bisherigen grünen Tests werden ausdrücklich nicht als vollständige Freigabe gewertet.
- Echte HA-Oberfläche erneut angesehen: Radar lädt, Grundriss test.5 mit Spiegelung lädt, Wechsel EG/DG funktioniert. Im DG wird korrekt kein EG-Sensor erfunden. Zum Prüfzeitpunkt 18:00 Uhr waren die Positionsdaten älter als 15 Sekunden; beide Karten zeigten dies korrekt an und zeichneten keine alte Position als live. Eine frische reale Bewegungsmeldung wurde in dieser Nachprüfung nicht bestätigt.
- Gefiltertes HA-Systemprotokoll enthielt eine einzelne Aqara-Warnung vom selben Tag um 08:25:46 Uhr zur abgebrochenen Positions-Subscription; im zurückgegebenen gefilterten Ausschnitt keine neuere Meldung. Daraus folgt keine Aussage über sämtliche Logs oder über eine dauerhaft störungsfreie Subscription.
- Echte Sensor-Schreibaktionen fanden nicht statt. Abschließender Vergleich: beide Dashboard-Hashes unverändert (`7202134bef5f932f`, `497e14c814acb33f`), Original-Zonenmasken und -namen identisch, alle 40 Ressourcen unverändert. Keine Änderung an Softwareinstallation, Matter-Kopplungen, Controller oder Automationen.

Offen bleiben die Fehlerkorrektur mit erneuter Browserabnahme, echte Touch-Gesten auf dem iPhone, räumlicher Abgleich und mehrere physische FP400. Die historischen Sitz-/Gangtests ersetzen diese Abnahmen nicht.

Stand: 25.10.2026. Erweiterter Integrationsstand und FP400 Controller 0.2.0 lokal sowie auf HA geprüft. Die neu ergänzten Funktionen und der frühere Entwicklungsstand sind getrennt aufgeführt.

## Ergänzende Prüfung: Controller, Anzeigenamen, Drehung und Aktualität

- Vollständiger lokaler Lauf nach dem Gegencheck: **86 Node-Tests und 44 Python-Tests bestanden**. Paketbau erfolgreich; kanonische und App-gebündelte Integration identisch geprüft.
- Backend: optionale Anzeigenamenänderung nur für aktive Administratoren, eindeutige Matter-Zuordnung, Vergleich von Entity-ID und bisherigem nullable Registry-Namen, erneute Prüfung nach der Namensspeicherung, klare Teilfehlermeldung und unveränderte Entity-IDs. Bestehende gespeicherte Namen bleiben kompatibel.
- Registry-Aufrufe anhand der offiziellen HA-2026.9.0-Quellen geprüft. Die zuvor beanstandete veraltete Gerätesuche ist ersetzt. Ein tatsächlicher Lauf auf HA 2026.9 wurde nicht durchgeführt.
- 23 Karten-Zuverlässigkeitstests, darunter 5.760 Zellzuordnungen über verschiedene Drehwinkel, Randbegrenzung und Vereinigung des Störflächenentwurfs mit bestehenden Zellen, Zeitstempel ausschließlich echter Positionsmeldungen sowie gesperrte Aktionen bei veralteten oder zeitlich widersprüchlichen Meldungen.
- Browserprüfung der simulierten Karte in Chrome bei 390 px Kartenbreite: +45°-Drehung, aufrechte Beschriftung, Namensvorschau mit ursprünglichem und neuem Anzeigenamen, korrekter Dienstauftrag mit erwarteter Entity-ID/Registry-Name, Rücksetzen der einmaligen Auswahl nach Speicherung. Störflächenentwurf vergrößerte die simulierte Interferenzmaske von einer auf fünf Zellen; „Verwerfen“ stellte eine Zelle wieder her, ohne einen Bereichsdienst aufzurufen.
- App-Prüfung in Chrome bei 1280 × 900 und 390 × 844: Übersicht für gespeicherte, auch offline befindliche Sensoren, Navigation zur Einrichtung, Downgrade-Sperre, keine beobachteten Browserfehler oder horizontalen Überläufe. Simulierte Zustände, keine echte Kopplung.
- Unabhängiger Gegencheck fand zwei reproduzierbare Randfälle, beide korrigiert und nachgeprüft: paralleles HACS-Update während der Installationsjournal-Schreibung; Positionszeitstempel weit in der Zukunft. Das tatsächlich verschobene Installationsbackup wird vor dem Commit erneut geprüft. Zeitstempel mehr als fünf Sekunden in der Zukunft sperren Personenaktionen und zeigen eine Zeitabweichung.

**Live-Prüfung des erweiterten Integrationsstands:** Vorherige Dateien separat gesichert, Paket-Prüfsumme auf HA bestätigt, installierte Karte mit der lokalen SHA-256 verglichen. HA-Konfigurationsprüfung erfolgreich; nach einmaligem Neustart neue Karte und Positionszeitstempel sichtbar. Zone 1 und deren eindeutig zugeordneter HA-Anzeigename vorübergehend gemeinsam umbenannt; die Rückvorschau bestätigte den geänderten Registry-Namen. Beide anschließend exakt zurückgesetzt. Der HA-MCP bestätigte danach identische vollständige Registereinträge aller vier Belegungsentitäten, dieselben 16 Matter-Geräte-IDs und unveränderte Zellen, Typen und Aktivierungsflags sämtlicher Zonen und Bereiche. Keine Sensorflächen geschrieben und keine Erkennung verworfen. Im abgefragten neuen Startprotokoll nur die allgemeine Warnung für eine Custom Integration, keine bisherige Registry-Deprecation und kein FP400-Fehler.

GitHub-Prüfungen des vorbereiteten Quellstands: Pakettests, HACS und Hassfest erfolgreich ([Lauf 40168850671](https://github.com/ckundel2008/fp400-card/actions/runs/40168850671)). Ein aktueller Störflächenentwurf konnte mangels aktueller Personenerkennung nicht erneut am echten Sensor vorbereitet werden; die oben genannten simulierten Browser- und Regressionstests sind dafür separat ausgewiesen. Die historischen Sitz-/Gangtests werden nicht als Ersatz gezählt. Neue echte Bildschirmansichten wurden angesehen; zusätzliche veröffentlichbare Bilddateien konnten wegen Fehlern der macOS-Aufnahmefunktion nicht erstellt werden. Die vorhandenen echten Sitztestbilder bleiben unverändert und entsprechend beschriftet.

### Live-Update des Controllers 0.2.0

- Separate Sicherung der vorhandenen Controller-App vor dem Update erstellt und in der Sicherungsübersicht bestätigt. Keine Sicherung wiederhergestellt und keine App deinstalliert.
- Das bestehende GitHub-App-Repository neu eingelesen: angebotene Version wechselte von 0.1.7 auf 0.2.0. Ausschließlich die vorhandene FP400-App aktualisiert.
- Supervisor bestätigt **FP400 Controller 0.2.0, gestartet**. Die echte Ingress-Oberfläche öffnet direkt die Übersicht und zeigt **Controller bereit**, **Kopplung gespeichert**, **Sensor online**, App-Version 0.2.0 und installierte/mitgelieferte Integration 1.3.0. Die Anzeige bestätigt übereinstimmende Integrationsdateien. Der gesonderte Einrichtungstab ist sichtbar; die Navigation wurde im simulierten Browser geprüft.
- Nach dem App-Neustart ist eine neue echte Positionsmeldung eingegangen. Der vollständige Vergleich sämtlicher Zonen- und Bereichszellen sowie aller 16 Matter-Geräte-IDs ist erneut identisch. Der unveränderte Haupt-Matter-Server 9.2.0 läuft weiter.
- Die abgefragten App-Fehlerzeilen betreffen ältere Zeitüberschreitungen vom Vortag; im abgefragten Fenster kein neuer Fehler nach diesem Update. Kein neues Koppeln, keine Änderungen an der Haupt-Fabric und kein künstlicher Personentest.

## Neue Bedienung und Namensspeicherung

Früherer Entwicklungsstand vor den obigen Ergänzungen: **67 Node-Tests und 36 Python-Tests bestanden**, Paketbau und Compileall erfolgreich. Der Pakettest bestätigt identische kanonische und App-gebündelte Integrationsdateien sowie passende Archiv-Prüfsummen. HACS und Hassfest sind im Veröffentlichungsworkflow vorgesehen, für diesen noch unveröffentlichten Stand aber nicht neu auf GitHub gelaufen.

- Automatisierte Frontendprüfungen: Standardansicht ohne Schreibmöglichkeit, Vorschau-/Offline-/Pending-Sperren, Entwurfswechsel und Verwerfen, Rückbestätigung statt bloßer Dienstannahme, Fehler und Zeitüberschreitung, konkurrierende Änderungen, Namensentwürfe und ungültig gewordene Personenauswahl.
- 15 zusätzliche Zuverlässigkeitsprüfungen decken unter anderem Abbruchdialoge mit gelöschten Zonen, verspätete Namensmeldungen, ID-Wiederverwendung, Eingabefokus und Textauswahl ab. Zwei reproduzierte Fehler wurden behoben: Beim Speichern einer gelöschten Zone wird kein überholter Namenauftrag mehr gesendet; verzögerte HA-Meldungen setzen bestätigte Namen nicht auf den alten Wert zurück und erzeugen keinen falschen Konflikt beim nächsten Bearbeiten.
- Backendprüfungen: persistente Namen für mehrere Geräte, Neustart, parallele Speicherung, Speicherfehler, gültige Zonen, bewusster Namensreset, bestätigte Löschung und ID-Wiederverwendung. Übernahme alter HA-Namen nur mit exakter Matter-Geräte-/Endpunkt-/Occupancy-Zuordnung; Mehrdeutigkeiten und erzeugte Standardnamen werden ausgelassen.
- Gegencheck durch getrennte Implementierer: zusätzliche Sperren für fremde ausstehende Schreibvorgänge, Namenskonflikte und Prüfung vor dem Verwerfen ergänzt. Veraltete Zonenfehler werden nach erfolgreichem neuem Sensorabruf gelöscht; Regression dazu vorhanden.
- Browserprüfung über native Chrome-Steuerung auf `http://127.0.0.1:8768/tests/fixtures/card-ux.html`: sichtbare Karte, Namensänderung „Sofa“ → „Sitzecke“, Auswahlring mit Kennung und Position, Abbrechen ohne Verwerfen, Zeichnen nach Freigabe, Abbruchdialog und Entwurf verwerfen. Ein simulierter Speichervorgang zeigt zunächst „Sensorbestätigung abwarten…“ und kehrt nach Rückmeldung zur Live-Ansicht zurück.
- Darstellung in 560 px und 390 px Kartenbreite geprüft. Gefundenen Kontrastfehler der Bereichsschalter korrigiert. Keine aufgezeichneten JavaScript-Laufzeitfehler oder unbehandelten Promise-Fehler in der finalen Testseite. Dies ersetzt keine vollständige Auswertung aller Browserkonsolenwarnungen.

Die isolierte Browserprüfung verwendet ausdrücklich simulierte Zustände und Dienste. Ergänzend wurde die folgende Bedienung am echten HA geprüft. Echte Touch-Gesten auf einem Smartphone, ARM64 und eine reale Anlage mit 32 Geräten bleiben offen. Die veröffentlichten echten Bilddateien zeigen weiterhin den historischen Sitztest.

## Live-Bedienprüfung 1.3.0 – 25.10.2026

- Bisherige Integrationsdateien vor der Installation separat gesichert. Upload-Prüfsumme und installierte Dateien gegen das gebaute Paket geprüft. Eine zurückgebliebene alte komprimierte Kartendatei wurde ebenfalls gesichert und aus dem aktiven Verzeichnis genommen.
- Nach Core-Neustart neue Oberfläche mit Live-Positionen und vier Zonen geladen. Die Cloud-Verbindung war während des Starts mehrere Minuten unterbrochen; der HA-MCP blieb zunächst auch nach Rückkehr der Oberfläche nicht erreichbar. Deshalb wurden die Bedienprüfungen über die echte HA-Oberfläche durchgeführt.
- Alle vier vorhandenen benutzerdefinierten Matter-Belegungsnamen wurden automatisch anhand der Geräte-/Endpunktzuordnung übernommen: `Belegung (Sofa)`, `Belegung (Küche)`, `Belegung (Esstisch)`, `Belegung (Spielmatte)`.
- Klick ins Raster in der Live-Ansicht änderte keine Zone; Bearbeitung wird erst nach „Bereiche bearbeiten“ angeboten. Rückkehr über „Abbrechen“ geprüft.
- Zone 1 in der Karte vorübergehend in `FP400 Prüftest – Sofa` umbenannt, gespeichert und nach vollständigem Browser-Neuladen erneut angezeigt. Anschließend den exakten Originalnamen `Belegung (Sofa)` wieder gespeichert und in der Live-Ansicht bestätigt. Die bestehenden Belegungsentitäten wurden dabei nicht umbenannt.
- Echte Erkennung ausgewählt: deutlicher Doppelring, Beschriftung mit Kennung, Position und Zonenname sowie Bestätigungsbereich sichtbar. „Abbrechen“ entfernt die Auswahl; die Erkennung blieb vorhanden. Es wurde keine Person am Sensor verworfen.
- Nach Rückkehr des HA-MCP vollständiger Vorher-/Nachher-Vergleich: alle Zellen, Typen und Aktivierungsflags der vier Zonen sowie sämtliche Bereichsmasken identisch; keine ausstehenden Schreibvorgänge oder Zonen-/Bereichsfehler. Alle 16 vorhandenen Matter-Geräteregister-IDs und die vier ursprünglichen Belegungsentitätseinträge unverändert. Haupt-Matter-App 9.2.0 und Zusatzcontroller-App 0.1.7 laufen; Integrationseintrag geladen und Kartenressource auf `v=1.3.0` aktualisiert.
- Keine Zonen- oder Bereichsgeometrie am Sensor geschrieben, keine Matter-Geräte neu gekoppelt und keine Fabric verändert. Fehlerfälle des Schreibens und Verwerfens sind automatisiert mit simuliertem Transport geprüft; daraus wird kein Hardware-Schreibtest abgeleitet.

### Im erweiterten Quellstand behobener Wartungspunkt

Der frühere Live-Test auf HA 2026.10.2 protokollierte eine Deprecation-Warnung zu `device_registry.async_get_device`. Im erweiterten Quellstand ist diese Abfrage durch die eindeutig auf den Konfigurationseintrag bezogene API ersetzt und automatisiert sowie auf HA 2026.10.2 geprüft. Daraus folgt keine Freigabe für zukünftige HA-Versionen.

## Reproduktion dieser Version

```sh
python3.13 tools/build_package.py
node --test tests/*.test.mjs
python3.13 tests/test_config_flow.py
python3.13 tests/test_node_updates.py
python3.13 tests/test_zone_names.py
python3.13 -m compileall -q custom_components
```

Für die isolierte Bedienprüfung das Repository lokal mit `python3.13 -m http.server 8768 --bind 127.0.0.1` bereitstellen und `/tests/fixtures/card-ux.html` öffnen. Diese Testseite verbindet sich nicht mit Home Assistant.

# Historischer Prüfstand – Integration 1.2.1 / FP400 Einrichtung 0.1.7

## Migration zur Repository-App

17 zusätzliche automatisierte Tests prüfen Export, Import, wiederholten Import, Prüfsummenfehler, Pfadmanipulation, Symlinks, bestehende Zieldaten und unterbrochene Kopiervorgänge. Startintegration führt die Migration vor dem Matter-Prozess aus; Export wartet ohne Controller. Ein Live-Migrationsnachweis wird erst nach tatsächlicher Durchführung ergänzt. Die vorherigen Prüfungen bleiben unten erhalten.

# Prüfstand – Integration 1.2.0 / FP400 Einrichtung 0.1.6

## Neue Funktionen 1.2.0

Automatisierte Prüfungen: skalare Attributmeldungen über echte Node-Callbacks mit simuliertem Matter-Transport, gezielte Abonnements, Null-Personen-Meldungen, Zonen-/Bereichsschutz bei ausstehenden Schreibvorgängen und abgefangene Callback-Fehler. Zielentfernung prüft gültige IDs, Erfolg, Gerätefehler und Zeitüberschreitung. Kartenprüfungen decken Bestätigung, Abbruch, Fehlererhalt, fehlende Gerätezuordnung und Vorschau-Schreibsperre ab.

Release-Prüfung: 27 Node-Tests und 22 Python-Tests, Paketbau, HACS und Hassfest. Der Release-Workflow veröffentlicht nur nach erfolgreicher Prüfung. Kein neuer Live-Test der Zielentfernung oder des Callback-Fixes am echten Sensor; die folgenden Sitz-, Gang- und Editorprüfungen gelten für die jeweils genannten älteren Stände. Controller-Image, App-Slug, Ports und Kopplungsspeicher sind unverändert.

## Reguläre App-Ausgabe 0.1.5

App 0.1.5 setzt `stage: stable` und enthält Integration 1.1.6. Funktionscode, App-Slug und Speicherpfade bleiben unverändert. Das Paket wird mit der aktuellen Anleitung und diesem Prüfstand neu gebaut. Ein erneuter Live-Update-Test auf dem produktiven HA wurde für diese Metadaten- und Dokumentationsänderung nicht durchgeführt.

## Ergänzung: Praxistest bei einem weiteren Nutzer

Der Projektinhaber bestätigt nach Veröffentlichung von 1.1.5, das Paket bei einem Kollegen erfolgreich getestet zu haben. Auf Grundlage dieser Rückmeldung wird 1.1.5 als reguläre Veröffentlichung freigegeben. Dies ist ein vom Nutzer bestätigter Praxistest, kein zusätzlich durch Codex beobachteter Test. Details zu Hardware, Installationsweg und Anzahl der Matter-Geräte wurden nicht gesondert dokumentiert; daraus werden keine weiteren Einzelprüfungen abgeleitet.

Die folgenden historischen Testprotokolle dokumentieren den Stand vor dieser Rückmeldung. Das neue ZIP enthält diese Ergänzung. Die bisherigen Einschränkungen der durch Codex beobachteten Prüfungen bleiben nachvollziehbar.

Stand: 23.10.2026. Experimentelle Ausgabe, kein offizielles HA-/Aqara-Paket. Technische Live-Prüfung einschließlich Sitztest bestanden; Gangtest laut Nutzerbestätigung vom 23.10.2026 bestanden.

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

## Sitztest mit einer echten Person – bestanden

Am 22.10.2026 bestätigte der Nutzer eine auf dem Sofa sitzende Person. HA meldete eine verfolgte Person, Personenanzahl 1, Aktivitätszustand `still` und eingeschaltetes Live-Tracking. Die tatsächlichen Zielkoordinaten kamen über den Zusatzcontroller an und aktualisierten sich in mehreren Abfragen. Die Radar-Karte zeigte dieselbe Person an; die bestehende Sofa-Belegung meldete „Erkannt“.

![Echte Radar-Karte beim bestandenen Sitztest](docs/images/04-radar-sitztest-echt.jpg)

![Echte Personenzahl und Sofa-Belegung](docs/images/05-sofa-belegung-echt.jpg)

Die Ausschnitte stammen aus dem echten HA und enthalten keine simulierten Positionen. Prüfung ausschließlich lesend; keine Änderungen an Zonen, Automationen, Matter-Geräten oder Kopplungen. Private Rohmesswerte bleiben außerhalb dieses Repositories.

Während der begleiteten Prüfung am 22.10.2026 war nur Sitzen möglich. Frühere Zonenereignisse sind im Verlauf vorhanden, die laufenden Einzelkoordinaten werden jedoch nicht im Recorder gespeichert.

## Gangtest – vom Nutzer als bestanden bestätigt

Am 23.10.2026 bestätigte der Nutzer den mittlerweile abgeschlossenen Gangtest. Er wird deshalb als bestanden laut Nutzerbestätigung geführt. Für diesen Nachtrag wurde kein eigener Live-Test durchgeführt; zusätzliche Messreihen oder eine Aufzeichnung der Gehstrecke liegen nicht vor. Die veröffentlichten Bilder zeigen den vorherigen Sitztest.

## Beim Live-Test behobene Fehler

- 0.1.1: eigener Healthcheck beendet den zuvor dauerhaft angezeigten Supervisor-Startstatus; Link auf aktuelle HA-App-Seite korrigiert.
- 0.1.2: tatsächliches WebSocket-Erkennungsformat mit `vendor_id`, `product_id`, `long_discriminator` statt interner SDK-Feldnamen; kurzer Diskriminator aus langem abgeleitet. Echte Kopplung danach erfolgreich. Geräteprüfung nicht abgeschwächt.

## Lokale Prüfung

- 16 Node-Tests: Bereitschaft, enger Installationsumfang, 32 unveränderte simulierte Matter-Geräte, exakte Sicherung, Wiederholung, Symlink-Sperren, unterbrochene Installation, tatsächliches Erkennungsformat, falsche/mehrdeutige Geräte, doppelte Klicks, unklare Kopplung, Ingress/CSRF und bereinigte Fehler.
- 16 Python-Flow-Tests: Erstinstallation, lokale URL, physischer Gerätevergleich, Offline-Sensor, bestehende Einträge und Optionsschalter.
- Zwei Paket-/Bootstrap-Tests und ein Dateivorschau-Test, Syntax-/JSON-Prüfung. Simulierter Browserdurchlauf ergänzend; nicht als Hardwarebeweis gewertet.

## Verbleibende Grenzen

Sitztest durch begleitete Live-Prüfung belegt; Gangtest durch Nutzerbestätigung vom 23.10.2026. Daraus folgt keine zusätzliche Abnahme der unten genannten Plattformen oder Funktionen.

Nicht live geprüft: ARM64-Hardware, reale Installation mit 32 Matter-Geräten, anderer Hauptserver als 1.5.2, erstmaliger Integrationseintrag auf einem frischen HA, Zonen schreiben/löschen, reale Ausführung aller bestehenden Automationen und Apple-/Aqara-App-Bedienung. Keine bestehenden Kopplungen gelöscht; deren Funktion in jeder Fremd-App nicht separat bedient. Zonenanzahl vor/nachher gleich; vollständige Zellmasken erst nach Kopplung erfasst.

## Reproduktion

Im Stammverzeichnis des heruntergeladenen oder geklonten `fp400-card`-Repositories (dort liegen `tools`, `tests` und `custom_components`):

```sh
python3.13 tools/build_package.py
node --test tests/addon.test.mjs tests/package.test.mjs tests/file-preview.test.mjs tests/repository.test.mjs
python3.13 tests/test_config_flow.py
python3.13 -m compileall -q custom_components
```

Die zusätzliche Repository-Struktur und der Karteneditor werden mit insgesamt 25 Node- und 16 Python-Tests geprüft. Version 1.1.4 ergänzt den visuellen Editor, sprachunabhängige Entitätszuordnung und einen Schreibschutz in der Kartenvorschau. Zusätzliche Tests prüfen umbenannte Sensoren, mehrere Geräte, mehrdeutige Zuordnung, Konfigurationsereignisse und den Vorschau-Schreibschutz. Der Python-/Controller-Code ist gegenüber dem live geprüften Stand verhaltensgleich; App 0.1.3 aktualisiert die gebündelte Integration. Das Startpaket enthält die aktuelle Anleitung, den Prüfstand mit Nutzerbestätigung des Gangtests und beide echten Bilder unter `docs/images/`; ihre Prüfsummen sind enthalten.

## Karteneditor im echten HA – bestanden, 23.10.2026

- Ursache des fehlenden Editors: HA lieferte noch die alte Kartendatei aus. Nur die JavaScript-Datei wurde nach Sicherung durch die geprüfte 1.1.4 ersetzt und ihre Ressourcenkennung aktualisiert. Prüfsumme der installierten Datei stimmte mit dem veröffentlichten Quellstand überein. Kein HA-/Matter-Neustart und keine erneute Kopplung.
- Im echten Chrome-Browser: **Dashboard bearbeiten → Karte hinzufügen → Nach Karte → FP400** findet **FP400 Radar – Zonen und Personen** mit Vorschau. Anklicken öffnet den visuellen Editor.
- Zonen, verfolgte Personen und Bereiche werden für das vorhandene Gerät automatisch vorausgewählt. Explizite Auswahl der Personen- und Bereiche-Sensoren erzeugt die richtigen Felder `targets_entity` und `regions_entity` im Konfigurationscode.
- Bestehende Karte zeigt echte, sich aktualisierende Personenpositionen und vier Zonen. Entry/Exit, Interference und Monitoring lassen sich umschalten. Keine FP400-bezogenen Browserfehler; andere bereits fehlerhafte Dashboard-Ressourcen sind nicht Teil dieser Prüfung.
- Testentwürfe verworfen; Hash der Dashboard-Konfiguration vorher/nachher identisch. Keine Zonen geschrieben oder gelöscht, keine zusätzliche Karte gespeichert. Der Schreibschutz der Vorschau ist zusätzlich automatisiert geprüft.
- Kein gesonderter mobiler Browsertest und kein neuer kontrollierter Gangtest. Die bisherige Nutzerbestätigung zum Gangtest bleibt separat dokumentiert.

Version 1.1.5 / App 0.1.4 aktualisiert Versionsangaben, Anleitung und Prüfstand. Der Karten-JavaScript-Code entspricht bytegenau der live geprüften 1.1.4. Eine vollständige Neuinstallation dieser neuen Paketversion wurde nicht erneut am produktiven HA durchgeführt.

GitHub Actions hat Paketbau, Tests und HACS-Prüfung erfolgreich ausgeführt ([Prüflauf](https://github.com/ckundel2008/fp400-card/actions/runs/39744481406)). Der echte HA akzeptierte das öffentliche Repository als benutzerdefinierte HACS-Integration; kein HACS-Download oder Wechsel vom Original wurde auf dem bestehenden HA ausgeführt. Der App-Katalog erkannte auch die Repository-App 0.1.2 als verfügbar. Der HA-UI-Dialog zum Hinzufügen der App-Quelle meldete einen fehlenden Repository-Parameter; dieselbe Quelle wurde über die Supervisor-Schnittstelle erfolgreich hinzugefügt. Die README nennt den geprüften ZIP-Weg als Ausweichweg. Keine zweite Controller-App installiert oder gestartet.

Private Vorher-/Nachher-Daten bleiben außerhalb des weitergebbaren Pakets. Es enthält keine HA-Adressen, Kopplungscodes oder Matter-Schlüssel.

## Offizieller HACS-Antrag, 22.10.2026

Für Version 1.1.2 wurde die Manifest-Reihenfolge korrigiert und die erforderliche Hassfest-Prüfung ergänzt. HACS, Hassfest und Pakettests bestanden ohne deaktivierte Checks ([Prüflauf](https://github.com/ckundel2008/fp400-card/actions/runs/39745753481)). Danach wurde die vollständige Release v1.1.2 erstellt und [HACS-Antrag #12425](https://github.com/hacs/default/pull/12425) mit einer einzelnen alphabetisch sortierten Ergänzung eröffnet. Beantragt als Integration einschließlich Karte; die zusätzliche HA-App bleibt ein separater Installationsbestandteil. Noch keine Annahme im allgemeinen Katalog. Keine Änderung an der laufenden HA-Installation.
# Lokale Vorschau: Raumausschnitt und Sensorposition, 25.10.2026

Die bisherige Radar-Karte unterstützt optional `view_mode: room`, `room_width`, `room_height`, `sensor_x` und `sensor_y`. Standard bleibt die vorhandene Vollansicht. Im Raum-Modus erfolgt die Drehung um den Montagepunkt, alle Radar-Ebenen verwenden dieselbe SVG-Transformation. Das unveränderte 20×16-Raster ist weiterhin Grundlage sämtlicher Sensoraktionen. Der sichtbare Ausschnitt löscht oder skaliert keine Sensorzellen.

- Vollständige JavaScript-Projektprüfung: **94 Tests bestanden** (`node --test tests/*.test.mjs`). Der erste Lauf innerhalb der Sandbox scheiterte an gesperrten Listen-Sockets der bestehenden lokalen HTTP-Tests; derselbe vollständige Lauf mit erlaubten lokalen Testservern bestand. Keine echten Matter-Geräte werden durch diese Tests angesprochen.
- Neue Regressionen: feste Raumabmessungen und versetzter Montagepunkt, gemeinsame Ebenen-Transformation, 5.760 Zellen-Rückrechnungen über neun Drehwinkel und beide Orientierungen, Grenzen/ungültige Maße vor Änderung eines aktiven Kartenstands, null als gültige Koordinate im visuellen Editor, Erhalt unsichtbarer Originalzellen beim expliziten Speichern. Bestehende Schutzprüfungen gegen versehentliche Flächenbearbeitung bleiben bestanden.
- Browser-Plugin nicht verfügbar; gerenderte Prüfung über CUA in Desktop-Chrome. Lokale Simulation: kompakter 5×4-m-Ausschnitt, Montagepunkt links oben, −45° Drehung, Umschalten in den visuellen Editor, Sensor-X=0 und Mobilbreite 390 px. Screenshot bestätigt gemeinsame Ausrichtung von Raster, Zonen und Ziel; kein horizontaler Überlauf der Karte. Browserfehleranzeige blieb leer, keine simulierten Dienstaufrufe durch Darstellungseinstellungen. Separate Entwicklerkonsole nicht ausgelesen.
- Auf Benutzer-HA als lokale kombinierte Frontend-Vorschau installiert: Kandidatenhash `cac3e65d6f8f6541a351518de3743b77bda66acd29fd93dc1bb6f402a9a23dd7`, Ausgangshash der bisherigen Kombination `4a4f39520567fd005c22e887e48510527f1b81c2a26c2a6399e633cb1dc85212`. Ausgangs- und Kandidatenhash vor atomarem Austausch geprüft, vorherige Datei gesichert. Gemeinsame Ressource mit neuer Vorschaukennung aktualisiert. Keine neue Ressource, kein HA-Neustart, keine Backend-/Matter-/App-Änderung.
- Nach vollständigem HA-Neuladen den echten Radar-Karteneditor geöffnet: neue Felder vorhanden, Standard-Vollansicht aktiv und Maße deaktiviert; Raum-Modus im Entwurf aktiviert, Maße und Positionen freigeschaltet und Vorschauhinweis sichtbar. Ohne Speichern abgebrochen und normale Ansicht wiederhergestellt. Abschließend zeigte die Radar-Karte eine frische Live-Meldung. Zuvor veraltete Daten waren korrekt als veraltet gekennzeichnet.
- Exakte Nachkontrolle: Radar-Dashboard-Hash `7202134bef5f932f`, Grundriss-Dashboard-Hash `497e14c814acb33f`, beide unverändert. Original-Zonenmasken und -namen identisch; Ressourcenanzahl weiterhin 40. HACS-Quelle und in der App gebündelte Quelle identisch. Keine Änderung an Personen-/Zonen-Entitäts-IDs oder Kopplungen.

Änderungs-Gegencheck: Für die lokale Frontend-Vorschau freigegeben. Einstellungen besitzen begrenzte, endliche Werte; außerhalb liegende Ziele/Zellen werden visuell beschnitten und erhalten keinen Tastaturfokus. Der sichtbare Hinweis begrenzt die Bedeutung der weiterhin radarweiten Live-Anzahl. Keine neue Abhängigkeit, kein fremder Netzwerkdienst und kein privater Grundriss im Kandidaten. Öffentliche Veröffentlichung und physischer Positionsabgleich in mehreren Montagefällen sind damit nicht bestätigt. Anleitung: [Raumausschnitt](docs/radar-raumausschnitt.md).

