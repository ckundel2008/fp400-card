Integration **1.2.1** / App **0.1.7**: Kopplungsdaten beim Wechsel einer lokalen App zur GitHub-App erhalten.

- Expliziter Export/Import vor dem Controllerstart; normale Starts bleiben unverändert.
- Prüfsummen, private Dateirechte, Symlink- und Überschreibschutz. Die alte App und der Transfer werden als Rückweg erhalten.
- HACS und App-Katalog bleiben getrennte Updatewege. Integration und Karte funktional unverändert gegenüber 1.2.0.
- 17 zusätzliche Migrationstests; insgesamt 66 Tests sowie Paketbau, HACS und Hassfest als Release-Prüfungen.

[Schritt-für-Schritt-Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.2.1/ANLEITUNG.md) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.2.1/PRUEFSTAND.md)

Der Migrationsweg ist automatisiert geprüft; ein Live-Nachweis wird nach tatsächlicher Durchführung ergänzt. Keine erneute Kopplung und kein Reset.
