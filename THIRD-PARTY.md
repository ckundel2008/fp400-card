# Herkunft und Lizenzen

Die enthaltene Integration basiert auf RAR/ha-aqara-fp400, Version 1.1.0, Quellstand 305bccb. Copyright 2026 Andrew Rankin, MIT-Lizenz. Vollständiger Lizenztext in LICENSE. Änderungen dieser Ausgabe: unabhängiger lokaler Controller, Zuordnung über Geräteidentität, Wiederverbindung und Einrichtungsdialog auf Deutsch/Englisch.

https://github.com/RAR/ha-aqara-fp400

Das App-Image basiert auf dem OHF Matter Server 1.5.2 (Apache-2.0). Das Image wird bei der Installation von ghcr.io geladen; es ist nicht in diesem ZIP enthalten. Der Dockerfile fixiert den Multiarch-Manifest-Digest sha256:47bc4d8354baf4775c1daf87b02b61123b1b61feeb3b2eadb17c610dbbda9a1c. Weitere Abhängigkeiten und Lizenztexte gehören zum Upstream-Image und -Quellcode.

https://github.com/matter-js/matterjs-server/tree/v1.5.2

Die neuen Installations- und Dialogdateien werden unter derselben MIT-Lizenz wie die Integration bereitgestellt. Das Paket enthält keine Tokens, gespeicherten Matter-Fabrics, Geräteseriennummern oder Zugangsdaten einer konkreten HA-Installation.
