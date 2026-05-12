import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const hexIdPattern = /^[0-9a-f]{16}$/;
const imageExtPattern = /\.(?:avif|webp|png|jpe?g|gif|svg)$/i;
const textExtPattern = /\.(?:ts|tsx|astro|md|mdx|json|css|js|mjs|cjs)$/i;
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

const excludedPublicPaths = new Set(["favicon.svg"]);
const excludedPublicDirs = new Set(["_watermarked", "friends"]);

type RenameMapping = {
  sourcePath: string;
  targetPath: string;
};

function walk(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPublicRelative(filePath: string): string {
  return path.relative(publicDir, filePath).split(path.sep).join("/");
}

function toPublicUrl(filePath: string): string {
  return `/${toPublicRelative(filePath)}`;
}

function isExcludedPublicFile(filePath: string): boolean {
  const relativePath = toPublicRelative(filePath);
  if (excludedPublicPaths.has(relativePath)) return true;

  const [topLevelDir] = relativePath.split("/");
  return excludedPublicDirs.has(topLevelDir);
}

function createHexId(): string {
  return randomBytes(8).toString("hex");
}

function createTargetPath(sourcePath: string, usedNames: Set<string>): string {
  const ext = path.extname(sourcePath).toLowerCase();
  let targetPath: string;

  do {
    targetPath = path.join(path.dirname(sourcePath), `${createHexId()}${ext}`);
  } while (usedNames.has(targetPath) || fs.existsSync(targetPath));

  usedNames.add(targetPath);
  return targetPath;
}

function findPublicImagesToRename(): string[] {
  return walk(publicDir)
    .filter((filePath) => imageExtPattern.test(filePath))
    .filter((filePath) => !isExcludedPublicFile(filePath))
    .filter((filePath) => {
      const basename = path.basename(filePath, path.extname(filePath));
      return force || !hexIdPattern.test(basename);
    })
    .sort();
}

function findTextFiles(): string[] {
  const files = [path.join(root, "astro.config.ts")];

  for (const dir of [path.join(root, "src"), publicDir]) {
    files.push(
      ...walk(dir)
        .filter(
          (filePath) =>
            !filePath.includes(`${path.sep}_watermarked${path.sep}`),
        )
        .filter((filePath) => textExtPattern.test(filePath)),
    );
  }

  return files;
}

const images = findPublicImagesToRename();
const usedNames = new Set<string>();
const mappings: RenameMapping[] = images.map((sourcePath) => ({
  sourcePath,
  targetPath: createTargetPath(sourcePath, usedNames),
}));

if (mappings.length === 0) {
  console.log("No public images need renaming.");
  process.exit(0);
}

for (const { sourcePath, targetPath } of mappings) {
  console.log(`${toPublicUrl(sourcePath)} -> ${toPublicUrl(targetPath)}`);
}

if (dryRun) process.exit(0);

for (const textFile of findTextFiles()) {
  const text = fs.readFileSync(textFile, "utf8");
  let nextText = text;

  for (const { sourcePath, targetPath } of mappings) {
    nextText = nextText
      .split(toPublicUrl(sourcePath))
      .join(toPublicUrl(targetPath));
  }

  if (nextText !== text) fs.writeFileSync(textFile, nextText);
}

for (const { sourcePath, targetPath } of mappings) {
  fs.renameSync(sourcePath, targetPath);
}
