import { AstroError } from "astro/errors";
import { z } from "astro/zod";
import type { ImageFunction } from "astro:content";

const metricsSchema = z
  .object({
    /**
     * The reading time of the blog post in seconds.
     * If not provided, an estimated reading time will be calculated based on the blog post content.
     */
    readingTime: z.number().optional(),
    /**
     * The number of words in the blog post.
     * If not provided, the word count will be computed from the blog post content.
     */
    words: z.number().optional(),
  })
  .optional();

export const blogEntrySchema = ({ image }: SchemaContext) =>
  z.object({
    /**
     * The date of the blog post which must be a valid YAML timestamp.
     * @see https://yaml.org/type/timestamp.html
     */
    date: z.date(),
    /**
     * The excerpt of the blog post used in the blog post list and tags pages.
     * If not provided, the entire blog post content will be rendered.
     */
    excerpt: z.string().optional(),
    /**
     * The metrics of the blog post.
     */
    metrics: metricsSchema,
    /**
     * A list of tags associated with the blog post.
     */
    tags: z.string().array().optional(),
    /**
     * An optional cover image for the blog post.
     */
    cover: z
      .union([
        z.object({
          /**
           * Alternative text describing the cover image for assistive technologies.
           */
          alt: z.string(),
          /**
           * Relative path to an image file in your project, e.g. `../../assets/cover.png`, or a URL to a remote image.
           */
          image: z.union([image(), z.string()]),
        }),
        z.object({
          /**
           * Alternative text describing the cover image for assistive technologies.
           */
          alt: z.string(),
          /**
           * Relative path to an image file in your project, e.g. `../../assets/cover-dark.png`, or a URL to a remote
           * image to use in dark mode.
           */
          dark: z.union([image(), z.string()]),
          /**
           * Relative path to an image file in your project, e.g. `../../assets/cover-light.png`, or a URL to a remote
           * image to use in light mode.
           */
          light: z.union([image(), z.string()]),
        }),
      ])
      .optional(),
    /**
     * Defines whether the blog post is featured or not.
     * Featured blog posts are displayed in a dedicated sidebar group above recent blog posts.
     */
    featured: z.boolean().optional(),
  });

export function blogSchema(context: SchemaContext) {
  // Checking for `context` to provide a better migration error message.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!context) {
    throw new AstroError(
      "Missing blog schema validation context.",
      `You may need to update your content collections configuration in the \`src/content.config.ts\` file and pass the context to the \`blogSchema\` function:

\`docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: (context) => blogSchema(context) }) })\`

This project now uses the local kokosa-blog plugin, so check the local schema wiring if this keeps failing.`,
    );
  }

  return blogEntrySchema(context).partial();
}

export type StarlightBlogUserMetrics = z.infer<typeof metricsSchema>;

interface SchemaContext {
  image: ImageFunction;
}
