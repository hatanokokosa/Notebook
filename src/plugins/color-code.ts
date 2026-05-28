const colorCodeCopyCleanupKey = "__kokosaColorCodeCopyCleanup";
const copiedClassName = "is-copied";

type WindowWithColorCodeCopyCleanup = Window & {
  [colorCodeCopyCleanupKey]?: () => void;
};

const resetTimers = new WeakMap<HTMLButtonElement, number>();

function setupColorCodeCopy() {
  const colorCodeWindow = window as WindowWithColorCodeCopyCleanup;

  colorCodeWindow[colorCodeCopyCleanupKey]?.();

  const onDocumentClick = async (event: MouseEvent) => {
    const button = getColorCodeButton(event.target);
    if (!button) return;

    const colorCode = button.dataset.colorCode;
    if (!colorCode) return;

    const copied = await copyText(colorCode);
    if (!copied) return;

    showCopiedState(button, colorCode);
  };

  document.addEventListener("click", onDocumentClick);

  colorCodeWindow[colorCodeCopyCleanupKey] = () => {
    document.removeEventListener("click", onDocumentClick);
  };
}

function getColorCodeButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLButtonElement>(".kokosa-color-code");
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below.
    }
  }

  return copyTextWithTextarea(text);
}

function copyTextWithTextarea(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function showCopiedState(button: HTMLButtonElement, colorCode: string) {
  const existingTimer = resetTimers.get(button);
  if (existingTimer !== undefined) window.clearTimeout(existingTimer);

  button.classList.add(copiedClassName);
  button.ariaLabel = `Copied ${colorCode}`;

  const resetTimer = window.setTimeout(() => {
    button.classList.remove(copiedClassName);
    button.ariaLabel = `Copy color ${colorCode}`;
    resetTimers.delete(button);
  }, 1200);

  resetTimers.set(button, resetTimer);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupColorCodeCopy, { once: true });
} else {
  setupColorCodeCopy();
}

document.addEventListener("astro:page-load", setupColorCodeCopy);
