FP400 Einrichtung **0.1.5** ist jetzt auch im HA-App-Katalog als reguläre App (`stable`) gekennzeichnet. Dieses Release bündelt Integration **1.1.6** und ein neu gebautes Startpaket mit aktueller Anleitung, Prüfstand und echten Bildern.

- Karten- und Controller-Code unverändert; App-Slug und Kopplungsspeicher bleiben erhalten.
- Der erfolgreiche Praxistest des Vorgängerpakets beim Kollegen ist als Rückmeldung des Projektinhabers dokumentiert.
- Repository-App: HA-Sicherung einschließlich App erstellen, vorhandene App im HA-App-Store aktualisieren, nach dem Start den vorhandenen FP400 prüfen. Nicht deinstallieren oder neu koppeln.
- HACS aktualisiert nur Integration und Karte. Ohne HACS den Integrations-Installationsschritt im aktualisierten App-Dialog ausführen, danach HA neu starten.
- Lokale ZIP-App: keine Repository-Updates; nicht durch eine zweite Repository-App ersetzen, da deren Daten nicht automatisch übernommen werden. Für reine Kartenupdates die laufende App behalten und die Integration über HACS verwalten.

**Downloads:** `FP400-Startpaket.zip` entpacken und `START-HIER.html` öffnen. Das Paket enthält den aktuellen Prüfstand und beide echten Sitztest-Bilder. `SHA256SUMS.json` enthält die Prüfsummen der Paketbestandteile.

Vor Veröffentlichung werden 25 Node-Tests, 16 Python-Tests sowie HACS und Hassfest ausgeführt. Diese Metadaten-/Dokumentationsausgabe wurde nicht erneut auf dem produktiven HA installiert. Keine offizielle HA-/Aqara-Ausgabe.

[Update-Anleitung](https://github.com/ckundel2008/fp400-card/blob/v1.1.6/ANLEITUNG.md#update-einer-bestehenden-installation) · [Prüfstand](https://github.com/ckundel2008/fp400-card/blob/v1.1.6/PRUEFSTAND.md)
