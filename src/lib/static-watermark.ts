import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";

const WATERMARK_TEXT = "hatanokokosa";
const ROTATION_DEG = -30;
const TEXT_COLOR = "rgba(128, 128, 128, 0.05)";
const FONT_SIZE_RATIO = 0.04;
const LINE_SPACING_RATIO = 0.15;
const COL_SPACING_RATIO = 0.35;
const NO_WATERMARK_MARKER = "|no-watermark";
const OUTPUT_FORMAT = "avif";
const OUTPUT_QUALITY = 75;

const projectRoot = process.cwd();
process.env.XDG_CACHE_HOME ??= path.join(projectRoot, ".cache");

const WATERMARK_CACHE_VERSION = [
  WATERMARK_TEXT,
  ROTATION_DEG,
  TEXT_COLOR,
  FONT_SIZE_RATIO,
  LINE_SPACING_RATIO,
  COL_SPACING_RATIO,
  OUTPUT_FORMAT,
  OUTPUT_QUALITY,
].join(":");

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

function setStringProperty(
  node: HastNode,
  propertyName: string,
  value: string,
): void {
  node.properties = node.properties ?? {};
  node.properties[propertyName] = value;
}

function stripNoWatermarkMarker(text: string): string {
  return text.endsWith(NO_WATERMARK_MARKER)
    ? text.slice(0, -NO_WATERMARK_MARKER.length).trimEnd()
    : text;
}

function hasNoWatermarkMarker(node: HastNode): boolean {
  return getStringProperty(node.properties?.alt).endsWith(NO_WATERMARK_MARKER);
}

function stripFigureCaptionMarker(node: HastNode): void {
  if (!node.children) return;

  visit(node as never, "element", (child: HastNode) => {
    if (child.tagName !== "figcaption" || !child.children?.length) return;

    const textNodes = child.children.filter(
      (captionChild) => captionChild.type === "text",
    );
    const lastText = textNodes.at(-1);
    if (!lastText?.value?.endsWith(NO_WATERMARK_MARKER)) return;

    lastText.value = stripNoWatermarkMarker(lastText.value);
  });
}

function isLocalPublicImage(src: string): boolean {
  const { pathname: srcPathname } = splitSrc(src);

  return (
    srcPathname.startsWith("/") &&
    !srcPathname.startsWith("//") &&
    !srcPathname.includes("/../") &&
    !srcPathname.endsWith(".svg") &&
    !srcPathname.endsWith(".gif")
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
  const decoded = decodeURIComponent(srcPathname);
  const filePath = path.resolve(publicDir, decoded.slice(1));

  if (!filePath.startsWith(`${publicDir}${path.sep}`)) return null;
  return filePath;
}

type ImageDimensions = {
  width: number;
  height: number;
};

function getAvifDimensions(buffer: Buffer): ImageDimensions | null {
  const ispeIndex = buffer.indexOf("ispe", 0, "ascii");
  if (ispeIndex < 4 || ispeIndex + 16 > buffer.length) return null;

  return {
    width: buffer.readUInt32BE(ispeIndex + 8),
    height: buffer.readUInt32BE(ispeIndex + 12),
  };
}

function getPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG")
    return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

async function getImageDimensions(
  inputPath: string,
): Promise<ImageDimensions | null> {
  const buffer = await readFile(inputPath);
  return (
    getPngDimensions(buffer) ??
    getJpegDimensions(buffer) ??
    getWebpDimensions(buffer) ??
    getAvifDimensions(buffer)
  );
}

async function mirrorGeneratedFile(
  outputPath: string,
  outputName: string,
): Promise<void> {
  const distDirStat = await stat(path.dirname(distOutputDir)).catch(() => null);
  if (!distDirStat?.isDirectory()) return;

  await mkdir(distOutputDir, { recursive: true });
  await copyFile(outputPath, path.join(distOutputDir, outputName));
}

function createWatermarkSvg(width: number, height: number): string {
  const shortEdge = Math.min(width, height);
  const fontSize = Math.max(1, Math.round(shortEdge * FONT_SIZE_RATIO));
  const lineSpacing = Math.max(
    fontSize * 2,
    Math.round(shortEdge * LINE_SPACING_RATIO),
  );
  const colSpacing = Math.max(
    fontSize * 5,
    Math.round(shortEdge * COL_SPACING_RATIO),
  );
  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));
  const start = -Math.ceil(diagonal / 2);
  const end = Math.ceil(diagonal / 2);
  const texts: string[] = [];

  for (let y = start; y <= end; y += lineSpacing) {
    for (let x = start; x <= end; x += colSpacing) {
      texts.push(
        `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${WATERMARK_TEXT}</text>`,
      );
    }
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>text{font-family:serif;font-size:${fontSize}px;fill:${TEXT_COLOR};}</style>
  <g transform="translate(${width / 2} ${height / 2}) rotate(${ROTATION_DEG})">
    ${texts.join("\n    ")}
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

  const cacheKey = `${inputPath}:${inputStat.mtimeMs}:${inputStat.size}:${suffix}`;
  const existing = generatedCache.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    const dimensions = await getImageDimensions(inputPath);
    if (!dimensions) return null;

    const hash = createHash("sha256")
      .update(inputPath)
      .update(String(inputStat.mtimeMs))
      .update(String(inputStat.size))
      .update(WATERMARK_CACHE_VERSION)
      .digest("hex")
      .slice(0, 16);
    const outputBaseName = `${path.basename(srcPathname, path.extname(srcPathname))}.${hash}`;
    const rasterOutputName = `${outputBaseName}.${OUTPUT_FORMAT}`;
    const rasterOutputPath = path.join(outputDir, rasterOutputName);

    await mkdir(outputDir, { recursive: true });

    const rasterOutputStat = await stat(rasterOutputPath).catch(() => null);
    if (!rasterOutputStat?.isFile()) {
      const { default: sharp } = await import("sharp");

      await sharp(inputPath)
        .rotate()
        .composite([
          {
            input: Buffer.from(
              createWatermarkSvg(dimensions.width, dimensions.height),
            ),
            blend: "over",
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

  visit(
    tree as never,
    "element",
    (node: HastNode, _index, parent: HastNode) => {
      if (node.tagName === "figure") {
        stripFigureCaptionMarker(node);
        return;
      }

      if (node.tagName !== "img") return;

      const alt = getStringProperty(node.properties?.alt);
      if (alt.endsWith(NO_WATERMARK_MARKER)) {
        setStringProperty(node, "alt", stripNoWatermarkMarker(alt));
        setStringProperty(node, "dataNoWatermark", "true");
        return;
      }

      if (parent?.tagName === "a" || hasNoWatermarkMarker(node)) return;

      const src = getStringProperty(node.properties?.src);
      if (!src) return;

      imageTasks.push({ node, src });
    },
  );

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
