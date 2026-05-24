import type { Element, Node as HastNode } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString } from "hast-util-to-string";
import { is } from "unist-util-is";
import { remove } from "unist-util-remove";

export function transformHTMLForMetrics(html: string) {
  let images = 0;

  const ast = fromHtml(html);

  remove(ast, (node) => {
    // Count images.
    if (isElementNode(node) && node.tagName === "img") images++;

    return (
      // Remove screen reader only accessibility text.
      hasCssClass(node, "sr-only") ||
      // Remove code blocks.
      hasCssClass(node, "expressive-code")
    );
  });

  return { content: toString(ast), images };
}

function isElementNode(node: HastNode): node is Element {
  return is(node, { type: "element" });
}

function hasCssClass(node: HastNode, className: string): boolean {
  return isElementNode(node) && Array.isArray(node.properties["className"]) && node.properties["className"].includes(className);
}
