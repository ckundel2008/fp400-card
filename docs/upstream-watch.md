# Upstream beobachten

Der Workflow **Upstream watch** prüft täglich um 07:17 UTC Releases, aktuelle Commits und offene Pull Requests von `RAR/ha-aqara-fp400`. In Deutschland entspricht das 08:17 Uhr im Winter und 09:17 Uhr im Sommer. GitHub kann geplante Läufe verzögern.

Der Bericht steht in der Zusammenfassung des jeweiligen [Workflow-Laufs](https://github.com/ckundel2008/fp400-card/actions/workflows/upstream-watch.yml) und 30 Tage lang als Artefakt `upstream-report`. Ein manueller Lauf ist über **Run workflow** möglich. Es werden keine Nachrichten oder Kommentare versendet und keine Änderungen automatisch übernommen oder in HA installiert.

Erster Stand am 23.10.2026: Upstream 1.1.1 korrigiert die Verarbeitung gepushter Attribute. Upstream 1.2.0 ergänzt `remove_target` und das Entfernen eines Ziels durch Anklicken der Karte. Beides wurde für unsere Version 1.2.0 übernommen und mit Regressionstests für Callback-Verarbeitung, Fehlerfälle und Vorschau-Schreibsperre ergänzt. Ein Hardwaretest der neuen Funktionen steht noch aus. Unsere Versionsnummern sind unabhängig von den Upstream-Versionen.

Der Beobachtungsstand im Skript ist kein Integrationsstand. Vor einer Übernahme Änderungen einzeln prüfen, die eigenen Anpassungen erhalten und Tests ausführen. Eine erfolgreiche Berichtserstellung bedeutet nicht, dass die gemeldeten Änderungen bereits in unserem Projekt enthalten sind.
