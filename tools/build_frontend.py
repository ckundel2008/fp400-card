"""Bundle both cards without runtime imports, for identical HACS/app delivery."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def build():
    model = (ROOT / 'frontend/floorplan/model.mjs').read_text()
    card = (ROOT / 'frontend/floorplan/card.js').read_text()
    first, body = card.split('\n', 1)
    if not first.startswith('import {') or not first.endswith("from './model.mjs';"):
        raise ValueError('Unexpected floorplan imports')
    bundle = '\n;(()=>{\n' + re.sub(r'^export ', '', model, flags=re.M)
    bundle += '\n' + re.sub(r'^export ', '', body, flags=re.M) + '\n})();\n'
    if re.search(r'^\s*(import |export )', bundle, re.M):
        raise ValueError('The delivered module must be self-contained')
    result = (ROOT / 'frontend/aqara-fp400-zone-card.js').read_text() + bundle
    for target in ['custom_components/aqara_fp400/www/aqara-fp400-zone-card.js',
                   'fp400_setup/integration/aqara_fp400/www/aqara-fp400-zone-card.js']:
        (ROOT / target).write_text(result)
    return result


if __name__ == '__main__':
    build()
