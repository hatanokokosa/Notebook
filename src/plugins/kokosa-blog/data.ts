import type { StarlightBlogEntry } from "./libs/content";

export interface StarlightBlogData {
  /**
   * A list of all the blog posts in your project ordered by descending publication date.
   */
  posts: {
    /**
     * The date of the blog post.
     */
    createdAt: Date;
    /**
     * The Astro content collection entry for the blog post which includes frontmatter values at `entry.data`.
     */
    entry: StarlightBlogEntry;
    /**
     * The link to the blog post.
     */
    href: string;
    /**
     * The metrics of the blog post.
     */
    metrics: {
      readingTime: {
        minutes: number;
        seconds: number;
      };
      words: {
        rounded: number;
        total: number;
      };
    };
    /**
     * A list of tags associated with the blog post.
     */
    tags: {
      label: string;
      href: string;
    }[];
    /**
     * The title of the blog post.
     */
    title: string;
    /**
     * The last update date of the blog post.
     * Defined only if the blog post has been updated and differs from the creation date.
     */
    updatedAt?: Date;
  }[];
}
