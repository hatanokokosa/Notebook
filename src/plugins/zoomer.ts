export interface ImageData {
  src: string;
  key: string;
}

interface ContentImageScan {
  images: ImageData[];
  elements: HTMLImageElement[];
  cleanup: () => void;
}

type OpenImageHandler = (
  index: number,
  images: ImageData[],
  elements: HTMLImageElement[],
) => void | Promise<void>;

const noWatermarkMarker = "|no-watermark";

const imageSelectors = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");

export function getViewerSrc(img: HTMLImageElement): string {
  return img.currentSrc || img.src;
}

export function scanContentImages(onOpen: OpenImageHandler): ContentImageScan {
  const imgElements =
    document.querySelectorAll<HTMLImageElement>(imageSelectors);
  const filtered = Array.from(imgElements).filter(
    (img) => img.naturalWidth >= 100 || !img.complete,
  );

  const images: ImageData[] = [];
  const handlers: Array<{ el: HTMLImageElement; handler: () => void }> = [];

  filtered.forEach((img, index) => {
    stripNoWatermarkMarker(img);

    images.push({
      src: getViewerSrc(img),
      key: `${getViewerSrc(img)}-${index}`,
    });

    img.style.cursor = "zoom-in";

    const handler = () => {
      const freshImages = images.map((item, imageIndex) => {
        const el = filtered[imageIndex];
        return el ? { ...item, src: getViewerSrc(el) } : item;
      });

      void onOpen(index, freshImages, filtered);
    };

    img.addEventListener("click", handler);
    handlers.push({ el: img, handler });
  });

  return {
    images,
    elements: filtered,
    cleanup: () => {
      handlers.forEach(({ el, handler }) =>
        el.removeEventListener("click", handler),
      );
    },
  };
}

function stripNoWatermarkMarker(img: HTMLImageElement) {
  const alt = img.alt ?? "";
  if (!alt.endsWith(noWatermarkMarker)) return;

  img.alt = alt.slice(0, -noWatermarkMarker.length).trimEnd();

  const figcaption = img.closest("figure")?.querySelector("figcaption");
  if (figcaption?.textContent?.endsWith(noWatermarkMarker)) {
    figcaption.textContent = figcaption.textContent
      .slice(0, -noWatermarkMarker.length)
      .trimEnd();
  }
}
