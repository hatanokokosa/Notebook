import type { GetStaticPathsResult } from "astro";
import starlightConfig from "virtual:starlight/user-config";
import config from "virtual:kokosa-blog/config";
import context from "virtual:kokosa-blog/context";

import { getBlogEntries, type StarlightBlogEntry } from "./content";
import { DefaultLocale, getLangFromLocale, type Locale } from "./i18n";
import { stripMarkdown } from "./markdown";
import { getPathWithLocale, getRelativeUrl } from "./page";
import { getBlogTitle } from "./title";

export function getRSSStaticPaths() {
  const paths = [];

  if (starlightConfig.isMultilingual) {
    for (const localeKey of Object.keys(starlightConfig.locales)) {
      const locale = localeKey === "root" ? undefined : localeKey;
      paths.push(getRSSStaticPath(locale));
    }
  } else {
    paths.push(getRSSStaticPath(DefaultLocale));
  }

  return paths satisfies GetStaticPathsResult;
}

export async function getRSSResponse(site: URL | undefined, locale: Locale) {
  const xml = await getRSSString(site, locale);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

async function getRSSString(site: URL | undefined, locale: Locale) {
  const MAX_RSS_ITEMS = 20;
  let entries = await getBlogEntries(locale);
  entries = entries.slice(0, MAX_RSS_ITEMS);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The route is only injected if `site` is defined in the user Astro config.
  const feedSite = site!;
  const items = await Promise.all(entries.map((entry) => getRSSItem(entry, locale, feedSite)));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(getRSSTitle(locale))}</title>`,
    `<description>${escapeXml(context.description ?? "")}</description>`,
    `<link>${escapeXml(feedSite.href)}</link>`,
    ...items,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}

function getRSSStaticPath(locale: Locale) {
  return {
    params: {
      prefix: getPathWithLocale(config.prefix, locale),
    },
  };
}

function getRSSTitle(locale: Locale): string {
  let title: string;

  if (typeof context.title === "string") {
    title = context.title;
  } else {
    const lang = getLangFromLocale(locale);
    if (starlightConfig.title[lang]) {
      title = starlightConfig.title[lang];
    } else {
      const defaultLang = starlightConfig.defaultLocale.lang ?? starlightConfig.defaultLocale.locale;
      title = defaultLang ? (starlightConfig.title[defaultLang] ?? "") : "";
    }
  }

  if (title.length > 0) {
    title += ` ${context.titleDelimiter ?? "|"} `;
  }

  title += getBlogTitle(locale);

  return title;
}

function getRSSDescription(entry: StarlightBlogEntry): Promise<string> | undefined {
  if (!entry.data.excerpt) return;

  return stripMarkdown(entry.data.excerpt);
}

async function getRSSItem(entry: StarlightBlogEntry, locale: Locale, site: URL) {
  const link = new URL(getRelativeUrl(`/${getPathWithLocale(entry.id, locale)}`), site).href;
  const description = await getRSSDescription(entry);

  return [
    "<item>",
    `<title>${escapeXml(entry.data.title)}</title>`,
    `<link>${escapeXml(link)}</link>`,
    `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
    description ? `<description>${escapeXml(normalizeDescription(description))}</description>` : undefined,
    `<pubDate>${entry.data.date.toUTCString()}</pubDate>`,
    "</item>",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function normalizeDescription(description: string) {
  return description.replace(/\s+/g, " ").trim();
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
