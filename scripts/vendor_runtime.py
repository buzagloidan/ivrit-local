"""Extract the pinned upstream browser runtime and replace its example preloader."""
import hashlib
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
DIGEST = "21559527d65f7674a45834870e4f51b0af14be27d4de1043aa6f576d9b426acc"
archive = Path(sys.argv[1])
if hashlib.sha256(archive.read_bytes()).hexdigest() != DIGEST:
    raise SystemExit("The archive does not match the official pinned release.")
names = {"sherpa-onnx-wasm-main-asr.js", "sherpa-onnx-wasm-main-asr.wasm", "sherpa-onnx-asr.js"}
destination = ROOT / "extension/vendor"
with tarfile.open(archive) as bundle:
    for entry in bundle:
        name = entry.name.rsplit("/", 1)[-1]
        if name in names:
            (destination / name).write_bytes(bundle.extractfile(entry).read())
loader = destination / "sherpa-onnx-wasm-main-asr.js"
source = loader.read_text()
start = source.index('if(!Module["expectedDataFileDownloads"])')
end = source.index("var arguments_=[];", start)
source = source[:start] + "/* Ivrit Local: example-model preloader removed; packaged Hebrew files are mounted by engine-worker.js. */" + source[end:]
loader.write_text(source)
print("Extracted the verified runtime; removed the English example preloader.")
