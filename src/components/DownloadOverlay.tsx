import { useCallback, useEffect, useRef } from "react";
import { downloadImage } from "../plugins/download";

const IMG_SELECTOR = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");

const WRAPPER_ATTR = "data-dl-wrapper";
const BLOCK_ATTR = "data-dl-block";
const OWNER_ATTR = "data-dl-owner";
let nextOwnerId = 0;

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

function wrapImage(img: HTMLImageElement, ownerId: string): HTMLButtonElement {
  const parent = img.parentNode as HTMLElement;
  const block = getComputedStyle(img).display === "block";

  const wrapper = document.createElement("div");
  wrapper.setAttribute(WRAPPER_ATTR, "");
  wrapper.setAttribute(OWNER_ATTR, ownerId);
  if (block) wrapper.setAttribute(BLOCK_ATTR, "");
  css(wrapper, {
    position: "relative",
    display: block ? "block" : "inline-block",
    ...(block ? { width: "fit-content", maxWidth: "100%" } : {}),
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-dl-btn", "");
  btn.ariaLabel = "Download image";
  btn.appendChild(makeSvgIcon());

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

function unwrapAll(ownerId: string) {
  document.querySelectorAll<HTMLDivElement>(`[${WRAPPER_ATTR}][${OWNER_ATTR}="${ownerId}"]`).forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    const img = wrapper.querySelector("img");
    if (img) parent.insertBefore(img, wrapper);
    parent.removeChild(wrapper);
  });
}

export default function DownloadOverlay({ enabled }: { enabled?: boolean }) {
  const scannedRef = useRef(false);
  const ownerIdRef = useRef("");

  if (!ownerIdRef.current) {
    ownerIdRef.current = String(++nextOwnerId);
  }

  const ownerId = ownerIdRef.current;

  const scan = useCallback(() => {
    if (!enabled) {
      if (scannedRef.current) {
        unwrapAll(ownerId);
        scannedRef.current = false;
      }
      return;
    }

    document.querySelectorAll<HTMLImageElement>(IMG_SELECTOR).forEach((img) => {
      if (img.closest(`[${WRAPPER_ATTR}]`)) return;
      if (!img.parentNode) return;
      wrapImage(img, ownerId);
    });

    scannedRef.current = true;
  }, [enabled, ownerId]);

  useEffect(() => {
    scan();
    document.addEventListener("astro:page-load", scan);
    return () => {
      unwrapAll(ownerId);
      document.removeEventListener("astro:page-load", scan);
    };
  }, [scan, ownerId]);

  return null;
}
