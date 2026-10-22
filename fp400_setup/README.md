# FP400 Einrichtung

Zusätzlicher lokaler Matter-Controller für FP400-Zonen und Live-Positionen. Der bisherige Matter-Server wird nicht umgestellt und seine Geräte werden nicht neu gekoppelt. Nur ein bereits in HA vorhandener FP400 erhält eine zusätzliche Verbindung.

Nach dem Start **Weboberfläche öffnen** und dem Dialog folgen. Voraussetzungen: HA OS, Core 2026.9+, amd64/ARM64, FP400 direkt in der bestehenden HA-Matter-Integration. Die App muss anschließend für die Zusatzfunktionen weiterlaufen.

Eigene experimentelle App, kein offizielles Home-Assistant- oder Aqara-Produkt. Auf HA OS 18.3 / Core 2026.10.2 (amd64) mit echtem FP400 installiert und zusätzlich gekoppelt; Zonen und Wiederverbindung nach App-Neustart geprüft. Der Bewegungstest mit einer Person und ARM64-Hardware stehen noch aus. Details im Startpaket unter PRUEFSTAND.md.
