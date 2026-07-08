import { AstroError } from "astro/errors";
import { z } from "astro/zod";

import { stripLeadingSlash, stripTrailingSlash } from "./path";

const configSchema = z
  .object({
    /**
     * The configuration of various metrics that can be displayed alongside blog posts.
     */
    metrics: z
      .object({
        /**
         * Controls whether or not the estimated reading time of blog posts are displayed.
         * The estimated reading time is displayed in minutes, rounded up to the nearest minute.
         *
         * @default false
         */
        readingTime: z.boolean().default(false),
        /**
         * Controls whether or not the word count of blog posts are displayed.
         *
         * - `false` does not display the word count.
         * - `total` displays the total word count of the blog post.
         * - `rounded` displays the word count of the blog post rounded up to the nearest multiple of 100.
         *
         * @default false
         */
        words: z.union([z.literal(false), z.literal("total"), z.literal("rounded")]).default(false),
      })
      .default({ readingTime: false, words: false }),
    navigation: z.union([z.literal("header-start"), z.literal("header-end"), z.literal("none")]).default("header-end"),
    /**
     * The base prefix for all blog routes.
     *
     * @default 'blog'
     */
    prefix: z
      .string()
      .default("blog")
      .transform((value) => stripTrailingSlash(stripLeadingSlash(value))),
    postCount: z
      .union([z.number().min(1), z.literal(Infinity)])
      .default(5)
      .transform(infinityToMax),
    rss: z.boolean().default(true),
    /**
     * The title of the blog.
     *
     * The value can be a string, or for multilingual sites, an object with values for each different locale.
     * When using the object form, the keys must be BCP-47 tags (e.g. `en`, `ar`, or `zh-CN`).
     */
    title: z.union([z.string(), z.record(z.string(), z.string())]).default("Blog"),
    prevNextLinksOrder: z.union([z.literal("chronological"), z.literal("reverse-chronological")]).default("chronological"),
  })
  .default({
    metrics: { readingTime: false, words: false },
    navigation: "header-end",
    prefix: "blog",
    postCount: 5,
    rss: true,
    title: "Blog",
    prevNextLinksOrder: "chronological",
  });

export function validateConfig(userConfig: unknown): StarlightBlogConfig {
  const config = configSchema.safeParse(userConfig);

  if (!config.success) {
    throw new AstroError(
      `Invalid kokosa-blog configuration:

${z.prettifyError(config.error)}
`,
      `See the error report above for more information.`,
    );
  }

  return config.data;
}

function infinityToMax(value: number): number {
  return value === Infinity ? Number.MAX_SAFE_INTEGER : value;
}

export type StarlightBlogUserConfig = z.input<typeof configSchema>;
export type StarlightBlogConfig = z.output<typeof configSchema>;
