/**
 * Client-side watermark module.
 *
 * When loaded, it finds all content images on the page and bakes a
 * repeating, rotated, semi-transparent text watermark directly into
 * each image's pixel data via an off-screen Canvas.  The original
 * `<img>` src is then replaced with the watermarked data-URL so that
 * right-click → Save also saves the watermarked version.
 *
 * To skip watermarking a specific image, add `|no-watermark` to the
 * end of its alt text in Markdown, e.g.:
 *   ![some description|no-watermark](/path/to/image.png)
 * The marker is stripped from the visible alt text automatically.
 */

const WATERMARK_TEXT = "hatanokokosa";
const WATERMARK_FONT = "Fraunces";
const ROTATION_DEG = -30;
const TEXT_COLOR = "rgba(128, 128, 128, 0.07)";

// All sizes are relative to the image's shorter edge so that
// the watermark scales proportionally regardless of resolution.
const FONT_SIZE_RATIO = 0.04; // font size as fraction of short edge
const LINE_SPACING_RATIO = 0.15; // vertical gap between rows
const COL_SPACING_RATIO = 0.35; // horizontal gap between columns

/** Marker that can be appended to alt text to opt out of watermarking. */
const NO_WATERMARK_MARKER = "|no-watermark";

/** Selectors that match content images (mirrors ImageZoomer selectors). */
const IMG_SELECTORS = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");

/**
 * Draw the watermark pattern onto a canvas context that already has
 * the source image painted on it.
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.save();

  // Derive pixel sizes from the image's shorter edge.
  const shortEdge = Math.min(width, height);
  const fontSize = Math.round(shortEdge * FONT_SIZE_RATIO);
  const lineSpacing = Math.round(shortEdge * LINE_SPACING_RATIO);
  const colSpacing = Math.round(shortEdge * COL_SPACING_RATIO);

  ctx.font = `${fontSize}px ${WATERMARK_FONT}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Rotate the entire context around the centre of the canvas.
  ctx.translate(width / 2, height / 2);
  ctx.rotate((ROTATION_DEG * Math.PI) / 180);

  // The bounding box after rotation is larger than the original canvas,
  // so we need to tile well beyond the edges to avoid gaps.
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

/**
 * Check whether an image has been opted out of watermarking via the
 * `|no-watermark` alt-text marker. If found, strips the marker from
 * the visible alt text and returns `true`.
 */
function isOptedOut(img: HTMLImageElement): boolean {
  const alt = img.alt ?? "";
  if (alt.endsWith(NO_WATERMARK_MARKER)) {
    // Strip the marker from visible alt text.
    img.alt = alt.slice(0, -NO_WATERMARK_MARKER.length).trimEnd();
    // Also clean the parent <figcaption> produced by rehype-figure.
    const figcaption = img.closest("figure")?.querySelector("figcaption");
    if (figcaption?.textContent?.endsWith(NO_WATERMARK_MARKER)) {
      figcaption.textContent = figcaption.textContent
        .slice(0, -NO_WATERMARK_MARKER.length)
        .trimEnd();
    }
    return true;
  }
  return false;
}

/**
 * Process a single `<img>` element: wait until it is decoded, paint it
 * onto a canvas with the watermark, and swap the src.
 */
async function processImage(img: HTMLImageElement): Promise<void> {
  // Skip images that have already been watermarked.
  if (img.dataset.watermarked === "true") return;

  // Skip images opted out via alt text marker.
  if (isOptedOut(img)) return;

  // Skip tiny images (icons, avatars, etc.).
  if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

  // Ensure the image is fully decoded before we draw.
  try {
    await img.decode();
  } catch {
    // Some browsers throw on decode() for broken / cross-origin images.
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(img, 0, 0);
  drawWatermark(ctx, canvas.width, canvas.height);

  // Replace the original src with the watermarked version.
  img.src = canvas.toDataURL("image/png");
  img.dataset.watermarked = "true";
}

/** Walk the DOM, find all content images, and watermark them. */
async function applyWatermarks(): Promise<void> {
  // Wait for web fonts to finish loading so Canvas can use them.
  await document.fonts.ready;

  const images = document.querySelectorAll<HTMLImageElement>(IMG_SELECTORS);

  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      processImage(img);
    } else {
      img.addEventListener("load", () => processImage(img), { once: true });
    }
  });
}

// Run on first load and on every Astro page transition.
applyWatermarks();
document.addEventListener("astro:page-load", applyWatermarks);
