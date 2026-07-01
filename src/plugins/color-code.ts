import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const colorCodePattern = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

export default function rehypeColorCode() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "code" || index === undefined || !parent) return;
      if (parent.type === "element" && parent.tagName === "pre") return;

      const colorCode = getInlineCodeText(node)?.trim();
      if (!colorCode || !colorCodePattern.test(colorCode)) return;

      parent.children[index] = createColorCodeButton(colorCode);
    });
  };
}

function getInlineCodeText(node: Element): string | null {
  if (node.children.length !== 1) return null;

  const child = node.children[0];
  return child?.type === "text" ? child.value : null;
}

function createColorCodeButton(colorCode: string): Element {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["kokosa-color-code"],
      dataColorCode: colorCode,
      ariaLabel: `Copy color ${colorCode}`,
      title: `Copy ${colorCode}`,
      style: `--kokosa-color-code: ${colorCode}`,
    },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: {
          ariaHidden: "true",
          className: ["kokosa-color-code__swatch"],
        },
        children: [],
      },
      {
        type: "element",
        tagName: "code",
        properties: {},
        children: [{ type: "text", value: colorCode }],
      },
    ],
  };
}

// --- client-side: click-to-copy ---

function setupColorCodeCopy() {
  const onButtonClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(".kokosa-color-code");
    if (!button) return;

    const colorCode = button.dataset.colorCode;
    if (!colorCode) return;

    navigator.clipboard.writeText(colorCode).then(() => {
      button.classList.add("is-copied");
      button.ariaLabel = `Copied ${colorCode}`;
      setTimeout(() => {
        button.classList.remove("is-copied");
        button.ariaLabel = `Copy color ${colorCode}`;
      }, 1500);
    });
  };

  document.addEventListener("click", onButtonClick);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupColorCodeCopy, { once: true });
  } else {
    setupColorCodeCopy();
  }
  document.addEventListener("astro:page-load", setupColorCodeCopy);
}
