"""Fetch release-only model/WASM assets with pinned URLs and SHA-256 verification."""
import hashlib
import json
from pathlib import Path
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCK = json.loads((ROOT / 'assets-lock.json').read_text())
def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
def download(url, target):
    if not url.startswith('https://'):
        raise SystemExit('Only HTTPS asset sources are allowed')
    request = urllib.request.Request(url, headers={'User-Agent': 'Ivrit-Local-build/0.2'})
    with urllib.request.urlopen(request, timeout=120) as response, target.open('wb') as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
for asset in LOCK['assets']:
    target = ROOT / 'extension' / asset['path']
    if target.is_file() and digest(target) == asset['sha256']:
        print('Verified:', asset['path'])
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        staging = Path(temporary) / 'asset'
        if 'archive_url' in asset:
            archive = Path(temporary) / 'runtime.tar.bz2'
            download(asset['archive_url'], archive)
            if digest(archive) != asset['archive_sha256']:
                raise SystemExit('Runtime archive integrity check failed')
            with tarfile.open(archive) as bundle:
                matches = [entry for entry in bundle if entry.isfile() and entry.name.rsplit('/', 1)[-1] == target.name]
                if len(matches) != 1:
                    raise SystemExit('Unexpected runtime archive layout')
                with bundle.extractfile(matches[0]) as source, staging.open('wb') as output:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
        else:
            download(asset['url'], staging)
        if digest(staging) != asset['sha256']:
            raise SystemExit('Asset integrity check failed: ' + asset['path'])
        # Staging may be on another filesystem; only verified bytes reach the destination.
        target.write_bytes(staging.read_bytes())
        print('Fetched and verified:', asset['path'])
print('Build assets ready. The installed extension never downloads these assets at runtime.')
