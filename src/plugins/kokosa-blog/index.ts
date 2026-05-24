/// <reference path="./locals.d.ts" />

import type { StarlightPlugin, StarlightUserConfig } from "@astrojs/starlight/types";

import { type StarlightBlogConfig, validateConfig, type StarlightBlogUserConfig } from "./libs/config";
import { isNavigationWithCustomCss } from "./libs/navigation";
import { stripLeadingSlash, stripTrailingSlash } from "./libs/path";
import { remarkKokosaBlog } from "./libs/remark";
import { vitePluginKokosaBlogConfig } from "./libs/vite";
import { Translations } from "./translations";

export type { StarlightBlogConfig, StarlightBlogUserConfig };

const pluginRoot = "./src/plugins/kokosa-blog";

export default function kokosaBlogPlugin(userConfig?: StarlightBlogUserConfig): StarlightPlugin {
  const config = validateConfig(userConfig);

  return {
    name: "kokosa-blog",
    hooks: {
      "i18n:setup"({ injectTranslations }) {
        injectTranslations(Translations);
      },
      "config:setup"({ addIntegration, addRouteMiddleware, astroConfig, config: starlightConfig, updateConfig: updateStarlightConfig }) {
        addRouteMiddleware({ entrypoint: `${pluginRoot}/middleware.ts` });

        const rssLink =
          astroConfig.site && config.rss
            ? `${stripTrailingSlash(astroConfig.site)}${stripTrailingSlash(astroConfig.base)}/${stripLeadingSlash(
                stripTrailingSlash(config.prefix),
              )}/rss.xml`
            : undefined;

        const configIncludesRSSSocial = starlightConfig.social?.some((social) => social.icon === "rss") ?? false;

        const components: StarlightUserConfig["components"] = { ...starlightConfig.components };
        overrideComponent(components, "MarkdownContent");
        if (config.navigation === "header-start") overrideComponent(components, "SiteTitle");
        if (config.navigation === "header-end") overrideComponent(components, "ThemeSelect");

        const customCss: StarlightUserConfig["customCss"] = [...(starlightConfig.customCss ?? [])];
        if (isNavigationWithCustomCss(config)) customCss.push(`${pluginRoot}/styles.css`);

        const head: StarlightUserConfig["head"] = [...(starlightConfig.head ?? [])];
        if (rssLink) {
          head.push({
            tag: "link",
            attrs: {
              href: rssLink,
              rel: "alternate",
              title: typeof config.title === "string" ? config.title : "Blog",
              type: "application/rss+xml",
            },
          });
        }

        const social: StarlightUserConfig["social"] = [...(starlightConfig.social ?? [])];
        if (rssLink && !configIncludesRSSSocial) {
          social.push({
            href: rssLink,
            icon: "rss",
            label: "RSS",
          });
        }

        updateStarlightConfig({ components, customCss, head, social });

        addIntegration({
          name: "kokosa-blog-integration",
          hooks: {
            "astro:config:setup": ({ injectRoute, updateConfig }) => {
              injectRoute({
                entrypoint: `${pluginRoot}/routes/Tags.astro`,
                pattern: "/[...prefix]/tags/[tag]",
                prerender: true,
              });

              injectRoute({
                entrypoint: `${pluginRoot}/routes/Blog.astro`,
                pattern: "/[...prefix]/[...page]",
                prerender: true,
              });

              if (rssLink) {
                injectRoute({
                  entrypoint: `${pluginRoot}/routes/rss.xml.ts`,
                  pattern: "/[...prefix]/rss.xml",
                  prerender: true,
                });
              }

              updateConfig({
                markdown: {
                  remarkPlugins: [[remarkKokosaBlog]],
                },
                vite: {
                  plugins: [
                    vitePluginKokosaBlogConfig(config, {
                      description: starlightConfig.description,
                      rootDir: astroConfig.root.pathname,
                      site: astroConfig.site,
                      srcDir: astroConfig.srcDir.pathname,
                      title: starlightConfig.title,
                      titleDelimiter: starlightConfig.titleDelimiter,
                      trailingSlash: astroConfig.trailingSlash,
                    }),
                  ],
                },
              });
            },
          },
        });
      },
    },
  };
}

function overrideComponent(
  components: NonNullable<StarlightUserConfig["components"]>,
  component: keyof NonNullable<StarlightUserConfig["components"]>,
) {
  if (components[component]) return;

  components[component] = `${pluginRoot}/overrides/${component}.astro`;
}
