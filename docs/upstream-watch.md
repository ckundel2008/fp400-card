# Upstream beobachten

Der Workflow **Upstream watch** prüft täglich um 07:17 UTC Releases, aktuelle Commits und offene Pull Requests von `RAR/ha-aqara-fp400`. In Deutschland entspricht das 08:17 Uhr im Winter und 09:17 Uhr im Sommer. GitHub kann geplante Läufe verzögern.

Der Bericht steht in der Zusammenfassung des jeweiligen [Workflow-Laufs](https://github.com/ckundel2008/fp400-card/actions/workflows/upstream-watch.yml) und 30 Tage lang als Artefakt `upstream-report`. Ein manueller Lauf ist über **Run workflow** möglich. Es werden keine Nachrichten oder Kommentare versendet und keine Änderungen automatisch übernommen oder in HA installiert.

Lokale Übernahmeentscheidungen, Stand 25.10.2026:

- **Upstream 1.1.1 übernommen:** Die Korrektur der Verarbeitung gepushter Attribute ist seit unserer Version 1.2.0 enthalten und durch Regressionstests abgesichert.
- **Upstream 1.2.0 übernommen:** `remove_target` und die Kartenaktion zum Verwerfen einer Erkennung sind seit unserer Version 1.2.0 enthalten, ergänzt um ausdrückliche Bestätigung, Fehlerbehandlung und eine Schreibsperre in der Vorschau.
- **PR #6 nicht übernommen:** Für native Aktivität und Personenanzahl wird kein zusätzlicher periodischer Lesezyklus ergänzt. Die korrigierten Attribut-Abonnements empfangen diese Werte bereits. Das bestehende Einlesen von Zonen und Bereichen bleibt davon unberührt.

Diese Entscheidungen beschreiben unseren Quellstand, nicht den heutigen Zustand des Upstream-Repositories oder eine Aktivierung in HA. Unsere Versionsnummern sind unabhängig von den Upstream-Versionen. Tatsächlich abgeschlossene Hardwareprüfungen und verbleibende Grenzen stehen in [PRUEFSTAND.md](../PRUEFSTAND.md).

Der eingecheckte [upstream-report.md](../upstream-report.md) enthält weiterhin den historischen GitHub-Abruf vom 23.10.2026. Am 25.10.2026 wurden darin nur die lokalen Übernahmeentscheidungen berichtigt; Releases, Commits, PR-Liste und Abrufzeit wurden nicht neu abgefragt. Für den neuesten erfolgreichen Abruf die Workflow-Zusammenfassung beziehungsweise das Artefakt prüfen. Das Skript schreibt die Übernahmeentscheidungen auch in künftige Berichte, damit bereits enthaltene Änderungen nicht wieder als ausstehend erscheinen.

Der Beobachtungsstand im Skript ist kein Integrationsstand. Vor einer Übernahme Änderungen einzeln prüfen, die eigenen Anpassungen erhalten und Tests ausführen. Eine erfolgreiche Berichtserstellung bedeutet nicht, dass die gemeldeten Änderungen bereits in unserem Projekt enthalten sind.
