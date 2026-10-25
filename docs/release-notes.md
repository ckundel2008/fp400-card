Integration **1.4.1** / FP400 Controller **0.2.2**: Gerader Raum und unabhängige Sensorausrichtung.

- **Raum bleibt gerade:** Raumraster und Meterangaben drehen sich im Raumausschnitt nicht mehr mit dem Sensor.
- **Sensor getrennt ausrichten:** Sensor-X/Y bestimmen den Montageort; **Sensordrehung im Raum** richtet Sensor, Zonen, Bereiche und Personen im Raum aus. Die bestehende Einstellung `map_rotation` bleibt kompatibel.
- **Bewusst bearbeiten:** Das tatsächliche Sensorzellenraster erscheint beim Start von **Bereiche bearbeiten**. Bei schräger Montage können diese Sensorzellen diagonal im geraden Raum liegen. Gespeicherte Flächen, Koordinaten und Zellzuordnungen werden nicht geändert.
- Die vollständige Radaransicht und die Grundrisskarte mit mehreren FP400 bleiben verfügbar. Sensorzonen werden durch ein Update nicht neu gezeichnet; bestehende Kopplungen bleiben erhalten.
- App **0.2.2** liefert Integration **1.4.1** mit. Controller, Ports, App-Slug und Kopplungsspeicher bleiben unverändert.

**Einrichten:** Raumausschnitt wählen, tatsächliche Raummaße und Sensor-X/Y ab linkem/oberem Rand eintragen. Die Blickrichtung separat einstellen. Ein eingezeichneter Pfeil, der nur den Montageort markiert, legt keinen Drehwinkel fest. Für einen Sensor oben links mit bestätigtem diagonalen Blick nach rechts unten gelten X/Y = 0 und bei „Oben“ −45°. Ohne bestätigte Blickrichtung keinen Winkel raten.

**Update:** Über HACS auf 1.4.1 aktualisieren, Home Assistant neu starten und die Browserseite beziehungsweise Companion-App vollständig neu öffnen. Ohne HACS in der bestehenden Controller-App unter **Einrichtung → Mitgelieferte Integration installieren** die gebündelte Ausgabe ausdrücklich installieren. Ein App-Update allein ersetzt die Integration nicht. Den Kopplungsschritt überspringen; keine Geräte neu anlernen.

**Prüfung:** 150 JavaScript- und 44 Python-Tests bestanden, einschließlich des neuen Regressionstests für das gerade Raumraster. Die lokale Chrome-Simulation bestätigt die Eckmontage, die neue Editorbeschriftung sowie Bearbeitungsstart und Abbrechen ohne Sensor-Schreibaufrufe. Diese Korrektur wurde vor Veröffentlichung nicht mit einer physischen Eckmontage auf HA abgenommen. Mehrere echte FP400, räumliche Kalibrierung und vollständige iPhone-Touchabnahme bleiben offen. Historische Sitz- und Gangtests ersetzen diese Prüfungen nicht.

[Schritt-für-Schritt-Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.4.1/ANLEITUNG.md) · [Raumausschnitt](https://github.com/ckundel2008/fp400-card/blob/v1.4.1/docs/radar-raumausschnitt.md) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.4.1/PRUEFSTAND.md)
