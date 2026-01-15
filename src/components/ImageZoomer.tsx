import { useEffect } from "react";
import mediumZoom from "medium-zoom";

export default function ImageZoomer() {
  useEffect(() => {
    const selector = [
      "article img:not(a img)",
      ".sl-markdown-content img:not(a img)",
      "figure img:not(a img)",
      ".content-panel img:not(a img)",
    ].join(", ");

    const zoom = mediumZoom(selector, {
      background: "rgba(108, 111, 133, 0.5)",
      margin: 24,
    });

    return () => {
      zoom.detach();
    };
  }, []);

  return null;
}
