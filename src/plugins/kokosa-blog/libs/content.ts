import type { GetStaticPathsResult } from "astro";
import { type CollectionEntry, getCollection, render } from "astro:content";
import starlightConfig from "virtual:starlight/user-config";
import config from "virtual:kokosa-blog/config";
import context from "virtual:kokosa-blog/context";

import { DefaultLocale, type Locale } from "./i18n";
import { getRelativeUrl, getRelativeBlogUrl, getPathWithLocale } from "./page";
import { stripLeadingSlash, stripTrailingSlash } from "./path";

const blogEntriesPerLocale = new Map<Locale, StarlightBlogEntry[]>();

export async function getBlogStaticPaths() {
  const paths = [];

  if (starlightConfig.isMultilingual) {
    for (const localeKey of Object.keys(starlightConfig.locales)) {
      const locale = localeKey === "root" ? undefined : localeKey;

      const entries = await getBlogEntries(locale);
      const pages = getPaginatedBlogEntries(entries);

      for (const [index, entries] of pages.entries()) {
        paths.push(getBlogStaticPath(pages, entries, index, locale));
      }
    }
  } else {
    const entries = await getBlogEntries(DefaultLocale);
    const pages = getPaginatedBlogEntries(entries);

    for (const [index, entries] of pages.entries()) {
      paths.push(getBlogStaticPath(pages, entries, index, DefaultLocale));
    }
  }

  return paths satisfies GetStaticPathsResult;
}

export async function getSidebarBlogEntries(locale: Locale) {
  const entries = await getBlogEntries(locale);
  return { recent: entries.slice(0, 10) };
}

export async function getBlogEntry(slug: string, locale: Locale): Promise<StarlightBlogEntryPaginated> {
  const entries = await getBlogEntries(locale);

  const entryIndex = entries.findIndex((entry) => {
    if (entry.id === stripLeadingSlash(stripTrailingSlash(slug))) return true;
    if (locale) return entry.id === stripLeadingSlash(stripTrailingSlash(getPathWithLocale(slug, undefined)));
    return false;
  });
  const entry = entries[entryIndex];

  if (!entry) {
    throw new Error(`Blog post with slug '${slug}' not found.`);
  }

  validateBlogEntry(entry);

  const prevEntry = entries[entryIndex - 1];
  const prevLink = prevEntry
    ? { href: getRelativeUrl(`/${getPathWithLocale(prevEntry.id, locale)}`), label: prevEntry.data.title }
    : undefined;

  const nextEntry = entries[entryIndex + 1];
  const nextLink = nextEntry
    ? { href: getRelativeUrl(`/${getPathWithLocale(nextEntry.id, locale)}`), label: nextEntry.data.title }
    : undefined;

  return {
    entry,
    nextLink,
    prevLink,
  };
}

export async function getBlogEntries(locale: Locale): Promise<StarlightBlogEntry[]> {
  if (blogEntriesPerLocale.has(locale)) {
    return blogEntriesPerLocale.get(locale) as StarlightBlogEntry[];
  }

  const docEntries = await getCollection("docs");
  const docEntriesById = new Map(docEntries.map((entry) => [entry.id, entry]));
  const blogEntries: StarlightEntry[] = [];

  const contentRelativePath = `${context.srcDir.replace(context.rootDir, "")}content/docs/`;

  for (const entry of docEntries) {
    const fileRelativePath = entry.filePath?.replace(contentRelativePath, "");

    const isDefaultLocaleEntry =
      fileRelativePath?.startsWith(`${getPathWithLocale(config.prefix, DefaultLocale)}/`) &&
      fileRelativePath !== `${getPathWithLocale(config.prefix, DefaultLocale)}/index.mdx`;

    if (isDefaultLocaleEntry) {
      if (locale === DefaultLocale) {
        blogEntries.push(entry);
        continue;
      }

      const localizedEntry = docEntriesById.get(getPathWithLocale(entry.id, locale));
      blogEntries.push(localizedEntry ?? entry);
    }
  }

  // Astro's content layer no longer filters `draft: true` entries automatically.
  // Keep drafts visible in dev (matching Astro's legacy behavior) but exclude them from the production build,
  // which covers RSS, blog listing, tags, and sidebar pages since they all read from this function.
  const publishedEntries = import.meta.env.PROD ? blogEntries.filter((entry) => entry.data.draft !== true) : blogEntries;

  validateBlogEntries(publishedEntries);

  publishedEntries.sort((a, b) => {
    return b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title);
  });

  blogEntriesPerLocale.set(locale, publishedEntries);

  return publishedEntries;
}

export async function getBlogEntryExcerpt(entry: StarlightBlogEntry) {
  if (entry.data.excerpt) {
    return entry.data.excerpt;
  }

  const { Content } = await render(entry);

  return Content;
}

function getBlogStaticPath(pages: StarlightBlogEntry[][], entries: StarlightBlogEntry[], index: number, locale: Locale) {
  const prevPage = index === 0 ? undefined : pages.at(index - 1);
  const prevLink = prevPage ? { href: getRelativeBlogUrl(index === 1 ? "/" : `/${index}`, locale) } : undefined;

  const nextPage = pages.at(index + 1);
  const nextLink = nextPage ? { href: getRelativeBlogUrl(`/${index + 2}`, locale) } : undefined;

  return {
    params: {
      page: index === 0 ? undefined : `${index + 1}`,
      prefix: getPathWithLocale(config.prefix, locale),
    },
    props: {
      entries,
      locale,
      nextLink,
      prevLink,
    } satisfies StarlightBlogStaticProps,
  };
}

function getPaginatedBlogEntries(entries: StarlightBlogEntry[]): StarlightBlogEntry[][] {
  const pages: StarlightBlogEntry[][] = [];

  for (const entry of entries) {
    const lastPage = pages.at(-1);

    if (!lastPage || lastPage.length === config.postCount) {
      pages.push([entry]);
    } else {
      lastPage.push(entry);
    }
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
}

// The validation of required fields is done here instead of in the zod schema directly as we do not want to require
// them for the docs.
function validateBlogEntries(entries: StarlightEntry[]): asserts entries is StarlightBlogEntry[] {
  for (const entry of entries) {
    validateBlogEntry(entry);
  }
}

function validateBlogEntry(entry: StarlightEntry): asserts entry is StarlightBlogEntry {
  // Schema uses .partial() for compatibility with non-blog docs, so date is only optional in the type.
  // This runtime assertion enforces that blog entries actually provide a date.
  if (entry.data.date === undefined) {
    throw new Error(`Missing date for blog entry '${entry.id}'.`);
  }

  if (entry.data.contentId === undefined) {
    throw new Error(`Missing content ID for blog entry '${entry.id}'.`);
  }
}

type StarlightEntry = CollectionEntry<"docs">;

export type StarlightBlogEntry = StarlightEntry & {
  data: {
    contentId: string;
    date: Date;
  };
};

export interface StarlightBlogLink {
  href: string;
  label?: string;
}

export interface StarlightBlogEntryPaginated {
  entry: StarlightBlogEntry;
  nextLink: StarlightBlogLink | undefined;
  prevLink: StarlightBlogLink | undefined;
}

interface StarlightBlogStaticProps {
  entries: StarlightBlogEntry[];
  locale: Locale;
  nextLink: StarlightBlogLink | undefined;
  prevLink: StarlightBlogLink | undefined;
}
