# Repository Guidelines

## Project Structure & Module Organization

This is an Astro blog/docs site. Core application code lives in `src/`: pages in `src/pages`, reusable Astro/React components in `src/components`, integrations and Starlight plugins in `src/plugins`, shared data in `src/data`, styles in `src/styles`, and content configuration in `src/content.config.ts`. Localized MDX/Markdown content is under `src/content/docs`, grouped by locale such as `en-us` and `zh-cn`. Static files and published media live in `public/`; source-only assets belong in `src/assets`.

## Build, Test, and Development Commands

Use `just` for routine local workflows; recipes wrap the Bun commands used by the project.

- `bun install`: install dependencies from `bun.lock`.
- `just`: list available recipes.
- `just dev`: start the Astro development server via `bun dev`.
- `bun run build`: build the production site and catch Astro/content errors; add a `just build` recipe if this becomes a frequent task.
- `bun run preview`: preview the built site locally.
- `bun run format`: run Prettier across the repository.
- `just clean`: remove generated build/cache directories.
- `just deploy`: deploy production with Vercel.

## Coding Style & Naming Conventions

Formatting is handled by Prettier with `prettier-plugin-astro`; run `bun run format` before committing broad edits. Keep TypeScript modules in kebab-case where the repo already does so, such as `static-watermark.ts`, and use PascalCase for components such as `ImageZoomer.tsx` and `Head.astro`. Keep locale paths lowercase and consistent with existing folders: `src/content/docs/en-us/...` and `src/content/docs/zh-cn/...`.

## Testing Guidelines

There is no dedicated test framework configured. Treat `bun run build` as the required validation step for code, content schema, and route changes. For visual or interaction changes, run `just dev` and check the affected pages in both supported locales when applicable. If adding tests later, place them near the code they cover and add matching `package.json` and `Justfile` entries.

## Commit & Pull Request Guidelines

Recent commit messages are informal and mixed-case, so prefer short imperative summaries that describe the change clearly, for example `Fix image zoom overlay` or `Add zh-cn blog entry`. Pull requests should include a concise description, affected routes or content paths, screenshots for UI changes, and the validation performed, especially `bun run build`. Link issues when relevant and call out any new assets added to `public/`.

## Agent-Specific Instructions

Avoid rewriting generated or media files unless the task requires it. Keep edits scoped to the requested content, component, or plugin, and preserve existing localization structure when adding pages.
