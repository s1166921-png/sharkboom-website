"""Encode actual first-frame WebGL captures as small inline images for SSR first paint."""
from pathlib import Path
from io import BytesIO
import base64
import json
from PIL import Image

root = Path(__file__).resolve().parents[2]
definitions = [('WORLD_POSTER_DESKTOP', 'world-desktop.png', 760),
               ('WORLD_POSTER_MOBILE', 'world-mobile.png', 520),
               ('MASCOT_POSTER', 'mascot.png', 420)]
parts = ['// Generated from actual WebGL first frames; no separate image request is needed.']
sizes = {}
for name, filename, max_width in definitions:
    im = Image.open(root / 'outputs/loading-qa' / filename).convert('RGBA')
    if im.width > max_width:
        im.resize((max_width, round(im.height * max_width / im.width)), Image.Resampling.LANCZOS).save(root / 'outputs/loading-qa' / ('scaled-' + filename))
        im = Image.open(root / 'outputs/loading-qa' / ('scaled-' + filename))
    encoded = BytesIO()
    im.save(encoded, format='WEBP', quality=79, method=6)
    payload = encoded.getvalue()
    parts.append(f'export const {name}=' + json.dumps('data:image/webp;base64,' + base64.b64encode(payload).decode('ascii')) + ';')
    sizes[name] = {'width': im.width, 'height': im.height, 'bytes': len(payload)}
(root / 'app/motion-3d/poster-assets.ts').write_text('\n'.join(parts) + '\n', encoding='utf-8')
(root / 'outputs/loading-qa/poster-sizes.json').write_text(json.dumps(sizes, indent=2), encoding='utf-8')
print(json.dumps(sizes, indent=2))
