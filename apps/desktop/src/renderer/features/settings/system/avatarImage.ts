interface ImageDimensions {
  height: number;
  width: number;
}

const avatarMaximumDimension = 256;
const avatarMaximumSourceDimension = 16_384;
const avatarMaximumSourcePixels = 64_000_000;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Avatar reading failed")));
    reader.readAsDataURL(file);
  });
}

function fileToArrayBuffer(file: File) {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("Avatar dimensions are unavailable"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Avatar reading failed")));
    reader.readAsArrayBuffer(file);
  });
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6]
      };
    }
    offset += segmentLength;
  }
  return undefined;
}

function readWebpDimensions(bytes: Uint8Array, view: DataView): ImageDimensions | undefined {
  if (readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") return undefined;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = readAscii(bytes, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > bytes.length) break;
    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        width: readUint24LittleEndian(bytes, dataOffset + 4) + 1,
        height: readUint24LittleEndian(bytes, dataOffset + 7) + 1
      };
    }
    if (chunkType === "VP8L" && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const bits = (
        bytes[dataOffset + 1] |
        (bytes[dataOffset + 2] << 8) |
        (bytes[dataOffset + 3] << 16) |
        (bytes[dataOffset + 4] << 24)
      ) >>> 0;
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1
      };
    }
    if (
      chunkType === "VP8 " &&
      chunkSize >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      return {
        width: (bytes[dataOffset + 6] | (bytes[dataOffset + 7] << 8)) & 0x3fff,
        height: (bytes[dataOffset + 8] | (bytes[dataOffset + 9] << 8)) & 0x3fff
      };
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  return undefined;
}

async function readImageDimensions(file: File): Promise<ImageDimensions | undefined> {
  try {
    const buffer = await fileToArrayBuffer(file);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (
      bytes.length >= 24 &&
      bytes[0] === 0x89 &&
      readAscii(bytes, 1, 3) === "PNG" &&
      readAscii(bytes, 12, 4) === "IHDR"
    ) {
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      return readJpegDimensions(bytes);
    }
    if (bytes.length >= 20) return readWebpDimensions(bytes, view);
  } catch {
    // Dimension probing is an optimization; the decoder remains the fallback.
  }
  return undefined;
}

function fitAvatarDimensions({ height, width }: ImageDimensions) {
  const scale = Math.min(1, avatarMaximumDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export async function prepareAvatarForStorage(file: File) {
  if (typeof createImageBitmap !== "function") {
    return {
      avatarDataUrl: await fileToDataUrl(file),
      avatarFileName: file.name
    };
  }

  const sourceDimensions = await readImageDimensions(file);
  if (
    sourceDimensions &&
    (
      sourceDimensions.width <= 0 ||
      sourceDimensions.height <= 0 ||
      sourceDimensions.width > avatarMaximumSourceDimension ||
      sourceDimensions.height > avatarMaximumSourceDimension ||
      sourceDimensions.width * sourceDimensions.height > avatarMaximumSourcePixels
    )
  ) {
    throw new Error("Avatar source dimensions are too large");
  }
  const targetDimensions = sourceDimensions ? fitAvatarDimensions(sourceDimensions) : undefined;
  const shouldResizeDuringDecode = Boolean(
    sourceDimensions &&
    targetDimensions &&
    (targetDimensions.width !== sourceDimensions.width || targetDimensions.height !== sourceDimensions.height)
  );
  const bitmap = shouldResizeDuringDecode && targetDimensions
    ? await createImageBitmap(file, {
        resizeHeight: targetDimensions.height,
        resizeQuality: "high",
        resizeWidth: targetDimensions.width
      })
    : await createImageBitmap(file);
  try {
    const { height, width } = fitAvatarDimensions(bitmap);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Avatar canvas is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    const avatarDataUrl = canvas.toDataURL("image/webp", 0.86);
    if (!avatarDataUrl.startsWith("data:image/webp")) throw new Error("Avatar encoding failed");
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "avatar";
    return {
      avatarDataUrl,
      avatarFileName: `${baseName}.webp`
    };
  } finally {
    bitmap.close();
  }
}
