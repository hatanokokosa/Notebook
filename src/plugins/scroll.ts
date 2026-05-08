const cleanupKey = "__kokosaScrollToTopCleanup";
const anchorCleanupKey = "__kokosaSmoothAnchorCleanup";
const styleId = "kokosa-scroll-to-top-style";
const buttonId = "kokosa-scroll-to-top-button";
const tooltipText = "Back to top";

type WindowWithScrollCleanup = Window & {
  [cleanupKey]?: () => void;
  [anchorCleanupKey]?: () => void;
};

function setupSmoothAnchorScroll() {
  const scrollWindow = window as WindowWithScrollCleanup;

  scrollWindow[anchorCleanupKey]?.();

  const getSamePageHashLink = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;

    const link = target.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link) return null;

    const url = new URL(link.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search ||
      !url.hash
    ) {
      return null;
    }

    return { link, hash: url.hash };
  };

  const onDocumentClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const hashLink = getSamePageHashLink(event.target);
    if (!hashLink) return;

    const target =
      hashLink.hash === "#_top"
        ? document.documentElement
        : document.getElementById(decodeURIComponent(hashLink.hash.slice(1)));

    if (!target) return;

    event.preventDefault();

    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
    });

    history.pushState(null, "", hashLink.hash);
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
  document.getElementById(styleId)?.remove();

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .scroll-to-top-button {
      position: fixed;
      right: 35px;
      bottom: 40px;
      width: 47px;
      height: 47px;
      border-radius: 50%;
      background-color: var(--sl-color-bg-sidebar);
      border: 1px solid var(--sl-color-gray-5);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 4px 8px 0 rgba(0, 0, 0, 0.2);
      color: var(--sl-color-text-accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.3s ease,
        visibility 0.3s ease,
        background-color 0.3s ease,
        color 0.3s ease;
      z-index: 100;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .scroll-to-top-button.visible {
      opacity: 1;
      visibility: visible;
    }

    .scroll-to-top-button:hover {
      background-color: var(--sl-color-accent);
      border-color: transparent;
      color: var(--sl-color-white);
    }

    .scroll-to-top-button:active {
      background-color: var(--sl-color-accent-high);
      color: var(--sl-color-white);
    }

    .scroll-to-top-button.keyboard-focus {
      outline: 2px solid var(--sl-color-text);
      outline-offset: 2px;
    }

    .scroll-to-top-tooltip {
      position: absolute;
      right: -22px;
      top: -47px;
      background-color: var(--sl-color-gray-6);
      color: var(--sl-color-text);
      padding: 5px 10px;
      border-radius: 4px;
      font-weight: 400;
      font-size: 14px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.3s;
      pointer-events: none;
    }

    html[data-theme="light"] .scroll-to-top-tooltip {
      background-color: var(--sl-color-gray-5);
    }

    .scroll-to-top-tooltip::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--sl-color-gray-6);
    }

    html[data-theme="light"] .scroll-to-top-tooltip::after {
      border-top-color: var(--sl-color-gray-5);
    }

    .scroll-to-top-tooltip.visible {
      opacity: 1;
      visibility: visible;
    }
  `;
  document.head.appendChild(style);

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
    const scrollableDistance =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage =
      scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0;
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
    style.remove();
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
