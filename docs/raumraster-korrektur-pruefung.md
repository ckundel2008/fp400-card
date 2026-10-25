# Lokale Korrektur: gerader Raum, getrennte Sensorausrichtung

Prüfgegenstand: Integration 1.4.1 / FP400 Controller 0.2.2, auf Basis von Release 1.4.0. Veröffentlichung über den bestehenden Release-Workflow nach erfolgreichen Checks. Die Korrektur wurde vor Veröffentlichung nicht auf einem HA installiert.

Die Raumansicht hatte bereits feste rechteckige Grenzen, zeichnete das sichtbare Raster und die Meterlinien aber innerhalb der gedrehten Sensorebene. Dadurch erschien die Raumdarstellung schräg. Jetzt liegen Raumraster und Meterangaben außerhalb der Sensorebene. Position und Drehung betreffen weiterhin Sensor, Zonen, Bereiche und Ziele gemeinsam. Im normalen Raummodus bleiben die Sensorzellen ohne eigene Gitterlinien; beim ausdrücklichen Bearbeiten werden sie sichtbar. Diese Zellen bleiben im ursprünglichen Sensorkoordinatensystem, damit Speichern und Trefferprüfung unverändert dieselben Radarflächen betreffen. Die vollständige Radaransicht behält ihr bisheriges Verhalten.

Verifikation am 25.10.2026:

- Neuer Regressionstest scheiterte vor der Korrektur wegen fehlendem eigenständigem Raumraster; nachher bestanden bei −45°, 0°, 45° und 90°.
- Alle 150 JavaScript-Tests bestanden, einschließlich Rotation, inverser Trefferprüfung, Bearbeitung außerhalb des Ausschnitts, Erhalt unsichtbarer Zonen und identischer HACS-/App-Auslieferung. Vier HTTP-Tests benötigten lokale Ports außerhalb der Sandbox; danach vollständiger Lauf erfolgreich.
- Chrome-Simulation mit 8 × 10 m, Montage oben links und −45°: gerade Raumlinien/Meterangaben, diagonaler Sensor und entsprechend transformierte Zonen/Person. Keine Browserfehler und keine Dienstaufrufe bei Ansichtsänderung, Bearbeitungsstart und Abbrechen.
- Visueller Editor zeigt im Raummodus „Sensordrehung im Raum“ und erklärt das getrennte Raum-/Sensorraster.
- Paket lokal neu gebaut. Keine Python-, Matter-, Kopplungs- oder Live-Konfigurationsänderungen.

Gegencheck: unverändertes Konfigurationsformat, gleiche Sensortransformation und Zell-IDs, keine neuen Schreibpfade. Offene Grenze: noch keine physische Eckmontage auf einem fremden HA abgenommen.
