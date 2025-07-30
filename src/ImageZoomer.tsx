import { useEffect } from "react";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export default function ImageZoomer() {
  useEffect(() => {
    Fancybox.bind("img", {
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
        img {
          cursor: pointer;
        }
        .fancybox-custom {
          --fancybox-backdrop-bg: rgba(108, 111, 133, 0.5);
        }
      `}</style>
    </>
  );
}
