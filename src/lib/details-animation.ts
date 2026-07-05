export function shouldReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createToggleAnimation(el: HTMLElement, setOpen: () => void, setClose: () => void, animationMs: number) {
  let closeTimer = 0;
  let openFrame = 0;

  return (open: boolean) => {
    window.clearTimeout(closeTimer);
    window.cancelAnimationFrame(openFrame);

    if (open) {
      setOpen();
      if (shouldReduceMotion()) {
        el.removeAttribute("data-closing");
        return;
      }
      el.setAttribute("data-closing", "");
      openFrame = window.requestAnimationFrame(() => {
        el.removeAttribute("data-closing");
      });
    } else {
      if (shouldReduceMotion()) {
        setClose();
        el.removeAttribute("data-closing");
        return;
      }
      el.setAttribute("data-closing", "");
      closeTimer = window.setTimeout(() => {
        setClose();
        el.removeAttribute("data-closing");
      }, animationMs);
    }
  };
}
