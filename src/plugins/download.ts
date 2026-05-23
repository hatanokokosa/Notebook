export async function downloadImage(img: HTMLImageElement): Promise<void> {
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => reject(new Error("Image load failed")), { once: true });
    });
  }

  const src = img.currentSrc || img.src;

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
    canvasToPngDownload(img);
    return;
  }

  try {
    const corsImg = await loadCrossOriginImg(src);
    if (corsImg) {
      canvasToPngDownload(corsImg);
      return;
    }
  } catch {
    // fall through
  }

  openInTab(src);
}

function isSameOrigin(src: string): boolean {
  try {
    return new URL(src, location.origin).origin === location.origin;
  } catch {
    return true;
  }
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

function canvasToPngDownload(source: CanvasImageSource): void {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : (source as HTMLVideoElement).videoWidth;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : (source as HTMLVideoElement).videoHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    ctx.drawImage(source, 0, 0);
  } catch {
    return;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "image.png");
    URL.revokeObjectURL(url);
  }, "image/png");
}

function downloadLink(src: string): void {
  const fileName =
    src
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "image";
  const ext =
    src
      .split("/")
      .pop()
      ?.match(/\.(\w+)(\?|#|$)/)?.[1] ?? "png";
  triggerDownload(src, `${fileName}.${ext}`);
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
