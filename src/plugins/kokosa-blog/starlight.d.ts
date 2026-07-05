// Redundant with @astrojs/starlight's own virtual.d.ts — kept for local visibility.
declare module "virtual:starlight/user-config" {
  const Config: import("@astrojs/starlight/types").StarlightConfig;

  export default Config;
}
