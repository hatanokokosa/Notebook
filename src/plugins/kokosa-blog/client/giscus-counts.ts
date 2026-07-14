import { isContentTerm } from "../../../lib/content-identity";

const discussionsEndpoint = "https://api.github.com/repos/hatanokokosa/hatanokokosa/discussions?per_page=100";
const cacheTtl = 2 * 60 * 60 * 1000;
const discussionCategory = "Q&A";

export const commentCountCacheKey = "kokosa-giscus-counts-v3";

export type GiscusCounts = {
  readonly comments: number;
  readonly reactions: number;
};

export type GiscusCountMap = Record<string, GiscusCounts>;

export type StorageAdapter = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
};

export type DiscussionResponse = {
  readonly ok: boolean;
  readonly headers: { readonly get: (name: string) => string | null };
  readonly json: () => Promise<unknown>;
};

export type DiscussionRequest = (url: string) => Promise<DiscussionResponse>;

export type CommentCounterTarget = {
  readonly dataset: Readonly<Record<string, string | undefined>>;
  textContent: string | null;
};

type CachedCounts = {
  readonly expiresAt: number;
  readonly counts: GiscusCountMap;
};

type CommentCountHydration = {
  readonly counters: readonly CommentCounterTarget[];
  readonly fallbackLabel: string;
  readonly getCounts: () => Promise<GiscusCountMap>;
};

export class GitHubDiscussionResponseError extends Error {
  public constructor() {
    super("GitHub Discussions returned an invalid response");
    this.name = "GitHubDiscussionResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getNextPageUrl(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;

  for (const link of linkHeader.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(link);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function getCountsFromResponse(response: unknown): GiscusCountMap {
  if (!Array.isArray(response)) {
    throw new GitHubDiscussionResponseError();
  }

  const counts: GiscusCountMap = {};

  for (const item of response) {
    if (!isRecord(item) || !isRecord(item.category)) continue;

    const title = item.title;
    if (item.category.name !== discussionCategory || typeof title !== "string" || !isContentTerm(title)) continue;

    const reactions = isRecord(item.reactions) ? item.reactions.total_count : undefined;
    counts[title] = {
      comments: getNumber(item.comments),
      reactions: getNumber(reactions),
    };
  }

  return counts;
}

function readCachedCounts(storage: StorageAdapter, now: number): GiscusCountMap | undefined {
  const value = storage.getItem(commentCountCacheKey);
  if (!value) return undefined;

  try {
    const cached: unknown = JSON.parse(value);
    if (!isRecord(cached) || typeof cached.expiresAt !== "number" || !isRecord(cached.counts) || cached.expiresAt <= now) {
      return undefined;
    }

    const counts: GiscusCountMap = {};
    for (const [term, count] of Object.entries(cached.counts)) {
      if (!isContentTerm(term) || !isRecord(count)) continue;
      counts[term] = {
        comments: getNumber(count.comments),
        reactions: getNumber(count.reactions),
      };
    }

    return counts;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function writeCachedCounts(storage: StorageAdapter, counts: GiscusCountMap, now: number): void {
  const cached: CachedCounts = { expiresAt: now + cacheTtl, counts };
  storage.setItem(commentCountCacheKey, JSON.stringify(cached));
}

export async function fetchDiscussionCounts(request: DiscussionRequest): Promise<GiscusCountMap> {
  const counts: GiscusCountMap = {};
  let nextPageUrl: string | undefined = discussionsEndpoint;

  while (nextPageUrl) {
    const response = await request(nextPageUrl);
    if (!response.ok) throw new GitHubDiscussionResponseError();

    Object.assign(counts, getCountsFromResponse(await response.json()));
    nextPageUrl = getNextPageUrl(response.headers.get("Link"));
  }

  return counts;
}

export async function getCommentCounts(storage: StorageAdapter, request: DiscussionRequest, now = Date.now()): Promise<GiscusCountMap> {
  const cached = readCachedCounts(storage, now);
  if (cached) return cached;

  const counts = await fetchDiscussionCounts(request);
  writeCachedCounts(storage, counts, now);
  return counts;
}

export function getDefaultFallbackLabel(language: string): string {
  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith("ja")) return "コメント - · いいね -";
  if (normalizedLanguage.startsWith("en")) return "Comments - · Likes -";
  return "评论 - · 喜欢 -";
}

function getCountLabel(counter: CommentCounterTarget, counts: GiscusCounts): string {
  const commentLabel = counter.dataset[counts.comments === 1 ? "commentOne" : "commentOther"] ?? " comments";
  const reactionLabel = counter.dataset[counts.reactions === 1 ? "reactionOne" : "reactionOther"] ?? " likes";
  return `${counts.comments}${commentLabel} · ${counts.reactions}${reactionLabel}`;
}

export async function hydrateCommentCounters({ counters, fallbackLabel, getCounts }: CommentCountHydration): Promise<void> {
  try {
    const counts = await getCounts();

    for (const counter of counters) {
      const term = counter.dataset.giscusTerm;
      const count = term && isContentTerm(term) ? counts[term] : undefined;
      counter.textContent = getCountLabel(counter, count ?? { comments: 0, reactions: 0 });
    }
  } catch {
    for (const counter of counters) {
      counter.textContent = counter.dataset.fallbackLabel ?? fallbackLabel;
    }
  }
}
