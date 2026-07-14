import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { runContentIdInventory } from "../scripts/content-ids";
import { isUuidV4 } from "../src/lib/content-identity";

const firstContentId = "550e8400-e29b-41d4-a716-446655440000";
const secondContentId = "123e4567-e89b-42d3-a456-426614174000";

type Fixture = {
  readonly contentDirectory: string;
  readonly readSource: (relativePath: string) => Promise<string>;
};

async function withFixture(files: Readonly<Record<string, string>>, assertion: (fixture: Fixture) => Promise<void>): Promise<void> {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "content-ids-"));
  const contentDirectory = join(fixtureDirectory, "src/content/docs");
  for (const [relativePath, content] of Object.entries(files)) {
    const sourcePath = join(contentDirectory, relativePath);
    await mkdir(dirname(sourcePath), { recursive: true });
    await Bun.write(sourcePath, content);
  }

  try {
    await assertion({
      contentDirectory,
      readSource: (relativePath) => Bun.file(join(contentDirectory, relativePath)).text(),
    });
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}

function getContentId(source: string): string {
  return /^contentId:\s*(.+?)\s*$/m.exec(source)?.[1] ?? "";
}

test("reports an enabled article without a content ID during check", async () => {
  // Given
  await withFixture({ "zh-cn/blog/example.md": "---\ntitle: Example\n---\nBody\ncomments : false\n" }, async ({ contentDirectory }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "check" });

    // Then
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(["zh-cn/blog/example.md: missing contentId"]);
  });
});

test("refuses to write an enabled source without recognized frontmatter", async () => {
  // Given
  const source = "title: Example\n---\ncontentId: not-frontmatter\n";
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report).toEqual({
      changedPaths: [],
      errors: ["zh-cn/blog/example.md: cannot add contentId without recognized frontmatter"],
      valid: false,
    });
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});

test("recognizes whitespace before the disabled comments key colon during check", async () => {
  // Given
  const source = "---\ncomments : false\n---\nBody\n";
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "check" });

    // Then
    expect(report).toEqual({ changedPaths: [], errors: [], valid: true });
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});

test("does not write a disabled source with whitespace before the comments key colon", async () => {
  // Given
  const source = "---\ncomments : false\n---\nBody\n";
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report).toEqual({ changedPaths: [], errors: [], valid: true });
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});

test("writes one content ID per locale group and makes the second write a no-op", async () => {
  // Given
  const source = "---\ntitle: Shared\n---\nBody bytes stay unchanged\n";
  await withFixture(
    {
      "zh-cn/blog/shared.md": source,
      "en-us/blog/shared.md": source,
      "ja-jp/blog/shared.md": source,
      "zh-cn/create/practice/solo.md": source,
    },
    async ({ contentDirectory, readSource }) => {
      // When
      const firstWrite = await runContentIdInventory({ contentDirectory, mode: "write" });
      const firstSources = await Promise.all([
        readSource("zh-cn/blog/shared.md"),
        readSource("en-us/blog/shared.md"),
        readSource("ja-jp/blog/shared.md"),
        readSource("zh-cn/create/practice/solo.md"),
      ]);
      const secondWrite = await runContentIdInventory({ contentDirectory, mode: "write" });
      const secondSources = await Promise.all([
        readSource("zh-cn/blog/shared.md"),
        readSource("en-us/blog/shared.md"),
        readSource("ja-jp/blog/shared.md"),
        readSource("zh-cn/create/practice/solo.md"),
      ]);

      // Then
      const sharedIds = firstSources.slice(0, 3).map(getContentId);
      expect(firstWrite.changedPaths).toHaveLength(4);
      expect(new Set(sharedIds).size).toBe(1);
      expect(isUuidV4(sharedIds[0] ?? "")).toBe(true);
      expect(getContentId(firstSources[3] ?? "")).not.toBe(sharedIds[0]);
      expect(secondWrite.changedPaths).toEqual([]);
      expect(secondSources).toEqual(firstSources);
      expect(firstSources[0]).toContain("title: Shared\ncontentId:");
      expect(firstSources[0]).toContain("---\nBody bytes stay unchanged\n");
    },
  );
});

test("uses an existing valid whitespace-spelled group content ID without rewriting that source", async () => {
  // Given
  const existingSource = `---\ntitle: Shared\ncontentId : ${firstContentId}\n---\nBody\n`;
  await withFixture(
    {
      "zh-cn/blog/shared.md": existingSource,
      "en-us/blog/shared.md": "---\ntitle: Shared\n---\nBody\n",
    },
    async ({ contentDirectory, readSource }) => {
      // When
      const report = await runContentIdInventory({ contentDirectory, mode: "write" });

      // Then
      expect(report.changedPaths).toEqual(["en-us/blog/shared.md"]);
      expect(await readSource("zh-cn/blog/shared.md")).toBe(existingSource);
      expect(getContentId(await readSource("en-us/blog/shared.md"))).toBe(firstContentId);
    },
  );
});

test("refuses conflicting content IDs in a locale group without modifying sources", async () => {
  // Given
  const chineseSource = `---\ncontentId: ${firstContentId}\n---\nBody\n`;
  const englishSource = `---\ncontentId: ${secondContentId}\n---\nBody\n`;
  await withFixture(
    { "zh-cn/blog/shared.md": chineseSource, "en-us/blog/shared.md": englishSource },
    async ({ contentDirectory, readSource }) => {
      // When
      const report = await runContentIdInventory({ contentDirectory, mode: "write" });

      // Then
      expect(report.valid).toBe(false);
      expect(report.errors[0]).toContain("zh-cn/blog/shared.md");
      expect(await readSource("zh-cn/blog/shared.md")).toBe(chineseSource);
      expect(await readSource("en-us/blog/shared.md")).toBe(englishSource);
    },
  );
});

test("refuses duplicate content IDs across unrelated locale-relative paths without modifying sources", async () => {
  // Given
  const source = `---\ncontentId: ${firstContentId}\n---\nBody\n`;
  await withFixture({ "zh-cn/blog/first.md": source, "en-us/blog/second.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report.valid).toBe(false);
    expect(report.errors[0]).toContain("zh-cn/blog/first.md");
    expect(await readSource("zh-cn/blog/first.md")).toBe(source);
    expect(await readSource("en-us/blog/second.md")).toBe(source);
  });
});

test("refuses an invalid existing content ID without modifying the source", async () => {
  // Given
  const source = "---\ncontentId:\n---\nBody\n";
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(["zh-cn/blog/example.md: invalid contentId"]);
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});

test("refuses multiple content ID fields without modifying the source", async () => {
  // Given
  const source = `---\ncontentId: ${firstContentId}\ncontentId: ${secondContentId}\n---\nBody\n`;
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(["zh-cn/blog/example.md: multiple contentId fields"]);
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});

test("refuses mixed whitespace spellings of repeated content ID fields without modifying the source", async () => {
  // Given
  const source = `---\ncontentId : ${firstContentId}\ncontentId: ${secondContentId}\n---\nBody\n`;
  await withFixture({ "zh-cn/blog/example.md": source }, async ({ contentDirectory, readSource }) => {
    // When
    const report = await runContentIdInventory({ contentDirectory, mode: "write" });

    // Then
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(["zh-cn/blog/example.md: multiple contentId fields"]);
    expect(await readSource("zh-cn/blog/example.md")).toBe(source);
  });
});
