import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { defineCollection, z } from "astro:content";
import { blogSchema } from "starlight-blog/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) =>
        z
          .object({
            comments: z.boolean().optional().default(true),
            watermark: z.boolean().optional().default(false),
          })
          .merge(blogSchema(context)),
    }),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema(),
  }),
};
