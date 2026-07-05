export async function downloadImage(img: HTMLImageElement): Promise<void> {
  if (!img.complete) {
    const loaded = await waitForImage(img);
    if (!loaded) {
      const fallbackSrc = img.currentSrc || img.src;
      if (fallbackSrc) openInTab(fallbackSrc);
      return;
    }
  }

  const src = img.currentSrc || img.src;
  if (!src) return;

  if (img.naturalWidth === 0) {
    openInTab(src);
    return;
  }

  const pngFilename = getDownloadFilename(src, "png", true);

  if (/\.(gif|svg)(\?|#|$)/i.test(src)) {
    if (isSameOrigin(src)) {
      downloadLink(src);
    } else {
      openInTab(src);
    }
    return;
  }

  const sameOrigin = isSameOrigin(src);

  if (sameOrigin) {
    canvasToPngDownload(img, pngFilename);
    return;
  }

  try {
    const corsImg = await loadCrossOriginImg(src);
    if (corsImg) {
      canvasToPngDownload(corsImg, pngFilename);
      return;
    }
  } catch {
    console.warn("CORS load failed:", src);
  }

  openInTab(src);
}

function waitForImage(img: HTMLImageElement): Promise<boolean> {
  if (img.complete) return Promise.resolve(img.naturalWidth > 0);

  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(true), { once: true });
    img.addEventListener("error", () => resolve(false), { once: true });
  });
}

function isSameOrigin(src: string): boolean {
  if (!src.startsWith("http://") && !src.startsWith("https://")) return true;
  return src.startsWith(location.origin);
}

function loadCrossOriginImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("CORS load timed out"));
    }, 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("CORS load failed"));
    };
    img.src = src;
  });
}

function canvasToPngDownload(source: CanvasImageSource, filename: string): void {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : (source as HTMLVideoElement).videoWidth;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : (source as HTMLVideoElement).videoHeight;
  if (w === 0 || h === 0) return;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    ctx.drawImage(source, 0, 0);
  } catch (error) {
    console.warn("Canvas drawImage failed:", error);
    return;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

function downloadLink(src: string): void {
  triggerDownload(src, getDownloadFilename(src, "png"));
}

function getDownloadFilename(src: string, fallbackExt: string, forceExt = false): string {
  const pathname = getSrcPathname(src);
  const rawName = pathname.split("/").pop() ?? "";
  const decodedName = safeDecodeURIComponent(rawName);
  const baseName = decodedName.replace(/\.[^.]*$/, "");
  const safeBaseName = baseName.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").trim() || "image";
  const ext = forceExt ? fallbackExt : getSrcExtension(pathname) || fallbackExt;

  return `${safeBaseName}.${ext}`;
}

function getSrcPathname(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      return new URL(src, location.href).pathname;
    } catch {
      console.warn("Failed to parse URL for pathname:", src);
    }
  }
  return src.split(/[?#]/, 1)[0] ?? src;
}

function getSrcExtension(pathname: string): string {
  return pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "";
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    console.warn("Failed to decode URI component:", value);
    return value;
  }
}

function openInTab(src: string): void {
  window.open(src, "_blank", "noopener");
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
