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

- Install dependencies: `bun install --frozen-lockfile`
- Development server: `just dev` or `bun run dev`
- Astro diagnostics: `bun run check`
- Production build: `bun run build`
- Tests: `bun test`
- Format: `bun run format`
- Check formatting: `bun run format:check`
- Regenerate Astro types: `bun run sync`

Bun is the only JavaScript runtime and package manager. Do not use Node.js, npm, npx, or bunx.

## Scripts

- `just rename-images`: assigns a random 16-hex name to every image under `public/` whose basename is not already 16-hex, and rewrites all them to the new names.
  - Write the image reference in the article with its temporary filename BEFORE running, so the reference gets rewritten too.
  - `--dry-run` previews the mapping; `--force` also renames already-hex-named images.
- `just content-ids-write`: generates a UUID v4 `contentId` (Do not add empty ones!) in the frontmatter of content markdown files that lack one.

## Verification

Choose verification based on the task:

- Components, plugins, TypeScript, config, or schemas:
  run `bun run check` and `bun run build`.
- Markdown rendering, routes, or localization wiring;
  Markdown frontmatter, components, links, or media references.
  run `bun run build`.
- Plain md text edits do not require a build.
- Content schema changes:
  run `bun run sync`, `bun run check`, and `bun run build`.

Do not claim completion if required verification failed or was not run.
Report skipped verification and the reason.

## Content Tasks

- Canonical articles live under `src/content/docs/zh-cn/`.
- Except for `study/practice/`, new articles require matching files under
  `en-us/` and `ja-jp/` at the same relative path.
- Translate title, description, tags, and article text naturally.
- Preserve frontmatter keys, media URLs, commands, code, and technical names.
- Blog entries must include a valid `date`.
- Daily practice entries under `study/practice/` are Chinese-only.

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
