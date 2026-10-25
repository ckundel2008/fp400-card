# Prüfstand – Integration 1.4.1 / FP400 Controller 0.2.2

Stand: 25.10.2026. Diese Übersicht trennt automatisierte Prüfungen, Browserprüfung und reale Hardwaretests. Ein bestandener älterer Hardwaretest ist keine Abnahme neuer Funktionen.

## Raumrasterkorrektur 1.4.1

Das Raumrechteck mit seinem Raster und den Meterangaben bleibt gerade. Sensorposition und Sensordrehung richten Sensor, Zonen, Bereiche und Personen im Raum aus. Beim ausdrücklichen Start von **Bereiche bearbeiten** erscheinen zusätzlich die tatsächlichen Sensorzellen; bei schräger Montage können diese diagonal im Raum liegen. Gespeicherte Zellen und die vollständige Radaransicht behalten ihr bisheriges Verhalten.

**150 JavaScript-Tests und 44 Python-Tests bestanden.** Der neue Regressionstest scheiterte vor der Korrektur am fehlenden eigenständigen Raumraster und besteht nachher bei −45°, 0°, 45° und 90°. Die vorhandenen Tests prüfen außerdem:

- Rückrechnung von Zeigerpositionen und Tastatureingaben in die ursprünglichen Sensorzellen.
- Eingabegrenzen am Raumausschnitt und Erhalt unsichtbarer Originalzellen beim Speichern.
- Getrennte Zonen- und Namensentwürfe, Konflikte und ausstehende Sensorbestätigungen.
- Fehlende, veraltete oder widersprüchliche Positionsdaten; keine Targetaktion auf unzuverlässiger Grundlage.
- Kompatibilität bestehender Karten und der früheren Grundriss-Testkartentypen.
- Identische Frontenddateien für HACS und die gebündelte App sowie aktuelle Paketmanifeste und Anleitungen.

**Chrome-Simulation bestanden:** 8 × 10 m, Sensor oben links, −45° als ausdrücklich angenommene diagonale Blickrichtung. Raumlinien und Meterangaben bleiben gerade; Sensor, Beispielzonen und Beispielperson werden passend transformiert. Bearbeitungsstart, Abbrechen und die neue Editorbeschriftung wurden geprüft. Dabei keine Browserfehler und keine Sensor-Dienstaufrufe. Die Simulation verwendet ausschließlich erfundene Daten.

Ein Pfeil, der nur den Montageort markiert, belegt keine Blickrichtung. Raummaße, Montageort und Blickrichtung müssen zum realen Raum passen.

## Frühere reale Prüfungen

### Sitztest mit einer echten Person – bestanden (historisch)

Die bereits veröffentlichten Bilder zeigen den früheren Sitztest, keine Eckmontage und keine Abnahme der Raumrasterkorrektur:

![Historischer Sitztest: Radarkarte](docs/images/04-radar-sitztest-echt.jpg)

![Historischer Sitztest: Sofa-Belegung](docs/images/05-sofa-belegung-echt.jpg)

Historische Sitz- und Gangtests mit einem echten FP400 sind abgeschlossen. Eine frühere stabile Ausgabe wurde einschließlich Controller-Update und Home-Assistant-Neustart geprüft: gespeicherte Zusatzkopplung wieder online, Zusatzintegration geladen, neue Positionsmeldung und unveränderte Zonen, Namen, Bereiche und Dashboard-Konfigurationen. Diese Ergebnisse gelten für den damals geprüften Stand und ersetzen keine physische Abnahme der Raumrasterkorrektur 1.4.1.

## Verbleibende Grenzen

- Version 1.4.1 wurde vor Veröffentlichung nicht mit einer physischen Eckmontage auf Home Assistant abgenommen.
- Räumliche Genauigkeit und Ausrichtung müssen vor Ort kalibriert werden.
- Mehrere echte FP400 in derselben Grundrisskarte und eine vollständige iPhone-Touchabnahme bleiben offen.
- ARM64-Hardware wurde nicht geprüft.
- Überlappende Sensoren können dieselbe Person mehrfach darstellen. Es gibt keine gemeinsame Personenidentität, sichere Gesamtpersonenzahl oder Tier-/Babyklassifizierung.
- Gespeicherte Zonen sind keine Live-Belegungsanzeige. Die Karten unterscheiden Positionsdaten von Belegungszuständen.

## Update und Erhalt bestehender Daten

App 0.2.2 bündelt Integration 1.4.1. Controller, App-Slug, Ports und Kopplungsspeicher werden durch diese Ausgabe nicht geändert. Ein App-Update allein ersetzt die installierte Integration nicht.

Vor dem Update eine HA-Sicherung einschließlich der Controller-App erstellen. Integration über HACS aktualisieren oder die mitgelieferte Integration ausdrücklich im Einrichtungsdialog installieren. Danach HA neu starten und die Browserseite beziehungsweise Companion-App vollständig neu öffnen. Den bestehenden Integrationseintrag und die gespeicherte FP400-Kopplung weiterverwenden; keine Geräte neu anlernen.

Die Veröffentlichung erfolgt über die bestehenden Paket-, HACS- und Hassfest-Prüfungen. Deren endgültiges Ergebnis ist beim jeweiligen Release-Commit unter GitHub Actions einsehbar.

