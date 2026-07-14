import { expect, test } from "bun:test";

import { getPreviewContentTerm } from "../src/lib/content-preview";
import {
  commentCountCacheKey,
  getCommentCounts,
  hydrateCommentCounters,
  type DiscussionResponse,
  type DiscussionRequest,
  type StorageAdapter,
} from "../src/plugins/kokosa-blog/client/giscus-counts";

const firstTerm = "kokosa: 550e8400-e29b-41d4-a716-446655440000";
const secondTerm = "kokosa: 6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const ignoredTerm = "kokosa: 123e4567-e89b-42d3-a456-426614174000";
const discussionsUrl = "https://api.github.com/repos/hatanokokosa/hatanokokosa/discussions?per_page=100";
const secondPageUrl = "https://api.github.com/repos/hatanokokosa/hatanokokosa/discussions?per_page=100&page=2";

function createStorage(initial: Record<string, string> = {}): StorageAdapter {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function createResponse(payload: unknown, nextPage?: string): DiscussionResponse {
  return {
    ok: true,
    headers: {
      get(name) {
        return name === "Link" && nextPage ? `<${nextPage}>; rel="next"` : null;
      },
    },
    async json() {
      return payload;
    },
  };
}

test("hydrates exact UUID terms from every paginated Q&A response and ignores the v2 cache", async () => {
  // Given
  const requests: string[] = [];
  const storage = createStorage({
    "kokosa-giscus-counts-v2": JSON.stringify({
      expiresAt: Date.now() + 60_000,
      counts: { [firstTerm]: { comments: 99, reactions: 99 } },
    }),
  });
  const request: DiscussionRequest = async (url) => {
    requests.push(url);

    if (url === discussionsUrl) {
      return createResponse(
        [
          {
            title: firstTerm,
            category: { name: "Q&A" },
            comments: 3,
            reactions: { total_count: 4 },
          },
          {
            title: "/blog/2-tgbot-rss/",
            body: "https://hatano.example/blog/2-tgbot-rss/",
            category: { name: "Q&A" },
            comments: 99,
            reactions: { total_count: 99 },
          },
          {
            title: ignoredTerm,
            category: { name: "Ideas" },
            comments: 98,
            reactions: { total_count: 98 },
          },
        ],
        secondPageUrl,
      );
    }

    return createResponse([
      {
        title: secondTerm,
        category: { name: "Q&A" },
        comments: 1,
        reactions: { total_count: 2 },
      },
    ]);
  };

  // When
  const counts = await getCommentCounts(storage, request);

  // Then
  expect(requests).toEqual([discussionsUrl, secondPageUrl]);
  expect(counts).toEqual({
    [firstTerm]: { comments: 3, reactions: 4 },
    [secondTerm]: { comments: 1, reactions: 2 },
  });
  expect(counts[ignoredTerm]).toBeUndefined();
  expect(storage.getItem(commentCountCacheKey)).toContain(firstTerm);
});

test("keeps the localized fallback when GitHub count hydration fails", async () => {
  // Given
  const counter = {
    dataset: {
      giscusTerm: firstTerm,
      fallbackLabel: "评论 - · 喜欢 -",
    },
    textContent: "评论 ...",
  };
  const request: DiscussionRequest = async () => ({
    ok: false,
    headers: { get: () => null },
    async json() {
      return [];
    },
  });

  // When
  await hydrateCommentCounters({
    counters: [counter],
    fallbackLabel: "Comments - · Likes -",
    getCounts: () => getCommentCounts(createStorage(), request),
  });

  // Then
  expect(counter.textContent).toBe("评论 - · 喜欢 -");
});

test("omits a preview count target when comments are disabled", () => {
  // Given
  const entry = { comments: false, contentId: "550e8400-e29b-41d4-a716-446655440000" };

  // When
  const term = getPreviewContentTerm(entry);

  // Then
  expect(term).toBeUndefined();
});
