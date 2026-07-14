import { expect, test } from "bun:test";

import { createContentTerm } from "../src/lib/content-identity";
import { GiscusTermConfigurationError, createGiscusScriptAttributes } from "../src/lib/giscus-config";

const contentId = "550e8400-e29b-41d4-a716-446655440000";

test("creates strict specific attributes from the rendered immutable term", () => {
  // Given
  const container = { dataset: { giscusTerm: createContentTerm(contentId) } };

  // When
  const attributes = createGiscusScriptAttributes(container.dataset.giscusTerm);

  // Then
  expect(attributes).toEqual({
    "data-mapping": "specific",
    "data-term": "kokosa: 550e8400-e29b-41d4-a716-446655440000",
    "data-strict": "1",
  });
});

test("rejects a missing rendered term instead of deriving one from a route", () => {
  // Given
  const container: { readonly dataset: { readonly giscusTerm?: string } } = { dataset: {} };

  // When
  const createAttributes = () => createGiscusScriptAttributes(container.dataset.giscusTerm);

  // Then
  expect(createAttributes).toThrow(GiscusTermConfigurationError);
});

test("rejects a route-derived rendered term", () => {
  // Given
  const container = { dataset: { giscusTerm: "kokosa:/en-us/blog/renamed/" } };

  // When
  const createAttributes = () => createGiscusScriptAttributes(container.dataset.giscusTerm);

  // Then
  expect(createAttributes).toThrow(GiscusTermConfigurationError);
});
