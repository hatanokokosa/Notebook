const endpoint = "https://giscus.app/api/discussions";
const repo = "hatanokokosa/hatanokokosa";
const category = "Q&A";
const cache = new Map<string, Promise<GiscusCounts>>();

interface GiscusCounts {
  comments: number;
  reactions: number;
}

function getCommentLabel({ comments, reactions }: GiscusCounts) {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("ja")) return `${comments} 件のコメント · ${reactions} いいね`;
  if (lang.startsWith("en")) return `${comments} comment${comments === 1 ? "" : "s"} · ${reactions} like${reactions === 1 ? "" : "s"}`;
  return `${comments}条评论 · ${reactions}个喜欢`;
}

function getFallbackLabel() {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("ja")) return "コメント - · いいね -";
  if (lang.startsWith("en")) return "Comments - · Likes -";
  return "评论 - · 喜欢 -";
}

async function fetchGiscusCounts(term: string): Promise<GiscusCounts> {
  const params = new URLSearchParams({ repo, category, term, strict: "0" });
  const response = await fetch(`${endpoint}?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to fetch Giscus count for ${term}`);

  const payload = await response.json();
  const discussion = payload?.discussion;
  if (!discussion) return { comments: 0, reactions: 0 };

  return {
    comments: Number(discussion.totalCommentCount ?? 0) + Number(discussion.totalReplyCount ?? 0),
    reactions: Number(discussion.reactionCount ?? 0),
  };
}

function getCachedGiscusCounts(term: string) {
  let request = cache.get(term);
  if (!request) {
    request = fetchGiscusCounts(term);
    cache.set(term, request);
  }
  return request;
}

async function hydrateCommentCounts() {
  const counters = document.querySelectorAll<HTMLElement>("[data-giscus-term]");

  await Promise.all(
    [...counters].map(async (counter) => {
      const term = counter.dataset.giscusTerm;
      if (!term) return;

      try {
        const counts = await getCachedGiscusCounts(term);
        counter.textContent = getCommentLabel(counts);
      } catch {
        counter.textContent = getFallbackLabel();
      }
    }),
  );
}

hydrateCommentCounts();
document.addEventListener("astro:page-load", hydrateCommentCounts);
