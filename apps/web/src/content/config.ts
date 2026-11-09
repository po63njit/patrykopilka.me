import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    draft: z.boolean().default(false),
    date: z.coerce.date(),
    description: z.string().optional(),
    hero: z.object({
      kind: z.literal("byte-order"),
      titleLines: z.tuple([z.string(), z.string()]),
      eyebrow: z.string(),
      deck: z.string(),
      emphasis: z.string(),
      summary: z.string(),
      status: z.string().optional(),
    }).optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
