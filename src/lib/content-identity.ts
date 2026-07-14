const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contentGuidPrefix = "urn:kokosa:content:";
const contentTermPrefix = "kokosa:";

export class InvalidContentIdError extends Error {
  public constructor(readonly contentId: string) {
    super(`Content ID must be a UUID v4: ${contentId}`);
    this.name = "InvalidContentIdError";
  }
}

export function isUuidV4(value: string): boolean {
  return uuidV4Pattern.test(value);
}

export function createContentTerm(contentId: string): string {
  if (!isUuidV4(contentId)) {
    throw new InvalidContentIdError(contentId);
  }

  return `${contentTermPrefix}${contentId}`;
}

export function createContentGuid(contentId: string): string {
  if (!isUuidV4(contentId)) {
    throw new InvalidContentIdError(contentId);
  }

  return `${contentGuidPrefix}${contentId}`;
}

export function isContentTerm(term: string): boolean {
  return term.startsWith(contentTermPrefix) && isUuidV4(term.slice(contentTermPrefix.length));
}

export function isExactContentTerm(term: string, contentId: string): boolean {
  return term === createContentTerm(contentId);
}
