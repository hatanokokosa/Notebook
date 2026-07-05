import { createHash } from "node:crypto";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";

// watermark text and layout
const WATERMARK_TEXT = "kokosa.icu";
const FONT_SIZE_RATIO = 0.14;
const WATERMARK_ROWS = 3;

// halftone dot pattern
const HALFTONE_CELL = 12;
const HALFTONE_R = 3;
const HALFTONE_ANGLE = 22;
const HALFTONE_COLOR = "#999999";
const HALFTONE_OPACITY = 0.25;

// glass emboss edge effect
const EMBOSS_HL_OFFSET = 1.0;
const EMBOSS_SD_OFFSET = 1.0;
const EMBOSS_HL_OPACITY = 0.3;
const EMBOSS_SD_OPACITY = 0.12;

// output settings
const NO_WATERMARK_MARKER = "|no-watermark";
const OUTPUT_FORMAT = "avif";
const OUTPUT_QUALITY = 95;
const OUTPUT_ID_LENGTH = 16;

const projectRoot = process.cwd();
// set cache home for sharp/libvips to use the project's .cache directory
process.env.XDG_CACHE_HOME ??= path.join(projectRoot, ".cache");

const publicDir = path.join(projectRoot, "public");
const outputDir = path.join(publicDir, "_watermarked");
const distOutputDir = path.join(projectRoot, "dist", "_watermarked");
const generatedCache = new Map<string, Promise<string | null>>();

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type ImageTask = {
  node: HastNode;
  src: string;
};

function getStringProperty(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return "";
}

function setStringProperty(node: HastNode, propertyName: string, value: string): void {
  node.properties = node.properties ?? {};
  node.properties[propertyName] = value;
}

function stripNoWatermarkMarker(text: string): string {
  return text.endsWith(NO_WATERMARK_MARKER) ? text.slice(0, -NO_WATERMARK_MARKER.length).trimEnd() : text;
}

function stripFigureCaptionMarker(node: HastNode): boolean {
  let found = false;
  if (!node.children) return found;

  visit(node as never, "element", (child: HastNode) => {
    if (child.tagName !== "figcaption" || !child.children?.length) return;

    const textNodes = child.children.filter((captionChild) => captionChild.type === "text");
    const lastText = textNodes.at(-1);
    if (!lastText?.value?.endsWith(NO_WATERMARK_MARKER)) return;

    lastText.value = stripNoWatermarkMarker(lastText.value);
    found = true;
  });

  return found;
}

function isLocalPublicImage(src: string): boolean {
  const { pathname: srcPathname } = splitSrc(src);
  const lowerPathname = srcPathname.toLowerCase();

  return (
    srcPathname.startsWith("/") &&
    !srcPathname.startsWith("//") &&
    !srcPathname.startsWith("/_watermarked/") &&
    !srcPathname.includes("/../") &&
    !lowerPathname.endsWith(".svg") &&
    !lowerPathname.endsWith(".gif")
  );
}

function splitSrc(src: string): { pathname: string; suffix: string } {
  const match = src.match(/^([^?#]*)(.*)$/);
  return {
    pathname: match?.[1] ?? src,
    suffix: match?.[2] ?? "",
  };
}

function resolvePublicPath(srcPathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(srcPathname);
  } catch {
    return null;
  }

  const filePath = path.resolve(publicDir, decoded.slice(1));

  if (!filePath.startsWith(`${publicDir}${path.sep}`)) return null;
  return filePath;
}

// cache key changes when any watermark param is tweaked
function getWatermarkCacheVersion(): string {
  return [
    WATERMARK_TEXT,
    FONT_SIZE_RATIO,
    WATERMARK_ROWS,
    HALFTONE_CELL,
    HALFTONE_R,
    HALFTONE_ANGLE,
    HALFTONE_COLOR,
    HALFTONE_OPACITY,
    EMBOSS_HL_OFFSET,
    EMBOSS_SD_OFFSET,
    EMBOSS_HL_OPACITY,
    EMBOSS_SD_OPACITY,
    OUTPUT_FORMAT,
    OUTPUT_QUALITY,
  ].join(":");
}

async function mirrorGeneratedFile(outputPath: string, outputName: string): Promise<void> {
  const distDirStat = await stat(path.dirname(distOutputDir)).catch(() => null);
  if (!distDirStat?.isDirectory()) return;

  await mkdir(distOutputDir, { recursive: true });
  await copyFile(outputPath, path.join(distOutputDir, outputName));
}

function createWatermarkSvg(width: number, height: number): string {
  // font size from the shorter image edge
  const shortEdge = Math.min(width, height);
  const fontSize = Math.max(1, Math.round(shortEdge * FONT_SIZE_RATIO));
  const cx = width / 2;
  const cy = height / 2;

  // row spacing for stacked watermark lines
  const rows = WATERMARK_ROWS;
  const gap = Math.round(height / (rows + 1));
  const halfSpan = ((rows - 1) / 2) * gap;

  // halftone pattern params
  const c = HALFTONE_CELL;
  const hc = c / 2;
  const r = HALFTONE_R;
  const angle = HALFTONE_ANGLE;
  const color = HALFTONE_COLOR;
  const opacity = HALFTONE_OPACITY;

  // emboss filter params
  const ehl = EMBOSS_HL_OFFSET;
  const esd = EMBOSS_SD_OFFSET;
  const eho = EMBOSS_HL_OPACITY;
  const eso = EMBOSS_SD_OPACITY;

  // 3 rows: top, center, bottom
  const textLines: string[] = [];
  for (let i = 0; i < rows; i++) {
    const y = Math.round(cy - halfSpan + i * gap);
    textLines.push(
      `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Noto Serif, serif" font-weight="700" font-size="${fontSize}" fill="url(#ht)">${WATERMARK_TEXT}</text>`,
    );
  }

  // svg: stacked text, halftone fill + glass emboss + soft-light blend in sharp
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="ht" width="${c}" height="${c}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
      <circle cx="${hc}" cy="${hc}" r="${r}" fill="${color}" opacity="${opacity}"/>
    </pattern>
    <filter id="glass" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="-${ehl}" dy="-${ehl}" stdDeviation="${ehl * 0.5}" flood-color="white" flood-opacity="${eho}"/>
      <feDropShadow dx="${esd}" dy="${esd}" stdDeviation="${esd * 0.5}" flood-color="black" flood-opacity="${eso}"/>
    </filter>
  </defs>
  <g filter="url(#glass)">
    ${textLines.join("\n    ")}
  </g>
</svg>`;
}

async function getWatermarkedSrc(src: string): Promise<string | null> {
  if (!isLocalPublicImage(src)) return null;

  const { pathname: srcPathname, suffix } = splitSrc(src);
  const inputPath = resolvePublicPath(srcPathname);
  if (!inputPath) return null;

  const inputStat = await stat(inputPath).catch(() => null);
  if (!inputStat?.isFile()) return null;

  const cacheVersion = getWatermarkCacheVersion();
  const cacheKey = `${inputPath}:${inputStat.mtimeMs}:${inputStat.size}:${suffix}:${cacheVersion}`;
  const existing = generatedCache.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    const hash = createHash("sha256")
      .update(inputPath)
      .update(String(inputStat.mtimeMs))
      .update(String(inputStat.size))
      .update(cacheVersion)
      .digest("hex");
    const outputBaseName = hash.slice(0, OUTPUT_ID_LENGTH);
    const rasterOutputName = `${outputBaseName}.${OUTPUT_FORMAT}`;
    const rasterOutputPath = path.join(outputDir, rasterOutputName);

    await mkdir(outputDir, { recursive: true });

    const rasterOutputStat = await stat(rasterOutputPath).catch(() => null);
    if (!rasterOutputStat?.isFile()) {
      const { default: sharp } = await import("sharp");

      const metadata = await sharp(inputPath).metadata();
      let imgWidth = metadata.width;
      let imgHeight = metadata.height;
      if (!imgWidth || !imgHeight) return null;

      const orientation = metadata.orientation ?? 1;
      if (orientation >= 5) {
        [imgWidth, imgHeight] = [imgHeight, imgWidth];
      }

      await sharp(inputPath)
        .rotate()
        .composite([
          {
            input: Buffer.from(createWatermarkSvg(imgWidth, imgHeight)),
            blend: "overlay",
          },
        ])
        .avif({ quality: OUTPUT_QUALITY })
        .toFile(rasterOutputPath);
    }

    await mirrorGeneratedFile(rasterOutputPath, rasterOutputName);

    return `/_watermarked/${rasterOutputName}${suffix}`;
  })().catch((error) => {
    console.warn(`Watermark generation failed for ${src}:`, error);
    return null;
  });

  generatedCache.set(cacheKey, task);
  return task;
}

export async function applyStaticWatermarks(html: string): Promise<string> {
  const tree = fromHtml(html, { fragment: true }) as HastNode;
  const imageTasks: ImageTask[] = [];

  visit(tree as never, "element", (node: HastNode, _index, parent: HastNode) => {
    if (node.tagName === "figure") {
      if (stripFigureCaptionMarker(node)) {
        setStringProperty(node, "dataNoWatermark", "true");
      }
      return;
    }

    if (node.tagName !== "img") return;

    const alt = getStringProperty(node.properties?.alt);
    if (alt.endsWith(NO_WATERMARK_MARKER)) {
      setStringProperty(node, "alt", stripNoWatermarkMarker(alt));
      setStringProperty(node, "dataNoWatermark", "true");
      return;
    }

    if (parent?.tagName === "a") return;
    if (parent?.tagName === "figure" && parent?.properties?.dataNoWatermark === "true") return;

    const src = getStringProperty(node.properties?.src);
    if (!src) return;

    imageTasks.push({ node, src });
  });

  await Promise.all(
    imageTasks.map(async ({ node, src }) => {
      const watermarkedSrc = await getWatermarkedSrc(src);
      if (!watermarkedSrc) return;

      setStringProperty(node, "src", watermarkedSrc);
      delete node.properties?.srcSet;
      delete node.properties?.sizes;
      setStringProperty(node, "dataWatermarked", "true");
    }),
  );

  return toHtml(tree as never);
}
