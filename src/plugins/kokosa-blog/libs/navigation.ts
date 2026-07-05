import type { StarlightBlogConfig } from "./config";

export function isNavigationInHeader(config: StarlightBlogConfig) {
  return config.navigation === "header-start" || config.navigation === "header-end";
}
