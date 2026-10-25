Integration **1.3.0** / App **0.2.0**: Zonen benennen und bewusst bearbeiten.

- Die Karte startet als Live-Ansicht. „Bereiche bearbeiten“ schaltet Zeichnen und Zonenänderungen ausdrücklich frei.
- Zonennamen werden zentral in Home Assistant gespeichert und in allen unseren Karten angezeigt. HA-Anzeigenamen bleiben standardmäßig unverändert. Administratoren können pro Speicherung **Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)** aktivieren; die Vorschau und ein erneuter Konfliktcheck schützen vor einer falschen Zuordnung. Entitäts-IDs bleiben erhalten.
- Eine ausgewählte Erkennung wird deutlich markiert; Position, Kennung und Zonen helfen bei der Kontrolle vor dem Verwerfen.
- **Kartendrehung** im visuellen Editor und `map_rotation` erlauben −180° bis 180° (positiv im Uhrzeigersinn). Sensorzellen und Zonen werden dadurch nicht verändert.
- **Stelle als Interferenz markieren** bereitet bis zu vier Zellen um eine aktuelle Erkennung vor und erhält vorhandene Interferenzflächen. Erst bewusstes Speichern überträgt den Entwurf.
- Die Karte zeigt das Alter der letzten echten Positionsmeldung und unterscheidet fehlende oder veraltete Daten, ausgeschaltetes Tracking, Verbindungsfehler und Uhrabweichung. Veraltete Erkennungen können nicht als Grundlage für Targetaktionen dienen.
- Ungespeicherte Änderungen, konkurrierende Änderungen und ausstehende Sensorbestätigungen werden sichtbar behandelt. Smartphone-Scrollen funktioniert im Ansichtsmodus.
- Die App heißt **FP400 Controller**. **Übersicht** zeigt Verbindung, Kopplung und Versionsstände; **Einrichtung** enthält die ausdrücklich auszuführenden Schritte. Neuere oder nicht sicher vergleichbare Integrationsversionen werden nicht durch die mitgelieferte Ausgabe überschrieben. Verfügbare Integrationsupdates sind weiterhin in HACS zu prüfen.
- Controller, App-Slug, Ports und Kopplungsspeicher bleiben unverändert. Keine erneute Kopplung.

[Schritt-für-Schritt-Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.3.0/ANLEITUNG.md) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.3.0/PRUEFSTAND.md)

Integration über HACS aktualisieren oder unter **Einrichtung → Mitgelieferte Integration installieren** die gebündelte Ausgabe ausdrücklich installieren, dann HA neu starten und Browser neu laden. Nur ein App-Update ersetzt die installierte Integration nicht. Eine gespeicherte FP400-Kopplung weiterverwenden; den Kopplungsschritt bei einem Update überspringen.

86 Node- und 44 Python-Tests bestanden; Paket-, HACS- und Hassfest-Prüfung erfolgreich. Auf dem eigenen HA wurden die neue Integration, eine temporäre Änderung von Karten- und HA-Anzeigenamen mit exakter Wiederherstellung sowie das Repository-Update auf FP400 Controller 0.2.0 geprüft. Alle 16 bestehenden Matter-Geräte-IDs und sämtliche Zonen-/Bereichszellen blieben erhalten. Die App zeigt die gespeicherte Kopplung und den Sensor online. Einzelheiten und Grenzen, insbesondere simulierte Störflächenprüfungen und weiterhin historische Bilder, stehen im Prüfstand.
