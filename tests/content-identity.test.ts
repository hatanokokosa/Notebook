import { expect, test } from "bun:test";

import { createContentGuid, createContentTerm, isExactContentTerm } from "../src/lib/content-identity";

const firstContentId = "550e8400-e29b-41d4-a716-446655440000";
const secondContentId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

test("creates exact immutable terms for UUID v4 content IDs", () => {
  // Given
  const expectedFirstTerm = "kokosa:550e8400-e29b-41d4-a716-446655440000";
  const expectedSecondTerm = "kokosa:f47ac10b-58cc-4372-a567-0e02b2c3d479";

  // When
  const firstTerm = createContentTerm(firstContentId);
  const secondTerm = createContentTerm(secondContentId);

  // Then
  expect(firstTerm).toBe(expectedFirstTerm);
  expect(secondTerm).toBe(expectedSecondTerm);
  expect(firstTerm).not.toBe(secondTerm);
});

test("compares only the supplied UUID-specific term", () => {
  // Given
  const immutableTerm = createContentTerm(firstContentId);
  const mutableTerms = [
    "kokosa:/en-us/blog/renamed/",
    "kokosa:Renamed article title",
    "kokosa:https://www.kokosa.icu/ja-jp/blog/renamed/",
    "kokosa:Discussion body URL https://www.kokosa.icu/zh-cn/blog/renamed/",
  ];

  // When
  const exactMatch = isExactContentTerm(immutableTerm, firstContentId);
  const mutableMatches = mutableTerms.map((term) => isExactContentTerm(term, firstContentId));

  // Then
  expect(exactMatch).toBe(true);
  expect(mutableMatches).toEqual([false, false, false, false]);
});

test("rejects an empty content ID", () => {
  // Given
  const emptyContentId = "";

  // When
  const createTerm = () => createContentTerm(emptyContentId);

  // Then
  expect(createTerm).toThrow();
});

test("rejects a malformed content ID", () => {
  // Given
  const malformedContentId = "550e8400-e29b-11d4-a716-446655440000";

  // When
  const createTerm = () => createContentTerm(malformedContentId);

  // Then
  expect(createTerm).toThrow();
});

test("rejects an already-prefixed content ID", () => {
  // Given
  const prefixedContentId = "kokosa:550e8400-e29b-41d4-a716-446655440000";

  // When
  const createTerm = () => createContentTerm(prefixedContentId);

  // Then
  expect(createTerm).toThrow();
});

test("creates a URL-independent RSS GUID for a content ID", () => {
  // Given
  const originalUrl = "https://kokosa.icu/zh-cn/blog/original/";
  const renamedUrl = "https://kokosa.icu/en-us/blog/renamed/";

  // When
  const originalGuid = createContentGuid(firstContentId);
  const renamedGuid = createContentGuid(firstContentId);

  // Then
  expect(originalGuid).toBe("urn:kokosa:content:550e8400-e29b-41d4-a716-446655440000");
  expect(renamedGuid).toBe(originalGuid);
  expect(originalGuid).not.toContain(originalUrl);
  expect(renamedGuid).not.toContain(renamedUrl);
});
