# FP400 einrichten – vorhandene Matter-Geräte behalten

Dieses Paket ergänzt deinen bestehenden Matter-Server um einen eigenen Controller für den Aqara FP400. Deine bisherigen 32 Matter-Geräte werden weder umgezogen noch neu gekoppelt. Nur der FP400 erhält eine zusätzliche Matter-Verbindung. Dein bestehender Matter-Server darf dabei auch eine andere, ältere Servervariante sein, solange der FP400 in der HA-Matter-Integration vorhanden und erreichbar ist.

## Was du brauchst

- Home Assistant **OS**, Core **2026.9 oder neuer**, auf einem 64-Bit-Rechner (Intel/AMD oder ARM64, etwa Raspberry Pi mit 64-Bit-HA-OS).
- Einen FP400, der bereits über die **Matter-Integration von Home Assistant** erreichbar ist.
- Einen Computer mit Browser zum Herunterladen, Entpacken und Hochladen des Pakets.
- Internet während der Installation. Die Einrichtung und die späteren Sensordaten laufen lokal.
- Du darfst den Browser auch aus der Ferne über deine übliche Nabu-Casa-Adresse benutzen. Die Geräteerkennung läuft auf HA zu Hause; dein Computer muss dafür nicht im Heimnetz sein. Für den abschließenden Bewegungstest muss jemand vor dem Sensor sein.
- Home Assistant und FP400 müssen sich über das vorhandene Netzwerk erreichen können, einschließlich IPv6/Thread-Border-Router, wenn der Sensor Thread nutzt. Den Border-Router und bestehende Netzwerkeinstellungen beibehalten.

Dieses Installationspaket ist für HA OS gedacht. Bei HA Container, älteren 32-Bit-Systemen oder einem FP400, der ausschließlich über eine Aqara-Bridge eingebunden ist, passt dieser Ablauf nicht.

## 1. Vorhandenen Zustand sichern

1. Öffne **Einstellungen → Geräte & Dienste → Matter**. Prüfe, ob dein FP400 und deine bisherigen Geräte vorhanden und erreichbar sind. Notiere die angezeigte Geräteliste oder mache einen Screenshot; die Zahl im HA-Geräteregister kann auch Untergeräte enthalten.
2. Öffne **Einstellungen → System → Backups** und erstelle eine vollständige Sicherung, einschließlich des bisherigen Matter-Servers.
3. Warte bis zum Abschluss und lade eine Kopie herunter. Läuft der bisherige Server außerhalb von HA, sichere seine Daten zusätzlich dort.

**Den bestehenden Matter-Server nicht deinstallieren, keine Herstellerkennung ändern, keine Geräte entfernen und den FP400 nicht zurücksetzen.** Für dieses Paket brauchst du kein `matter_server_args`, kein `--vendorid` am bisherigen Server und keine neue Thread-Konfiguration.

## 2. Das Startpaket entpacken

Entpacke **FP400-Startpaket.zip** auf deinem Computer. Darin findest du:

- `START-HIER.html`: diese Anleitung zum Öffnen im Browser.
- `fp400-app.zip`: die eigentliche HA-App. **Diese innere ZIP-Datei nicht entpacken.**
- `fp400-installieren.sh`: die Installationshilfe.
- `ANLEITUNG.md`, Lizenz- und Prüfhinweise.

## 3. Zwei HA-Werkzeuge öffnen

Unter **Einstellungen → Apps → App-Store** heißen die Werkzeuge **File editor** und **Terminal & SSH**. Früher hieß das Menü „Add-ons“.

1. Falls noch nicht vorhanden, installiere die offiziellen Apps **File editor** und **Terminal & SSH** und starte sie.
2. Beide lassen sich über **Weboberfläche öffnen** bedienen. Du brauchst keinen externen SSH-Zugang und keinen freigegebenen SSH-Port.
3. Sollte Terminal & SSH beim ersten Start eine leere Anmeldung beanstanden, lege in seiner Konfiguration ein eigenes Passwort fest, speichere und starte die App. Der externe Port 22 bleibt deaktiviert.

Die beiden Werkzeuge werden nur zum Einspielen des lokalen Pakets benötigt. HACS ist für diese Installation nicht erforderlich.

## 4. Zwei Dateien hochladen

1. Öffne **File editor → Weboberfläche öffnen**.
2. Öffne über das Ordnersymbol den Hauptordner deiner HA-Konfiguration. Dort liegt normalerweise `configuration.yaml`; dieser Ordner heißt im File editor meist `/config`.
3. Nutze **Upload/Hochladen** und lade **`fp400-app.zip`** und **`fp400-installieren.sh`** in genau diesen Ordner. Dateinamen unverändert lassen, beide Dateien nebeneinander ablegen. Keine vorhandene Konfigurationsdatei ersetzen.

## 5. Einmal die Installationshilfe ausführen

Öffne **Terminal & SSH → Weboberfläche öffnen**. Kopiere diesen ganzen Block, füge ihn ein und drücke Enter:

```sh
if [ -f /homeassistant/fp400-installieren.sh ]; then
  sh /homeassistant/fp400-installieren.sh
else
  sh /config/fp400-installieren.sh
fi
```

Die Hilfe prüft die ZIP-Datei, legt ausschließlich die neue lokale App an und liest den App-Katalog neu ein. Sie verändert weder deinen bestehenden Matter-Server noch dessen gespeicherte Kopplungen. Bei einem bereits vorhandenen gleichnamigen App-Ordner ersetzt sie keine Dateien.

Erwartete Abschlussmeldung: **„Fertig. Im App-Store unter Lokale Apps: FP400 Controller installieren.“**

## 6. Die neue App installieren und öffnen

1. Öffne wieder **Einstellungen → Apps → App-Store** und lade die Browserseite neu.
2. Suche unter **Lokale Apps** nach **FP400 Controller**.
3. Klicke **Installieren**. HA baut das Paket auf deinem Rechner; das kann mehrere Minuten dauern.
4. Aktiviere **Beim Booten starten** und starte die App.
5. Öffne **Weboberfläche öffnen**. Den Schutzmodus eingeschaltet lassen.

**Wo wird die HA-Adresse eingetragen?** Der installierte Dialog läuft bereits innerhalb deines Home Assistant und benötigt keine zusätzliche Adresse. Öffnest du stattdessen die HTML-Datei aus den Quelldateien direkt auf deinem Computer, ist das nur eine Dateivorschau. Dort kannst du deine übliche HA-Adresse eintragen, um die HA-App-Seite zu öffnen; eine Installation wird dadurch nicht ersetzt. Die Adresse einer anderen Person gehört nicht fest ins Paket.

Die App benötigt das Host-Netzwerk für die lokale Matter-Kommunikation und Schreibzugriff auf den HA-Konfigurationsordner zum Installieren der FP400-Integration. Ihr Code schreibt dort nur die FP400-Integration und deren Sicherungen. Sie benötigt keinen Zugriff auf die HA-Steuerungs-API, den Docker-Socket oder die Daten des bisherigen Matter-Servers.

## 7. Dem Einrichtungsdialog folgen

Die App bietet **Übersicht** und **Einrichtung**. Bei einer gespeicherten Kopplung startet sie in **Übersicht**. Dort siehst du, ob Controller und Sensor erreichbar sind, sowie installierte und mitgelieferte Integrationsversionen. „Hier nicht geprüft“ ist keine Aussage darüber, ob ein Update verfügbar ist; dafür in HACS beziehungsweise im HA-App-Store nachsehen. Ein gespeicherter, aber momentan nicht erreichbarer FP400 muss nicht neu gekoppelt werden.

Öffne für eine Erstinstallation **Einrichtung**. Dort sind die Schritte durchnummeriert:

1. **Sicherung bestätigen.** Bestätige die bereits abgeschlossene vollständige HA-Sicherung.
2. **Mitgelieferte Integration installieren.** Alternativ die Integration über HACS installieren. Eine ersetzte FP400-Version wird vorher gesichert. Neuere oder nicht sicher vergleichbare Versionen werden nicht überschrieben; ist die mitgelieferte Ausgabe bereits installiert, diesen Schritt überspringen. Nach einer Installation Home Assistant einmal über das HA-Menü neu starten und die App wieder öffnen. Nicht den vorhandenen Matter-Server austauschen.
3. **Nur den FP400 zusätzlich verbinden.** In HA das vorhandene FP400-Matter-Gerät öffnen und **Gerät teilen / Mit anderem Ökosystem verbinden** wählen. Je nach HA-Version liegt die Funktion im Menü des Geräts oder der Matter-Geräteansicht. Alternativ die Teilen-Funktion in der Aqara- oder Apple-Home-App für diesen FP400 benutzen. Einen frischen Freigabecode erzeugen, im Assistenten einfügen und bestätigen, dass der Code zu deinem FP400 gehört. Dann **FP400 zusätzlich verbinden** klicken.
4. **Warten.** Die Kopplung kann einige Minuten dauern. Der Assistent meldet, wenn der FP400 zusätzlich verbunden ist. Nicht den Code vom Aufkleber benutzen und keinen Werksreset durchführen.

Ein Freigabecode ist nur kurz gültig. Der Assistent speichert ihn nicht dauerhaft. Bei mehreren passenden Geräten rät er nicht, sondern hält die Einrichtung an.

## 8. Integration in HA aktivieren

1. Öffne **Einstellungen → Geräte & Dienste → Integration hinzufügen**.
2. Suche **Aqara FP400 (Zusatzcontroller)** und bestätige den Dialog. Eine Serveradresse musst du nicht eingeben.
3. Die Integration akzeptiert den Sensor erst, wenn Seriennummer, Hersteller und Produkt zu dem schon vorhandenen FP400 in deiner HA-Matter-Integration passen.

**Schon eine FP400-Integration vorhanden?** Keinen zweiten Eintrag anlegen. Öffne ihren **Konfigurieren**-Dialog, aktiviere **Zusätzlichen FP400-Controller verwenden (empfohlen)** und speichere. Wird noch der alte Dialog angezeigt, wurde HA nach dem Installieren noch nicht neu gestartet.

## 9. Zonen und Live-Positionen anzeigen

Öffne das FP400-Radar-Gerät. Schalte **Live-Tracking / Live-Positionen** ein und bewege dich vor dem Sensor. Die Personenanzahl und Positionen sollen sich ändern. Vorhandene Zonen werden eingelesen; bei der Einrichtung werden keine Zonen überschrieben. Nach einem vollständigen HA-Neustart den Schalter prüfen und gegebenenfalls wieder einschalten. Ein leerer Raum mit null Personen bestätigt noch keinen erfolgreichen Bewegungstest.

Die Karte lässt sich ab Version 1.1.4 ohne YAML einrichten. Dieses Paket enthält Integration 1.4.1 und App 0.2.2.

1. Öffne dein gewünschtes Dashboard und wähle oben rechts **Dashboard bearbeiten**.
2. Klicke im gewünschten Abschnitt auf **Karte hinzufügen**.
3. Wechsle auf **Nach Karte**, gib **FP400** in die Suche ein und wähle **FP400 Radar – Zonen und Personen**.
4. Wähle bei **Zonen** den Zonen-Sensor deines FP400. Ist genau ein passendes Gerät vorhanden, ist es bereits vorausgewählt.
5. Prüfe **Verfolgte Personen** und **Bereiche (Entry/Exit, Monitoring, Interference)**. Eindeutig zugehörige Sensoren werden vorausgewählt. Du kannst sie auch ausdrücklich aus den Listen wählen. Alle drei Sensoren müssen zum selben FP400 gehören; **Personenanzahl** ist kein Ersatz für **Verfolgte Personen**.
6. Vergib bei Bedarf einen **Titel**. Unter **Sensor in der Darstellung** wählst du **Oben** oder **Unten**. Mit **Kartendrehung** lässt sich die Darstellung zwischen −180° und 180° drehen, beispielsweise um 45° für einen Sensor in einer Ecke. Die tatsächlichen Sensorflächen bleiben dabei unverändert.
7. Prüfe die Vorschau, klicke auf **Speichern** und anschließend auf **Fertig**. Die Auswahl konfiguriert nur die Dashboard-Karte; vorhandene Sensorzonen und Kopplungen bleiben erhalten. Die Vorschau schreibt keine Zonenänderungen an den Sensor.

Bei mehreren FP400 zuerst die Zonen des gewünschten Geräts wählen und die beiden anderen Sensoren prüfen. Dieser Ablauf einschließlich Katalogsuche und Entitätenauswahl wurde am 23.10.2026 im echten HA getestet; beim Test wurden die Entwürfe verworfen und keine zusätzlichen Karten angelegt.

Alternativ **Manuell** wählen und Folgendes einfügen:

```yaml
type: custom:aqara-fp400-zone-card
entity: sensor.DEINE_FP400_RADAR_ZONES
targets_entity: sensor.DEINE_VERFOLGTE_PERSONEN_ENTITAET
regions_entity: sensor.DEINE_BEREICHE_ENTITAET
title: FP400
sensor_at: top
```

Ersetze alle drei Platzhalter durch die vollständigen Entitäts-IDs desselben Radar-Geräts. Unter **Einstellungen → Geräte & Dienste → Entitäten** die jeweilige Entität öffnen, deren Einstellungen aufrufen und die **Entitäts-ID** mit dem Kopiersymbol kopieren.

| Karten-Eintrag | Gesuchte Entität | Zweck |
| --- | --- | --- |
| `entity` | Zonen / Zones | Zonenkarte |
| `targets_entity` | Verfolgte Personen / Tracked people | Personenpositionen und Live-Tracking-Anzeige |
| `regions_entity` | Bereiche / Regions | Entry/Exit, Monitoring und Interference |

Ab 1.1.4 erkennt die automatische Zuordnung Sensorattribute und die HA-Gerätezuordnung; deutsche und umbenannte IDs werden unterstützt. Bei mehrdeutiger Zuordnung alle drei ausdrücklich auswählen. Ältere Kartenversionen erwarten englische Endungen `_zones`, `_tracked_people` und `_regions`; dort alle drei IDs in YAML eintragen. Dafür keine Entitäts-IDs ändern; „Personenanzahl“ ersetzt nicht „Verfolgte Personen“. Für Entry/Exit, Monitoring und Interference gibt es keine eigenen Karten-Einträge. Bleiben Bereiche leer, bei ihrer Entität unter **Entwicklerwerkzeuge → Zustände** das Attribut `regions` prüfen.

`sensor_at` erlaubt `top` oder `bottom`; `map_rotation` ergänzt einen Darstellungswinkel von −180 bis 180 Grad (Standard 0). Positive Winkel drehen im Uhrzeigersinn. Beispielsweise dreht `map_rotation: 45` nur die Kartenansicht um 45°, ohne Zonen, Bereiche oder Sensorkoordinaten zu ändern. Die Kartenressource wird von der Integration registriert. Bei „Custom element doesn't exist“ die Browserseite vollständig neu laden.

Ab 1.4.0 bietet der visuelle Editor außerdem **Sichtbarer Ausschnitt → Raumausschnitt und freie Sensorposition**. Dort lassen sich Breite, Tiefe und der Montagepunkt in Metern einstellen. Ohne diese Option bleibt die bisherige Vollansicht erhalten. Details und Montagebeispiele stehen in `docs/radar-raumausschnitt.md`.

## 10. Abschluss prüfen und sichern

- Die bisherigen Matter-Geräte sind weiterhin vorhanden und einige davon lassen sich wie zuvor bedienen.
- Eine vorhandene Matter-Automation funktioniert weiterhin.
- Zonen und aktuelle Personenpositionen des FP400 werden angezeigt.
- Ein Neustart ausschließlich der App **FP400 Controller** führt nach kurzer Wartezeit wieder zu aktuellen Radar-Daten.

Erstelle anschließend eine neue vollständige Sicherung **einschließlich FP400 Controller**. Die App muss für die Zusatzfunktionen weiterlaufen. Ihre privaten Daten enthalten die zusätzliche FP400-Kopplung.

## Update einer bestehenden Installation

### Wird das Update automatisch angeboten?

Wenn **dieses Repository** bereits über HACS installiert ist, kann HACS neue GitHub-Releases nach seiner nächsten Aktualisierung als Update anbieten. Die Installation startest du selbst. Eine Änderung der GitHub-Anleitung allein ist noch kein Release.

Nach Veröffentlichung einer regulären Version muss die Anzeige von Vorabversionen nicht aktiviert werden. Wird ein bereits veröffentlichtes Update noch nicht angezeigt, öffne das Repository in HACS und wähle im Menü **Informationen aktualisieren**. Danach unter **Einstellungen → Updates** beziehungsweise direkt in HACS nachsehen. Die Beschriftung kann je nach HACS-Version abweichen. Ein lokal vorbereitetes Paket erscheint erst nach seiner Veröffentlichung als Update.

Eine reine ZIP-Installation erhält dadurch keine Update-Meldung. Dafür zuerst die Integration wie unten beschrieben in HACS übernehmen. Updates der Controller-App werden separat über den HA-App-Store verwaltet; sie aktualisieren die bereits installierte Integration nicht automatisch.

Grundlage: [HACS-Update-Anleitung](https://github.com/hacs/documentation/blob/main/source/docs/use/update.md). Es ist kein erneutes Anlernen der Matter-Geräte erforderlich.

### Passenden Updateweg wählen

Vorher eine vollständige HA-Sicherung einschließlich der Controller-App erstellen. Dieses Paket: **Integration 1.4.1 / App 0.2.2**. Ein erneutes Koppeln ist nicht erforderlich. Integration über HACS aktualisieren, HA neu starten und den Browser beziehungsweise die Companion-App vollständig neu öffnen. Bei App-Updates ohne HACS zusätzlich die mitgelieferte Integration ausdrücklich installieren.

- **Integration bereits in HACS verwaltet:** Dort FP400 Card & Controller auf 1.4.1 aktualisieren. Danach HA neu starten und die Browserseite vollständig neu laden.
- **Bisher nur per ZIP/Einrichtungsdialog installiert:** Die bereits laufende Controller-App beibehalten. In HACS dieses Repository als benutzerdefinierte Quelle vom Typ **Integration** hinzufügen und Version 1.4.1 herunterladen. Danach HA neu starten und den Browser neu laden. Den vorhandenen Integrationseintrag weiterverwenden. Nicht zusätzlich eine zweite Controller-App starten. Falls noch das Original RAR in HACS verwaltet wird, den Wechselhinweis in der README beachten.
- **Repository-App über den App-Store aktualisiert:** App 0.2.2 liefert die neue Integration mit. Unter **Einrichtung** ausdrücklich **Mitgelieferte Integration installieren** wählen, danach HA neu starten und den Browser neu laden. Den Kopplungsschritt überspringen. Bei HACS-Verwaltung stattdessen den ersten Weg verwenden.

Die **Übersicht** unterscheidet installierte und mitgelieferte Version. Eine neuere installierte Integration wird nicht durch die ältere mitgelieferte Ausgabe ersetzt. Bei unbekannter oder nicht sicher vergleichbarer Versionsnummer ist diese Installation gesperrt; Herkunft und Update in HACS prüfen. Gleiche Versionsnummern mit unterschiedlichen Dateien werden gesondert angezeigt und nicht automatisch ersetzt. Die Übersicht zeigt den Dateistand; bereits ausgeführter HA-Code kann bis zum Neustart noch aus der vorherigen Version stammen.

Das ZIP-Installationsskript überschreibt eine vorhandene lokale App absichtlich nicht. Eine alte lokale App kann deshalb weiter die alte Integration mitliefern: Nach dem HACS-Update deren Installationsschritt nicht erneut ausführen. App-Daten und bestehende Kopplungen behalten.

## Wenn etwas nicht klappt

**Die Karte fehlt oder „Visueller Editor wird nicht unterstützt“ erscheint:**

1. Prüfe zuerst, ob tatsächlich die aktuelle Integration installiert ist. Ein neuer Download auf dem Computer aktualisiert die laufende HA-Installation noch nicht.
2. Folge dem passenden Updateweg oben. Eine alte lokale Einrichtungs-App kann weiterhin die alte Karte installieren; ihren Installationsschritt nach einem HACS-Update nicht erneut ausführen.
3. Öffne **Einstellungen → Dashboards → Ressourcen**. Dort darf die FP400-Karte nur einmal als **JavaScript-Modul** eingetragen sein. Bei automatischer Verwaltung zeigt der Eintrag nach dem vollständigen Update auf `/aqara_fp400/aqara-fp400-zone-card.js?v=1.4.1`. Bei YAML-Verwaltung den dortigen bestehenden Eintrag aktualisieren. Die Ressource bietet beide FP400-Karten.
4. Eine Versionsnummer in der URL allein ersetzt keine alte Datei. Ist die richtige Datei bereits installiert, erzwingt eine geänderte Versionskennung das Neuladen. Im Desktop-Browser vollständig neu laden; in der HA-App gegebenenfalls den Frontend-Cache zurücksetzen.
5. Erneut **Dashboard bearbeiten → Karte hinzufügen → Nach Karte → FP400** öffnen. Jetzt müssen die Auswahlfelder für Zonen, verfolgte Personen und Bereiche erscheinen.

Ein gezielter Austausch nur der Kartendatei mit Sicherung und neuer Ressourcenkennung wurde am 23.10.2026 ohne HA-Neustart geprüft. Das ist eine Wartungsmaßnahme; für reguläre Nutzer gelten die vollständigen Updatewege oben. Die Matter-Integration, den FP400-Geräteeintrag und Controller-App-Daten dabei niemals löschen.

| Anzeige / Problem | Was du tun kannst |
|---|---|
| „ZIP-Datei fehlt“ | Beide hochgeladenen Dateien müssen im selben HA-Konfigurationsordner liegen. Die innere ZIP heißt exakt `fp400-app.zip`. |
| „Dateiprüfung fehlgeschlagen“ | ZIP erneut aus dem Startpaket hochladen. Nicht mit einer anderen ZIP weitermachen. |
| „Lokale Apps“ fehlt | Abschlussmeldung der Installationshilfe prüfen, dann App-Store neu laden. Das Paket benötigt HA OS. |
| App startet nicht / Port 5581 belegt | Es läuft möglicherweise bereits ein anderer Zusatzcontroller. Keine vorhandenen Matter-Server stoppen oder umstellen. Erst feststellen, welcher Zusatzcontroller den Anschluss nutzt. |
| Kein FP400 gefunden | Neues Freigabefenster für genau den FP400 öffnen und frischen Code verwenden. Netzwerkerreichbarkeit und IPv6 prüfen. Nicht zurücksetzen. |
| Kopplung unklar abgeschlossen | Eine Minute warten. Falls er nicht als verbunden erscheint, ausschließlich **FP400 Controller** stoppen und wieder starten. Danach bei Bedarf einen neuen Freigabecode verwenden. |
| FP400 gespeichert, aber nicht erreichbar | Kein erneutes Anlernen starten. Stromversorgung, Netzwerk und vorhandenen Thread-Border-Router prüfen. |
| Die Integration findet keinen passenden ursprünglichen FP400 | Prüfen, ob derselbe Sensor direkt in der HA-Matter-Integration vorhanden ist. Eine reine Aqara-Bridge-Anzeige genügt nicht. |
| Mehrere Netzwerkkarten / VLANs | Im Konfigurationsreiter der App kann `network_interface` auf die HA-Netzwerkschnittstelle zum FP400 gesetzt werden; standardmäßig automatische Auswahl. Anschließend nur diese App neu starten. |

Bleibt ein Fehler bestehen, notiere die genaue Meldung aus dem Assistenten bzw. dem Protokoll der neuen App. Freigabecodes nicht weitergeben. Der ursprüngliche Matter-Server bleibt bei der Fehlersuche bestehen.

## Updates und Rückweg

Das ist eine angepasste Ausgabe der FP400-Integration. Als Updatequelle muss **ckundel2008/fp400-card** verwendet werden. Das Originalprojekt darf denselben Integrationsordner nicht parallel aktualisieren, da es die Zusatzcontroller-Unterstützung überschreiben kann. Falls du eigene Automationen zum Installieren von Updates eingerichtet hast, diese Integration davon ausnehmen. Updates dieses Pakets zuerst prüfen und sichern.

Zum Abschalten zuerst die FP400-Zusatzintegration deaktivieren und anschließend nur die App **FP400 Controller** stoppen. Die bisherige Matter-Integration und ihre Geräte bleiben erhalten. Für diesen Rückweg müssen keine Fabrics oder Geräte gelöscht werden.

Eine vorher vorhandene FP400-Integration liegt unverändert unter `/config/fp400-sicherungen/<Sicherungs-ID>/aqara_fp400`. Die Sicherung betrifft nur diese Integration, nicht die vollständige HA-Installation. Für eine vollständige Wiederherstellung das zuvor erstellte HA-Backup verwenden.

## Stand und Herkunft

Integration 1.4.1 / App 0.2.2, 25.10.2026. Eigene lokale App auf Basis des OHF Matter Servers 1.5.2 und einer angepassten Ausgabe von [RAR/ha-aqara-fp400](https://github.com/RAR/ha-aqara-fp400). Keine offizielle Home-Assistant- oder Aqara-App. Der zusätzliche Controller bleibt unverändert. Version 1.4.1 enthält Grundriss, Raumausschnitt und freie Sensorposition; die Bedienfunktionen aus 1.3.0 bleiben erhalten. Die tatsächlich abgeschlossenen Prüfungen und verbleibenden Grenzen stehen in `PRUEFSTAND.md`; ältere Hardwaretests sind keine erneute Abnahme dieser Funktionen.

Frühere reale Prüfungen bestätigten zusätzliche Kopplung, Zonen, Bereiche und Wiederverbindung mit einem FP400 sowie den Erhalt vorhandener Geräte und Entitäten. Historische Sitz- und Gangtests sind abgeschlossen. Die Raumrasterkorrektur 1.4.1 wurde vor Veröffentlichung automatisiert und in einer Browser-Simulation geprüft, noch nicht mit einer physischen Eckmontage auf HA. Mehrere reale FP400 und ARM64-Hardware sind nicht abgenommen. Details siehe `PRUEFSTAND.md`.

## Grundriss und Raumausschnitt (ab 1.4.0)

1. Nach dem Update HA neu starten und die HA-App beziehungsweise Browserseite vollständig neu öffnen. Bereits gespeicherte FP400-Kopplungen weiterverwenden.
2. Für die neue Ansicht **Dashboard bearbeiten → Karte hinzufügen → Nach Karte → FP400 Grundriss** wählen. Beide Karten werden mit derselben Ressource geliefert.
3. **Grundriss bearbeiten** wählen und einen maßstäblichen PNG-/JPEG-/WebP-Plan hochladen. Breite und Höhe einschließlich der Bildränder in Metern einstellen oder über zwei Punkte mit bekannter Strecke kalibrieren.
4. **FP400 hinzufügen**, dessen **Verfolgte Personen** und optional **Zonen desselben Geräts** auswählen.
5. Den Montagepunkt im Plan anklicken. X läuft vom linken Rand nach rechts, Y vom oberen Rand nach unten. Blickrichtung: 0° oben, 90° rechts, 180° unten, −90° links. Wenn die Zonen seitenverkehrt erscheinen, **Links/rechts spiegeln (Zonen und Ziele)** aktivieren.
6. Weitere Sensoren einzeln hinzufügen. Pro Etage eine eigene Karte verwenden. **Entwurf übernehmen**, anschließend im HA-Dialog **Speichern**. **Abbrechen** verwirft den Entwurf. Die Grundrisskarte verändert keine Zonen im Sensor.
7. Für einen Ausschnitt ohne Grundrissbild die bisherige **FP400 Radar**-Karte öffnen. **Sichtbarer Ausschnitt → Raumausschnitt und freie Sensorposition** wählen. Breite/Tiefe sowie Sensor-X/Y ab linkem/oberem Ausschnittrand in Metern eintragen. Das Raumraster bleibt gerade; **Sensordrehung im Raum** richtet den Sensor mit seinen Zonen und Personen aus. Hier blickt „Oben“ bei 0° nach unten und „Unten“ nach oben. Diese historische Radar-Konvention unterscheidet sich von der oben beschriebenen Grundriss-Blickrichtung. Beim ausdrücklichen Bearbeiten erscheinen zusätzlich die tatsächlichen Sensorzellen; bei schräger Montage können diese diagonal im geraden Raum liegen.
8. **Vollständiges Radar (Standard)** stellt die bisherige Vollansicht wieder her. Ausschnitt und Position ändern nur die Darstellung; sie erweitern nicht die Radarreichweite. Die Live-Anzahl gilt weiterhin für das gesamte Radar.

Ausführliche Beispiele stehen in den enthaltenen Dateien `docs/grundriss.md` und `docs/radar-raumausschnitt.md`. Alte Grundriss-Testtypen bleiben kompatibel. Nach Umstieg die ausschließlich eigene zusätzliche Lab-Ressource entfernen und die gemeinsame FP400-Ressource behalten. Nicht zwei FP400-Module parallel eintragen. Keine neue Kopplung oder zweite Controller-App anlegen. Mehrere reale Sensoren und vollständige iPhone-Touchbedienung sind noch nicht abschließend abgenommen.

## Zonen und Bereiche bewusst bearbeiten (ab 1.3.0)

1. Die Karte startet in der Live-Ansicht. Berühren oder Scrollen verändert keine Flächen.
2. Wähle **Bereiche bearbeiten**. Erst jetzt sind Zeichnen, Radieren, Hinzufügen, Aktivieren/Deaktivieren und Löschen verfügbar.
3. Wähle die Zone oder den Bereich und ändere die gewünschten Zellen. Die Änderungen sind zunächst nur ein Entwurf.
4. Wähle **Speichern** und warte auf die Rückbestätigung. Bei einem Fehler bleibt der Entwurf erhalten. **Abbrechen** öffnet bei ungespeicherten Änderungen eine Rückfrage; erst **Verwerfen** entfernt den Entwurf.
5. Beim Wechsel mit ungespeicherten Änderungen kannst du speichern, verwerfen oder weiterbearbeiten. Bei gleichzeitigen Änderungen von anderer Stelle zuerst den aktuellen Stand neu laden.

### Zonen benennen

Im Bearbeitungsmodus eine vorhandene Zone auswählen, beispielsweise **Sofa** als Namen eingeben und **Name speichern** wählen. Eine neue Zone zuerst als Fläche speichern, danach benennen. Ein leerer Name setzt die Anzeige auf **Zone N** zurück.

Der Name wird zentral in Home Assistant gespeichert und erscheint in allen unseren FP400-Karten desselben Geräts. Namen dürfen bis zu 80 Zeichen lang sein. Fehlt der Namensdienst, Integration aktualisieren und HA neu starten; nur die App zu aktualisieren reicht nicht.

Administratoren können vor jedem Speichern zusätzlich **Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)** auswählen. Die Option ist zunächst aus und gilt nur für diese Speicherung. Prüfe die Vorschau der eindeutig zugeordneten Belegungsentität und ihres bisherigen/neuen Anzeigenamens. Entitäts-ID und bestehende Automationen bleiben erhalten; Namen in Aqara/Apple werden nicht geändert. Ein leerer Name setzt ausschließlich den Kartennamen zurück und kann nicht zusammen mit dieser Option gespeichert werden. Bei fehlender oder mehrdeutiger Zuordnung lässt sich weiterhin der Kartenname speichern. Bei zwischenzeitlichen Änderungen zuerst die Vorschau aktualisieren. Meldet HA einen Teilfehler, kann der Kartenname bereits gespeichert sein, obwohl der Anzeigename unverändert bleibt.

### Eine Störfläche vorbereiten

Eine aktuelle Erkennung auswählen und **Stelle als Interferenz markieren** wählen. Die Karte wechselt zur Interferenzfläche und erstellt einen Entwurf um diesen Punkt mit bis zu vier Rasterzellen (zusammen etwa 1 × 1 Meter); am Rand wird die Fläche begrenzt. Vorhandene Interferenzflächen bleiben enthalten. Prüfe die markierten Zellen und wähle ausdrücklich **Speichern**. Mit **Abbrechen → Verwerfen** entfernst du nur den Entwurf. Eine veraltete oder verschwundene Erkennung kann nicht verwendet werden. Die Kartendrehung ändert die zugeordneten Sensorzellen nicht.

### Aktualität der Positionen

Die Karte unterscheidet eine unterbrochene Verbindung, ausgeschaltete Live-Positionen, fehlende Positionsmeldungen und das Alter der letzten Meldung. Nach 15 Sekunden ohne neue Positionsmeldung erscheint ein Hinweis. Das bedeutet nicht, dass der Raum leer oder der Sensor offline ist. Ein mehr als fünf Sekunden in der Zukunft liegender Zeitstempel wird als Uhrabweichung behandelt. Aus veralteten oder zeitlich unplausiblen Daten lassen sich weder eine Erkennung verwerfen noch Interferenzentwürfe anlegen. Lokales Verwerfen einer Erkennung gilt nicht als neue Sensormeldung.

**Bisherige Namen übernehmen:** Ausdrücklich in HA vergebene Namen der bisherigen Matter-Belegungssensoren werden automatisch übernommen, wenn Gerät und Zonen-Endpunkt eindeutig passen. Bereits in unserer Karte gespeicherte Namen haben Vorrang. Bei fehlender oder mehrdeutiger Zuordnung bleibt „Zone N“ stehen; trage den gewünschten Namen dort selbst ein. Namen, die ausschließlich in Aqara/Apple existieren, sind damit nicht abrufbar. Absichtlich geleerte Namen werden nicht erneut importiert. Der erste Import kann bis zum nächsten erfolgreichen Einlesen der Zonen dauern.

## Einzelne falsche Erkennung verwerfen

1. Öffne die gespeicherte Radar-Karte im Dashboard. Live-Positionen müssen eingeschaltet und „Verfolgte Personen“ zugeordnet sein.
2. Tippe den Punkt der falschen Erkennung an, etwa einen dauerhaft als Person erkannten Vorhang.
3. Prüfe den markierten Punkt mit Doppelring sowie die angezeigte Erkennungsnummer, Position und Zonen. Bestätige **Diese Erkennung verwerfen**. **Abbrechen** sendet keinen Befehl.

Ab 1.3.0 verschwindet die Auswahl, wenn die Spur nicht mehr vorhanden oder die Verbindung unterbrochen ist. Während der Flächenbearbeitung ist das Verwerfen gesperrt; zuerst die Bearbeitung beenden. Die Anzeige beweist nicht, dass es eine Geisterperson ist: Eine tatsächlich anwesende Person kann erneut erkannt werden.
4. Bei einem Fehler bleibt die Auswahl erhalten. Prüfe dann die Verbindung zum Zusatzcontroller. In der Kartenvorschau sind schreibende Aktionen gesperrt.

Es wird nur diese Erkennung verworfen, kein Matter-Gerät und keine Kopplung gelöscht. Tatsächlich anwesende Personen können erneut erkannt werden. Zonen und Bereiche bleiben erhalten. Für Automationen steht die Aktion `aqara_fp400.remove_target` mit `device_id` und `target_id` (0–255) bereit.

## Wechsel der lokalen App zur GitHub-App (ab 0.1.7)

Die App-Daten gehören zur jeweiligen Installation. Der Wechsel erfolgt daher mit geprüfter Datenübernahme, nicht durch erneutes Koppeln.

1. HA einschließlich der lokalen FP400-App sichern. Die bisherige App nicht deinstallieren.
2. Die lokale App auf eine Version mit Migrationsmodus aktualisieren: mindestens 0.1.7, in diesem Paket 0.2.2. Vorher ihre Quelldateien sichern. Dieser Schritt erfordert einen administrativen Dateizugriff; der Erstinstallationshelfer überschreibt absichtlich keine vorhandene lokale App.
3. In der lokalen App `migration_mode: export` einstellen, Watchdog ausschalten und neu starten. Der Export läuft vor dem Controllerstart; der Controller bleibt angehalten. Im Protokoll muss „Export vollständig geprüft“ stehen.
4. Die lokale App stoppen und ihren automatischen Start ausschalten. Ihre Daten bleiben als Rückweg erhalten.
5. Die Repository-App aus `https://github.com/ckundel2008/fp400-card` installieren. Vor ihrem ersten Start `migration_mode: import` setzen und die bisherige Einstellung `network_interface` übernehmen. Nur starten, wenn die lokale App gestoppt ist.
6. Nach der Meldung „Kopplungsdaten geprüft übernommen“ und erfolgreicher Verbindung `migration_mode` auf `none` zurückstellen. Bestehenden FP400, Zonen und Live-Tracking prüfen. Nicht neu koppeln.
7. Die Integration über HACS aus **ckundel2008/fp400-card** aktualisieren; den vorhandenen Integrationseintrag erhalten. Danach HA neu starten.

Die Übertragung liegt ausschließlich lokal unter `/config/fp400-migration` (in der App `/homeassistant/fp400-migration`). Sie enthält vertrauliche Matter-Kopplungsdaten und darf nicht auf GitHub oder in Support-Anhänge gelangen. Dateirechte sind auf den Eigentümer beschränkt. Prüfsummen und Pfadprüfung schützen vor beschädigten Dateien; eine bereits gefüllte, abweichende Zielinstallation wird nicht überschrieben. Nach erfolgreicher Umstellung den Transfer zusammen mit dem Rückweg bewusst verwalten; er wird nicht automatisch gelöscht.

Rückweg: Repository-App stoppen, lokale App auf `migration_mode: none` stellen und starten. Niemals beide Controller gleichzeitig starten. Ein erneut angeforderter Export überschreibt keine vorhandenen Transferdaten.
