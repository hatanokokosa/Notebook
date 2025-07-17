import { useEffect } from "react";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export default function ImageZoomer() {
  useEffect(() => {
    Fancybox.bind("article img", {
      Carousel: {
        formatCaption: (fancybox, slide) => {
          return slide.triggerEl?.getAttribute('alt') || "";
        },
      },      
      groupAll: true,
      // wheel: 'slide',
      mainClass: 'fancybox-custom',
    });
    return () => {
      Fancybox.destroy();
    };
  }, []);

  return (
    <>
      <style>{`
        article img {
          cursor: pointer;
        }
        .fancybox-custom {
          --fancybox-backdrop-bg: rgba(24, 24, 27, 0.8);
        }
      `}</style>
    </>
  );
}
