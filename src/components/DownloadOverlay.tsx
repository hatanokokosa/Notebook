import { useCallback, useEffect, useRef } from "react";
import { downloadImage } from "../plugins/download";

const IMG_SELECTOR = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");

const WRAPPER_ATTR = "data-dl-wrapper";

function makeSvgIcon(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M3 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2");
  svg.appendChild(path);

  const polyline = document.createElementNS(ns, "polyline");
  polyline.setAttribute("points", "5 7 8 10 11 7");
  svg.appendChild(polyline);

  const line = document.createElementNS(ns, "line");
  line.setAttribute("x1", "8");
  line.setAttribute("y1", "1");
  line.setAttribute("x2", "8");
  line.setAttribute("y2", "10");
  svg.appendChild(line);

  return svg;
}

function css(el: HTMLElement, styles: Record<string, string>) {
  Object.assign(el.style, styles);
}

function isImgCentered(img: HTMLImageElement): boolean {
  const parent = img.parentElement;
  if (!parent) return false;
  const imgRect = img.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  return Math.abs(imgRect.left + imgRect.width / 2 - parentRect.left - parentRect.width / 2) < 1.5;
}

function wrapImage(img: HTMLImageElement): HTMLButtonElement {
  const parent = img.parentNode as HTMLElement;
  const centered = isImgCentered(img);
  const block = centered || getComputedStyle(img).display === "block";

  const wrapper = document.createElement("div");
  wrapper.setAttribute(WRAPPER_ATTR, "");
  css(wrapper, {
    position: "relative",
    display: block ? "block" : "inline-block",
    ...(centered ? { width: "fit-content", margin: "0 auto" } : {}),
  });

  const btn = document.createElement("button");
  btn.setAttribute("data-dl-btn", "");
  btn.ariaLabel = "Download image";
  btn.appendChild(makeSvgIcon());
  css(btn, {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    display: "flex",
    height: "36px",
    width: "36px",
    bottom: "8px",
    right: "8px",
    padding: "0",
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    void downloadImage(img);
  });

  parent.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  wrapper.appendChild(btn);
  return btn;
}

function unwrapAll() {
  document.querySelectorAll<HTMLDivElement>(`[${WRAPPER_ATTR}]`).forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    const img = wrapper.querySelector("img");
    if (img) parent.insertBefore(img, wrapper);
    parent.removeChild(wrapper);
  });
}

function injectThemeStyle() {
  const id = "dl-overlay-theme";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = `\
[data-dl-btn] {
  background: #dce0e8 !important;
  color: #4c4f69 !important;
  border: 1px solid #ccd0da !important;
}
[data-theme="dark"] [data-dl-btn] {
  background: #303446 !important;
  color: #e78284 !important;
  border: 1px solid #414559 !important;
}`;
  document.head.appendChild(el);
}

export default function DownloadOverlay({ enabled }: { enabled?: boolean }) {
  const scannedRef = useRef(false);

  const scan = useCallback(() => {
    if (!enabled) {
      if (scannedRef.current) {
        unwrapAll();
        scannedRef.current = false;
      }
      return;
    }

    injectThemeStyle();

    document.querySelectorAll<HTMLImageElement>(IMG_SELECTOR).forEach((img) => {
      if (img.closest(`[${WRAPPER_ATTR}]`)) return;
      if (!img.parentNode) return;
      wrapImage(img);
    });

    scannedRef.current = true;
  }, [enabled]);

  useEffect(() => {
    scan();
    document.addEventListener("astro:page-load", scan);
    return () => {
      unwrapAll();
      document.removeEventListener("astro:page-load", scan);
    };
  }, [scan]);

  return null;
}
