import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoSlider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

/** Marker appended to alt text to opt an image out of the viewer. */
const NO_WATERMARK_MARKER = "|no-watermark";

/** Selectors that match content images (shared with watermark.ts). */
const IMG_SELECTORS = [
  "article img:not(a img)",
  ".sl-markdown-content img:not(a img)",
  "figure img:not(a img)",
  ".content-panel img:not(a img)",
].join(", ");
const VIEWER_PLACEHOLDER_SRC =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const WATERMARK_PAGE_SELECTOR = "[data-watermark-page]";

interface ImageData {
  src: string;
  key: string;
}

type WatermarkRuntime = {
  ensureWatermarked: (img: HTMLImageElement) => Promise<void>;
};

/**
 * Collect all content images from the DOM and attach click handlers
 * that open the react-photo-view slider at the correct index.
 *
 * Uses PhotoSlider (the controlled component) because images are
 * rendered by Astro's markdown pipeline, not by React.
 */
export default function ImageZoomer() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<ImageData[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const imageElementsRef = useRef<HTMLImageElement[]>([]);

  const isWatermarkPage = useCallback(
    () => document.querySelector(WATERMARK_PAGE_SELECTOR) !== null,
    [],
  );

  const getViewerSrc = useCallback(
    (img: HTMLImageElement): string => {
      if (!isWatermarkPage()) return img.src;
      if (img.dataset.noWatermark === "true") return img.src;
      if (
        img.dataset.watermarked === "true" ||
        img.dataset.watermarkPreviewReady === "true"
      ) {
        return img.src;
      }
      return VIEWER_PLACEHOLDER_SRC;
    },
    [isWatermarkPage],
  );

  const syncImageSource = useCallback(
    (targetIndex: number) => {
      const img = imageElementsRef.current[targetIndex];
      if (!img) return;

      setImages((current) => {
        const existing = current[targetIndex];
        if (!existing) return current;

        const nextSrc = getViewerSrc(img);
        if (existing.src === nextSrc) return current;

        const nextImages = [...current];
        nextImages[targetIndex] = { ...existing, src: nextSrc };
        return nextImages;
      });
    },
    [getViewerSrc],
  );

  const ensureViewerImageReady = useCallback(
    async (targetIndex: number) => {
      const img = imageElementsRef.current[targetIndex];
      if (!img) return;

      const runtime = (
        window as Window & { __watermarkRuntime?: WatermarkRuntime }
      ).__watermarkRuntime;

      if (runtime && isWatermarkPage() && img.dataset.noWatermark !== "true") {
        await runtime.ensureWatermarked(img);
      }

      syncImageSource(targetIndex);
    },
    [isWatermarkPage, syncImageSource],
  );

  const warmNearbyImages = useCallback(
    (centerIndex: number) => {
      [centerIndex - 1, centerIndex + 1].forEach((targetIndex) => {
        if (targetIndex < 0 || targetIndex >= imageElementsRef.current.length) {
          return;
        }

        void ensureViewerImageReady(targetIndex);
      });
    },
    [ensureViewerImageReady],
  );

  const scan = useCallback(() => {
    cleanupRef.current?.();

    const imgElements =
      document.querySelectorAll<HTMLImageElement>(IMG_SELECTORS);

    // Skip tiny images (icons, avatars, decorations).
    const filtered = Array.from(imgElements).filter(
      (img) => img.naturalWidth >= 100 || !img.complete,
    );
    imageElementsRef.current = filtered;

    const collected: ImageData[] = [];
    const handlers: Array<{ el: HTMLImageElement; handler: () => void }> = [];

    filtered.forEach((img, i) => {
      const alt = img.alt ?? "";
      if (alt.endsWith(NO_WATERMARK_MARKER)) {
        img.alt = alt.slice(0, -NO_WATERMARK_MARKER.length).trimEnd();
        const figcaption = img.closest("figure")?.querySelector("figcaption");
        if (figcaption?.textContent?.endsWith(NO_WATERMARK_MARKER)) {
          figcaption.textContent = figcaption.textContent
            .slice(0, -NO_WATERMARK_MARKER.length)
            .trimEnd();
        }
      }

      collected.push({
        src: getViewerSrc(img),
        key: `${img.currentSrc || img.src}-${i}`,
      });
      img.style.cursor = "zoom-in";

      const handler = async () => {
        await ensureViewerImageReady(i);

        const freshImages = collected.map((item, idx) => {
          const el = filtered[idx];
          return el ? { ...item, src: getViewerSrc(el) } : item;
        });

        setImages(freshImages);
        setIndex(i);
        setVisible(true);
        warmNearbyImages(i);
      };

      img.addEventListener("click", handler);
      handlers.push({ el: img, handler });
    });

    setImages(collected);
    cleanupRef.current = () => {
      handlers.forEach(({ el, handler }) =>
        el.removeEventListener("click", handler),
      );
    };
  }, [ensureViewerImageReady, getViewerSrc, warmNearbyImages]);

  useEffect(() => {
    scan();
    document.addEventListener("astro:page-load", scan);
    return () => {
      cleanupRef.current?.();
      document.removeEventListener("astro:page-load", scan);
    };
  }, [scan]);

  return (
    <PhotoSlider
      images={images}
      visible={visible}
      onClose={() => setVisible(false)}
      index={index}
      onIndexChange={(nextIndex) => {
        setIndex(nextIndex);
        void ensureViewerImageReady(nextIndex);
        warmNearbyImages(nextIndex);
      }}
      maskOpacity={0.6}
      bannerVisible={false}
      photoClassName="photo-view__photo"
    />
  );
}
