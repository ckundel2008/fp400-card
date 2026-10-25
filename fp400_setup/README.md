# FP400 Controller

Version 0.2.1 bündelt Integration 1.4.0 mit Grundrisskarte und Raumausschnitt. Bei HACS-Verwaltung die Integration dort aktualisieren. Ohne HACS die mitgelieferte Integration im Einrichtungsdialog ausdrücklich installieren; danach HA neu starten und die Browseransicht vollständig neu öffnen. Gespeicherte Kopplungen bleiben erhalten.

Zusätzlicher lokaler Matter-Controller für FP400-Zonen und Live-Positionen. Der bisherige Matter-Server wird nicht umgestellt und seine Geräte werden nicht neu gekoppelt. Nur ein bereits in HA vorhandener FP400 erhält eine zusätzliche Verbindung.

Nach dem Start **Weboberfläche öffnen** und dem Dialog folgen. Nach der Kopplung öffnet sich die Übersicht; die Einrichtung bleibt über einen eigenen Reiter erreichbar. Voraussetzungen: HA OS, Core 2026.9+, amd64/ARM64, FP400 direkt in der bestehenden HA-Matter-Integration. Die App muss anschließend für die Zusatzfunktionen weiterlaufen. Sie heißt deshalb ab 0.2.0 **FP400 Controller**. Beim Update bleiben App-Slug, Daten und Kopplungen erhalten.

Eigenes Community-Projekt, kein offizielles Home-Assistant- oder Aqara-Produkt. Installation, zusätzliche Kopplung, Zonen und Wiederverbindung wurden auf HA OS 18.3 / Core 2026.10.2 (amd64) mit echtem FP400 geprüft. Sitz- und Bewegungstest sind abgeschlossen; ARM64-Hardware wurde nicht geprüft. Diese historischen Tests ersetzen keine Abnahme neuer Funktionen. Versionsbezogene Ergebnisse und Grenzen stehen im Startpaket unter PRUEFSTAND.md.
