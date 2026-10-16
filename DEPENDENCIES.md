# Dependency inventory

No npm/Python packages are needed for the extension or development utilities.

| Component | Pinned version/source | License | Verification |
|---|---|---|---|
| Hebrew INT8 Zipformer model | HF revision `6c07526ebfdfc71d12ed4ce6aaebe32774a2613a` | CC BY 4.0 | SHA-256 in assets-lock.json |
| sherpa-onnx WebAssembly | v1.13.7 official SIMD browser archive | Apache-2.0 and dependency notices | Archive/binary SHA-256 |
| ONNX Runtime within the runtime build | 1.27.1, per upstream archive notices | MIT | Covered by pinned runtime archive |
| kaldi-native-fbank | 1.22.3 | Apache-2.0 | Covered by pinned runtime archive |
| kaldi-decoder | 0.3.0 | Apache-2.0 | Covered by pinned runtime archive |
| Kiss FFT / Emscripten support | Per upstream notices | BSD/MIT/NCSA | Covered by pinned runtime archive |
| Demo recording | YaronSh / Lingua Libre, 2023-12-16 | CC0-1.0 | Original SHA-1 in demo/SOURCE.json |

See extension/THIRD_PARTY_NOTICES.md for source URLs and complete bundled license texts.
The generated runtime loader is modified only to remove the example English model preloader;
scripts/vendor_runtime.py reproduces that transformation from the verified archive.

CI GitHub Actions are pinned to full commit IDs. Dependabot monitors Actions updates.
The WebAssembly build's native dependencies are not npm dependencies; upstream advisories and
release notes must be checked manually before each release. Hash verification establishes
provenance/integrity, not absence of vulnerabilities. No clean-CVE-audit claim is made here.
