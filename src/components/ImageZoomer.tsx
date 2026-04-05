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

  const scan = useCallback(() => {
    cleanupRef.current?.();

    const imgElements =
      document.querySelectorAll<HTMLImageElement>(IMG_SELECTORS);

    // Skip tiny images (icons, avatars, decorations).
    const filtered = Array.from(imgElements).filter(
      (img) => img.naturalWidth >= 100 || !img.complete,
    );

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

      collected.push({ src: img.src, key: `${img.src}-${i}` });
      img.style.cursor = "zoom-in";

      const handler = async () => {
        const runtime = (
          window as Window & { __watermarkRuntime?: WatermarkRuntime }
        ).__watermarkRuntime;

        if (runtime && img.dataset.noWatermark !== "true") {
          await runtime.ensureWatermarked(img);
        }

        const freshImages = collected.map((item, idx) => {
          const el = filtered[idx];
          return el ? { ...item, src: el.src } : item;
        });

        setImages(freshImages);
        setIndex(i);
        setVisible(true);
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
  }, []);

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
      onIndexChange={setIndex}
      maskOpacity={0.6}
    />
  );
}
