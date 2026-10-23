# 1.1.6 – 23.10.2026

- FP400 Einrichtung 0.1.5 als reguläre App mit `stage: stable` veröffentlicht.
- Neues Startpaket mit konsistenter Anleitung, ergänztem Prüfstand und echten Bildern.
- Integration und Karte funktional unverändert; Versionsanhebung für ein eindeutig zugeordnetes Gesamtpaket.

# 1.1.5 – 23.10.2026

- Visueller Karteneditor im echten HA erfolgreich geprüft: Katalogsuche, automatische Vorauswahl, Entitätenauswahl und Konfigurationsübernahme.
- Sieben Klickschritte zur Einrichtung ohne YAML; Update- und Cache-Hilfe für eine noch geladene alte Karte.
- Anleitung und ehrlicher Prüfstand auch im neu gebauten Startpaket und in START-HIER.html enthalten.
- Karten- und Controller-Verhalten unverändert gegenüber 1.1.4; keine neue Kopplung erforderlich.

# 1.1.4 – 23.10.2026

- Visueller Karteneditor mit Auswahl für Zonen, verfolgte Personen, Bereiche, Titel und Sensorausrichtung. Katalogname: FP400 Radar – Zonen und Personen.
- Sprachunabhängige Zuordnung anhand von Sensorattributen und HA-Gerätezuordnung; keine automatische Auswahl zwischen mehreren Geräten oder mehrdeutigen Sensoren.
- Fehlende Tracking-Daten werden als fehlende Zuordnung angezeigt. Schreibende Sensoraktionen in der Kartenvorschau gesperrt.
- Startpaket, HTML-Anleitung, Prüfstand und echte Bilder auf den aktuellen Dokumentationsstand gebracht.
- Automatisierte Editorprüfung; Browser-/Live-Abnahme im HA-Karteneditor noch offen. Controller-Protokoll und Kopplungsdaten unverändert.

# Dokumentationsnachtrag – 23.10.2026

- Alle drei Karten-Entitäten mit deutscher/englischer Bezeichnung und vollständiger YAML-Vorlage dokumentiert.
- Hinweis auf falsche automatische Zuordnung bei übersetzten, umbenannten oder nummerierten IDs: Live-Tracking-Anzeige und Bereiche ausdrücklich zuordnen.
- Gangtest laut Nutzerbestätigung bestanden. Kein neuer eigener Live-Test; bestehende Bilder zeigen den Sitztest.
- Dokumentation auf dem Standardzweig aktualisiert; die zuvor veröffentlichten Release-Dateien von 1.1.3 bleiben der Stand vom 22.10.2026.

# 1.1.3 – 22.10.2026

- Startpaket mit aktuellem Prüfstand: Sitztest mit einer echten Person bestanden, gezielter Gangtest weiterhin offen.
- Echte Radar- und Sofa-Aufnahmen samt Prüfsummen im ZIP enthalten; relative Bildverweise funktionieren nach dem Entpacken.
- Versionsangabe und Arbeitsverzeichnis für die Prüfkommandos korrigiert.
- Paketbau nimmt ausschließlich ausdrücklich vorgesehene Dateien auf. Controller-App bleibt 0.1.2; keine Änderung am Laufzeitverhalten.

# 1.1.2 – 22.10.2026

- Erforderliche Hassfest-Prüfung für die offizielle HACS-Einreichung ergänzt.
- Reihenfolge der Manifestfelder entsprechend Hassfest korrigiert.
- Keine Änderung an Python-/JavaScript-Laufzeitverhalten, Matter-Kopplungen oder Controller-App 0.1.2.
- Experimenteller Prüfstand bleibt bestehen: Bewegungstest mit einer Person, ARM64 und reale Anlagen mit 32 Geräten noch offen. Einzelheiten in PRUEFSTAND.md.

# 1.1.1 – 22.10.2026

- Erste öffentliche Ausgabe mit HACS-Struktur, gebündelter Zonenkarte, zusätzlicher Controller-App und Einrichtungsdialog.
- Zusätzliche Kopplung, Zonen/Bereiche und Wiederverbindung am echten FP400 geprüft. Bestehende Matter- und Radar-Identitäten erhalten.
