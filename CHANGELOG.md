# 1.4.0 – 25.10.2026

- Zweite Karte „FP400 Grundriss“ mit eigenem Bild, mehreren Sensoren, Kalibrierung, Montagepunkt, Blickrichtung und gemeinsamer Spiegelung für Zonen/Ziele.
- Visueller Grundrisseditor mit getrenntem Entwurf, ausdrücklichem Übernehmen und Abbrechen. Liest ausschließlich vorhandene Entitäten; keine Änderung der Sensorzonen.
- Raumausschnitt und frei wählbare Sensorposition in der bisherigen Radar-Karte; Vollansicht bleibt Standard.
- Ziehen über Ausschnittränder kann keine unsichtbaren neuen Zellen verändern. Sichere Rückrechnung bei fehlenden oder ungültigen SVG-Transformationen; Regression für alle vier Ebenen.
- Beide Karten aus derselben automatisch registrierten Ressource. Alte Testkartentypen und deren Konfigurationen bleiben kompatibel.
- App 0.2.1 bündelt Integration 1.4.0, ohne Controller- oder Kopplungsdaten zu ändern. Aktuelle Anleitungen und Prüfgrenzen im Paket.

# 1.3.0 – 25.10.2026

- Karte startet als Live-Ansicht; Zonen und Bereiche erst nach „Bereiche bearbeiten“ verändern.
- Zentrale Zonennamen in HA; pro Speichern optional auch den Anzeigenamen der eindeutig zugeordneten HA-Entität ändern, mit Vorschau und Konfliktschutz. IDs und Matter-Kopplungen bleiben erhalten.
- Eindeutig zugeordnete, ausdrücklich vergebene HA-Zonennamen übernehmen; bewusst geleerte Namen nicht erneut importieren.
- Deutliche Auswahl einzelner Erkennungen mit Markierung und Bestätigung; veraltete Auswahl wird aufgehoben.
- Schutz ungespeicherter Änderungen, Rückbestätigung beim Speichern und deutsche/englische Bedienung.
- Kartendrehung von −180° bis 180° mit unverändertem Sensorraster und aufrechten Beschriftungen.
- Ausgewählte aktuelle Erkennung als Störflächenentwurf vormerken; Übertragung erst nach ausdrücklichem Speichern.
- Aktualität anhand echter Positionsmeldungen anzeigen; fehlende Meldungen nicht als leeren Raum deuten.
- Gerätezuordnung über die unterstützte Registry-Schnittstelle und den passenden Matter-Konfigurationseintrag.
- App 0.2.0 heißt FP400 Controller, trennt Übersicht und Einrichtung und verhindert ein Downgrade der Integration. Prüfgrenzen und tatsächliche Testergebnisse stehen im Prüfstand.

# 1.2.1 – 24.10.2026

- App 0.1.7 mit geprüftem Export/Import der FP400-Kopplungsdaten für den Wechsel von einer lokalen zur Repository-App.
- Expliziter Migrationsmodus, Prüfsummen, private Dateirechte, Überschreibschutz und Tests für Fehlerfälle.
- Integration und Karte funktional unverändert gegenüber 1.2.0.

# 1.2.0 – 23.10.2026

- Upstream-Fix für skalare Attributmeldungen übernommen; gezielte Abonnements erhalten Live-Zustand und Zonenaktualisierungen.
- Einzelne Erkennung per Kartenpunkt und Bestätigung oder Aktion `aqara_fp400.remove_target` verwerfen.
- Vorschau-Schreibsperre, Gerätezuordnung und Fehlerbehandlung erhalten; ungültige Zielnummern werden abgelehnt.
- Neue Regressionstests und Anleitung; App 0.1.6 bündelt die Integration. Bestehende Matter-Kopplungen bleiben bestehen.

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
