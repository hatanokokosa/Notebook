import { expect, test } from "bun:test";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const legacyIdentityName = ["comment", "Id"].join("");
const legacyCheckCommand = ["comments", "ids", "check"].join(":");
const contentCheckCommand = ["content", "ids", "check"].join(":");

test("uses content identity terminology and stable RSS GUIDs", async () => {
  // Given
  const packageSource = await Bun.file(join(projectRoot, "package.json")).text();
  const schemaSource = await Bun.file(join(projectRoot, "src/content.config.ts")).text();
  const rssSource = await Bun.file(join(projectRoot, "src/plugins/kokosa-blog/libs/rss.ts")).text();

  // When
  // Then
  expect(packageSource).toContain(`"${contentCheckCommand}"`);
  expect(packageSource).not.toContain(`"${legacyCheckCommand}"`);
  expect(schemaSource).toContain("contentId");
  expect(schemaSource).not.toContain(legacyIdentityName);
  expect(rssSource).toContain('isPermaLink="false"');
  expect(rssSource).toContain("createContentGuid(entry.data.contentId)");
  expect(rssSource).not.toContain('isPermaLink="true"');
});
