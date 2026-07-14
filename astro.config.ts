import rehypeFigure from "@microflash/rehype-figure";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import react from "@astrojs/react";
import kokosaBlog from "./src/plugins/kokosa-blog";
import rehypeColorCode from "./src/plugins/color-code";
import remarkFoldImg from "./src/plugins/fold-img";
import "katex/contrib/mhchem";

export default defineConfig({
  devToolbar: { enabled: false },

  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },

  site: "https://kokosa.icu",

  markdown: {
    rehypePlugins: [rehypeFigure, rehypeKatex, rehypeColorCode],
    remarkPlugins: [remarkMath, remarkFoldImg],
  },

  integrations: [
    react(),

    starlight({
      title: "Kokosa's Intensive Care Unit",

      favicon: "/favicon.svg",

      // i18n configuration
      defaultLocale: "zh-cn",
      locales: {
        "zh-cn": {
          label: "Chinese",
          lang: "zh-CN",
        },
        "en-us": {
          label: "English",
          lang: "en-US",
        },
        "ja-jp": {
          label: "Japanese",
          lang: "ja-JP",
        },
      },

      customCss: [
        "@fontsource/noto-serif-sc/600.css",
        "@fontsource/noto-serif-sc/800.css",
        "@fontsource/fraunces/400.css",
        "@fontsource/iosevka/400.css",
        "./src/styles/view-transition.css",
        "./src/styles/photo-view.css",
        "./src/styles/sl-custom.css",
        "./src/styles/friends.css",
        "./src/styles/figure.css",
        "./src/styles/color-code.css",
        "./src/styles/font.css",
        "./src/styles/catppuccin.css",
        "./src/styles/scroll-to-top.css",
      ],

      components: {
        Head: "./src/components/Head.astro",
        LanguageSelect: "./src/components/LanguageSelect.astro",
        MarkdownContent: "./src/components/MarkdownContent.astro",
        PageTitle: "./src/components/PageTitle.astro",
        PageSidebar: "./src/components/PageSidebar.astro",
        SocialIcons: "./src/components/SocialIcons.astro",
      },

      social: [
        {
          href: "/zh-cn/blog/rss.xml",
          icon: "rss",
          label: "RSS",
        },
      ],

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
        kokosaBlog({
          metrics: {
            readingTime: true,
            words: "rounded",
          },

          title: {
            "zh-CN": "Kokosa's Blog",
            "en-US": "Kokosa's Blog",
            "ja-JP": "Kokosa's Blog",
          },
          postCount: 8,
        }),
      ],

      sidebar: [
        {
          label: "About",
          autogenerate: { directory: "about" },
        },
        {
          label: "Study",
          autogenerate: { directory: "study" },
        },
        {
          label: "Create",
          autogenerate: { directory: "create" },
        },
      ],
    }),
  ],
});
