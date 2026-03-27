function getGiscusTheme(): string {
  const storedTheme =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("starlight-theme")
      : "auto";
  let isDark = false;

  if (storedTheme === "auto" || !storedTheme) {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    isDark = document.documentElement.dataset.theme === "dark";
  }

  const base = "https://www.kokosa.icu";
  return isDark ? `${base}/giscus/frappe.css` : `${base}/giscus/latte.css`;
}

function renderGiscus() {
  const container = document.querySelector(".giscus-container");
  if (!container) return;

  if (container.innerHTML.trim() !== "") {
    updateGiscusTheme();
    return;
  }

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", "hatanokokosa/hatanokokosa");
  script.setAttribute("data-repo-id", "R_kgDONiihcQ");
  script.setAttribute("data-category", "Q&A");
  script.setAttribute("data-category-id", "DIC_kwDONiihcc4Cs5Yk");
  script.setAttribute("data-mapping", "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "bottom");
  script.setAttribute("data-theme", getGiscusTheme());
  const lang = document.documentElement.lang || "zh-CN";
  script.setAttribute("data-lang", lang);
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;

  container.appendChild(script);
}

function updateGiscusTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe.giscus-frame",
  );
  if (!iframe || !iframe.contentWindow) return;

  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme: getGiscusTheme() } } },
    "https://giscus.app",
  );
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

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", updateGiscusTheme);

init();
document.addEventListener("astro:page-load", init);
