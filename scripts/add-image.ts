/**
 * Add one or more images to the site in one step:
 *   - converts each source to AVIF (libaom-av1, crf 30, ~quality 90) into `public/`,
 *   - keeps GIF sources as-is and converts animated sources to GIF (fps 15),
 *   - names the file with a random 16-hex basename (so `just rename-images` skips it),
 *   - optionally inserts the markdown reference into an article.
 *
 * Usage:
 *   bun scripts/add-image.ts <source>... --dir <public-relative-dir>
 *     [--article <repo-relative-md-path>] [--after <text>] [--caption <text>]...
 *
 * --caption is repeatable: one value applies to all images, N values map to
 * N sources one-to-one (a mismatch is an error). Without --caption, each
 * reference uses its source basename as alt text.
 *
 * Example:
 *   bun scripts/add-image.ts ~/tmp/scan.png \
 *     --dir notebook/practice/2026-08-06-day-13 \
 *     --article src/content/docs/zh-cn/study/practice/2026-08-06-day-13.md \
 *     --caption "图片描述"
 *   bun scripts/add-image.ts a.png b.png --dir blog/foo \
 *     --article src/content/docs/zh-cn/blog/foo.md \
 *     --caption "第一张" --caption "第二张"
 *
 * Without --article, only the conversion/placement happens and the URL is printed.
 * With --article, the reference line is inserted after the first line containing
 * --after (default: appended at end of file).
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");

const args = process.argv.slice(2);
const sources: string[] = [];
const captions: string[] = [];
let targetDir = "";
let articlePath = "";
let after = "";
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--dir") targetDir = args[++i] ?? "";
  else if (arg === "--article") articlePath = args[++i] ?? "";
  else if (arg === "--after") after = args[++i] ?? "";
  else if (arg === "--caption") captions.push(args[++i] ?? "");
  else sources.push(arg);
}

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function run(command: string, commandArgs: string[]): { status: number; stderr: string } {
  const result = spawnSync(command, commandArgs, { encoding: "utf8" });
  return { status: result.status ?? 1, stderr: (result.stderr ?? "").trim() };
}

function probeVideo(source: string): Record<string, string> {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=pix_fmt,nb_read_frames",
      "-of",
      "default=nw=1",
      source,
    ],
    { encoding: "utf8" },
  );
  const fields: Record<string, string> = {};
  for (const line of (result.stdout ?? "").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) fields[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return fields;
}

function isAnimated(source: string): boolean {
  const ext = path.extname(source).toLowerCase();
  if (ext === ".gif") return true;
  const fields = probeVideo(source);
  return Number(fields["nb_read_frames"]) > 1;
}

function convertToAvif(source: string, target: string): void {
  const { pix_fmt } = probeVideo(source);
  // libaom-av1: crf 30 ≈ AVIF quality 90; -b:v 0 is required for crf mode.
  const pixelFormat = pix_fmt.includes("a") ? "yuva420p" : "yuv420p";
  const result = run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    source,
    "-c:v",
    "libaom-av1",
    "-crf",
    "30",
    "-b:v",
    "0",
    "-pix_fmt",
    pixelFormat,
    "-cpu-used",
    "6",
    target,
  ]);
  if (result.status !== 0) fail(`ffmpeg failed for ${source}: ${result.stderr}`);
}

function convertToGif(source: string, target: string): void {
  const result = run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    source,
    "-vf",
    "fps=15,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    target,
  ]);
  if (result.status !== 0) fail(`ffmpeg failed for ${source}: ${result.stderr}`);
}

if (sources.length === 0) fail("no source images given");
if (captions.length > 1 && captions.length !== sources.length) {
  fail(
    `--caption count mismatch: ${captions.length} caption(s) for ${sources.length} image(s) ` + "(use one shared caption or one per image)",
  );
}
if (!targetDir) fail("--dir is required (public-relative target directory)");
if (targetDir.startsWith("/") || targetDir.split("/").includes("..")) {
  fail(`--dir must be a public-relative path without "..": ${targetDir}`);
}
if (articlePath && !fs.existsSync(path.join(root, articlePath))) {
  fail(`--article not found: ${articlePath}`);
}

const outDir = path.join(publicDir, targetDir);
fs.mkdirSync(outDir, { recursive: true });

const urls: string[] = [];
for (const source of sources) {
  if (!fs.existsSync(source)) fail(`source not found: ${source}`);
  const ext = path.extname(source).toLowerCase();
  const isGifSource = ext === ".gif";
  const animated = isGifSource || isAnimated(source);
  const outExt = isGifSource || animated ? "gif" : "avif";
  const hex = randomBytes(8).toString("hex");
  const targetPath = path.join(outDir, `${hex}.${outExt}`);
  if (animated && !isGifSource) convertToGif(source, targetPath);
  else if (!animated) convertToAvif(source, targetPath);
  else fs.copyFileSync(source, targetPath);
  const url = `/${targetDir.split("/").join("/")}/${hex}.${outExt}`;
  urls.push(url);
  console.log(`${url} <- ${source}`);
}

if (articlePath) {
  const fullPath = path.join(root, articlePath);
  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split("\n");
  const shared = captions.length === 1 ? captions[0] : "";
  const imageLines = urls.map((url, index) => {
    const alt = shared || captions[index] || path.basename(sources[index], path.extname(sources[index]));
    return `![${alt}](${url})`;
  });
  let inserted = false;
  if (after) {
    const index = lines.findIndex((line) => line.includes(after));
    if (index >= 0) {
      lines.splice(index + 1, 0, ...imageLines);
      inserted = true;
    }
  }
  if (!inserted) {
    const joiner = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(fullPath, `${content}${joiner}\n${imageLines.join("\n")}\n`);
  } else {
    fs.writeFileSync(fullPath, lines.join("\n"));
  }
  console.log(`inserted ${imageLines.length} reference(s) into ${articlePath}`);
}
