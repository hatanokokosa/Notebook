// Wrap Starlight theme changes in View Transition for clip-path reveal
if (!document.startViewTransition || window.__themeVT) {
  // No-op: either browser doesn't support View Transitions, or already installed
} else {
  window.__themeVT = true;

  let current = document.documentElement.dataset.theme || "dark";
  let busy = false;
  let pending: string | null = null;

  const obs = new MutationObserver((mutations) => {
    if (busy) return;
    for (const m of mutations) {
      if (m.attributeName !== "data-theme") continue;
      const next = document.documentElement.dataset.theme;
      if (!next || next === current) return;

      busy = true;
      obs.disconnect();
      pending = next;

      // Revert to old theme (observer fires before paint — no flash)
      document.documentElement.dataset.theme = current;

      // Direction: dark reveals from bottom, light from top
      document.documentElement.style.setProperty("--theme-reveal-from", pending === "dark" ? "0 0 100% 0" : "100% 0 0 0");
      document.documentElement.style.viewTransitionName = "theme-root";

      const vt = document.startViewTransition(() => {
        document.documentElement.dataset.theme = pending!;
      });

      const done = () => {
        document.documentElement.style.viewTransitionName = "";
        document.documentElement.style.removeProperty("--theme-reveal-from");
        current = pending!;
        pending = null;
        busy = false;
        obs.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      };

      vt.finished.then(done, done);
      return;
    }
  });

  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}
