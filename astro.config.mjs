import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

const CLOUDFLARE = !!process.env.CLOUDFLARE;

export default defineConfig({
  site: "https://badrng.xyz",
  integrations: [mdx(), sitemap()],
  adapter: CLOUDFLARE
    ? cloudflare({
        imageService: { build: "compile", runtime: "cloudflare-binding" },
      })
    : undefined,
});
