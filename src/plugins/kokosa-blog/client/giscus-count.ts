import { getCommentCounts, getDefaultFallbackLabel, hydrateCommentCounters } from "./giscus-counts";

async function hydrateCommentCounts() {
  const counters = [...document.querySelectorAll<HTMLElement>("[data-giscus-term]")];
  if (counters.length === 0) return;

  await hydrateCommentCounters({
    counters,
    fallbackLabel: getDefaultFallbackLabel(document.documentElement.lang),
    getCounts: () =>
      getCommentCounts(localStorage, (url) =>
        fetch(url, {
          headers: { Accept: "application/vnd.github+json" },
        }),
      ),
  });
}

hydrateCommentCounts();
document.addEventListener("astro:page-load", hydrateCommentCounts);

export {};
