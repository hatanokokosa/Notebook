import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { blogSchema } from "./plugins/kokosa-blog/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) =>
        z
          .object({
            comments: z.boolean().optional().default(true),
            contentId: z.uuidv4().optional(),
            watermark: z.boolean().optional().default(false),
            download: z.boolean().optional().default(false),
            draft: z.boolean().optional().default(false),
          })
          .extend(blogSchema(context).shape),
    }),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema(),
  }),
};
