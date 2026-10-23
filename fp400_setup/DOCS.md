# Einrichtung

1. Vollständige HA-Sicherung erstellen; bei externem Matter-Server dessen Daten zusätzlich sichern.
2. App starten, **Beim Booten starten** aktivieren und **Weboberfläche öffnen** wählen.
3. Sicherung bestätigen und die mitgelieferte FP400-Integration installieren. Eine vorhandene Version wird unter `/config/fp400-sicherungen/<ID>/aqara_fp400` aufbewahrt.
4. HA einmal neu starten, Assistenten wieder öffnen.
5. Beim bereits gekoppelten FP400 **Gerät teilen / Mit anderem Ökosystem verbinden** wählen. Den neuen Freigabecode im Assistenten eingeben. Kein Werksreset, keine bestehende Kopplung löschen, keinen anderen Matter-Server umstellen.
6. Nach erfolgreicher zusätzlicher Verbindung unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** die Integration **Aqara FP400 (Zusatzcontroller)** hinzufügen. Bei vorhandenem FP400-Eintrag dessen Konfigurieren-Dialog nutzen und den Zusatzcontroller aktivieren.
7. Live-Positionen einschalten, bisherige Geräte prüfen und fertigen Zustand einschließlich dieser App sichern.

# Karte zum Dashboard hinzufügen

1. **Dashboard bearbeiten → Karte hinzufügen → Nach Karte** öffnen.
2. Nach **FP400** suchen und **FP400 Radar – Zonen und Personen** auswählen.
3. Unter **Zonen** das gewünschte Radar-Gerät wählen. **Verfolgte Personen** und **Bereiche** desselben Geräts prüfen; eindeutige Sensoren werden vorausgewählt.
4. Bei Bedarf Titel und Darstellung **Oben/Unten** wählen, dann **Speichern → Fertig**. Personenanzahl ist kein Ersatz für den Sensor Verfolgte Personen. Entry/Exit, Monitoring und Interference kommen gemeinsam aus Bereiche.

Fehlt die Karte oder erscheint „Visueller Editor wird nicht unterstützt“, ist meist noch die alte Karte geladen: Integration aktualisieren, HA nach einem vollständigen Integrationsupdate neu starten und den Browser vollständig neu laden. Die Ressourcenkennung muss zur tatsächlich installierten Datei passen. Keine doppelte FP400-Ressource hinzufügen und keine Geräte neu koppeln. Ausführliche [Update- und Cache-Hilfe](https://github.com/ckundel2008/fp400-card/blob/main/ANLEITUNG.md#update-einer-bestehenden-installation).

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

Aktuell: **FP400 Einrichtung 0.1.6**, reguläre App-Ausgabe, mit Integration 1.2.0.

1. Vollständige HA-Sicherung einschließlich dieser App erstellen.
2. Bei Installation über unser GitHub-App-Repository den App-Store aktualisieren, die bestehende **FP400 Einrichtung** öffnen und **Aktualisieren** wählen. Die App wird dabei neu gestartet. Nicht deinstallieren.
3. Nach dem Start den vorhandenen FP400 prüfen. Den Kopplungsschritt überspringen: App-Slug und Kopplungsspeicher sind unverändert.
4. Die Integration separat über HACS aktualisieren. Ohne HACS im aktualisierten Einrichtungsdialog **FP400-Integration installieren** ausführen und anschließend HA neu starten. Ein App-Update allein ersetzt die installierte Integration nicht.

Eine als lokale App per ZIP installierte Ausgabe erhält keine Updates aus dem GitHub-App-Repository. Nicht einfach durch eine zweite Repository-App ersetzen: Diese hat einen anderen App-Bezeichner und übernimmt die Kopplungsdaten nicht automatisch. Für ein reines Kartenupdate die vorhandene App behalten und nur die Integration über HACS aktualisieren.

Als HACS-Quelle **ckundel2008/fp400-card** verwenden; das Originalprojekt darf denselben Integrationsordner nicht parallel überschreiben.

Zum Abschalten zuerst die Zusatzintegration deaktivieren, anschließend nur diese App stoppen. Die bisherigen Matter-Geräte und Fabrics bestehen weiter. Die privaten App-Daten sichern; sie enthalten die zusätzliche FP400-Kopplung.

Lizenz: MIT für Integration und neue Dialog-/Installationsdateien; Basis-Image OHF Matter Server unter Apache-2.0. Hinweise in LICENSE und THIRD-PARTY.md. Unterstützung erfolgt über denjenigen, der dieses individuelle Paket bereitstellt; Upstream unterstützt die unveränderte Originalintegration.
