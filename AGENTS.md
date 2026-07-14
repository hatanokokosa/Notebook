# AGENTS.md

## Task Workflow

1. Read the relevant files before making changes.
2. Keep changes limited to the requested task.
3. Preserve existing project patterns and user changes.
4. Apply the smallest correct change.
5. When adding content, run `just content-ids-write` to generate its `contentId`.
6. Verify according to the change type.
7. Report changed files, verification results, and unresolved issues.

## Commands

- Install dependencies: `bun install`
- Development server: `just dev` or `bun run dev`
- Astro diagnostics: `bunx astro check`
- Production build: `bun run build`
- Format: `bun run format`
- Regenerate Astro types: `bun run astro sync`

Prefer Bun. Do not use npm unless explicitly requested.

## Verification

Choose verification based on the task:

- Components, plugins, TypeScript, config, or schemas:
  run `bunx astro check` and `bun run build`.
- Markdown rendering, routes, or localization wiring;
  Markdown frontmatter, components, links, or media references.
  run `bun run build`.
- Plain md text edits do not require a build.
- Content schema changes:
  run `bun run astro sync`, `bunx astro check`, and `bun run build`.

Do not claim completion if required verification failed or was not run.
Report skipped verification and the reason.

## Content Tasks

- Canonical articles live under `src/content/docs/zh-cn/`.
- Except for `create/practice/`, new articles require matching files under
  `en-us/` and `ja-jp/` at the same relative path.
- Translate title, description, tags, and article text naturally.
- Preserve frontmatter keys, media URLs, commands, code, and technical names.
- Blog entries must include a valid `date`.
- Daily practice entries under `create/practice/` are Chinese-only.

## UI Localization

When adding user-facing text:

1. Update `src/content/i18n/zh-CN.json`.
2. Update `src/content/i18n/en-US.json`.
3. Update `src/content/i18n/ja-JP.json`.
4. For injected blog defaults, also update
   `src/plugins/kokosa-blog/translations.ts`.

Content paths use `zh-cn`, `en-us`, and `ja-jp`.
UI translation files use `zh-CN`, `en-US`, and `ja-JP`.

## Image Tasks

- Put images under `public/`.
- Convert new images to AVIF with `ffmpeg` at quality 90.
- Run `just rename-images` when adding images.
- Update and verify all references after renaming.
- Use GIF instead when animation requires it.

## Article Conventions

- Chinese articles are canonical. I18n translate all text naturally.
- Do not add, remove, or change factual content unless explicitly requested.
- Do not add sentence-ending periods (`。`) to Japanese translations.
- Format commands, paths, filenames, and code identifiers as inline code.
- Do not add an H1 to the body. Use `###` for primary sections.
- Pangu: Add spaces between Chinese text and English technical terms.
- Code blocks: Use `txt` for directory trees and plain text.
- Add `::toc` (table of contents) to longer articles.

## Project-Specific Guidance

- This is one Astro 6 + Starlight site, not a monorepo.
- Main configuration is in `astro.config.ts`.
- Content collections are defined in `src/content.config.ts`.
- Blog implementation is under `src/plugins/kokosa-blog/`.
- Markdown rendering is centralized in
  `src/components/MarkdownContent.astro`.
- Default-locale blog entries under `zh-cn/blog/` are canonical.
- Blog `date` is enforced at runtime.

## Safety

- Do not commit, push, deploy, or force-push.
- Never run `just push`.
- Run `just deploy` only when explicitly requested.
- Never use `rm`; use `rip`.
- Do not revert or overwrite unrelated worktree changes.
- Do not manually edit generated files:
  `public/_watermarked`, `.astro`, `.cache`, or `dist`.
- Do not update unrelated dependencies or reformat unrelated files.
