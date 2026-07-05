export interface TocItem {
  depth: number;
  slug: string;
  text: string;
  children?: TocItem[];
}

export function getUserTocItems(items: TocItem[]): TocItem[] {
  return items.flatMap((item) => {
    const children = getUserTocItems(item.children ?? []);

    if (item.slug === "_top") {
      return children;
    }

    return [{ ...item, children }];
  });
}

export function countTocItems(items: TocItem[]): number {
  return items.reduce((count, item) => count + 1 + countTocItems(item.children ?? []), 0);
}
