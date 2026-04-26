import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoSlider } from "react-photo-view";
import {
  getViewerSrc,
  scanContentImages,
  type ImageData,
} from "../plugins/zoomer";
import "react-photo-view/dist/react-photo-view.css";

export default function ImageZoomer() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<ImageData[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const imageElementsRef = useRef<HTMLImageElement[]>([]);

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

      syncImageSource(targetIndex);
    },
    [syncImageSource],
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

    const contentImages = scanContentImages(
      async (imageIndex, freshImages, elements) => {
        imageElementsRef.current = elements;
        await ensureViewerImageReady(imageIndex);
        setImages(freshImages);
        setIndex(imageIndex);
        setVisible(true);
        warmNearbyImages(imageIndex);
      },
    );

    imageElementsRef.current = contentImages.elements;
    setImages(contentImages.images);
    cleanupRef.current = contentImages.cleanup;
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
