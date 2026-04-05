import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoSlider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

/** Marker appended to alt text to opt an image out of the viewer. */
const NO_WATERMARK_MARKER = "|no-watermark";

/** CSS selectors that match content images (shared with watermark.ts). */
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

  // Keep a mutable ref to the cleanup function so we can teardown
  // event listeners when re-scanning or unmounting.
  const cleanupRef = useRef<(() => void) | null>(null);

  const scan = useCallback(() => {
    // Teardown previous listeners.
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
      // Strip the no-watermark marker from alt text so it doesn't
      // show in the viewer. (watermark.ts also does this, but we
      // need to handle the case where this component initialises first.)
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

      // Visual hint that images are clickable.
      img.style.cursor = "zoom-in";

      const handler = () => {
        // Re-read src in case the watermark script replaced it
        // with a data-URL after initial scan.
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
    // Initial scan once DOM content is ready.
    scan();

    // Re-scan on Astro page transitions.
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
