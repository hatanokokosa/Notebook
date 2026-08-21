---
name: new-practice-article
description: Scaffold a new daily practice article from newly added images (zh-cn).
whenToUse: The user adds new practice screenshots/images (under a study practice directory such as src/content/docs/zh-cn/study/practice/ or a sibling series) and asks to process them and link them into a new or updated practice article, or asks to scaffold a practice article following the existing house style.
---

# New practice article (practice entry)

Turn newly added practice images into a new daily practice article in `/home/hatano/Development/Blog` (Astro + Starlight, single site).
**Core principle:** images must be processed and structured (frontmatter + `::toc` + `###` headings + `---` dividers), but **do not write any body prose/descriptions** — the author fills those in later ("等我来写"). Headings/alt text may only be short factual placeholders, and you must call them out as adjustable in the final summary.

This is intentionally **generic across courses/series** (抖抖村 drawing practice is only one current series). Never assume a specific course name, lesson number, or `Day N` pattern — detect it from the repo and from the images, then confirm with the user.

## Standing conventions (always follow)

- Use only `bun`/`just`. Never node/npm/npx/bunx.
- Delete files with `rip`, **never `rm`**.
- Practice entries (`study/practice/`) are **zh-cn only** — no en-us / ja-jp translation required.
- Body: **no H1**; primary sections use `###`; add `::toc` for longer articles.
- Pangu: add spaces between Chinese text and English technical terms.
- Preserve the user's existing/own edits. Re-read a file with `read` before editing — the user often renames files or changes dates themselves (e.g. re-dated a day-17 entry to `2026-08-16-day-17.md`).

## Steps

1. **Find newly added images**
   - `git status --short` for untracked images; list the practice directory in question (`src/content/docs/zh-cn/study/practice/` or any sibling series dir).
   - Screenshots are usually named `Screenshot_YYYYMMDD_HHMMSS.png`; the filename date is only a hint.

2. **Identify what entry/lesson this is**
   - Inspect the images with `vision_describe`: read any visible footer/text (e.g. a course logo + "第N天-课程名" for 抖抖村) to determine the course/lesson and its position in the series.
   - Inspect existing articles in the same directory (`*-day-*.md` or other naming) to infer the series, next number, and any gaps. Blog numbering follows the course/series numbering, not the file count.
   - **When the visual budget is exhausted:** reason from evidence already gathered and clearly state the remaining uncertainty in the summary (e.g. an alt not re-verified).

3. **Confirm with the user** (creating/renaming is a persistent decision — ask first)
   - Article identity: propose a filename `YYYY-MM-DD-<id>.md` + title + date that matches the directory's existing convention (for 抖抖村 that is `YYYY-MM-DD-day-N.md` / "抖抖村 绘画练习 Day N", date usually from the screenshots; late-night screenshots may be dated to the preceding session day or re-dated by the user).
   - Whether to delete the source images after conversion (this repo's confirmed default preference is "delete after processing", but still ask).
   - Do **not** create an unconfirmed article file.

4. **Convert and place images**
   - Convert without inserting into the article (we build the layout ourselves):
     `just image-add <source>... --dir notebook/practice/<article-id>`
   - Output looks like `/notebook/practice/.../<16-hex>.avif <- <source>`; record the URL ↔ source mapping line by line.
   - Verify with ffprobe that files are av1/avif and dimensions look right (animated sources become gif).

5. **Scaffold the article** `<article-id>.md` (under the practice directory)
   - Frontmatter: `title` + `date` matching the confirmed identity (**do not write `contentId` yet** — step 6 generates it).
   - Layout (follow the house style, e.g. `2026-08-18-day-18.md`):
     ```markdown
     ---
     title: <title>
     date: YYYY-MM-DD
     ---

     ::toc

     ---

     ### <heading 1>

     ![<alt 1>](/notebook/practice/<article-id>/<hex1>.avif)

     ---

     ### <heading 2>

     ![<alt 2>](/notebook/practice/<article-id>/<hex2>.avif)

     ---
     ```
   - Style rules:
     - Use `###` headings; when a heading goes with one image, **heading text == alt text** (that is the author's established pattern).
     - Headings/alts: short, factual subject descriptions. **Do not invent course/lesson-name prefixes** (the author explicitly rejected a `构成法练习：` prefix).
     - Separate sections with `---`; the author likes a closing `---` at the end (preserve that habit; also preserve if they added it manually).
     - **Leave the body description area empty** — no commentary or explanations.
   - One `###` per image block; order images as given.

6. **Generate the contentId**: `just content-ids-write` (fills UUIDs into files that lack one)

7. **Delete source images** (only if confirmed): `rip <source png>...`, then confirm no residual `*.png` remains in the directory.

8. **Verify**
   - `bun run build` (the repo's verification for markdown/image/link changes), must be green.
   - Spot-check `dist/zh-cn/study/practice/<article>/index.html`: expect an `article-toc` container and one `<h3>` per `###` heading.

9. **Report**
   - List changed files (source → AVIF mapping table), verification results, and unresolved items.
   - Explicitly flag placeholders (headings/alt) as adjustable; if the visual budget ran out, state which images were not re-verified.

## Common-situation reminders

- The user may rename/re-date a file or add a trailing `---` themselves: re-read before touching, never overwrite their edits.
- The image dir name (`notebook/practice/...`) and the article filename date may diverge (e.g. article re-dated) — usually harmless since it is just a URL path. Proactively mention the mismatch; only move the dir / rewrite references if the user asks. Do not do it unilaterally.
- Multiple batches of images for the same session (e.g. added after midnight) are processed separately, each as its own article; same date but different lesson numbers is normal.
