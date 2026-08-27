# Third-Party Notices

Ling includes or depends on third-party software and content. The Apache-2.0 License
at the repository root does not replace the licenses that apply to those
third-party components.

## Bundled resources

| Component | Location | Upstream | License |
| --- | --- | --- | --- |
| LXGW ZhenKai | `assets/fonts/lxgw-zhenkai/` | `lxgw/LxgwZhenKai` | SIL Open Font License 1.1; see `assets/fonts/lxgw-zhenkai/OFL.txt` |
| sherpa-onnx X-ASR model | `assets/models/voice/x-asr-zh-en-punct-int8-480ms-2026-06-05/` | [`GilgameshWind/X-ASR-zh-en`](https://huggingface.co/GilgameshWind/X-ASR-zh-en), distributed in sherpa-onnx format by [`k2-fsa/sherpa-onnx`](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-x-asr-480ms-streaming-zipformer-transducer-zh-en-punct-int8-2026-06-05.tar.bz2) | Apache License 2.0; license, Ling packaging modification and checksums are recorded in the model directory. The upstream model card does not yet provide a complete independently auditable training-data inventory. |
| Garden ambience audio | `assets/runtime/lobby/outdoor-garden/audio/` | Freesound, Wikimedia Commons and Incompetech; see the directory README | CC0, public domain and CC BY 4.0 per file; source, author, modification status, attribution and checksums are recorded in the directory README |

## npm dependencies

Runtime and development npm dependencies retain their respective upstream
licenses. `package-lock.json` records the resolved dependency versions. A
machine-generated dependency notice may supplement this file before a public
binary release.

## Release gate

Before a public source or binary release, maintainers must verify that every
bundled font, model, audio file, image and other non-code asset has a recorded
source, owner, applicable license and redistribution status. The current
classification is recorded in `assets/ASSET_SOURCES.md`. An undocumented asset
must not be treated as Apache-2.0-licensed merely because it is present in the
repository.
