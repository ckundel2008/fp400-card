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

Erwartete Abschlussmeldung: **„Fertig. Im App-Store unter Lokale Apps: FP400 Einrichtung installieren.“**

## 6. Die neue App installieren und öffnen

1. Öffne wieder **Einstellungen → Apps → App-Store** und lade die Browserseite neu.
2. Suche unter **Lokale Apps** nach **FP400 Einrichtung**.
3. Klicke **Installieren**. HA baut das Paket auf deinem Rechner; das kann mehrere Minuten dauern.
4. Aktiviere **Beim Booten starten** und starte die App.
5. Öffne **Weboberfläche öffnen**. Den Schutzmodus eingeschaltet lassen.

**Wo wird die HA-Adresse eingetragen?** Der installierte Dialog läuft bereits innerhalb deines Home Assistant und benötigt keine zusätzliche Adresse. Öffnest du stattdessen die HTML-Datei aus den Quelldateien direkt auf deinem Computer, ist das nur eine Dateivorschau. Dort kannst du deine übliche HA-Adresse eintragen, um die HA-App-Seite zu öffnen; eine Installation wird dadurch nicht ersetzt. Die Adresse einer anderen Person gehört nicht fest ins Paket.

Die App benötigt das Host-Netzwerk für die lokale Matter-Kommunikation und Schreibzugriff auf den HA-Konfigurationsordner zum Installieren der FP400-Integration. Ihr Code schreibt dort nur die FP400-Integration und deren Sicherungen. Sie benötigt keinen Zugriff auf die HA-Steuerungs-API, den Docker-Socket oder die Daten des bisherigen Matter-Servers.

## 7. Dem Einrichtungsdialog folgen

Im Dialog sind die Schritte durchnummeriert:

1. **Sicherung bestätigen.** Bestätige die bereits abgeschlossene vollständige HA-Sicherung.
2. **FP400-Integration installieren.** Eine vorhandene FP400-Integration wird vorher gesichert. Danach Home Assistant einmal über das HA-Menü neu starten und den Assistenten wieder öffnen. Nicht den vorhandenen Matter-Server austauschen.
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

Die Karte lässt sich ab Version 1.1.4 ohne YAML einrichten. Aktuelles Paket: 1.1.6.

1. Öffne dein gewünschtes Dashboard und wähle oben rechts **Dashboard bearbeiten**.
2. Klicke im gewünschten Abschnitt auf **Karte hinzufügen**.
3. Wechsle auf **Nach Karte**, gib **FP400** in die Suche ein und wähle **FP400 Radar – Zonen und Personen**.
4. Wähle bei **Zonen** den Zonen-Sensor deines FP400. Ist genau ein passendes Gerät vorhanden, ist es bereits vorausgewählt.
5. Prüfe **Verfolgte Personen** und **Bereiche (Entry/Exit, Monitoring, Interference)**. Eindeutig zugehörige Sensoren werden vorausgewählt. Du kannst sie auch ausdrücklich aus den Listen wählen. Alle drei Sensoren müssen zum selben FP400 gehören; **Personenanzahl** ist kein Ersatz für **Verfolgte Personen**.
6. Vergib bei Bedarf einen **Titel**. Unter **Sensor in der Darstellung** wählst du **Oben** oder **Unten**. Eckpositionen und freie Drehwinkel werden nicht unterstützt.
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

Ab 1.1.4 erkennt die automatische Zuordnung Sensorattribute und die HA-Gerätezuordnung; deutsche und umbenannte IDs werden unterstützt. Bei mehrdeutiger Zuordnung alle drei ausdrücklich auswählen. Ältere Kartenversionen erwarten englische Endungen `_zones`, `_tracked_people` und `_regions`; dort alle drei IDs in YAML eintragen. Keine Entitäten umbenennen; „Personenanzahl“ ersetzt nicht „Verfolgte Personen“. Für Entry/Exit, Monitoring und Interference gibt es keine eigenen Karten-Einträge. Bleiben Bereiche leer, bei ihrer Entität unter **Entwicklerwerkzeuge → Zustände** das Attribut `regions` prüfen.

`sensor_at` erlaubt `top` oder `bottom`; Eckpositionen und freie Drehwinkel werden nicht unterstützt. Die Kartenressource wird von der Integration registriert. Bei „Custom element doesn't exist“ die Browserseite vollständig neu laden.

## 10. Abschluss prüfen und sichern

- Die bisherigen Matter-Geräte sind weiterhin vorhanden und einige davon lassen sich wie zuvor bedienen.
- Eine vorhandene Matter-Automation funktioniert weiterhin.
- Zonen und aktuelle Personenpositionen des FP400 werden angezeigt.
- Ein Neustart ausschließlich der App **FP400 Einrichtung** führt nach kurzer Wartezeit wieder zu aktuellen Radar-Daten.

Erstelle anschließend eine neue vollständige Sicherung **einschließlich FP400 Einrichtung**. Die App muss für die Zusatzfunktionen weiterlaufen. Ihre privaten Daten enthalten die zusätzliche FP400-Kopplung.

## Update einer bestehenden Installation

### Wird das Update automatisch angeboten?

Wenn **dieses Repository** bereits über HACS installiert ist, kann HACS neue GitHub-Releases nach seiner nächsten Aktualisierung als Update anbieten. Die Installation startest du selbst. Eine Änderung der GitHub-Anleitung allein ist noch kein Release.

Version 1.1.6 ist wie die beim Kollegen getestete Vorgängerversion eine **reguläre Veröffentlichung**. Vorabversionen müssen dafür nicht aktiviert werden. Wird sie noch nicht angezeigt, öffne das Repository in HACS und wähle im Menü **Informationen aktualisieren**. Danach unter **Einstellungen → Updates** beziehungsweise direkt in HACS nachsehen. Die Beschriftung kann je nach HACS-Version abweichen.

Eine reine ZIP-Installation erhält dadurch keine Update-Meldung. Dafür zuerst die Integration wie unten beschrieben in HACS übernehmen. Updates der Controller-App werden separat über den HA-App-Store verwaltet; sie aktualisieren die bereits installierte Integration nicht automatisch.

Grundlage: [HACS-Update-Anleitung](https://github.com/hacs/documentation/blob/main/source/docs/use/update.md). Es ist kein erneutes Anlernen der Matter-Geräte erforderlich.

### Passenden Updateweg wählen

Vorher eine vollständige HA-Sicherung einschließlich der Controller-App erstellen. Aktuelle Ausgabe: **Integration 1.1.6**. Der neue Karteneditor ist ab 1.1.4 enthalten; ein erneutes Koppeln ist nicht erforderlich.

- **Integration bereits in HACS verwaltet:** Dort FP400 Card & Controller auf 1.1.6 aktualisieren. Danach HA neu starten und die Browserseite vollständig neu laden.
- **Bisher nur per ZIP/Einrichtungsdialog installiert:** Die bereits laufende Controller-App beibehalten. In HACS dieses Repository als benutzerdefinierte Quelle vom Typ **Integration** hinzufügen und Version 1.1.6 herunterladen. Danach HA neu starten und den Browser neu laden. Den vorhandenen Integrationseintrag weiterverwenden. Nicht zusätzlich eine zweite Controller-App starten. Falls noch das Original RAR in HACS verwaltet wird, den Wechselhinweis in der README beachten.
- **Repository-App über den App-Store aktualisiert:** App 0.1.5 liefert die neue Integration mit. Im aktualisierten Einrichtungsdialog den Schritt **FP400-Integration installieren** ausführen, danach HA neu starten und den Browser neu laden. Den Kopplungsschritt überspringen. Bei HACS-Verwaltung stattdessen den ersten Weg verwenden.

Das ZIP-Installationsskript überschreibt eine vorhandene lokale App absichtlich nicht. Eine alte lokale App kann deshalb weiter die alte Integration mitliefern: Nach dem HACS-Update deren Installationsschritt nicht erneut ausführen. App-Daten und bestehende Kopplungen behalten.

## Wenn etwas nicht klappt

**Die Karte fehlt oder „Visueller Editor wird nicht unterstützt“ erscheint:**

1. Prüfe zuerst, ob tatsächlich die aktuelle Integration installiert ist. Ein neuer Download auf dem Computer aktualisiert die laufende HA-Installation noch nicht.
2. Folge dem passenden Updateweg oben. Eine alte lokale Einrichtungs-App kann weiterhin die alte Karte installieren; ihren Installationsschritt nach einem HACS-Update nicht erneut ausführen.
3. Öffne **Einstellungen → Dashboards → Ressourcen**. Dort darf die FP400-Karte nur einmal als **JavaScript-Modul** eingetragen sein. Bei automatischer Verwaltung zeigt der Eintrag nach dem vollständigen Update auf `/aqara_fp400/aqara-fp400-zone-card.js?v=1.1.6`. Bei YAML-Verwaltung den dortigen bestehenden Eintrag aktualisieren.
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
| Kopplung unklar abgeschlossen | Eine Minute warten. Falls er nicht als verbunden erscheint, ausschließlich **FP400 Einrichtung** stoppen und wieder starten. Danach bei Bedarf einen neuen Freigabecode verwenden. |
| FP400 gespeichert, aber nicht erreichbar | Kein erneutes Anlernen starten. Stromversorgung, Netzwerk und vorhandenen Thread-Border-Router prüfen. |
| Die Integration findet keinen passenden ursprünglichen FP400 | Prüfen, ob derselbe Sensor direkt in der HA-Matter-Integration vorhanden ist. Eine reine Aqara-Bridge-Anzeige genügt nicht. |
| Mehrere Netzwerkkarten / VLANs | Im Konfigurationsreiter der App kann `network_interface` auf die HA-Netzwerkschnittstelle zum FP400 gesetzt werden; standardmäßig automatische Auswahl. Anschließend nur diese App neu starten. |

Bleibt ein Fehler bestehen, notiere die genaue Meldung aus dem Assistenten bzw. dem Protokoll der neuen App. Freigabecodes nicht weitergeben. Der ursprüngliche Matter-Server bleibt bei der Fehlersuche bestehen.

## Updates und Rückweg

Das ist eine angepasste Ausgabe der FP400-Integration. Als Updatequelle muss **ckundel2008/fp400-card** verwendet werden. Das Originalprojekt darf denselben Integrationsordner nicht parallel aktualisieren, da es die Zusatzcontroller-Unterstützung überschreiben kann. Falls du eigene Automationen zum Installieren von Updates eingerichtet hast, diese Integration davon ausnehmen. Updates dieses Pakets zuerst prüfen und sichern.

Zum Abschalten zuerst die FP400-Zusatzintegration deaktivieren und anschließend nur die App **FP400 Einrichtung** stoppen. Die bisherige Matter-Integration und ihre Geräte bleiben erhalten. Für diesen Rückweg müssen keine Fabrics oder Geräte gelöscht werden.

Eine vorher vorhandene FP400-Integration liegt unverändert unter `/config/fp400-sicherungen/<Sicherungs-ID>/aqara_fp400`. Die Sicherung betrifft nur diese Integration, nicht die vollständige HA-Installation. Für eine vollständige Wiederherstellung das zuvor erstellte HA-Backup verwenden.

## Stand und Herkunft

Integration 1.1.6 / App 0.1.5, 23.10.2026. Eigene lokale App auf Basis des OHF Matter Servers 1.5.2 und einer angepassten Ausgabe von [RAR/ha-aqara-fp400](https://github.com/RAR/ha-aqara-fp400). Keine offizielle Home-Assistant- oder Aqara-App. Die bekannte Herstellerkennungs-Beschränkung des FP400 wird über einen zusätzlichen Controller umgangen, ohne den bisherigen Server umzustellen. Der Karteneditor aus 1.1.4 wurde automatisiert und im echten HA geprüft. Version 1.1.6 bündelt die reguläre App 0.1.5 bei unveränderter Kartenfunktion. Der Praxistest des Vorgängerpakets beim Kollegen ist vom Projektinhaber bestätigt; diese Metadaten-/Dokumentationsausgabe wurde nicht erneut live installiert.

Dieses Paket wurde auf HA OS 18.3 / Core 2026.10.2 (Intel/AMD 64 Bit) installiert und mit einem echten FP400 (Firmware 1.2.0.0) zusätzlich gekoppelt. Zonen, Bereiche und Wiederverbindung nach App-Neustart wurden geprüft. Alle 16 dort vorhandenen Matter-Geräteregistereinträge und die 23 Radar-Entitäts-IDs blieben erhalten. Der Sitztest mit einer echten Person, aktuellen Positionsmeldungen und passender Sofa-Belegung ist bestanden. Den abgeschlossenen Gangtest bestätigte der Nutzer am 23.10.2026 als bestanden; dazu wurde kein weiterer eigener Live-Test durchgeführt. ARM64, eine reale Anlage mit 32 Geräten und ein anderer Hauptserver als Matter Server 1.5.2 wurden nicht live getestet. Details siehe `PRUEFSTAND.md`.
