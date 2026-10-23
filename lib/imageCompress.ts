/**
 * Client-side image downscaling for meal/fridge photos.
 * Phone cameras produce 4–12 MB photos; the AI needs ~1280px at most.
 * Resizing first makes uploads 20–50× smaller (fast on mobile data), cheaper to
 * analyse, and keeps us far below the server body limit.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.82;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function drawScaled(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.fillStyle = "#fff"; // flatten transparency (PNG) onto white for JPEG
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

/** Compress a File (from <input type=file>) into a JPEG data URL. */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  // createImageBitmap honours EXIF orientation so photos aren't rotated.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const out = drawScaled(bmp, bmp.width, bmp.height);
      bmp.close?.();
      return out;
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return drawScaled(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Compress an existing data URL (e.g. a webcam screenshot). */
export async function compressDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  return drawScaled(img, img.naturalWidth, img.naturalHeight);
}

/**
 * A small preview (about 20–40 KB) to keep with a logged meal. The full-size photo is only needed for the AI to look at;
 * keeping every full photo would fill the database (500 MB) after a few thousand meals.
 */
export async function makeThumb(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const edge = 480;
  const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.6);
}
