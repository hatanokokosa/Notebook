import type { Element, Root } from "hast";
import { SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";

export default function rehypeTriDollar() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value);

    visit(tree, "element", (node, index, parent) => {
      if (index === undefined || !parent) return;

      const isInline = node.tagName === "code" && hasClass(node, "math-inline");
      const isDisplay =
        node.tagName === "pre" && node.children.some((child) => child.type === "element" && hasClass(child, "math-display"));
      if (!isInline && !isDisplay) return;

      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;

      const formula = source.slice(start, end);
      if (!formula.startsWith("$$$") || !formula.endsWith("$$$")) return;

      const wrapper: Element = {
        type: "element",
        tagName: isDisplay ? "div" : "span",
        properties: { className: ["tri-dollar"] },
        children: [node],
      };
      parent.children[index] = wrapper;
      return SKIP;
    });
  };
}

function hasClass(node: Element, className: string): boolean {
  const classes = node.properties.className;
  return Array.isArray(classes) && classes.includes(className);
}
