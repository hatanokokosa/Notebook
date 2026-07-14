import { isContentTerm } from "./content-identity";

export type GiscusScriptAttributes = {
  readonly "data-mapping": "specific";
  readonly "data-term": string;
  readonly "data-strict": "1";
};

export class GiscusTermConfigurationError extends Error {
  public constructor(readonly term: string | undefined) {
    super(`Giscus requires an immutable content term: ${term ?? "(missing)"}`);
    this.name = "GiscusTermConfigurationError";
  }
}

export function createGiscusScriptAttributes(term: string | undefined): GiscusScriptAttributes {
  if (!term || !isContentTerm(term)) {
    throw new GiscusTermConfigurationError(term);
  }

  return {
    "data-mapping": "specific",
    "data-term": term,
    "data-strict": "1",
  };
}
