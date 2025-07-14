// @ts-check
import catppuccin from "@catppuccin/starlight";
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/contrib/mhchem';
import starlightBlog from 'starlight-blog'
import starlightGiscus from 'starlight-giscus'
import starlightSiteGraph from 'starlight-site-graph'


// https://astro.build/config
export default defineConfig({

	// site: 'https://hatanokokosa.github.io',
	// base: '/hatanokokosa.github.io',

	devToolbar: {
		enabled: false
	},

	markdown: {
		remarkPlugins: [ remarkMath ],
		rehypePlugins: [ rehypeKatex ]
	},

	integrations: [

		starlight({

			title: 'Kokosa\'s Notebook',

			customCss: [
				'./src/styles/katex.css',
				'./src/styles/font.css',
				'@fontsource/maple-mono/400.css',
				'@fontsource/baskervville/600.css',
				'@fontsource/noto-serif-sc/600.css',
			],

			head: [
				{
					tag: 'link',
					attrs: {
						href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
						rel: 'stylesheet',
					},
				},
			],

			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/hatanokokosa' },
				{ icon: 'codeberg', label: 'Codeberg', href: 'https://codeberg.org/hatanokokosa' },
			],

			plugins: [

				catppuccin({
					dark: { flavor: "macchiato", accent: "blue" },
					light: { flavor: "latte", accent: "sapphire" }
				}),

				starlightBlog({
					title: { en: "Kokosa's Blog" },
					postCount: 8,
					recentPostCount: 10,
					metrics: {
            			readingTime: true,
            			words: 'rounded'
          			},
					authors: {
            			kokosa: {
              				name: 'Hatano Kokosa',
              				url: 'https://github.com/hatanokokosa',
							picture: '/assets/oc.webp'
            			},
					},
				}),

				starlightGiscus({
           			repo: 'hatanokokosa/hatanokokosa',
           			repoId: 'R_kgDONiihcQ',
           			category: 'Q&A',
           			categoryId: 'DIC_kwDONiihcc4Cs5Yk',
          			theme: {
            			light: 'catppuccin_latte',
            			dark: 'catppuccin_mocha',
            			auto: 'preferred_color_scheme'
          			},
          			lazy: false
       			}),

				starlightSiteGraph(),

			],

			sidebar: [
				{
					label: 'Main',
					autogenerate: { directory: 'main' },
				},
				{
					label: 'Learning',
					autogenerate: { directory: 'learning' },
				},
				{
					label: 'Drawing',
					autogenerate: { directory: 'drawing' },
				},
			],
		}),
	],
});
