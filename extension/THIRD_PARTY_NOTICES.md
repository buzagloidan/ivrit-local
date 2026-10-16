# Third-party notices

## Hebrew model

zipformer2-66m-streaming-he by **thewh1teagle**.
Source: https://huggingface.co/thewh1teagle/zipformer2-66m-streaming-he
Revision: 6c07526ebfdfc71d12ed4ce6aaebe32774a2613a.
License: Creative Commons Attribution 4.0 International; full text in model/CC-BY-4.0.txt.
The INT8 model files are unchanged. This extension adapts the model's deployment to a browser.
The model author credits the icefall English streaming Zipformer base model and ivrit.ai training audio.
The complete author-supplied model card is retained at model/README.upstream.md.

## Recognition engine

sherpa-onnx v1.13.7, copyright the sherpa-onnx contributors, including Xiaomi Corporation.
Source: https://github.com/k2-fsa/sherpa-onnx
Apache-2.0: vendor/SHERPA-LICENSE.txt.

Official browser release:
https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.7/sherpa-onnx-wasm-simd-v1.13.7-en-asr-zipformer.tar.bz2
SHA-256: 21559527d65f7674a45834870e4f51b0af14be27d4de1043aa6f576d9b426acc.

The WebAssembly binary and JavaScript recognizer API are unchanged. The generated Emscripten
loader was modified to remove its automatic English-example-model preload block. The extension
mounts its own packaged Hebrew weights instead. No English model weights are distributed here.

## Runtime dependencies

- ONNX Runtime 1.27.1, Microsoft Corporation and contributors; MIT.
  vendor/ONNX-RUNTIME-LICENSE.txt and vendor/ONNX-RUNTIME-THIRD-PARTY-NOTICES.txt.
  Source: https://github.com/microsoft/onnxruntime/tree/v1.27.1
- kaldi-native-fbank 1.22.3, contributors; Apache-2.0.
  vendor/KALDI-NATIVE-FBANK-LICENSE.txt.
  Source: https://github.com/csukuangfj/kaldi-native-fbank/tree/v1.22.3
- kaldi-decoder 0.3.0, contributors; Apache-2.0.
  vendor/KALDI-DECODER-LICENSE.txt.
  Source: https://github.com/k2-fsa/kaldi-decoder/tree/v0.3.0
- Kiss FFT, Mark Borgerding and contributors; BSD-3-Clause.
  vendor/KISSFFT-LICENSE.txt.
  Source: https://github.com/mborgerding/kissfft/tree/febd4caeed32e33ad8b2e0bb5ea77542c40f18ec

The generated WebAssembly runtime also contains Emscripten support code, distributed under
MIT and University of Illinois/NCSA terms. Emscripten's notices are retained in vendor/EMSCRIPTEN-LICENSE.txt.

## Sample

demo/sample-hebrew.wav is a recording of “שלום” by YaronSh (speaker and recorder),
Lingua Libre / Wikimedia Commons, 16 December 2023. CC0 1.0 Universal.
Source: https://commons.wikimedia.org/wiki/File:LL-Q9288_(heb)-YaronSh-%D7%A9%D7%9C%D7%95%D7%9D.wav
License: https://creativecommons.org/publicdomain/zero/1.0/
The original recording was resampled to mono 16 kHz PCM and padded with silence.
Original SHA-1 and download URL are retained in demo/SOURCE.json.
No customer recording or Apple-generated speech is bundled in the current release.

## Ivrit Local code

Our extension code is MIT, copyright 2026 Idan Buzaglo and contributors.
See LICENSE.txt. This does not relicense the third-party assets above.
