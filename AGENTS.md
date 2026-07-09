# AGENTS.md

## Commands

- Prefer Bun for this repo: `bun.lock` and `Justfile` are present even though `package-lock.json` also exists.
- Dev server: `just dev` or `bun run dev`.
- Production build: `bun run build`.
- Preview build output: `bun run preview`.
- Format everything: `bun run format`.
- Typecheck/Astro diagnostics: `bunx astro check`.
- Regenerate Astro types after config/content schema changes if needed: `bun run astro sync`.
- Deploy only when explicitly requested: `just deploy` runs `bunx vercel --prod`.
- Do not run `just push` unless explicitly requested; it formats, commits with a random message, and force-pushes `main`.

## Workflow

- Do not create commits or push from agent sessions; leave changes in the worktree for the user to review.
- Choose verification by change type: code/config/schema changes usually need `bunx astro check` and/or `bun run build`; content-only edits usually only need `bun run build`.
- Full-repo formatting with `bun run format` is allowed when useful.

## Project Shape

- This is a single Astro 6 + Starlight site, not a monorepo.
- Main wiring is in `astro.config.ts`: locales, Starlight sidebar, custom CSS/components, Markdown plugins, and the `kokosaBlog()` plugin.
- Content collections are defined in `src/content.config.ts`; docs entries get extra frontmatter fields `comments`, `watermark`, and `download`.
- Localized content lives under `src/content/docs/{zh-cn,en-us,ja-jp}/`.
- `src/pages/index.astro` is only a locale redirect page.

## Article & UI i18n

- Treat `src/content/docs/zh-cn/` as the canonical article tree; every new article should have matching translated files under `en-us/` and `ja-jp/` with the same relative path.
- Translate articles naturally for English and Japanese; translate user-facing frontmatter values including title, description, and tags, while preserving frontmatter keys and media links.
- When adding user-facing text in plugins or components, add matching keys to `src/content/i18n/{zh-CN,en-US,ja-JP}.json`; for injected `kokosaBlog` defaults, also check `src/plugins/kokosa-blog/translations.ts`.

## Custom Blog Plugin

- The custom blog implementation is under `src/plugins/kokosa-blog/`.
- `src/plugins/kokosa-blog/index.ts` injects blog, tag, RSS routes, middleware, component overrides, and virtual Vite config.
- Blog entries are sourced from Starlight `docs`; `src/plugins/kokosa-blog/libs/content.ts` treats default-locale `zh-cn/blog/*` entries as canonical and falls back to them when localized entries are missing.
- Blog frontmatter `date` is optional in the merged schema for non-blog docs, but `libs/content.ts` enforces it at runtime for blog entries.

## Rendering Gotchas

- `src/components/MarkdownContent.astro` is the central Markdown wrapper; it handles static watermarks, image zoom/download enhancements, inline article TOC markers, blog-specific rendering, and Giscus.
- `public/_watermarked`, `.astro`, `.cache`, and `dist` are generated/ignored artifacts; don't commit them.

## Image Workflow

- Rename public images with `just rename-images --dry-run` first, then `just rename-images`.
- The image renamer updates references across `astro.config.ts`, `src`, and text files in `public`.
- It excludes `public/favicon.svg`, `public/_watermarked`, and `public/friends`.

## Formatting

- Prettier uses `printWidth: 140` and `prettier-plugin-astro`.
- `.prettierignore` intentionally excludes the three locale landing MDX files: `src/content/docs/{zh-cn,en-us,ja-jp}/index.mdx`.
