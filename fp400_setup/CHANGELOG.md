# 0.1.7 – 2026-10-24

- Optionaler Migrationsmodus `export`/`import` für lokale Kopplungsdaten; Standard `none`.
- Export startet keinen Controller. Import nur vor Controllerstart in ein leeres oder identisches Ziel, mit Prüfsummen und Symlink-Schutz.
- Alte Daten werden erhalten; keine neue FP400-Kopplung erforderlich. Anleitung unter DOCS.md beachten.
- Integration 1.2.1 gebündelt, funktional wie 1.2.0.

# 0.1.6 – 2026-10-23

- Integration 1.2.0 mit korrigierten Live-Meldungen und bestätigtem Verwerfen einzelner Erkennungen gebündelt.
- Controller, App-Slug und gespeicherte Kopplungen unverändert. Keine erneute Kopplung erforderlich.
- Integration zusätzlich über HACS aktualisieren oder im App-Dialog installieren; danach HA neu starten.

# 0.1.5 – 2026-10-23

- Reguläre App-Ausgabe (`stage: stable`) nach bestätigtem Praxistest beim Kollegen.
- Integration 1.1.6 und aktuelle Anleitung gebündelt. Karten- und Controller-Code unverändert.
- App-Slug, Speicherpfade und Kopplungsdaten unverändert; bestehende App aktualisieren, nicht deinstallieren oder neu koppeln.
- Repository-App über den HA-App-Store aktualisieren; lokale ZIP-App erhält keine Repository-Updates. HACS verwaltet nur Integration und Karte.

# 0.1.4 – 2026-10-23

- Integration 1.1.5 gebündelt; Karten- und Controller-Verhalten gegenüber 0.1.3 unverändert.
- Startpaket mit Klickanleitung, Updatehilfe und bestandenem Live-Test des Karteneditors.

# 0.1.3 – 2026-10-23

- Gebündelte Integration 1.1.4 mit visuellem Karteneditor und sprachunabhängiger Entitätszuordnung.
- Controller-Code, Ports und Kopplungsspeicher unverändert. Ein App-Update allein ersetzt nicht die bereits installierte Integration; diese über HACS aktualisieren oder den Installationsschritt im aktualisierten Dialog ausführen.

# 0.1.2 – 2026-10-22

- Geräteerkennung an das tatsächliche WebSocket-Antwortformat von Matter Server 1.5.2 angepasst; kurzer Diskriminator wird aus dem langen abgeleitet. Falsche oder mehrdeutige Geräte bleiben gesperrt.

# 0.1.1 – 2026-10-22

- Echte Controller-Bereitschaftsprüfung für den Supervisor ergänzt. `HEALTHCHECK NONE` hinterließ die App auf dem getesteten Supervisor im Startstatus.
- Link auf die aktuelle HA-App-Seite korrigiert (`/config/app/.../info`).

# 0.1.0 – 2026-10-22

- Lokale App mit Einrichtungsdialog auf Deutsch.
- Installation mit Sicherung einer vorhandenen FP400-Integration.
- Zusätzliche FP400-Kopplung über Freigabecode; bestehender Matter-Server bleibt unangetastet.
- Geräteprüfung, sichere Wiederverbindung und verständliche Fehlermeldungen.
- Experimentelle Ausgabe: automatisierte lokale Tests und simulierte Browserprüfung; frischer HA-OS-/Hardwaretest noch ausstehend.
