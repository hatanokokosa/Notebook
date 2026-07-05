const cleanupKey = "__kokosaScrollToTopCleanup";
const anchorCleanupKey = "__kokosaSmoothAnchorCleanup";
const buttonId = "kokosa-scroll-to-top-button";
const tooltipText = "Back to top";

type WindowWithScrollCleanup = Window & {
  [cleanupKey]?: () => void;
  [anchorCleanupKey]?: () => void;
};

function setupSmoothAnchorScroll() {
  const scrollWindow = window as WindowWithScrollCleanup;

  scrollWindow[anchorCleanupKey]?.();

  const onDocumentClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (!(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search ||
      !url.hash
    ) {
      return;
    }

    const target = url.hash === "#_top" ? document.documentElement : document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;

    event.preventDefault();

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", url.hash);
  };

  document.addEventListener("click", onDocumentClick);

  scrollWindow[anchorCleanupKey] = () => {
    document.removeEventListener("click", onDocumentClick);
  };
}

function setupScrollToTop() {
  const scrollWindow = window as WindowWithScrollCleanup;

  scrollWindow[cleanupKey]?.();
  document.getElementById(buttonId)?.remove();

  const button = document.createElement("button");
  button.id = buttonId;
  button.className = "scroll-to-top-button";
  button.type = "button";
  button.ariaLabel = tooltipText;
  button.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="35"
      height="35"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 15l-6-6-6 6"></path>
    </svg>
  `;

  const tooltip = document.createElement("div");
  tooltip.className = "scroll-to-top-tooltip";
  tooltip.textContent = tooltipText;
  button.appendChild(tooltip);
  document.body.appendChild(button);

  let isKeyboard = false;

  const hideTooltip = () => tooltip.classList.remove("visible");
  const showTooltip = () => tooltip.classList.add("visible");
  const scrollToTop = () => {
    hideTooltip();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleVisibility = () => {
    const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0;
    button.classList.toggle("visible", scrollPercentage > 0.2);
  };
  const checkZoomLevel = () => {
    button.style.display = window.devicePixelRatio > 3 ? "none" : "flex";
  };
  const onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Tab") isKeyboard = true;
  };
  const onButtonKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    scrollToTop();
    button.classList.remove("keyboard-focus");
  };
  const onFocus = () => {
    if (!isKeyboard) return;
    showTooltip();
    button.classList.add("keyboard-focus");
  };
  const onBlur = () => {
    hideTooltip();
    button.classList.remove("keyboard-focus");
  };
  const onPointerDown = () => {
    isKeyboard = false;
  };
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    scrollToTop();
  };

  button.addEventListener("mouseenter", showTooltip);
  button.addEventListener("mouseleave", hideTooltip);
  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("keydown", onButtonKeydown);
  button.addEventListener("focus", onFocus);
  button.addEventListener("blur", onBlur);
  button.addEventListener("click", onClick);
  document.addEventListener("keydown", onDocumentKeydown);
  window.addEventListener("scroll", toggleVisibility, { passive: true });
  window.addEventListener("resize", checkZoomLevel);

  toggleVisibility();
  checkZoomLevel();

  scrollWindow[cleanupKey] = () => {
    button.removeEventListener("mouseenter", showTooltip);
    button.removeEventListener("mouseleave", hideTooltip);
    button.removeEventListener("pointerdown", onPointerDown);
    button.removeEventListener("keydown", onButtonKeydown);
    button.removeEventListener("focus", onFocus);
    button.removeEventListener("blur", onBlur);
    button.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onDocumentKeydown);
    window.removeEventListener("scroll", toggleVisibility);
    window.removeEventListener("resize", checkZoomLevel);
    button.remove();
  };
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupScrollToTop();
      setupSmoothAnchorScroll();
    },
    { once: true },
  );
} else {
  setupScrollToTop();
  setupSmoothAnchorScroll();
}

document.addEventListener("astro:page-load", () => {
  setupScrollToTop();
  setupSmoothAnchorScroll();
});
