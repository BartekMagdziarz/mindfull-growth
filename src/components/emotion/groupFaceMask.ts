// twarze grup: assets/emotion-faces/<slug>.svg jako maski CSS.
// UWAGA: małe SVG Vite inlinuje jako data: URI z SUROWYMI apostrofami w środku,
// więc wartość url() MUSI być w cudzysłowach (zdiagnozowane 2026-07-11).
export function groupFaceMask(slug: string): string {
  return `url("${new URL(`../../assets/emotion-faces/${slug}.svg`, import.meta.url).href}")`
}
