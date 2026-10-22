"""Build the redistributable package; no credentials or household data are included."""
from pathlib import Path
from hashlib import sha256
import html
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PACKAGE_FILES = (
    "fp400-app.zip", "fp400-installieren.sh", "START-HIER.html",
    "ANLEITUNG.md", "LICENSE", "THIRD-PARTY.md", "PRUEFSTAND.md",
    "docs/images/04-radar-sitztest-echt.jpg",
    "docs/images/05-sofa-belegung-echt.jpg",
)


def add_tree(archive, source, prefix):
    for item in sorted(source.rglob("*")):
        if item.is_symlink():
            raise ValueError(f"Symlink in release: {item}")
        if item.is_file() and "__pycache__" not in item.parts and item.suffix != ".pyc":
            archive.write(item, f"{prefix}/{item.relative_to(source).as_posix()}")


def build():
    shutil.copytree(ROOT / "custom_components", ROOT / "fp400_setup/integration", dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    DIST.mkdir(exist_ok=True)
    app = DIST / "fp400-app.zip"
    with zipfile.ZipFile(app, "w", zipfile.ZIP_DEFLATED) as archive:
        add_tree(archive, ROOT / "fp400_setup", "fp400_setup")
    digest = sha256(app.read_bytes()).hexdigest()
    installer = (ROOT / "install-template.sh").read_text().replace("__ARCHIVE_SHA256__", digest)
    (DIST / "fp400-installieren.sh").write_text(installer)
    for name in ("ANLEITUNG.md", "LICENSE", "THIRD-PARTY.md", "PRUEFSTAND.md"):
        shutil.copy2(ROOT / name, DIST / name)
    for name in PACKAGE_FILES:
        if name.startswith("docs/images/"):
            (DIST / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, DIST / name)
    guide = (ROOT / "ANLEITUNG.md").read_text()
    # Self-contained, printable guide; render a small controlled Markdown subset.
    # Inline escaping deliberately keeps prose/code safe in a local downloaded file.
    import re
    def inline(text):
        escaped = html.escape(text)
        escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
        escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
        return re.sub(r"\[([^]]+)\]\((https://[^)]+)\)", r'<a href="\2">\1</a>', escaped)
    lines, code, table = [], None, False
    for line in guide.splitlines():
        if table and not line.startswith("|"):
            lines.append("</tbody></table>")
            table = False
        if line.startswith("```"):
            if code is None: code = []
            else:
                lines.append("<pre>" + html.escape("\n".join(code)) + "</pre>")
                code = None
        elif code is not None: code.append(line)
        elif line.startswith("# "): lines.append("<h1>" + inline(line[2:]) + "</h1>")
        elif line.startswith("## "): lines.append("<h2>" + inline(line[3:]) + "</h2>")
        elif line.startswith("- "): lines.append('<p class="item">• ' + inline(line[2:]) + "</p>")
        elif line.startswith("|"):
            cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
            if all(re.fullmatch(r"[-: ]+", cell) for cell in cells): continue
            if not table:
                lines.append('<table><thead><tr>' + ''.join('<th>' + inline(cell) + '</th>' for cell in cells) + '</tr></thead><tbody>')
                table = True
            else: lines.append('<tr>' + ''.join('<td>' + inline(cell) + '</td>' for cell in cells) + '</tr>')
        elif line.strip(): lines.append("<p>" + inline(line) + "</p>")
    page = '''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FP400 – Schritt für Schritt</title><style>body{font:17px/1.65 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 22px;color:#18342c;background:#fafcfa}h1{font-size:34px;line-height:1.2}h2{margin-top:42px;font-size:24px}pre{background:#eaf0ed;border-radius:10px;padding:18px;overflow:auto;font-size:14px}code{font-size:.9em}a{color:#176952}.item{margin:6px 0}table{width:100%;border-collapse:collapse;font-size:15px}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #cad9d0;padding:10px;overflow-wrap:anywhere}@media print{body{font-size:11pt}h2{break-after:avoid}pre{white-space:pre-wrap}}</style><main>''' + "\n".join(lines) + '</main></html>'
    (DIST / "START-HIER.html").write_text(page)
    # Include only named deliverables, including the report's relative image paths.
    # Stale build outputs and unrelated local files must never enter the archive.
    manifest = {name: sha256((DIST / name).read_bytes()).hexdigest() for name in PACKAGE_FILES}
    (DIST / "SHA256SUMS.json").write_text(json.dumps(manifest, indent=2) + "\n")
    with zipfile.ZipFile(DIST / "FP400-Startpaket.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for name in [*manifest, "SHA256SUMS.json"]:
            archive.write(DIST / name, name)
    print(json.dumps({"package": str(DIST / "FP400-Startpaket.zip"), "app_sha256": digest,
                      "bytes": (DIST / "FP400-Startpaket.zip").stat().st_size}, indent=2))


if __name__ == "__main__":
    build()
