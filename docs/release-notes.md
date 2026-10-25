Integration **1.4.0** / App **0.2.1**: Grundriss, Raumausschnitt und freie Sensorposition.

- **FP400 Grundriss** als zweite Karte direkt in der Kartenauswahl: eigener Plan, mehrere Sensoren, visueller Editor, Kalibrierung und Spiegelung. Liest vorhandene Entitäten; keine erneute Kopplung.
- **Raumausschnitt** und **Sensor-X/Y** in der bisherigen Radar-Karte. Vollansicht bleibt Standard. Zonen und Ziele drehen sich gemeinsam um den Montagepunkt.
- **Randkorrektur:** Ziehen über den Ausschnittrand verändert keine unsichtbaren neuen Zellen. Speichern vorhandener Zonen erhält deren ursprüngliche unsichtbare Zellen.
- Kompatibilitätsnamen erhalten bestehende Test-Grundrisskarten. Nur die eigene frühere Lab-Ressource entfernen, die gemeinsame FP400-Ressource behalten und HA vollständig neu öffnen.
- Grundriss- und Raumausschnittanleitungen sind im Startpaket enthalten. Mehrere physische FP400, räumliche Genauigkeit jeder Montage und vollständige iPhone-Touchabnahme bleiben offen; historische Sitzbilder belegen diese Punkte nicht.

- Die Karte startet als Live-Ansicht. „Bereiche bearbeiten“ schaltet Zeichnen und Zonenänderungen ausdrücklich frei.
- Zonennamen werden zentral in Home Assistant gespeichert und in allen unseren Karten angezeigt. HA-Anzeigenamen bleiben standardmäßig unverändert. Administratoren können pro Speicherung **Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)** aktivieren; die Vorschau und ein erneuter Konfliktcheck schützen vor einer falschen Zuordnung. Entitäts-IDs bleiben erhalten.
- Eine ausgewählte Erkennung wird deutlich markiert; Position, Kennung und Zonen helfen bei der Kontrolle vor dem Verwerfen.
- **Kartendrehung** im visuellen Editor und `map_rotation` erlauben −180° bis 180° (positiv im Uhrzeigersinn). Sensorzellen und Zonen werden dadurch nicht verändert.
- **Stelle als Interferenz markieren** bereitet bis zu vier Zellen um eine aktuelle Erkennung vor und erhält vorhandene Interferenzflächen. Erst bewusstes Speichern überträgt den Entwurf.
- Die Karte zeigt das Alter der letzten echten Positionsmeldung und unterscheidet fehlende oder veraltete Daten, ausgeschaltetes Tracking, Verbindungsfehler und Uhrabweichung. Veraltete Erkennungen können nicht als Grundlage für Targetaktionen dienen.
- Ungespeicherte Änderungen, konkurrierende Änderungen und ausstehende Sensorbestätigungen werden sichtbar behandelt. Smartphone-Scrollen funktioniert im Ansichtsmodus.
- Die App heißt **FP400 Controller**. **Übersicht** zeigt Verbindung, Kopplung und Versionsstände; **Einrichtung** enthält die ausdrücklich auszuführenden Schritte. Neuere oder nicht sicher vergleichbare Integrationsversionen werden nicht durch die mitgelieferte Ausgabe überschrieben. Verfügbare Integrationsupdates sind weiterhin in HACS zu prüfen.
- Controller, App-Slug, Ports und Kopplungsspeicher bleiben unverändert. Keine erneute Kopplung.

[Schritt-für-Schritt-Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.4.0/ANLEITUNG.md) · [Grundriss](https://github.com/ckundel2008/fp400-card/blob/v1.4.0/docs/grundriss.md) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.4.0/PRUEFSTAND.md)

Integration über HACS aktualisieren oder unter **Einrichtung → Mitgelieferte Integration installieren** die gebündelte Ausgabe ausdrücklich installieren, dann HA neu starten und Browser neu laden. Nur ein App-Update ersetzt die installierte Integration nicht. Eine gespeicherte FP400-Kopplung weiterverwenden; den Kopplungsschritt bei einem Update überspringen.

149 JavaScript- und 44 Python-Tests bestanden. Die Tests prüfen Koordinaten, Entwürfe, Kompatibilität, sichere Eingabegrenzen und Paketinhalte. Die Randkorrektur wurde zusätzlich mit echter Mausbedienung im lokalen Chrome geprüft und als Frontend-Vorschau im eigenen HA installiert. Originalzonen und beide Dashboard-Konfigurationen blieben unverändert. Die Grenzen der realen Hardware-Abnahme stehen im Prüfstand. Die Veröffentlichung erfolgt erst nach den Paket-, HACS- und Hassfest-Prüfungen der Release-Automatisierung.
