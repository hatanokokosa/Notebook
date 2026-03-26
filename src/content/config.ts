// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { blogSchema } from "starlight-blog/schema";

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: (context) =>
        blogSchema(context).and(
          z.object({
            // comments field
            comments: z.boolean().default(true),
          }),
        ),
    }),
  }),
};
