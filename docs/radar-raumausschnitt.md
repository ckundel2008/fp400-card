# Radar-Karte: Raumausschnitt und freie Sensorposition

Ab Integration 1.4.0 / FP400 Controller 0.2.1. Die Optionen ergänzen die bisherige Radar-Karte `custom:aqara-fp400-zone-card`; ein Grundrissbild oder neuer Controller wird dafür nicht benötigt.

1. Dashboard bearbeiten und die vorhandene Radar-Karte öffnen.
2. Im visuellen Editor unter **Sichtbarer Ausschnitt** die Option **Raumausschnitt und freie Sensorposition** wählen.
3. **Ausschnittbreite** und **Ausschnitttiefe** in Metern eintragen. Gemeint ist der gewünschte rechteckige sichtbare Bereich, nicht die Kartenbreite auf dem Bildschirm. Erlaubt sind 0,5 bis 30 Meter pro Seite. Das Verhältnis bestimmt die Form der Karte.
4. **Sensor-X** vom linken Rand und **Sensor-Y** vom oberen Rand dieses Ausschnitts messen. Beide Werte dürfen null sein; der Montagepunkt muss innerhalb oder auf dem Rand des Ausschnitts liegen. Zuerst bei Bedarf die Sensorwerte verkleinern, bevor der Ausschnitt kleiner eingestellt wird.
5. **Sensor in der Darstellung** und **Kartendrehung** einstellen. „Oben“ blickt bei 0° nach unten; „Unten“ blickt bei 0° nach oben. Positive Winkel drehen im Uhrzeigersinn. Im Raumausschnitt dreht die Darstellung um den Montagepunkt, der selbst stehen bleibt. Die Pfeilspitze zeigt die Richtung.
6. Vorschau prüfen und im HA-Kartendialog speichern. Die normale Live-Ansicht bleibt gegen versehentliches Malen gesperrt. Zonenänderungen benötigen weiterhin **Bereiche bearbeiten**.

Beispiel: Sensor einen Meter vom linken Rand an der oberen Wand, Blick nach unten; sichtbarer Bereich 5 × 4 Meter:

```yaml
type: custom:aqara-fp400-zone-card
entity: sensor.wohnzimmer_zonen
targets_entity: sensor.wohnzimmer_verfolgte_personen
view_mode: room
room_width: 5
room_height: 4
sensor_x: 1
sensor_y: 0
sensor_at: top
map_rotation: 0
```

Für Montage oben links mit Blick diagonal nach rechts unten: `sensor_x: 0`, `sensor_y: 0`, `sensor_at: top`, `map_rotation: -45`. Für oben rechts mit Blick nach links unten: `sensor_x: 5`, `sensor_y: 0`, `sensor_at: top`, `map_rotation: 45`. Ein Sensor an der unteren Wand mit Blick nach oben verwendet `sensor_at: bottom`, `sensor_y: 4`, Drehung 0°. Sensor-X und -Y beziehen sich immer auf den ungedrehten Ausschnitt, nicht auf das Radarraster.

Die Karte verschiebt und dreht Sensorzeichen, Zonen, Bereiche und Live-Ziele gemeinsam. Sie beschneidet nur die Anzeige. Das Radar behält seine Reichweite und alle gespeicherten Zellen. Auch vollständig unsichtbare Teile einer vorhandenen Zone bleiben beim Speichern erhalten; der Ausschnitt ist keine Löschfunktion. Eine große sichtbare Fläche erweitert nicht die physische Erfassung.

Der Hinweis über der Karte erklärt, dass außerhalb liegende Zellen und Ziele ausgeblendet sind. Die Live-Anzahl im Kopf gilt weiterhin für das gesamte Radar. Versteckte Zellen und Ziele erhalten keinen Tastaturfokus. Die Anzahl ist kein Beleg dafür, wie viele Personen gerade im gewählten Ausschnitt stehen.

Zum Zurückstellen **Vollständiges Radar (Standard)** wählen beziehungsweise `view_mode: radar` setzen. Vorhandene Karten ohne die neuen Optionen behalten ihre bisherigen Abmessungen und ihre bisherige Drehung um die Rastermitte. Maße und Sensorposition bleiben im Editor deaktiviert erhalten, sodass sie beim erneuten Umschalten wieder verfügbar sind. Ungültige Werte werden zurückgewiesen; der Editor übernimmt sie nicht.

Die Grundrisskarte bleibt eine zusätzliche, davon unabhängige Ansicht für ein Hintergrundbild und mehrere FP400. Diese Erweiterung überträgt ausschließlich Ausschnitt und Montagepunkt auf die Einzel-Radarkarte.
