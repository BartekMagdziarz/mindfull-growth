/**
 * Drobne narzędzia „rysunkowe” dla SVG w Labie: deterministyczny szum, kleks
 * atramentu, ołówkowe kółko, gładka krzywa przez punkty.
 */

/** Deterministyczny pseudolosowy generator (mulberry32) — ten sam seed = ten sam kształt. */
export function seeded(seed: number): () => number {
  let t = (seed >>> 0) || 1
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Kleks: zamknięta krzywa przez 7 punktów o promieniu r ± wobble. */
export function blobPath(cx: number, cy: number, r: number, seed = 1, wobble = 0.16): string {
  const rnd = seeded(seed)
  const n = 7
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.25
    const rr = r * (1 + (rnd() * 2 - 1) * wobble)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return smoothClosedPath(pts)
}

/** Ołówkowe kółko: otwarty łuk, który nie domyka się idealnie i lekko się rozjeżdża. */
export function pencilCirclePath(cx: number, cy: number, r: number, seed = 1): string {
  const rnd = seeded(seed)
  const start = rnd() * Math.PI * 2
  const pts: [number, number][] = []
  const steps = 14
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * Math.PI * 2.08
    const rr = r * (1 + (rnd() * 2 - 1) * 0.07) + i * 0.05
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return smoothOpenPath(pts)
}

/** Catmull-Rom → kubiczne Béziery, krzywa otwarta. */
export function smoothOpenPath(pts: [number, number][], tension = 0.5): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d
}

/** Catmull-Rom → kubiczne Béziery, krzywa zamknięta. */
export function smoothClosedPath(pts: [number, number][]): string {
  const n = pts.length
  if (n < 3) return ''
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d + ' Z'
}

/** Prosty hash tekstu na seed. */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
