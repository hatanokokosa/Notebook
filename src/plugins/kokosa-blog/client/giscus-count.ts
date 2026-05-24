const giscusOrigin = "https://giscus.app";
const repo = "hatanokokosa/hatanokokosa";
const repoId = "R_kgDONiihcQ";
const category = "Q&A";
const categoryId = "DIC_kwDONiihcc4Cs5Yk";

interface GiscusCounts {
  comments: number;
  reactions: number;
}

const iframeTerms = new WeakMap<Window, string>();

function getCountLabel({ comments, reactions }: GiscusCounts) {
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

function getWidgetUrl(term: string) {
  const params = new URLSearchParams({
    origin: window.location.href.split("#")[0],
    session: "",
    theme: "preferred_color_scheme",
    reactionsEnabled: "1",
    emitMetadata: "1",
    inputPosition: "bottom",
    repo,
    repoId,
    category,
    categoryId,
    strict: "0",
    description: "",
    backLink: window.location.href.split("#")[0],
    term,
  });

  return `${giscusOrigin}/widget?${params.toString()}`;
}

function ensureFrameHost() {
  let host = document.querySelector<HTMLElement>("[data-giscus-count-frames]");
  if (host) return host;

  host = document.createElement("div");
  host.dataset.giscusCountFrames = "";
  host.style.position = "absolute";
  host.style.inlineSize = "1px";
  host.style.blockSize = "1px";
  host.style.overflow = "hidden";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  return host;
}

function createMetadataFrame(term: string) {
  const iframe = document.createElement("iframe");
  iframe.title = "Giscus metadata";
  iframe.src = getWidgetUrl(term);
  iframe.loading = "lazy";
  iframe.tabIndex = -1;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.border = "0";
  iframe.style.inlineSize = "1px";
  iframe.style.blockSize = "1px";
  iframe.style.visibility = "hidden";

  ensureFrameHost().appendChild(iframe);
  if (iframe.contentWindow) iframeTerms.set(iframe.contentWindow, term);
}

function hydrateCommentCounts() {
  const counters = [...document.querySelectorAll<HTMLElement>("[data-giscus-term]")];
  const terms = new Set(counters.map((counter) => counter.dataset.giscusTerm).filter((term): term is string => Boolean(term)));

  ensureFrameHost().replaceChildren();
  for (const term of terms) createMetadataFrame(term);

  window.setTimeout(() => {
    for (const counter of counters) {
      if (counter.textContent?.includes("...")) counter.textContent = getFallbackLabel();
    }
  }, 7000);
}

window.addEventListener("message", (event) => {
  if (event.origin !== giscusOrigin) return;
  if (!(typeof event.data === "object" && event.data?.giscus && "discussion" in event.data.giscus)) return;

  const term = event.source ? iframeTerms.get(event.source as Window) : undefined;
  if (!term) return;

  const discussion = event.data.giscus.discussion;
  const label = getCountLabel({
    comments: Number(discussion.totalCommentCount ?? 0) + Number(discussion.totalReplyCount ?? 0),
    reactions: Number(discussion.reactionCount ?? 0),
  });

  for (const counter of document.querySelectorAll<HTMLElement>(`[data-giscus-term="${CSS.escape(term)}"]`)) {
    counter.textContent = label;
  }
});

hydrateCommentCounts();
document.addEventListener("astro:page-load", hydrateCommentCounts);
