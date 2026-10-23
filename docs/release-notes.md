Integration **1.2.0** und FP400 Einrichtung **0.1.6** sind reguläre Ausgaben.

- Live-Meldungen: skalare Attributwerte werden korrekt verarbeitet; Null-Personen-Meldungen und Zonenänderungen kommen im Zustand an.
- Falsche Personenerkennung: Punkt auf der Karte antippen und **Erkennung verwerfen** bestätigen. Fehler erhalten die Auswahl; Vorschau bleibt schreibgeschützt.
- Controller, Gerätezuordnung und Kopplungsspeicher unverändert. Nicht neu koppeln oder zurücksetzen.
- Vorher HA einschließlich App sichern. HACS aktualisiert Integration und Karte; anschließend HA neu starten und Browser neu laden. Ohne HACS die gebündelte Integration im aktualisierten App-Dialog installieren.
- Repository-App über HA aktualisieren. Lokale ZIP-Apps erhalten keine Repository-Updates; nicht durch eine zweite App ersetzen. Für reine Integrationsupdates kann die laufende App beibehalten werden.

Paket mit aktueller Anleitung, ehrlichem Prüfstand und beiden echten Sitztest-Bildern. Vor Veröffentlichung: Paketbau, 27 Node-Tests, 22 Python-Tests, HACS und Hassfest. Neue Funktionen automatisiert geprüft, noch kein neuer Hardwaretest; bisherige Sitz-/Gangtests bleiben gesondert dokumentiert.

[Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.2.0/ANLEITUNG.md) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.2.0/PRUEFSTAND.md)
