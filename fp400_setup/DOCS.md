# Einrichtung

1. Vollständige HA-Sicherung erstellen; bei externem Matter-Server dessen Daten zusätzlich sichern.
2. App starten, **Beim Booten starten** aktivieren und **Weboberfläche öffnen** wählen. Für eine Erstinstallation **Einrichtung** öffnen; bei vorhandener Kopplung erscheint zunächst **Übersicht**.
3. Sicherung bestätigen und die Integration bevorzugt über HACS installieren. Alternativ **Mitgelieferte Integration installieren** wählen. Eine ersetzte Version wird unter `/config/fp400-sicherungen/<ID>/aqara_fp400` aufbewahrt. Neuere oder nicht sicher vergleichbare Versionen werden nicht überschrieben; eine bereits identische Installation muss nicht wiederholt werden.
4. HA einmal neu starten, Assistenten wieder öffnen.
5. Nur wenn in diesem Zusatzcontroller noch keine Kopplung gespeichert ist: Beim bereits in HA gekoppelten FP400 **Gerät teilen / Mit anderem Ökosystem verbinden** wählen und den neuen Freigabecode im Assistenten eingeben. Kein Werksreset, keine bestehende Kopplung löschen, keinen anderen Matter-Server umstellen. Bei einem Update mit gespeicherter Kopplung diesen Schritt überspringen.
6. Nach erfolgreicher zusätzlicher Verbindung unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** die Integration **Aqara FP400 (Zusatzcontroller)** hinzufügen. Bei vorhandenem FP400-Eintrag dessen Konfigurieren-Dialog nutzen und den Zusatzcontroller aktivieren.
7. Live-Positionen einschalten, bisherige Geräte prüfen und fertigen Zustand einschließlich dieser App sichern.

# Karte zum Dashboard hinzufügen

1. **Dashboard bearbeiten → Karte hinzufügen → Nach Karte** öffnen.
2. Nach **FP400** suchen und **FP400 Radar – Zonen und Personen** auswählen.
3. Unter **Zonen** das gewünschte Radar-Gerät wählen. **Verfolgte Personen** und **Bereiche** desselben Geräts prüfen; eindeutige Sensoren werden vorausgewählt.
4. Bei Bedarf Titel, Darstellung **Oben/Unten** und **Kartendrehung** wählen, dann **Speichern → Fertig**. Die Drehung von −180° bis 180° verändert nur die Darstellung; positive Winkel drehen im Uhrzeigersinn. Personenanzahl ist kein Ersatz für den Sensor Verfolgte Personen. Entry/Exit, Monitoring und Interference kommen gemeinsam aus Bereiche.

Fehlt die Karte oder erscheint „Visueller Editor wird nicht unterstützt“, ist meist noch die alte Karte geladen: Integration aktualisieren, HA nach einem vollständigen Integrationsupdate neu starten und den Browser vollständig neu laden. Die Ressourcenkennung muss zur tatsächlich installierten Datei passen. Keine doppelte FP400-Ressource hinzufügen und keine Geräte neu koppeln. Ausführliche [Update- und Cache-Hilfe](https://github.com/ckundel2008/fp400-card/blob/main/ANLEITUNG.md#update-einer-bestehenden-installation).

# Übersicht und Kartenbedienung

**Übersicht** zeigt Controller-Erreichbarkeit, gespeicherte Kopplung und Sensor-Erreichbarkeit getrennt. Bei einem gespeicherten, aber offline gemeldeten FP400 Stromversorgung und Netzwerk prüfen; nicht erneut anlernen. Die Versionsangaben unterscheiden installierte Dateien und die mitgelieferte Integration. „Hier nicht geprüft“ bestätigt weder ein Update noch dessen Abwesenheit; veröffentlichte Updates in HACS beziehungsweise im HA-App-Store prüfen. Nach einem Integrationsupdate den erforderlichen HA-Neustart beachten.

Die Dashboard-Karte startet als Live-Ansicht. **Bereiche bearbeiten** aktiviert Flächenänderungen. **Speichern** überträgt einen Entwurf und wartet auf die Sensorbestätigung. Bei ungespeicherten Änderungen öffnet **Abbrechen** eine Rückfrage mit **Speichern**, **Verwerfen** und **Weiter bearbeiten**.

Zonennamen werden HA-lokal für alle unsere Karten gespeichert. Der vorhandene HA-Anzeigename bleibt standardmäßig unverändert. Nur Administratoren können vor einer Speicherung **Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)** aktivieren. Dazu muss die Belegungsentität eindeutig zugeordnet sein; die Vorschau zeigt Entität sowie bisherigen und neuen Namen. Entitäts-ID und Kopplungen bleiben erhalten. Bei geänderter Zuordnung oder geändertem Anzeigenamen zuerst die Vorschau aktualisieren. Ein leerer Name setzt nur den Kartennamen zurück.

Mit **Stelle als Interferenz markieren** bei einer aktuellen ausgewählten Erkennung entsteht ein Entwurf aus bis zu vier Sensorzellen. Vorhandene Interferenzflächen bleiben enthalten. Erst **Speichern** ändert den Sensor; **Abbrechen → Verwerfen** entfernt den Entwurf. Die Kartendrehung hat darauf keinen Einfluss.

Nach 15 Sekunden ohne Positionsmeldung zeigt die Karte veraltete Daten an. Das beweist weder einen leeren Raum noch einen offline befindlichen Sensor. Fehlende Meldungen, ausgeschaltete Live-Positionen, Verbindungsfehler und Zeitstempel mit Uhrabweichung werden getrennt angezeigt. Veraltete oder zeitlich unplausible Erkennungen lassen sich nicht verwerfen oder als Interferenzentwurf verwenden.

# Optionen und Berechtigungen

`network_interface` bleibt normalerweise leer (automatische Auswahl). Bei mehreren Netzwerkkarten lässt sich dort der Linux-Schnittstellenname zum FP400 eintragen. Änderungen erfordern einen Neustart ausschließlich dieser App.

Host-Netzwerk ist für lokale IPv6-/Matter-Erreichbarkeit erforderlich. Die Weboberfläche akzeptiert ausschließlich den authentifizierten Supervisor-Ingress. Es wird kein LAN-Webport freigegeben. Der separate Matter-WebSocket ist ausschließlich am HA-Rechner auf `127.0.0.1:5581` erreichbar.

Der Schreibzugriff auf den HA-Konfigurationsordner dient ausschließlich der FP400-Integration und deren Sicherungen. Die App erhält weder den Docker-Socket noch Zugriff auf die Daten des bestehenden Matter-Servers oder die HA-Steuerungs-API. Schutzmodus eingeschaltet lassen.

# Fehlerbehebung

- Port 5581 belegt: bereits vorhandenen Zusatzcontroller identifizieren; bestehenden Hauptserver nicht verändern.
- Kein Sensor gefunden: Freigabefenster neu öffnen, frischen Code und Netzwerk/IPv6 prüfen. Kein Werksreset.
- Kopplung unklar: eine Minute warten; bleibt sie unbestätigt, nur diese App stoppen/starten und danach frischen Code verwenden.
- Sensor gespeichert, aber offline: Netzwerk/Stromversorgung/Border-Router prüfen; nicht erneut anlernen.
- Kein passender ursprünglicher Sensor: derselbe FP400 muss direkt in HA Matter vorhanden sein. Zuordnung erfolgt über Seriennummer, Hersteller und Produkt.
- Installation der Integration gescheitert: Meldung im Dialog prüfen. Verknüpfte Ordner/Dateien werden nicht überschrieben. Eine vorhandene Originalintegration wird gesichert.

# Updates / Abschalten

Dieses Paket: **FP400 Controller 0.2.0**, mit Integration 1.3.0. Die bisherige App „FP400 Einrichtung“ erhält einen passenden Namen für ihren dauerhaften Betrieb. Übersicht und Einrichtung sind getrennt erreichbar. App-Slug und Kopplungsdaten bleiben erhalten. Die Karte ergänzt zentrale Zonennamen, ausdrückliche Flächenbearbeitung, Kartendrehung und einen Störflächenentwurf für ausgewählte Erkennungen. Pro Namensspeicherung lässt sich optional auch der Anzeigename der eindeutig zugeordneten HA-Belegungsentität ändern. Entitäts-IDs bleiben unverändert.

1. Vollständige HA-Sicherung einschließlich dieser App erstellen.
2. Bei Installation über unser GitHub-App-Repository den App-Store aktualisieren, die bestehende **FP400 Controller** öffnen und **Aktualisieren** wählen. Die App wird dabei neu gestartet. Nicht deinstallieren.
3. Nach dem Start den vorhandenen FP400 prüfen. Den Kopplungsschritt überspringen: App-Slug und Kopplungsspeicher sind unverändert.
4. Die Integration separat über HACS aktualisieren. Ohne HACS unter **Einrichtung → Mitgelieferte Integration installieren** die mitgelieferte Ausgabe ausdrücklich installieren und anschließend HA neu starten. Ein App-Update allein ersetzt die installierte Integration nicht. Der Dialog zeigt die installierte und die mitgelieferte Version; eine neuere installierte Version wird nicht durch eine ältere Paketversion ersetzt. Bei unbekannter oder nicht sicher vergleichbarer Version ist die Installation über die App gesperrt. Gleiche Versionsnummern mit unterschiedlichen Dateien werden gesondert angezeigt und nicht automatisch ersetzt.

Eine als lokale App per ZIP installierte Ausgabe erhält keine Updates aus dem GitHub-App-Repository. Nicht einfach durch eine zweite Repository-App ersetzen: Diese hat einen anderen App-Bezeichner und übernimmt die Kopplungsdaten nicht automatisch. Für ein reines Kartenupdate die vorhandene App behalten und nur die Integration über HACS aktualisieren.

Als HACS-Quelle **ckundel2008/fp400-card** verwenden; das Originalprojekt darf denselben Integrationsordner nicht parallel überschreiben.

Zum Abschalten zuerst die Zusatzintegration deaktivieren, anschließend nur diese App stoppen. Die bisherigen Matter-Geräte und Fabrics bestehen weiter. Die privaten App-Daten sichern; sie enthalten die zusätzliche FP400-Kopplung.

Lizenz: MIT für Integration und neue Dialog-/Installationsdateien; Basis-Image OHF Matter Server unter Apache-2.0. Hinweise in LICENSE und THIRD-PARTY.md. Unterstützung erfolgt über denjenigen, der dieses individuelle Paket bereitstellt; Upstream unterstützt die unveränderte Originalintegration.

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
