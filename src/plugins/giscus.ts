import { createGiscusScriptAttributes } from "../lib/giscus-config";

function getGiscusTheme(): string {
  const storedTheme = typeof localStorage !== "undefined" ? localStorage.getItem("starlight-theme") : "auto";
  let isDark = false;

  if (storedTheme === "auto" || !storedTheme) {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    isDark = document.documentElement.dataset.theme === "dark";
  }

  const base = "https://www.kokosa.icu";
  return isDark ? `${base}/main/css/frappe.css` : `${base}/main/css/latte.css`;
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

function renderGiscus() {
  const container = document.querySelector<HTMLElement>(".giscus-container");
  if (!container) return;

  if (container.innerHTML.trim() !== "") {
    updateGiscusTheme();
    return;
  }

  if (container.getAttribute("data-giscus-loading") === "true") return;
  container.setAttribute("data-giscus-loading", "true");

  const giscusAttributes = createGiscusScriptAttributes(container.dataset.giscusTerm);

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", "hatanokokosa/hatanokokosa");
  script.setAttribute("data-repo-id", "R_kgDONiihcQ");
  script.setAttribute("data-category", "Q&A");
  script.setAttribute("data-category-id", "DIC_kwDONiihcc4Cs5Yk");
  for (const [name, value] of Object.entries(giscusAttributes)) {
    script.setAttribute(name, value);
  }
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

  // Re-register media/theme listeners (with cleanup from prior init calls in SPA)
  if (mediaQueryListener) {
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaQueryListener);
  }
  mediaQueryListener = updateGiscusTheme;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateGiscusTheme);

  if (themeUpdatedListener) {
    window.removeEventListener("theme-updated", themeUpdatedListener);
  }
  themeUpdatedListener = updateGiscusTheme;
  window.addEventListener("theme-updated", updateGiscusTheme);
}

let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
let themeUpdatedListener: (() => void) | null = null;

init();
document.addEventListener("astro:page-load", init);

export {};
