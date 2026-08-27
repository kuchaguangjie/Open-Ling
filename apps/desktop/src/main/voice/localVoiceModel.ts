import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { VoiceModelStatus } from "../../../../../packages/shared/src/index.js";

const MODEL_ID = "x-asr-zh-en-punct-int8-480ms-2026-06-05";
const MODEL_BUNDLE_BYTES = 169_227_953;
const MODEL_MARKER_FILE = "ling-voice-model.json";
const MODEL_FILE_HASHES = {
  decoder: "a1cbc9eac2d5e3fb6617a218c67ad6daaa7f4e0fd225f08b2c22ab0413c8c257",
  encoder: "908596dcc137a73b95be908ca55e88caa1b3dbbe8027c171615f4b0609c5eb1e",
  joiner: "aedb7fa697b2ab43f20499826fff7c997eea7d67db77be97769aeeeb726e63b3",
  tokens: "b818a60878b9aae978cbb8ad594acbd403d76d1af2e31ef4197c84e2dbdba27c"
} as const;

export interface LocalVoiceModelFiles {
  decoder: string;
  encoder: string;
  joiner: string;
  tokens: string;
}

interface LocalVoiceModelManagerOptions {
  bundledModelDirectory: string;
  onProgress?: (status: VoiceModelStatus) => void;
  rootDirectory: string;
}

export class LocalVoiceModelManager {
  private readonly bundledModelDirectory: string;
  private readonly onProgress?: (status: VoiceModelStatus) => void;
  private readonly rootDirectory: string;
  private installPromise: Promise<LocalVoiceModelFiles> | null = null;
  private currentStatus: VoiceModelStatus = {
    state: "not-installed",
    downloadedBytes: 0,
    totalBytes: MODEL_BUNDLE_BYTES
  };

  constructor(options: LocalVoiceModelManagerOptions) {
    this.bundledModelDirectory = options.bundledModelDirectory;
    this.onProgress = options.onProgress;
    this.rootDirectory = options.rootDirectory;
  }

  async getStatus(): Promise<VoiceModelStatus> {
    if (this.installPromise) return this.currentStatus;
    try {
      await this.resolveModelFiles();
      this.currentStatus = {
        state: "ready",
        downloadedBytes: MODEL_BUNDLE_BYTES,
        totalBytes: MODEL_BUNDLE_BYTES
      };
    } catch {
      this.currentStatus = {
        state: "not-installed",
        downloadedBytes: 0,
        totalBytes: MODEL_BUNDLE_BYTES
      };
    }
    return this.currentStatus;
  }

  install(): Promise<LocalVoiceModelFiles> {
    if (this.installPromise) return this.installPromise;
    this.installPromise = this.performInstall()
      .catch((error) => {
        this.updateStatus({
          state: "error",
          downloadedBytes: this.currentStatus.downloadedBytes,
          totalBytes: MODEL_BUNDLE_BYTES,
          message: error instanceof Error ? error.message : "本地语音组件安装失败。"
        });
        throw error;
      })
      .finally(() => {
        this.installPromise = null;
      });
    return this.installPromise;
  }

  async resolveModelFiles(): Promise<LocalVoiceModelFiles> {
    const modelDirectory = this.getModelDirectory();
    const marker = JSON.parse(await readFile(join(modelDirectory, MODEL_MARKER_FILE), "utf8")) as { modelId?: unknown };
    if (marker.modelId !== MODEL_ID) throw new Error("本地语音组件版本不匹配。");
    return findModelFiles(modelDirectory);
  }

  private async performInstall(): Promise<LocalVoiceModelFiles> {
    try {
      return await this.resolveModelFiles();
    } catch {
      // Continue by preparing the checksum-verified model bundled with Ling.
    }

    await mkdir(this.rootDirectory, { recursive: true });
    const stagingDirectory = join(this.rootDirectory, `${MODEL_ID}.installing`);
    await rm(stagingDirectory, { force: true, recursive: true });
    await mkdir(stagingDirectory, { recursive: true });

    this.updateStatus({
      state: "preparing",
      downloadedBytes: 0,
      totalBytes: MODEL_BUNDLE_BYTES
    });

    try {
      await this.prepareBundledModel(stagingDirectory);
      const modelFiles = await findModelFiles(stagingDirectory);
      await writeFile(
        join(stagingDirectory, MODEL_MARKER_FILE),
        JSON.stringify({
          modelId: MODEL_ID,
          source: "bundled-with-ling-direct-v2",
          fileHashes: MODEL_FILE_HASHES
        }, null, 2),
        "utf8"
      );

      const modelDirectory = this.getModelDirectory();
      await rm(modelDirectory, { force: true, recursive: true });
      await rename(stagingDirectory, modelDirectory);
      const installedFiles = remapModelFiles(modelFiles, stagingDirectory, modelDirectory);
      this.updateStatus({
        state: "ready",
        downloadedBytes: MODEL_BUNDLE_BYTES,
        totalBytes: MODEL_BUNDLE_BYTES
      });
      return installedFiles;
    } finally {
      await rm(stagingDirectory, { force: true, recursive: true });
    }
  }

  private async prepareBundledModel(destination: string) {
    const partNames = (await readdir(this.bundledModelDirectory))
      .filter((name) => name.startsWith("encoder.int8.onnx.part-"))
      .sort();
    if (partNames.length === 0) {
      throw new Error("安装包缺少本地语音组件，请重新安装 Ling。");
    }
    let preparedBytes = 0;
    let lastProgressAt = 0;
    const reportProgress = (addedBytes: number) => {
      preparedBytes += addedBytes;
      const now = Date.now();
      if (now - lastProgressAt < 80 && preparedBytes < MODEL_BUNDLE_BYTES) return;
      lastProgressAt = now;
      this.updateStatus({
        state: "preparing",
        downloadedBytes: preparedBytes,
        totalBytes: MODEL_BUNDLE_BYTES
      });
    };

    const encoderPath = join(destination, "encoder.int8.onnx");
    const encoderFile = await open(encoderPath, "w");
    const encoderHash = createHash("sha256");
    try {
      for (const partName of partNames) {
        for await (const chunk of createReadStream(join(this.bundledModelDirectory, partName))) {
          const buffer = chunk as Buffer;
          encoderHash.update(buffer);
          await encoderFile.write(buffer);
          reportProgress(buffer.byteLength);
        }
      }
    } finally {
      await encoderFile.close();
    }
    if (encoderHash.digest("hex") !== MODEL_FILE_HASHES.encoder) {
      throw new Error("安装包中的本地语音组件校验失败，请重新安装 Ling。");
    }

    const directFiles = [
      { name: "decoder.onnx", hash: MODEL_FILE_HASHES.decoder },
      { name: "joiner.int8.onnx", hash: MODEL_FILE_HASHES.joiner },
      { name: "tokens.txt", hash: MODEL_FILE_HASHES.tokens }
    ];
    for (const directFile of directFiles) {
      const content = await readFile(join(this.bundledModelDirectory, directFile.name));
      if (createHash("sha256").update(content).digest("hex") !== directFile.hash) {
        throw new Error("安装包中的本地语音组件校验失败，请重新安装 Ling。");
      }
      await writeFile(join(destination, directFile.name), content);
      reportProgress(content.byteLength);
    }
  }

  private getModelDirectory() {
    return join(this.rootDirectory, MODEL_ID);
  }

  private updateStatus(status: VoiceModelStatus) {
    this.currentStatus = status;
    this.onProgress?.(status);
  }
}

async function findModelFiles(rootDirectory: string): Promise<LocalVoiceModelFiles> {
  const files = await listFiles(rootDirectory);
  const tokens = files.find((file) => basename(file) === "tokens.txt");
  const encoder = findOnnxFile(files, "encoder", true);
  const decoder = findOnnxFile(files, "decoder", false);
  const joiner = findOnnxFile(files, "joiner", true);
  if (!tokens || !encoder || !decoder || !joiner) {
    throw new Error("本地语音组件缺少必要的模型文件。");
  }
  return { tokens, encoder, decoder, joiner };
}

function findOnnxFile(files: string[], part: "encoder" | "decoder" | "joiner", preferInt8: boolean) {
  const candidates = files.filter((file) => basename(file).toLowerCase().includes(part) && file.endsWith(".onnx"));
  return (preferInt8 ? candidates.find((file) => basename(file).includes("int8")) : undefined) ?? candidates[0];
}

async function listFiles(rootDirectory: string): Promise<string[]> {
  const entries = await readdir(rootDirectory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(rootDirectory, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    if (entry.isFile() && (await stat(path)).size > 0) return [path];
    return [];
  }));
  return nested.flat();
}

function remapModelFiles(files: LocalVoiceModelFiles, from: string, to: string): LocalVoiceModelFiles {
  return {
    decoder: join(to, relative(from, files.decoder)),
    encoder: join(to, relative(from, files.encoder)),
    joiner: join(to, relative(from, files.joiner)),
    tokens: join(to, relative(from, files.tokens))
  };
}
