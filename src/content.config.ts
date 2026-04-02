import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const page = ({ image }) =>
  z.object({
    date: z.coerce.date(),
    title: z.string(),
    description: z.string().optional(),
    image: z.optional(image()),
  });

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: page,
});

const pages = defineCollection({
  loader: glob({ base: "./src/content", pattern: "*.{md,mdx}" }),
  schema: page,
});

export const collections = {
  posts,
  pages,
};
