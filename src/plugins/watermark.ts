/**
 * Client-side watermark module.
 *
 * When loaded, it finds all content images on the page and bakes a
 * repeating, rotated, semi-transparent text watermark directly into
 * each image's pixel data via an off-screen Canvas. The original
 * `<img>` src is then replaced with the watermarked data URL so that
 * right-click -> Save also saves the watermarked version.
 *
 * To skip watermarking a specific image, add `|no-watermark` to the
 * end of its alt text in Markdown, e.g.:
 *   ![some description|no-watermark](/path/to/image.png)
 * The marker is stripped from the visible alt text automatically.
 */

const WATERMARK_TEXT = "hatanokokosa";
const WATERMARK_FONT = "Fraunces, serif";
const ROTATION_DEG = -30;
const TEXT_COLOR = "rgba(128, 128, 128, 0.07)";

const FONT_SIZE_RATIO = 0.04;
const LINE_SPACING_RATIO = 0.15;
const COL_SPACING_RATIO = 0.35;
const PREVIEW_MAX_EDGE = 400;

/** Selectors that match content images (mirrors ImageZoomer selectors). */
const IMG_SELECTORS = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");

const NO_WATERMARK_MARKER = "|no-watermark";
const WATERMARK_PAGE_SELECTOR = "[data-watermark-page]";
const OBSERVER_ROOT_MARGIN = "200px 0px";
let preferredFormat: string | null = null;
const previewInFlightImages = new WeakMap<HTMLImageElement, Promise<void>>();
const fullInFlightImages = new WeakMap<HTMLImageElement, Promise<void>>();
const scheduledUpgrades = new WeakSet<HTMLImageElement>();
let watermarkObserver: IntersectionObserver | null = null;
const idleCapableWindow = window as Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
};

function isWatermarkPage(): boolean {
  return document.querySelector(WATERMARK_PAGE_SELECTOR) !== null;
}

function markImageReady(img: HTMLImageElement): void {
  img.dataset.watermarkReady = "true";
}

function lockRenderedSize(img: HTMLImageElement): void {
  if (img.dataset.watermarkSizeLocked === "true") return;

  const rect = img.getBoundingClientRect();
  if (rect.width <= 0) return;

  const parentWidth = img.parentElement?.getBoundingClientRect().width ?? 0;

  if (parentWidth > 0) {
    const widthPercent = Math.min(100, (rect.width / parentWidth) * 100);
    img.style.width = `${widthPercent}%`;
  } else {
    img.style.width = `${Math.round(rect.width)}px`;
  }

  img.style.maxWidth = "100%";
  img.style.height = "auto";
  img.dataset.watermarkSizeLocked = "true";
}

function getOriginalSrc(img: HTMLImageElement): string {
  const originalSrc =
    img.dataset.watermarkOriginalSrc || img.currentSrc || img.src;
  img.dataset.watermarkOriginalSrc = originalSrc;
  return originalSrc;
}

function replaceImageSrc(img: HTMLImageElement, nextSrc: string): void {
  const previousObjectUrl = img.dataset.watermarkObjectUrl;
  if (previousObjectUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previousObjectUrl);
  }

  img.src = nextSrc;

  if (nextSrc.startsWith("blob:")) {
    img.dataset.watermarkObjectUrl = nextSrc;
  } else {
    delete img.dataset.watermarkObjectUrl;
  }
}

function getPreferredFormat(): string {
  if (preferredFormat) return preferredFormat;

  const testCanvas = document.createElement("canvas");
  testCanvas.width = 1;
  testCanvas.height = 1;

  const avif = testCanvas.toDataURL("image/avif", 1.0);
  preferredFormat = avif.startsWith("data:image/avif")
    ? "image/avif"
    : "image/webp";

  return preferredFormat;
}

async function canvasToCompactURL(
  canvas: HTMLCanvasElement,
  quality = 1.0,
): Promise<string> {
  const format = getPreferredFormat();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(canvas.toDataURL(format, 1.0));
        }
      },
      format,
      quality,
    );
  });
}

function getScaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxEdge) return { width, height };

  const scale = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.save();

  const shortEdge = Math.min(width, height);
  const fontSize = Math.round(shortEdge * FONT_SIZE_RATIO);
  const lineSpacing = Math.round(shortEdge * LINE_SPACING_RATIO);
  const colSpacing = Math.round(shortEdge * COL_SPACING_RATIO);

  ctx.font = `${fontSize}px ${WATERMARK_FONT}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.translate(width / 2, height / 2);
  ctx.rotate((ROTATION_DEG * Math.PI) / 180);

  const diagonal = Math.sqrt(width * width + height * height);
  const startX = -diagonal / 2;
  const startY = -diagonal / 2;

  for (let y = startY; y < diagonal / 2; y += lineSpacing) {
    for (let x = startX; x < diagonal / 2; x += colSpacing) {
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }

  ctx.restore();
}

function isOptedOut(img: HTMLImageElement): boolean {
  if (img.dataset.noWatermark === "true") return true;

  const alt = img.alt ?? "";
  if (!alt.endsWith(NO_WATERMARK_MARKER)) return false;

  img.dataset.noWatermark = "true";
  img.alt = alt.slice(0, -NO_WATERMARK_MARKER.length).trimEnd();

  const figcaption = img.closest("figure")?.querySelector("figcaption");
  if (figcaption?.textContent?.endsWith(NO_WATERMARK_MARKER)) {
    figcaption.textContent = figcaption.textContent
      .slice(0, -NO_WATERMARK_MARKER.length)
      .trimEnd();
  }

  return true;
}

async function decodeImage(img: HTMLImageElement): Promise<boolean> {
  if (img.complete && img.naturalWidth > 0) {
    try {
      await img.decode();
    } catch {
      // Some browsers throw after a successful load; dimensions are enough.
    }
    return true;
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };

    const onLoad = async () => {
      cleanup();
      try {
        await img.decode();
      } catch {
        // Ignore decode failures after load and continue with the loaded bitmap.
      }
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });
}

async function loadOriginalImage(
  src: string,
): Promise<HTMLImageElement | null> {
  const loader = new Image();
  loader.src = src;

  try {
    await loader.decode();
  } catch {
    return null;
  }

  return loader.naturalWidth > 0 && loader.naturalHeight > 0 ? loader : null;
}

async function processPreviewImage(img: HTMLImageElement): Promise<void> {
  if (
    img.dataset.watermarked === "true" ||
    img.dataset.watermarkPreviewReady === "true"
  ) {
    markImageReady(img);
    return;
  }

  if (isOptedOut(img)) {
    markImageReady(img);
    return;
  }

  getOriginalSrc(img);

  const ready = await decodeImage(img);
  if (!ready) {
    markImageReady(img);
    return;
  }

  if (img.naturalWidth < 100 || img.naturalHeight < 100) {
    markImageReady(img);
    return;
  }

  const previewSize = getScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    PREVIEW_MAX_EDGE,
  );
  lockRenderedSize(img);
  const canvas = document.createElement("canvas");
  canvas.width = previewSize.width;
  canvas.height = previewSize.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height);
    replaceImageSrc(img, await canvasToCompactURL(canvas, 0.9));
    img.dataset.watermarkPreviewReady = "true";
    markImageReady(img);
  } catch (error) {
    console.error("Watermark processing failed:", error);
    markImageReady(img);
  }
}

async function processFullImage(img: HTMLImageElement): Promise<void> {
  if (img.dataset.watermarked === "true") {
    markImageReady(img);
    return;
  }

  if (isOptedOut(img)) {
    markImageReady(img);
    return;
  }

  const originalSrc = getOriginalSrc(img);
  if (!originalSrc || originalSrc.startsWith("data:image/gif")) {
    markImageReady(img);
    return;
  }

  const sourceImage = await loadOriginalImage(originalSrc);
  if (!sourceImage) {
    markImageReady(img);
    return;
  }

  if (sourceImage.naturalWidth < 100 || sourceImage.naturalHeight < 100) {
    markImageReady(img);
    return;
  }

  lockRenderedSize(img);
  const canvas = document.createElement("canvas");
  canvas.width = sourceImage.naturalWidth;
  canvas.height = sourceImage.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    ctx.drawImage(sourceImage, 0, 0);
    drawWatermark(ctx, canvas.width, canvas.height);
    replaceImageSrc(img, await canvasToCompactURL(canvas));
    delete img.dataset.watermarkPreviewReady;
    img.dataset.watermarked = "true";
    markImageReady(img);
  } catch (error) {
    console.error("Watermark processing failed:", error);
    markImageReady(img);
  }
}

async function ensurePreviewReady(img: HTMLImageElement): Promise<void> {
  if (!isWatermarkPage()) {
    markImageReady(img);
    return;
  }

  const existing = previewInFlightImages.get(img);
  if (existing) {
    await existing;
    return;
  }

  const task = processPreviewImage(img).finally(() => {
    previewInFlightImages.delete(img);
  });

  previewInFlightImages.set(img, task);
  await task;
}

async function ensureWatermarked(img: HTMLImageElement): Promise<void> {
  if (!isWatermarkPage()) {
    markImageReady(img);
    return;
  }

  const existing = fullInFlightImages.get(img);
  if (existing) {
    await existing;
    return;
  }

  const task = processFullImage(img).finally(() => {
    fullInFlightImages.delete(img);
  });

  fullInFlightImages.set(img, task);
  await task;
}

function scheduleFullUpgrade(img: HTMLImageElement): void {
  if (
    img.dataset.watermarked === "true" ||
    img.dataset.noWatermark === "true" ||
    scheduledUpgrades.has(img)
  ) {
    return;
  }

  scheduledUpgrades.add(img);

  const run = () => {
    void ensureWatermarked(img).finally(() => {
      scheduledUpgrades.delete(img);
    });
  };

  if (typeof idleCapableWindow.requestIdleCallback === "function") {
    idleCapableWindow.requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

function setupWatermarkObserver(): void {
  if (!isWatermarkPage()) return;

  watermarkObserver?.disconnect();

  const images = document.querySelectorAll<HTMLImageElement>(IMG_SELECTORS);

  images.forEach((img) => {
    if (img.dataset.watermarkReady === "true") return;
    if (img.dataset.watermarked === "true") {
      markImageReady(img);
      return;
    }
    if (isOptedOut(img)) {
      markImageReady(img);
    }
  });

  if (!("IntersectionObserver" in window)) {
    images.forEach((img) => {
      void ensurePreviewReady(img).then(() => {
        scheduleFullUpgrade(img);
      });
    });
    return;
  }

  watermarkObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const img = entry.target as HTMLImageElement;
        watermarkObserver?.unobserve(img);
        void ensurePreviewReady(img).then(() => {
          scheduleFullUpgrade(img);
        });
      });
    },
    {
      rootMargin: OBSERVER_ROOT_MARGIN,
    },
  );

  images.forEach((img) => {
    if (img.dataset.watermarkReady === "true") return;
    watermarkObserver?.observe(img);
  });
}

(
  window as Window & {
    __watermarkRuntime?: {
      ensureWatermarked: (img: HTMLImageElement) => Promise<void>;
    };
  }
).__watermarkRuntime = {
  ensureWatermarked,
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupWatermarkObserver();
    },
    { once: true },
  );
} else {
  setupWatermarkObserver();
}

document.addEventListener("astro:page-load", setupWatermarkObserver);
