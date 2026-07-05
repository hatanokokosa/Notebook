import starlightConfig from "virtual:starlight/user-config";

export const DefaultLocale = starlightConfig.defaultLocale.locale === "root" ? undefined : starlightConfig.defaultLocale.locale;

const DEFAULT_LANG = "en";

export function getLangFromLocale(locale: Locale): string {
  const lang = locale ? starlightConfig.locales?.[locale]?.lang : starlightConfig.locales?.root?.lang;
  const defaultLang = starlightConfig.defaultLocale.lang ?? starlightConfig.defaultLocale.locale;
  return lang ?? defaultLang ?? DEFAULT_LANG;
}

export type Locale = string | undefined;
