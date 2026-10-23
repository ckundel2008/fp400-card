Der FP400-Karteneditor wurde im echten Home Assistant erfolgreich geprüft. Version 1.1.5 ergänzt die Anleitung und den Prüfstand; die Kartenfunktion entspricht der live geprüften 1.1.4.

**Reguläre Veröffentlichung:** Der Projektinhaber hat den erfolgreichen Praxistest des Pakets bei einem Kollegen bestätigt. Deshalb wurde 1.1.5 von einer Vorabversion zu einer regulären Veröffentlichung hochgestuft. HACS benötigt für diese Version keine aktivierte Vorabversionsanzeige. Das geprüfte ZIP und der ursprüngliche Tag bleiben unverändert; die darin enthaltenen Hinweise zur Vorabversion beschreiben den früheren Veröffentlichungsstand. Den ergänzten [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/main/PRUEFSTAND.md) findest du im Repository.

- **Karte hinzufügen → Nach Karte → FP400**: Vorlage mit Auswahl für Zonen, verfolgte Personen und Bereiche, Titel und Sensorausrichtung.
- Sieben Einrichtungsschritte ohne YAML und Hilfe bei fehlender Karte, altem Browser-Cache oder „Visueller Editor wird nicht unterstützt“.
- Update-Anleitung für HACS, ZIP und Repository-App: Update-Informationen abrufen und die Installation selbst bestätigen. Bestehende Matter-Kopplungen bleiben erhalten.
- README, Anleitung, App-Dokumentation, Prüfstand und das herunterladbare Startpaket enthalten den aktualisierten Stand.
- Live geprüft: Kartenkatalog, automatische Vorauswahl, explizite Entitätenauswahl und Übernahme in den Konfigurationscode. Keine Sensorzonen geschrieben; Testentwürfe verworfen.
- 25 Node-Tests und 16 Python-Tests bestanden; HACS- und Hassfest-Prüfung vor Veröffentlichung.

**Downloads:** `FP400-Startpaket.zip` entpacken und `START-HIER.html` öffnen. Das ZIP enthält die Anleitung, den Prüfstand und die vorhandenen echten Sitztest-Bilder. Die einzelne HTML-Datei ist die separat lesbare Anleitung. `SHA256SUMS.json` enthält die Prüfsummen der Paketbestandteile.

**Bestehende Installation:** Integration 1.1.5 / Repository-App 0.1.4. Den passenden Updateweg in der [Anleitung](https://github.com/ckundel2008/fp400-card/blob/main/ANLEITUNG.md#update-einer-bestehenden-installation) befolgen. Bestehende Controller-App-Daten und Matter-Kopplungen behalten; nicht erneut anlernen. Keine offizielle HA-/Aqara-Ausgabe.
