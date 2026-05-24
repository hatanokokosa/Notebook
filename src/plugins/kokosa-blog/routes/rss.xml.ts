import type { APIRoute } from "astro";

import { getLocaleFromPath } from "../libs/page";
import { getRSSResponse, getRSSStaticPaths } from "../libs/rss";

export function getStaticPaths() {
  return getRSSStaticPaths();
}

export const GET: APIRoute = async ({ params, site }) => {
  return getRSSResponse(site, getLocaleFromPath(params["prefix"] ?? ""));
};
