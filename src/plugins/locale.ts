const preferredLocaleStorageKey = "kokosa-preferred-locale";

class StarlightLanguageSelect extends HTMLElement {
  constructor() {
    super();

    const currentLocale = this.dataset.currentLocale;
    if (currentLocale && typeof localStorage !== "undefined") {
      localStorage.setItem(preferredLocaleStorageKey, currentLocale);
    }

    const select = this.querySelector("select");
    if (!select) return;

    select.addEventListener("change", (event) => {
      if (event.currentTarget instanceof HTMLSelectElement) {
        const locale = event.currentTarget.value.split("/").filter(Boolean)[0];
        if (locale && typeof localStorage !== "undefined") {
          localStorage.setItem(preferredLocaleStorageKey, locale);
        }
        window.location.pathname = event.currentTarget.value;
      }
    });

    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;

      const markupSelectedIndex =
        select.querySelector<HTMLOptionElement>("option[selected]")?.index;
      if (markupSelectedIndex !== select.selectedIndex) {
        select.selectedIndex = markupSelectedIndex ?? 0;
      }
    });
  }
}

customElements.define("starlight-lang-select", StarlightLanguageSelect);
