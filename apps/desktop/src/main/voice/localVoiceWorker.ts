import { createRequire } from "node:module";
import { parentPort } from "node:worker_threads";
import type { LocalVoiceModelFiles } from "./localVoiceModel.js";

const require = createRequire(import.meta.url);
const sherpa = require("sherpa-onnx-node") as typeof import("sherpa-onnx-node");
if (!parentPort) throw new Error("本地语音工作线程未正确启动。");
const workerPort = parentPort;

type WorkerInput =
  | { type: "init"; files: LocalVoiceModelFiles; inputSampleRate: number }
  | { type: "audio"; samples: Float32Array }
  | { type: "stop" };

let recognizer: InstanceType<typeof sherpa.OnlineRecognizer> | null = null;
let stream: ReturnType<InstanceType<typeof sherpa.OnlineRecognizer>["createStream"]> | null = null;
let resampler: InstanceType<typeof sherpa.LinearResampler> | null = null;
let lastPartial = "";
let hasStopped = false;

workerPort.on("message", (message: WorkerInput) => {
  try {
    if (message.type === "init") {
      recognizer = new sherpa.OnlineRecognizer(createRecognizerConfig(message.files));
      stream = recognizer.createStream();
      resampler = new sherpa.LinearResampler(message.inputSampleRate, 16_000);
      workerPort.postMessage({ type: "ready" });
      return;
    }

    if (!recognizer || !stream || !resampler || hasStopped) return;

    if (message.type === "audio") {
      const samples = resampler.resample(message.samples);
      if (samples.length > 0) {
        stream.acceptWaveform({ sampleRate: 16_000, samples });
        decodeAvailableAudio();
      }
      return;
    }

    hasStopped = true;
    stream.inputFinished();
    decodeAvailableAudio();
    const finalText = recognizer.getResult(stream).text.trim();
    if (finalText) workerPort.postMessage({ type: "final", text: finalText });
    workerPort.postMessage({ type: "stopped" });
  } catch (error) {
    workerPort.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "本地语音识别发生错误。"
    });
  }
});

function decodeAvailableAudio() {
  if (!recognizer || !stream) return;
  while (recognizer.isReady(stream)) recognizer.decode(stream);

  const text = recognizer.getResult(stream).text.trim();
  if (recognizer.isEndpoint(stream)) {
    if (text) workerPort.postMessage({ type: "final", text });
    recognizer.reset(stream);
    lastPartial = "";
    return;
  }

  if (text !== lastPartial) {
    lastPartial = text;
    workerPort.postMessage({ type: "partial", text });
  }
}

function createRecognizerConfig(files: LocalVoiceModelFiles) {
  return {
    featConfig: {
      sampleRate: 16_000,
      featureDim: 80
    },
    modelConfig: {
      transducer: {
        encoder: files.encoder,
        decoder: files.decoder,
        joiner: files.joiner
      },
      tokens: files.tokens,
      numThreads: 2,
      provider: "cpu",
      modelType: "zipformer2",
      debug: 0
    },
    decodingMethod: "greedy_search",
    maxActivePaths: 4,
    enableEndpoint: true,
    rule1MinTrailingSilence: 2.2,
    rule2MinTrailingSilence: 1.0,
    rule3MinUtteranceLength: 18
  };
}
