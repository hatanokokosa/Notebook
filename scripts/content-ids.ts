import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { isUuidV4 } from "../src/lib/content-identity";

const markdownExtensions = new Set([".md", ".mdx"]);

export type ContentIdMode = "check" | "write";

export type ContentIdReport = {
  readonly changedPaths: readonly string[];
  readonly errors: readonly string[];
  readonly valid: boolean;
};

export type ContentIdRunOptions = {
  readonly contentDirectory: string;
  readonly mode: ContentIdMode;
};

type Frontmatter = {
  readonly contentId: string | undefined;
  readonly contentIdFieldCount: number;
  readonly disabled: boolean;
  readonly insertionOffset: number | undefined;
};

type SourceFile = {
  readonly content: string;
  readonly frontmatter: Frontmatter;
  readonly groupPath: string;
  readonly relativePath: string;
  readonly sourcePath: string;
};

type Inventory = {
  readonly enabledFiles: readonly SourceFile[];
  readonly errors: readonly string[];
  readonly groups: ReadonlyMap<string, readonly SourceFile[]>;
};

export async function runContentIdInventory(options: ContentIdRunOptions): Promise<ContentIdReport> {
  const files = await readSourceFiles(options.contentDirectory);
  const inventory = buildInventory(files);

  if (inventory.errors.length > 0) {
    return { changedPaths: [], errors: inventory.errors, valid: false };
  }

  if (options.mode === "check") {
    const errors = inventory.enabledFiles
      .filter((file) => file.frontmatter.contentId === undefined)
      .map((file) => `${file.relativePath}: missing contentId`);
    return { changedPaths: [], errors, valid: errors.length === 0 };
  }

  const unwritableFiles = inventory.enabledFiles.filter(
    (file) => file.frontmatter.contentId === undefined && file.frontmatter.insertionOffset === undefined,
  );
  if (unwritableFiles.length > 0) {
    return {
      changedPaths: [],
      errors: unwritableFiles.map((file) => `${file.relativePath}: cannot add contentId without recognized frontmatter`),
      valid: false,
    };
  }

  const changedPaths = await writeMissingContentIds(inventory.groups);
  return { changedPaths, errors: [], valid: true };
}

async function readSourceFiles(contentDirectory: string): Promise<readonly SourceFile[]> {
  const sourcePaths = await collectMarkdownPaths(contentDirectory);
  const files: SourceFile[] = [];

  for (const sourcePath of sourcePaths) {
    const content = await Bun.file(sourcePath).text();
    const relativePath = relative(contentDirectory, sourcePath).replaceAll("\\", "/");
    files.push({
      content,
      frontmatter: parseFrontmatter(content),
      groupPath: getLocaleRelativePath(relativePath),
      relativePath,
      sourcePath,
    });
  }

  return files;
}

async function collectMarkdownPaths(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const sourcePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await collectMarkdownPaths(sourcePath)));
    } else if (entry.isFile() && markdownExtensions.has(extensionOf(entry.name))) {
      paths.push(sourcePath);
    }
  }

  return paths.sort();
}

function extensionOf(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? "" : path.slice(dotIndex);
}

function parseFrontmatter(content: string): Frontmatter {
  const openingLineEnd = content.indexOf("\n");
  if (openingLineEnd === -1 || content.slice(0, openingLineEnd).replace(/\r$/, "") !== "---") {
    return { contentId: undefined, contentIdFieldCount: 0, disabled: false, insertionOffset: undefined };
  }

  const closingBoundary = /^---\r?$/gm;
  closingBoundary.lastIndex = openingLineEnd + 1;
  const closingMatch = closingBoundary.exec(content);
  if (!closingMatch || closingMatch.index === 0) {
    return { contentId: undefined, contentIdFieldCount: 0, disabled: false, insertionOffset: undefined };
  }

  const frontmatter = content.slice(openingLineEnd + 1, closingMatch.index);
  const contentIds = [...frontmatter.matchAll(/^contentId[ \t]*:[ \t]*(.*?)[ \t]*\r?$/gm)].map((match) => unquote(match[1]));
  return {
    contentId: contentIds.length === 1 ? contentIds[0] : undefined,
    contentIdFieldCount: contentIds.length,
    disabled: /^comments[ \t]*:[ \t]*false[ \t]*(?:#.*)?\r?$/m.test(frontmatter),
    insertionOffset: closingMatch.index,
  };
}

function unquote(value: string | undefined): string {
  if (value === undefined) return "";
  const quoted = /^(?:"(.*)"|'(.*)')$/.exec(value);
  return quoted?.[1] ?? quoted?.[2] ?? value;
}

function getLocaleRelativePath(relativePath: string): string {
  const [locale, ...pathSegments] = relativePath.split("/");
  switch (locale) {
    case "zh-cn":
    case "en-us":
    case "ja-jp":
      return pathSegments.join("/");
    default:
      return relativePath;
  }
}

function buildInventory(files: readonly SourceFile[]): Inventory {
  const enabledFiles = files.filter((file) => !file.frontmatter.disabled);
  const groups = new Map<string, SourceFile[]>();
  const errors: string[] = [];

  for (const file of enabledFiles) {
    const contentId = file.frontmatter.contentId;
    if (file.frontmatter.contentIdFieldCount > 1) {
      errors.push(`${file.relativePath}: multiple contentId fields`);
    } else if (contentId !== undefined && !isUuidV4(contentId)) {
      errors.push(`${file.relativePath}: invalid contentId`);
    }

    const group = groups.get(file.groupPath);
    if (group) {
      group.push(file);
    } else {
      groups.set(file.groupPath, [file]);
    }
  }

  for (const group of groups.values()) {
    const ids = new Set(group.flatMap((file) => (file.frontmatter.contentId ? [file.frontmatter.contentId] : [])));
    if (ids.size > 1) {
      errors.push(`${group.map((file) => file.relativePath).join(", ")}: conflicting contentId values`);
    }
  }

  const pathsById = new Map<string, SourceFile[]>();
  for (const file of enabledFiles) {
    const contentId = file.frontmatter.contentId;
    if (!contentId || !isUuidV4(contentId)) continue;
    const filesWithId = pathsById.get(contentId);
    if (filesWithId) {
      filesWithId.push(file);
    } else {
      pathsById.set(contentId, [file]);
    }
  }

  for (const filesWithId of pathsById.values()) {
    const groupPaths = new Set(filesWithId.map((file) => file.groupPath));
    if (groupPaths.size > 1) {
      errors.push(`${filesWithId.map((file) => file.relativePath).join(", ")}: duplicate contentId across locale groups`);
    }
  }

  return { enabledFiles, errors: errors.sort(), groups };
}

async function writeMissingContentIds(groups: ReadonlyMap<string, readonly SourceFile[]>): Promise<readonly string[]> {
  const changedPaths: string[] = [];

  for (const group of groups.values()) {
    const contentId = group.find((file) => file.frontmatter.contentId !== undefined)?.frontmatter.contentId ?? crypto.randomUUID();
    for (const file of group) {
      if (file.frontmatter.contentId !== undefined) continue;
      const insertionOffset = file.frontmatter.insertionOffset;
      if (insertionOffset === undefined) continue;
      const lineEnding = file.content.includes("\r\n") ? "\r\n" : "\n";
      const updatedContent = `${file.content.slice(0, insertionOffset)}contentId: ${contentId}${lineEnding}${file.content.slice(insertionOffset)}`;
      await Bun.write(file.sourcePath, updatedContent);
      changedPaths.push(file.relativePath);
    }
  }

  return changedPaths.sort();
}

if (import.meta.main) {
  const mode = process.argv[2];
  if (mode !== "--check" && mode !== "--write") {
    console.error("Usage: bun scripts/content-ids.ts --check|--write");
    process.exitCode = 1;
  } else {
    const report = await runContentIdInventory({
      contentDirectory: join(process.cwd(), "src/content/docs"),
      mode: mode === "--check" ? "check" : "write",
    });
    for (const error of report.errors) console.error(error);
    for (const changedPath of report.changedPaths) console.log(changedPath);
    if (!report.valid) process.exitCode = 1;
  }
}
