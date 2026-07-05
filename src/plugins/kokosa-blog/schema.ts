import { z } from "astro/zod";
import type { ImageFunction } from "astro:content";

const metricsSchema = z
  .object({
    /**
     * The reading time of the blog post in seconds.
     * If not provided, an estimated reading time will be calculated based on the blog post content.
     */
    readingTime: z.number(),
    /**
     * The number of words in the blog post.
     * If not provided, the word count will be computed from the blog post content.
     */
    words: z.number(),
  })
  .optional();

export const blogEntrySchema = () =>
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
  });

export function blogSchema(_context: SchemaContext) {
  // .partial() keeps blog fields optional when merged into docsSchema for non-blog pages.
  // The runtime assertion in content.ts:validateBlogEntry enforces required fields for blog entries.
  return blogEntrySchema().partial();
}

export type StarlightBlogUserMetrics = z.infer<typeof metricsSchema>;

interface SchemaContext {
  image: ImageFunction;
}
