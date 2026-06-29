import type { Image, Paragraph, Root } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

const DEFAULT_TITLE = "图片集";

function getUnit(path: string | undefined): string {
  if (!path) return "张";
  if (path.includes("/ja-jp/")) return "枚";
  if (path.includes("/en-us/")) return "";
  return "张";
}

function isContainerDirective(node: unknown): node is ContainerDirective {
  return (node as ContainerDirective)?.type === "containerDirective";
}

function isParagraph(node: unknown): node is Paragraph {
  return (node as Paragraph)?.type === "paragraph";
}

function isImage(node: unknown): node is Image {
  return (node as Image)?.type === "image";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function countImages(nodes: unknown[]): number {
  let count = 0;
  for (const node of nodes) {
    if (isImage(node)) {
      count++;
    } else if (isParagraph(node)) {
      count += node.children.filter(isImage).length;
    } else if (node && typeof node === "object" && "children" in node && Array.isArray(node.children)) {
      count += countImages(node.children);
    }
  }
  return count;
}

function getDirectiveLabel(node: ContainerDirective): string | undefined {
  if (node.attributes?.title) {
    return node.attributes.title;
  }

  const firstChild = node.children[0];
  if (isParagraph(firstChild) && firstChild.data?.directiveLabel) {
    const textParts: string[] = [];
    for (const child of firstChild.children) {
      if (child.type === "text") {
        textParts.push(child.value);
      } else if ("value" in child && typeof child.value === "string") {
        textParts.push(child.value);
      }
    }
    return textParts.join("") || undefined;
  }

  return undefined;
}

const remarkFoldImg: Plugin<[], Root> = function () {
  return (tree, file) => {
    const directives: Array<{
      node: ContainerDirective;
      index: number;
      parent: Root;
    }> = [];

    visit(tree, (node, index, parent) => {
      if (isContainerDirective(node) && node.name === "fold-img" && index !== undefined && parent) {
        directives.push({
          node,
          index,
          parent: parent as Root,
        });
      }
    });

    for (let i = directives.length - 1; i >= 0; i--) {
      const { node, index, parent } = directives[i];
      const label = getDirectiveLabel(node);
      const title = label || DEFAULT_TITLE;

      const hasLabelAsFirstChild = isParagraph(node.children[0]) && node.children[0].data?.directiveLabel;

      const contentChildren = hasLabelAsFirstChild ? node.children.slice(1) : node.children;

      const imageCount = countImages(contentChildren);

      if (imageCount === 0) continue;

      const filePath = (file as VFile).path || (file as VFile).history?.[0] || "";
      const unit = getUnit(filePath);
      const countText = unit ? `${imageCount} ${unit}` : `${imageCount} images`;
      const openHtml = `<div class="fold-img not-content" data-spread="true"><p class="fold-img-desc"><span class="fold-img-title">${escapeHtml(title)}</span><span class="fold-img-count">${countText}</span></p><div class="fold-img-content"><div class="fold-img-grid">`;
      const closeHtml = `</div></div></div>`;

      parent.children.splice(index, 1, { type: "html", value: openHtml }, ...contentChildren, { type: "html", value: closeHtml });
    }
  };
};

export default remarkFoldImg;
