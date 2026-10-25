#!/bin/sh
set -eu

fail() { printf '\nAbgebrochen: %s\n' "$1" >&2; exit 1; }
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
archive="$base/fp400-app.zip"
expected='__ARCHIVE_SHA256__'
[ -f "$archive" ] || fail 'ZIP-Datei fehlt. fp400-app.zip neben diese Installationshilfe hochladen.'
for program in unzip sha256sum curl mktemp; do
  command -v "$program" >/dev/null 2>&1 || fail "Werkzeug fehlt: $program. Bitte die offizielle App Terminal & SSH verwenden."
done
[ -n "${SUPERVISOR_TOKEN:-}" ] || fail 'Bitte innerhalb der offiziellen HA-App Terminal & SSH ausführen.'
actual=$(sha256sum "$archive")
actual=${actual%% *}
[ "$actual" = "$expected" ] || fail 'Dateiprüfung fehlgeschlagen. Die richtige fp400-app.zip erneut hochladen.'
if [ -d /local_apps ]; then
  apps=/local_apps
elif [ -d /addons ]; then
  apps=/addons
else
  fail 'Kein lokaler App-Ordner gefunden. Dieses Paket benötigt Home Assistant OS und Terminal & SSH mit lokalem App-Zugriff.'
fi
[ -w "$apps" ] || fail 'Der lokale App-Ordner ist nicht beschreibbar.'
lock="$apps/.fp400-install.lock"
mkdir "$lock" 2>/dev/null || fail 'Eine Installation läuft bereits. Nach abgebrochenem Versuch Terminal neu öffnen und den verwaisten Ordner .fp400-install.lock prüfen.'
stage=''
cleanup() {
  [ -z "$stage" ] || rm -rf "$stage"
  rmdir "$lock" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 1' INT TERM HUP
stage=$(mktemp -d "$apps/.fp400-auspacken.XXXXXX")
unzip -q "$archive" -d "$stage" || fail 'ZIP-Datei konnte nicht entpackt werden.'
[ -f "$stage/fp400_setup/config.yaml" ] || fail 'App-Konfiguration fehlt im Paket.'
destination="$apps/fp400_setup"
if [ -e "$destination" ] || [ -L "$destination" ]; then
  printf '%s\n' 'Der App-Ordner existiert bereits. Es werden keine Dateien überschrieben; nur der Katalog wird neu eingelesen.'
else
  mv "$stage/fp400_setup" "$destination"
fi
# The catalog endpoint reads local app definitions; it does not restart any server.
curl -fsS --max-time 60 -X POST \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  http://supervisor/store/reload >/dev/null || fail 'App-Dateien liegen bereit, aber der Katalog konnte nicht neu eingelesen werden. Installationshilfe später erneut ausführen.'
printf '\n%s\n' 'Fertig. Im App-Store unter Lokale Apps: FP400 Controller installieren.'
printf '%s\n' 'Der bestehende Matter-Server wurde nicht verändert oder neu gestartet.'
