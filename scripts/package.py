"""Validate the self-contained extension and produce a Chrome Web Store upload ZIP."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "extension"
model_hashes = {
    "encoder.int8.onnx": "6c6febcb74a09435315a1d872a6539f6e7fc2c333533f14c74edc0e85c49ffcd",
    "decoder.int8.onnx": "feb03e7c8aa761593a9284a6fa1e91259be3702de75f630062256c1a59c5a906",
    "joiner.int8.onnx": "1d2c6d8e6dabc5eb52de52e95718e9bdfbffbfe7ead3808fb5ffd74e83bd9cae",
}
for name, expected in model_hashes.items():
    actual = hashlib.sha256((EXT / "model" / name).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Model integrity check failed: {name}")
tokens = (EXT / "model/tokens.txt").read_bytes()
if hashlib.sha1(b"blob " + str(len(tokens)).encode() + b"\0" + tokens).hexdigest() != "97675cfca093bb75694b0f8e5a115b3fecf51d86":
    raise SystemExit("Tokenizer integrity check failed")
manifest = json.loads((EXT / "manifest.json").read_text())
required = [manifest["background"]["service_worker"], manifest["side_panel"]["default_path"],
            *manifest["icons"].values(), "panel.js", "panel.css", "capture-target.js", "audio-worklet.js",
            "engine-worker.js", "transcript-tools.js", "file-player.js", "i18n.js", "privacy.html", "LICENSE.txt", "demo/SOURCE.json", "model/tokens.txt", "microphone.html", "microphone.js", "microphone-access.js", "microphone.css", "about.html",
            "vendor/sherpa-onnx-wasm-main-asr.js", "vendor/sherpa-onnx-wasm-main-asr.wasm",
            "vendor/sherpa-onnx-asr.js", "demo/sample-hebrew.wav", "THIRD_PARTY_NOTICES.md",
            "model/CC-BY-4.0.txt", "vendor/SHERPA-LICENSE.txt", "vendor/ONNX-RUNTIME-LICENSE.txt",
            "vendor/ONNX-RUNTIME-THIRD-PARTY-NOTICES.txt", "vendor/KISSFFT-LICENSE.txt", "vendor/KISSFFT-BSD-3-CLAUSE.txt",
            "vendor/KALDI-DECODER-LICENSE.txt", "vendor/KALDI-NATIVE-FBANK-LICENSE.txt", "vendor/EMSCRIPTEN-LICENSE.txt"]
for name in required:
    if not (EXT / name).is_file() or not (EXT / name).stat().st_size:
        raise SystemExit(f"Required bundled asset missing: {name}")
expected_files = set(required) | {"manifest.json", "BUNDLED_ASSETS.json", "model/README.upstream.md"} | {"model/" + name for name in model_hashes}
actual_files = {p.relative_to(EXT).as_posix() for p in EXT.rglob("*") if p.is_file() and p.name != ".DS_Store"}
if actual_files - expected_files:
    raise SystemExit("Unexpected files in release directory: " + ", ".join(sorted(actual_files - expected_files)))
lock = json.loads((ROOT / "assets-lock.json").read_text())
for asset in lock["assets"]:
    if hashlib.sha256((EXT / asset["path"]).read_bytes()).hexdigest() != asset["sha256"]:
        raise SystemExit("Pinned build asset integrity check failed: " + asset["path"])
if manifest.get("host_permissions"):
    raise SystemExit("Unexpected required host permissions")
if manifest.get("optional_host_permissions") != ["https://*/*", "http://*/*"]:
    raise SystemExit("Unexpected optional website access declaration")
if "media-src 'self' blob:" not in manifest["content_security_policy"]["extension_pages"]:
    raise SystemExit("Local streaming media CSP missing")
if "connect-src 'self'" not in manifest["content_security_policy"]["extension_pages"]:
    raise SystemExit("Unexpected network content security policy")
assets = {
    p.relative_to(EXT).as_posix(): {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
    for p in sorted(EXT.rglob("*")) if p.is_file() and p.name not in {"BUNDLED_ASSETS.json", ".DS_Store"}
}
(EXT / "BUNDLED_ASSETS.json").write_text(json.dumps({
    "model": "thewh1teagle/zipformer2-66m-streaming-he",
    "model_revision": "6c07526ebfdfc71d12ed4ce6aaebe32774a2613a",
    "sherpa_onnx_version": "1.13.7", "assets": assets,
}, indent=2) + "\n")
dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
output = dist / f"ivrit-local-{manifest['version']}.zip"
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for p in sorted(EXT.rglob("*")):
        if p.is_file() and p.name != ".DS_Store":
            entry = zipfile.ZipInfo(p.relative_to(EXT).as_posix(), (2026, 10, 15, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, p.read_bytes())
    if archive.testzip():
        raise SystemExit("ZIP integrity check failed")
total = sum(p.stat().st_size for p in EXT.rglob("*") if p.is_file())
print(f"Validated {len(assets)} assets; bundled model hashes match Hugging Face.")
print(f"Extension: {total / 1_000_000:.1f} MB unpacked")
print(f"ZIP: {output.stat().st_size / 1_000_000:.1f} MB — {output}")
