# Ling 内置本地语音模型

## 来源与许可

- 模型：X-ASR 480 ms streaming Zipformer transducer，中文/英文、标点、INT8；Ling 通过 sherpa-onnx 加载。
- 上游模型：[`GilgameshWind/X-ASR-zh-en`](https://huggingface.co/GilgameshWind/X-ASR-zh-en)。上游模型卡将模型标为 Apache License 2.0。
- 打包版本：2026-06-05。
- 获取位置：[`k2-fsa/sherpa-onnx` 模型发布文件](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-x-asr-480ms-streaming-zipformer-transducer-zh-en-punct-int8-2026-06-05.tar.bz2)。
- 模型文件许可：Apache License 2.0；完整许可见本目录 `LICENSE-APACHE-2.0.txt`。

模型卡称训练使用了开放来源和收集的语音数据，但截至本次审计，上游尚未公布可供逐项核验的完整数据清单与技术报告。Ling 因此只依据上游对模型权重作出的 Apache-2.0 授权进行再分发，不声称已经独立审计每一项训练数据的来源。这项透明度限制不影响 Ling 离线运行，也不代表模型适合医疗诊断或替代专业服务。

## Ling 的打包修改

上游 Encoder 文件未改动模型参数，只因 GitHub 单文件大小限制按原始字节顺序拆成两个 part。Ling 首次准备模型时会在本地按顺序合并，并以合并后 SHA-256 校验内容；其他模型文件原样放置。该修改说明用于满足 Apache-2.0 的再分发要求。

内置模型文件总大小为 169,227,953 bytes。当前文件校验值：

| 文件 | SHA-256 |
| --- | --- |
| `decoder.onnx` | `a1cbc9eac2d5e3fb6617a218c67ad6daaa7f4e0fd225f08b2c22ab0413c8c257` |
| `encoder.int8.onnx.part-00` | `ea7ca8d497d3a84d4011515900e13b6a3d881da80d895d43bff9b6e04c733353` |
| `encoder.int8.onnx.part-01` | `f38c9b5164c2d8472d58af7a1a7f166ac73755c8e0e9fd178a5752c91cefc287` |
| 合并后的 `encoder.int8.onnx` | `908596dcc137a73b95be908ca55e88caa1b3dbbe8027c171615f4b0609c5eb1e` |
| `joiner.int8.onnx` | `aedb7fa697b2ab43f20499826fff7c997eea7d67db77be97769aeeeb726e63b3` |
| `tokens.txt` | `b818a60878b9aae978cbb8ad594acbd403d76d1af2e31ef4197c84e2dbdba27c` |
