const discussionsEndpoint = "https://api.github.com/repos/hatanokokosa/hatanokokosa/discussions?per_page=100";
const cacheKey = "kokosa-giscus-counts-v2";
const cacheTtl = 2 * 60 * 60 * 1000;
const uniqueTermPrefix = "kokosa:";

interface GiscusCounts {
  comments: number;
  reactions: number;
}

interface CachedCounts {
  expiresAt: number;
  counts: Record<string, GiscusCounts>;
}

interface GitHubDiscussion {
  title?: string;
  body?: string;
  comments?: number;
  category?: { name?: string };
  reactions?: { total_count?: number };
}

function getDatasetValue(counter: HTMLElement, key: string, fallback: string) {
  return counter.dataset[key] ?? fallback;
}

function getCountLabel(counter: HTMLElement, { comments, reactions }: GiscusCounts) {
  const commentLabel = getDatasetValue(counter, comments === 1 ? "commentOne" : "commentOther", ` comment${comments === 1 ? "" : "s"}`);
  const reactionLabel = getDatasetValue(counter, reactions === 1 ? "reactionOne" : "reactionOther", ` like${reactions === 1 ? "" : "s"}`);

  return `${comments}${commentLabel} · ${reactions}${reactionLabel}`;
}

function getFallbackLabel(counter?: HTMLElement) {
  if (counter?.dataset.fallbackLabel) return counter.dataset.fallbackLabel;

  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("ja")) return "コメント - · いいね -";
  if (lang.startsWith("en")) return "Comments - · Likes -";
  return "评论 - · 喜欢 -";
}

function normalizeTerm(value: string) {
  let pathname = value.trim().replace(/^#\s*/, "");

  if (pathname.startsWith(uniqueTermPrefix)) pathname = pathname.slice(uniqueTermPrefix.length);

  try {
    pathname = new URL(pathname).pathname;
  } catch {}

  pathname = pathname.replace(/^\/(zh-cn|en-us|ja-jp)(?=\/|$)/, "");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (!pathname.endsWith("/")) pathname = `${pathname}/`;

  return pathname;
}

function getDiscussionTerms(discussion: GitHubDiscussion) {
  const terms = new Set<string>();

  if (discussion.title) terms.add(normalizeTerm(discussion.title));

  for (const url of discussion.body?.match(/https?:\/\/[^\s)]+/g) ?? []) {
    terms.add(normalizeTerm(url));
  }

  return terms;
}

function readCachedCounts() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "") as CachedCounts;
    if (cached.expiresAt > Date.now()) return cached.counts;
  } catch {}
}

function writeCachedCounts(counts: Record<string, GiscusCounts>) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + cacheTtl, counts } satisfies CachedCounts));
  } catch {}
}

async function fetchAllCounts() {
  const cached = readCachedCounts();
  if (cached) return cached;

  const response = await fetch(discussionsEndpoint, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error("Failed to fetch GitHub discussions");

  const discussions = (await response.json()) as GitHubDiscussion[];
  const counts: Record<string, GiscusCounts> = {};

  for (const discussion of discussions) {
    if (discussion.category?.name !== "Q&A") continue;

    const value = {
      comments: Number(discussion.comments ?? 0),
      reactions: Number(discussion.reactions?.total_count ?? 0),
    };

    for (const term of getDiscussionTerms(discussion)) {
      counts[term] = value;
    }
  }

  writeCachedCounts(counts);
  return counts;
}

async function hydrateCommentCounts() {
  const counters = [...document.querySelectorAll<HTMLElement>("[data-giscus-term]")];
  if (counters.length === 0) return;

  try {
    const counts = await fetchAllCounts();

    for (const counter of counters) {
      const term = counter.dataset.giscusTerm ? normalizeTerm(counter.dataset.giscusTerm) : undefined;
      counter.textContent =
        term && counts[term] ? getCountLabel(counter, counts[term]) : getCountLabel(counter, { comments: 0, reactions: 0 });
    }
  } catch {
    for (const counter of counters) {
      counter.textContent = getFallbackLabel(counter);
    }
  }
}

hydrateCommentCounts();
document.addEventListener("astro:page-load", hydrateCommentCounts);

export {};
