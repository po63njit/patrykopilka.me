import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: import.meta.env.PUBLIC_SITE_URL || 'https://patrykopilka.me',
  integrations: [mdx()],
});
