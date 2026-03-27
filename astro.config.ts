import starlightScrollToTop from "starlight-scroll-to-top";

import rehypeFigure from "@microflash/rehype-figure";
import catppuccin from "@catppuccin/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";
import starlight from "@astrojs/starlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import react from "@astrojs/react";
import "katex/contrib/mhchem";

export default defineConfig({
  devToolbar: { enabled: false },

  site: "https://kokosa.icu",

  markdown: {
    rehypePlugins: [rehypeFigure, rehypeKatex],
    remarkPlugins: [remarkMath],
  },

  integrations: [
    react(),

    starlight({
      title: "Kokosa's Intensive Care Unit",

      favicon: "/favicon.svg",

      // i18n configuration
      defaultLocale: "root",
      locales: {
        root: {
          label: "简体中文",
          lang: "zh-CN",
        },
        en: {
          label: "English",
          lang: "en",
        },
      },

      customCss: [
        "@fontsource/fraunces/400.css",
        "@fontsource/fraunces/400-italic.css",
        "@fontsource/noto-serif-sc/600.css",
        "@fontsource/iosevka/400.css",
        "./src/styles/view-transition.css",
        "./src/styles/sl-custom.css",
        "./src/styles/friends.css",
        "./src/styles/figure.css",
        "./src/styles/font.css",
      ],

      components: {
        MarkdownContent: "./src/components/MarkdownContent.astro",
      },

      head: [
        {
          tag: "link",
          attrs: {
            href: "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css",
            rel: "stylesheet",
          },
        },
      ],

      plugins: [
        catppuccin({
          light: { flavor: "latte", accent: "rosewater" },
          dark: { flavor: "frappe", accent: "red" },
        }),

        starlightBlog({
          authors: {
            kokosa: {
              url: "https://github.com/hatanokokosa",
              picture: "/friends/oc.avif",
              name: "Hatano Kokosa",
            },
          },

          metrics: {
            readingTime: true,
            words: "rounded",
          },

          title: { "zh-CN": "Kokosa's Blog", en: "Kokosa's Blog" },
          postCount: 8,
        }),

        starlightScrollToTop({
          tooltipText: "Back to top",
          svgStrokeWidth: 1.5,
          smoothScroll: true,
          showTooltip: true,
          borderRadius: "50",
          threshold: 20,
        }),
      ],

      sidebar: [
        {
          label: "Main",
          autogenerate: { directory: "main" },
        },
        {
          label: "Learning",
          autogenerate: { directory: "learning" },
        },
        {
          label: "Creating",
          autogenerate: { directory: "drawing" },
        },
      ],
    }),
  ],
});
