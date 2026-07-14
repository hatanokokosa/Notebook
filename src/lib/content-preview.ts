import { createContentTerm } from "./content-identity";

type PreviewContentConfiguration = {
  readonly contentId?: string;
  readonly comments?: boolean;
};

export function getPreviewContentTerm({ comments, contentId }: PreviewContentConfiguration): string | undefined {
  if (comments === false || !contentId) {
    return undefined;
  }

  return createContentTerm(contentId);
}
