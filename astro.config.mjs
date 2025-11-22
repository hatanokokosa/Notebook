import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightSiteGraph from "starlight-site-graph";
import rehypeFigure from "@microflash/rehype-figure";
import catppuccin from "@catppuccin/starlight";
import starlightGiscus from "starlight-giscus";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";
import starlight from "@astrojs/starlight";
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import react from '@astrojs/react';
import 'katex/contrib/mhchem';

export default defineConfig({

	devToolbar: { enabled: false },

	site: 'https://kokosa.icu',

	markdown: {
		rehypePlugins: [
			rehypeFigure,
			rehypeKatex
		],
		remarkPlugins: [
			remarkMath,
		]
	},

	integrations: [

		react(),

		starlight({

			title: 'Kokosa\'s Notebook',

			favicon: '/favicon.svg',

			customCss: [
				'@fontsource/noto-serif-sc/600.css',
				'@fontsource/baskervville/600.css',
				'@fontsource/iosevka/400.css',
				'./src/styles/friends.css',
				'./src/styles/figure.css',
				'./src/styles/katex.css',
				'./src/styles/font.css'
			],

			components: {
				SocialIcons: './src/components/MarkdownContent.astro',
			},

			head: [
				{
					tag: 'link',
					attrs: {
						href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
						rel: 'stylesheet',
					},
				},
			],

			plugins: [

				catppuccin({
					light: { flavor: "latte", accent: "lavender" },
					dark: { flavor: "frappe", accent: "lavender" }
				}),

				starlightBlog({
					authors: {
						kokosa: {
							url: 'https://github.com/hatanokokosa',
							picture: '/friends/oc.avif',
							name: 'Hatano Kokosa'
						},
					},

					metrics: {
						readingTime: true,
						words: 'rounded'
					},
					
					title: { en: "Kokosa's Blog" },
					postCount: 8
				}),

				starlightGiscus({
					categoryId: 'DIC_kwDONiihcc4Cs5Yk',
					repo: 'hatanokokosa/hatanokokosa',
					repoId: 'R_kgDONiihcQ',
					category: 'Q&A',
					theme: {
						light: 'catppuccin_latte',
						dark: 'catppuccin_frappe'
					},
				}),

				starlightSiteGraph(),

				starlightScrollToTop({
					tooltipText: 'Back to top',
					svgStrokeWidth: 1.5,
					smoothScroll: true,
					showTooltip: true,
					borderRadius: '50',
					threshold: 20,
				}),

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
