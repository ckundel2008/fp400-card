# Einrichtung

1. Vollständige HA-Sicherung erstellen; bei externem Matter-Server dessen Daten zusätzlich sichern.
2. App starten, **Beim Booten starten** aktivieren und **Weboberfläche öffnen** wählen.
3. Sicherung bestätigen und die mitgelieferte FP400-Integration installieren. Eine vorhandene Version wird unter `/config/fp400-sicherungen/<ID>/aqara_fp400` aufbewahrt.
4. HA einmal neu starten, Assistenten wieder öffnen.
5. Beim bereits gekoppelten FP400 **Gerät teilen / Mit anderem Ökosystem verbinden** wählen. Den neuen Freigabecode im Assistenten eingeben. Kein Werksreset, keine bestehende Kopplung löschen, keinen anderen Matter-Server umstellen.
6. Nach erfolgreicher zusätzlicher Verbindung unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** die Integration **Aqara FP400 (Zusatzcontroller)** hinzufügen. Bei vorhandenem FP400-Eintrag dessen Konfigurieren-Dialog nutzen und den Zusatzcontroller aktivieren.
7. Live-Positionen einschalten, bisherige Geräte prüfen und fertigen Zustand einschließlich dieser App sichern.

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

HACS-Updates der ursprünglichen FP400-Integration können diese angepasste Version überschreiben. Automatische Updates dafür ausschalten. Änderungen dieses Pakets vor Aktivierung sichern und prüfen.

Zum Abschalten zuerst die Zusatzintegration deaktivieren, anschließend nur diese App stoppen. Die bisherigen Matter-Geräte und Fabrics bestehen weiter. Die privaten App-Daten sichern; sie enthalten die zusätzliche FP400-Kopplung.

Lizenz: MIT für Integration und neue Dialog-/Installationsdateien; Basis-Image OHF Matter Server unter Apache-2.0. Hinweise in LICENSE und THIRD-PARTY.md. Unterstützung erfolgt über denjenigen, der dieses individuelle Paket bereitstellt; Upstream unterstützt die unveränderte Originalintegration.
