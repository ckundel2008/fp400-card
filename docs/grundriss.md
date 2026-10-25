# Grundriss mit einem oder mehreren FP400

Ab Integration 1.4.0, auch in FP400 Controller 0.2.1 gebündelt. Die Karte liest vorhandene Entitäten. Bestehende Matter-Geräte und Kopplungen bleiben erhalten.

1. Integration über HACS aktualisieren, HA neu starten und Browser beziehungsweise Companion-App vollständig neu öffnen. Ohne HACS in der aktualisierten Controller-App ausdrücklich die mitgelieferte Integration installieren und danach HA neu starten. Ein App-Update allein ersetzt die installierte Integration nicht.
2. Dashboard bearbeiten → Karte hinzufügen → „Nach Karte“ → nach **FP400 Grundriss** suchen. Es gibt weiterhin die separate Karte **FP400 Radar – Zonen und Personen**. Beide werden durch dieselbe Ressource geladen; keine zusätzliche JavaScript-Ressource hinzufügen.
3. Im visuellen Editor **Grundriss bearbeiten** wählen. Erst dieser Schritt öffnet einen getrennten Entwurf.
4. Einen maßstäblichen PNG-, JPEG- oder WebP-Grundriss hochladen. Der Plan bleibt in der Dashboard-Konfiguration; er wird nicht an GitHub oder einen externen Bilddienst übertragen. SVG und externe URLs sind nicht vorgesehen. Upload maximal 10 MB und 30 Megapixel; automatische Verkleinerung auf längste Seite 1.600 Pixel.
5. Breite/Höhe des sichtbaren Plans einschließlich seiner Ränder in Metern einstellen. Alternativ **Zwei-Punkt-Kalibrierung**, zwei Punkte einer bekannten Strecke anklicken, reale Länge eintragen und Maßstab anwenden. Schräg fotografierte Pläne vorher entzerren.
6. **FP400 hinzufügen**. Die Entität **Verfolgte Personen** und optional die **Zonen desselben Geräts** auswählen. Normale Matter-Anwesenheitsentitäten enthalten keine Positionsdaten. Bei vorhandener Gerätezuordnung werden widersprüchliche Paare blockiert.
7. Den Sensor per Klick an seiner Montageposition platzieren oder X/Y in Metern eintragen: X ab linkem, Y ab oberem Planrand. Blickrichtung **0° oben, 90° rechts, 180° unten, −90° links**. Die Pfeillinie kontrollieren. Bei seitenverkehrten Radarflächen **Links/rechts spiegeln (Zonen und Ziele)** aktivieren. Dies verändert ausschließlich die Darstellung.
8. Weitere FP400 mit eigenen Personenentitäten hinzufügen. Pro Karte maximal 16 Sensoren. Eine Etage pro Karte; für weitere Etagen separate Karten anlegen. Sensorpositionen an bekannten Stellen im Raum prüfen, nicht nur anhand des Plans schätzen.
9. **Entwurf übernehmen**, danach im HA-Kartendialog **Speichern**. **Abbrechen** verwirft den Entwurf. Externe Konfigurationsänderungen blockieren das Übernehmen eines älteren Entwurfs.

Manueller Kartentyp, falls die Suche noch keinen Eintrag zeigt:

```yaml
type: custom:aqara-fp400-floorplan-card
```

Die Karte bearbeitet keine Zonen im FP400 und ruft keine Sensor-Schreibdienste auf. Zonennamen kommen aus der ausgewählten Entität. Ziele älter als 15 Sekunden oder mit unplausibel zukünftigem Zeitstempel werden nicht als live gezeichnet. Jeder Sensor hat eine eigene Statusanzeige. Es gibt keine sensorübergreifende Personenzahl, Identitätsverknüpfung oder Hund-/Babyklassifizierung; überlappende Sensoren können dieselbe Erkennung doppelt anzeigen.

## Wechsel von der getrennten Testkarte

Die alten Typen `custom:fp400-floorplan-test-v5` und `custom:fp400-floorplan-test` bleiben als Kompatibilitätsnamen vorhanden. Bild, Ausschnitt, Position, Richtung, Spiegelung und HA-Layout bleiben erhalten. Beim nächsten bewussten Übernehmen im neuen Editor wird der öffentliche Kartentyp gespeichert. Keine automatische Umschreibung fremder Dashboards.

Nach dem Update ausschließlich die eigene zusätzliche Lab-Ressource entfernen, sofern sie bisher separat registriert war; die gemeinsame FP400-Ressource `/aqara_fp400/aqara-fp400-zone-card.js?v=1.4.0` muss erhalten bleiben. Danach die HA-Ansicht vollständig neu öffnen. Eine schon geladene alte Custom-Element-Klasse wird nicht durch eine neue URL innerhalb derselben laufenden Seite ersetzt.

Die Grundfunktionen und der Datenfluss wurden mit einem echten FP400 geprüft. Mehrere echte Sensoren, räumliche Genauigkeit jeder Montageposition und vollständige iPhone-Touchabnahme sind weiterhin offene Prüfungen. Bestehende Sitz-/Gangtests belegen keine Mehrsensor-Abnahme.
