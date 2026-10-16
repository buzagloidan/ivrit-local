"""Validate the store artwork/copy and bundle them with the existing extension ZIP."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'store-kit'
version = json.loads((ROOT / 'extension/manifest.json').read_text())['version']
package = ROOT / 'dist' / f'ivrit-local-{version}.zip'
if not package.is_file():
    raise SystemExit('Build the extension first: python3 scripts/package.py')
with zipfile.ZipFile(package) as archive:
    if json.loads(archive.read('manifest.json'))['version'] != version or archive.testzip():
        raise SystemExit('Extension ZIP failed validation')

def dimensions(path):
    data = path.read_bytes()
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return struct.unpack('>II', data[16:24])
    if data[:2] != b'\xff\xd8':
        raise SystemExit(f'Expected PNG/JPEG image: {path.name}')
    position = 2
    while position < len(data):
        if data[position] != 0xff:
            raise SystemExit(f'Invalid JPEG marker: {path.name}')
        while data[position] == 0xff:
            position += 1
        marker = data[position]
        position += 1
        if marker in (0xd8, 0xd9) or 0xd0 <= marker <= 0xd7:
            continue
        size = int.from_bytes(data[position:position+2], 'big')
        if marker in (0xc0, 0xc1, 0xc2):
            height, width = struct.unpack('>HH', data[position+3:position+7])
            return width, height
        position += size
    raise SystemExit(f'JPEG dimensions missing: {path.name}')

images = {
    'icon-128.png': (128, 128),
    'screenshot-01-overview-1280x800.jpg': (1280, 800),
    'screenshot-02-privacy-1280x800.jpg': (1280, 800),
    'promo-small-440x280.jpg': (440, 280),
    'promo-marquee-1400x560.jpg': (1400, 560),
}
for name, expected in images.items():
    path = KIT / 'images' / name
    if not path.is_file() or dimensions(path) != expected:
        raise SystemExit(f'Missing image or incorrect dimensions: {name}; expected {expected}')
for name in ['name.txt', 'short-description.txt', 'description-he.txt', 'links.txt',
             'privacy-and-permissions.txt', 'reviewer-instructions.txt', 'PRIVACY.md', 'acceptance-checks.md']:
    if not (KIT / 'text' / name).read_text().strip():
        raise SystemExit(f'Missing store copy: {name}')
for name, limit in [('name.txt', 75), ('short-description.txt', 132)]:
    if len((KIT / 'text' / name).read_text().strip()) > limit:
        raise SystemExit(f'{name} exceeds {limit} characters')
if len((KIT / 'text/description-he.txt').read_text().strip()) > 16000:
    raise SystemExit('Detailed description exceeds 16000 characters')
files = sorted(path for path in KIT.rglob('*') if path.is_file() and path.name not in {'.DS_Store', 'SHA256SUMS.txt'})
entries = [(path.relative_to(KIT).as_posix(), path) for path in files]
entries.append((f'package/{package.name}', package))
checksums = ''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {name}\n' for name, path in entries)
(KIT / 'SHA256SUMS.txt').write_text(checksums)
entries.append(('SHA256SUMS.txt', KIT / 'SHA256SUMS.txt'))
output = ROOT / 'dist' / f'ivrit-local-store-kit-{version}.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name, path in entries:
        entry = zipfile.ZipInfo(name, (2026, 10, 16, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_STORED if path.suffix == '.zip' else zipfile.ZIP_DEFLATED
        archive.writestr(entry, path.read_bytes())
    if archive.testzip():
        raise SystemExit('Store kit ZIP integrity check failed')
print(f'Validated {len(images)} images, copy lengths, package version, checksums and ZIP integrity.')
print(f'Store kit: {output} ({output.stat().st_size / 1_000_000:.1f} MB)')
