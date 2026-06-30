const discussionsEndpoint = "https://api.github.com/repos/hatanokokosa/hatanokokosa/discussions?per_page=100";
const discussionCacheKey = "kokosa-giscus-discussions-v1";
const discussionCacheTtl = 2 * 60 * 60 * 1000;
const uniqueTermPrefix = "kokosa:";

interface CachedDiscussions {
  expiresAt: number;
  discussions: GitHubDiscussion[];
}

interface GitHubDiscussion {
  number?: number;
  title?: string;
  body?: string;
  category?: { name?: string };
}

function getGiscusTheme(): string {
  const storedTheme = typeof localStorage !== "undefined" ? localStorage.getItem("starlight-theme") : "auto";
  let isDark = false;

  if (storedTheme === "auto" || !storedTheme) {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    isDark = document.documentElement.dataset.theme === "dark";
  }

  const base = "https://www.kokosa.icu";
  return isDark ? `${base}/giscus/frappe.css` : `${base}/giscus/latte.css`;
}

function getGiscusLang(): string {
  const lang = (document.documentElement.lang || "zh-CN").toLowerCase();

  if (lang.startsWith("en")) return "en";
  if (lang === "zh-cn") return "zh-CN";
  if (lang === "zh-tw") return "zh-TW";
  if (lang === "zh-hk") return "zh-HK";
  if (lang === "ja-jp") return "ja";

  return "en";
}

function getGiscusTerm(): string {
  return normalizeTerm(window.location.pathname);
}

function normalizeTerm(value: string): string {
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

function readCachedDiscussions() {
  try {
    const cached = JSON.parse(localStorage.getItem(discussionCacheKey) ?? "") as CachedDiscussions;
    if (cached.expiresAt > Date.now()) return cached.discussions;
  } catch {}
}

function writeCachedDiscussions(discussions: GitHubDiscussion[]) {
  try {
    localStorage.setItem(
      discussionCacheKey,
      JSON.stringify({ expiresAt: Date.now() + discussionCacheTtl, discussions } satisfies CachedDiscussions),
    );
  } catch {}
}

async function fetchDiscussions() {
  const cached = readCachedDiscussions();
  if (cached) return cached;

  const response = await fetch(discussionsEndpoint, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error("Failed to fetch GitHub discussions");

  const discussions = (await response.json()) as GitHubDiscussion[];
  writeCachedDiscussions(discussions);
  return discussions;
}

async function getGiscusDiscussionConfig() {
  const term = getGiscusTerm();

  try {
    const discussions = await fetchDiscussions();
    const discussion = discussions.find((discussion) => discussion.category?.name === "Q&A" && getDiscussionTerms(discussion).has(term));

    if (discussion?.number) {
      return { mapping: "number", term: String(discussion.number) };
    }
  } catch {}

  return { mapping: "specific", term: `${uniqueTermPrefix}${term}` };
}

async function renderGiscus() {
  const container = document.querySelector(".giscus-container");
  if (!container) return;

  if (container.innerHTML.trim() !== "") {
    updateGiscusTheme();
    return;
  }

  if (container.getAttribute("data-giscus-loading") === "true") return;
  container.setAttribute("data-giscus-loading", "true");

  const discussionConfig = await getGiscusDiscussionConfig();

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", "hatanokokosa/hatanokokosa");
  script.setAttribute("data-repo-id", "R_kgDONiihcQ");
  script.setAttribute("data-category", "Q&A");
  script.setAttribute("data-category-id", "DIC_kwDONiihcc4Cs5Yk");
  script.setAttribute("data-mapping", discussionConfig.mapping);
  script.setAttribute("data-term", discussionConfig.term);
  script.setAttribute("data-strict", "1");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "bottom");
  script.setAttribute("data-theme", getGiscusTheme());
  script.setAttribute("data-lang", getGiscusLang());
  script.setAttribute("data-loading", "eager");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;

  container.appendChild(script);
  container.removeAttribute("data-giscus-loading");
}

function updateGiscusTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
  if (!iframe || !iframe.contentWindow) return;

  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: getGiscusTheme() } } }, "https://giscus.app");
}

let observer: MutationObserver | null = null;

function init() {
  renderGiscus();
  if (observer) observer.disconnect();
  observer = new MutationObserver(updateGiscusTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateGiscusTheme);
window.addEventListener("theme-updated", updateGiscusTheme);

init();
document.addEventListener("astro:page-load", init);

export {};
