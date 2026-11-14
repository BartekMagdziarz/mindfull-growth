import { describe, expect, it } from 'vitest'
import {
  buildMonthPresets,
  cloudColor,
  cloudFill,
  cloudParts,
  cloudRgb,
  cloudTitle,
  colourDistance,
  cornerLegend,
  DEFAULT_LOOK,
  dotColors,
  rgbToOklab,
  stateJumpAt,
  stateJumps,
  TINT_SHARE,
  type CloudLook,
  type Scheme,
  type TintProfile,
} from '~lab/lab/loadStateClouds'
import { AREA_KEYS, type Rating } from '~lab/lab/weekLoadState'

const RATINGS: Rating[] = [1, 2, 3, 4, 5]
const PAIRS = RATINGS.flatMap(load => RATINGS.map(state => [load, state] as const))
const SCHEME_IDS: Scheme[] = ['tint', 'fade', 'map', 'split']
const withScheme = (scheme: Scheme, profile: TintProfile = 'even'): CloudLook => ({ ...DEFAULT_LOOK, scheme, profile })
const rgb = (load: Rating, state: Rating, scheme: Scheme) => cloudRgb(load, state, withScheme(scheme))!
/** Kąt barwy w oklab, w stopniach: błękit ok. 255–265°, fiolet ok. 315°, róż ok. 0–10°. */
const hue = (colour: [number, number, number]) => {
  const [, a, b] = rgbToOklab(colour)
  return (Math.atan2(b, a) * 180) / Math.PI + (b < 0 ? 360 : 0)
}

describe('obciążenie i stan jako chmury', () => {
  it('słupek sięga od początku skali do oceny obciążenia, niezależnie od stanu', () => {
    expect(cloudParts(5, 1)).toEqual([
      { kind: 'track', from: 1, to: 5 },
      { kind: 'cloud', from: 1, to: 5 },
    ])
    expect(cloudParts(2, 5)[1]).toEqual({ kind: 'cloud', from: 1, to: 2 })
    expect(cloudParts(1, 1)[1]).toEqual({ kind: 'cloud', from: 1, to: 1 })
  })

  it('tydzień bez pełnej oceny to pusty tor bez koloru', () => {
    expect(cloudParts(null, null)).toEqual([{ kind: 'gap', from: 1, to: 5 }])
    expect(cloudParts(4, null)[0].kind).toBe('gap')
    expect(cloudRgb(null, 3)).toBeNull()
    expect(cloudColor(null, 3)).toBe('var(--mg-color-paper)')
  })

  it('konwencja pickera emocji w narożnikach każdego schematu', () => {
    for (const scheme of SCHEME_IDS) {
      // lekko · źle = fiolet, ciężko · źle = róż, dobra strona = błękit
      expect(hue(rgb(1, 1, scheme))).toBeGreaterThan(300)
      expect(hue(rgb(1, 1, scheme))).toBeLessThan(330)
      expect(hue(rgb(5, 1, scheme))).toBeLessThan(20)
      expect(hue(rgb(1, 5, scheme))).toBeGreaterThan(245)
      expect(hue(rgb(1, 5, scheme))).toBeLessThan(275)
      expect(hue(rgb(5, 5, scheme))).toBeGreaterThan(245)
      expect(hue(rgb(5, 5, scheme))).toBeLessThan(275)
      // ciężko jest ciemniejsze niż lekko po obu stronach
      expect(rgbToOklab(rgb(5, 5, scheme))[0]).toBeLessThan(rgbToOklab(rgb(1, 5, scheme))[0])
      expect(rgbToOklab(rgb(5, 1, scheme))[0]).toBeLessThan(rgbToOklab(rgb(1, 1, scheme))[0])
    }
    expect(cloudColor(5, 1, withScheme('map'))).toBe('rgb(216 95 126)')
    expect(cloudColor(5, 5, withScheme('map'))).toBe('rgb(62 110 184)')
    expect(cloudColor(1, 1, withScheme('map'))).toBe('rgb(205 180 219)')
  })

  it('runda 5 miała ten szkopuł: krok 3→2 prawie dwa razy większy niż 4→3', () => {
    const [, mid43, mid32] = stateJumps(withScheme('split'))
    expect(mid32 / mid43).toBeGreaterThan(1.8)
  })

  it('odcień w stanie 3 dzieli skok po równo, nie przesuwa go', () => {
    const before = stateJumps(withScheme('split'))
    const after = stateJumps(withScheme('tint'))
    expect(Math.abs(after[1] - after[2])).toBeLessThan(0.5)
    // największy krok jest mniejszy niż dawny skok 3→2 — nigdzie nie powstał nowy
    expect(Math.max(...after)).toBeLessThan(before[2])
    // kroki przy skrajnych stanach się nie zmieniły
    expect(after[0]).toBeCloseTo(before[0], 5)
    expect(after[3]).toBeCloseTo(before[3], 5)
  })

  it('odcień w stanie 3 zmienia tylko wiersz stanu 3 i zostawia go po stronie błękitu', () => {
    for (const [load, state] of PAIRS) {
      if (state !== 3) expect(rgb(load, state, 'tint')).toEqual(rgb(load, state, 'split'))
    }
    for (const load of RATINGS) {
      const tinted = rgb(load, 3, 'tint')
      expect(colourDistance(tinted, rgb(load, 3, 'split'))).toBeLessThan(colourDistance(tinted, rgb(load, 2, 'split')))
    }
    // lekki tydzień ciągnie w fiolet, ciężki w róż: kąt barwy rośnie od błękitu w stronę różu
    expect(hue(rgb(5, 3, 'tint'))).toBeGreaterThan(hue(rgb(5, 3, 'split')))
    expect(hue(rgb(1, 3, 'tint'))).toBeGreaterThan(hue(rgb(1, 3, 'split')))
  })

  it('przejście w słupku: tylko wiersz stanu 3 jest gradientem — od dzisiejszego błękitu do koloru wiersza 2', () => {
    const look = withScheme('fade')
    for (const [load, state] of PAIRS) {
      const fill = cloudFill(load, state, look)
      if (state !== 3) expect(fill).toBe(cloudColor(load, state, withScheme('split')))
      else expect(fill.startsWith('linear-gradient(90deg, ')).toBe(true)
    }
    const stops = cloudFill(5, 3, look).match(/rgb\([^)]+\)/g)!
    expect(stops).toHaveLength(5)
    expect(stops[0]).toBe(cloudColor(5, 3, withScheme('split')))
    expect(stops[4]).toBe(cloudColor(5, 2, withScheme('split')))
    // pozostałe schematy malują jednym kolorem
    expect(cloudFill(5, 3, withScheme('tint'))).toBe(cloudColor(5, 3, withScheme('tint')))
  })

  it('profil „tylko na skrajach”: odcień wyraźny przy obciążeniu 1 i 5, najsłabszy przy 3', () => {
    const share = TINT_SHARE.edges
    expect(share[0]).toBe(TINT_SHARE.even[0])
    expect(share[4]).toBe(TINT_SHARE.even[4])
    expect(Math.min(...share)).toBe(share[2])
    expect(share[2]).toBeLessThan(0.1)
    expect(DEFAULT_LOOK.profile).toBe('edges')
  })

  it('profil „tylko na skrajach”: zwykły tydzień (3 · 3) zostaje po stronie błękitu, bliżej niż w rundzie 7', () => {
    for (const scheme of ['tint', 'fade'] as Scheme[]) {
      const today = rgb(3, 3, 'split')
      const edges = cloudRgb(3, 3, withScheme(scheme, 'edges'))!
      const even = cloudRgb(3, 3, withScheme(scheme, 'even'))!
      expect(colourDistance(edges, today)).toBeLessThan(colourDistance(even, today) / 2)
      expect(colourDistance(edges, today)).toBeLessThan(2)
      // skraje bez zmian względem rundy 7 tylko w schemacie z odcieniem; w przejściu koniec słupka jest krótszy
      if (scheme === 'tint') {
        expect(cloudRgb(1, 3, withScheme(scheme, 'edges'))).toEqual(cloudRgb(1, 3, withScheme(scheme, 'even')))
        expect(cloudRgb(5, 3, withScheme(scheme, 'edges'))).toEqual(cloudRgb(5, 3, withScheme(scheme, 'even')))
      }
    }
  })

  it('profil „tylko na skrajach” oddaje część wyrównania: krok 3→2 przy obciążeniu 3 wraca prawie do rundy 5', () => {
    const look = withScheme('fade', 'edges')
    const split = withScheme('split')
    expect(stateJumpAt(3, 3, look)).toBeGreaterThan(stateJumpAt(3, 3, withScheme('fade', 'even')))
    expect(stateJumpAt(3, 3, look)).toBeLessThanOrEqual(stateJumpAt(3, 3, split))
    // przy ciężkim tygodniu skok zostaje wyraźnie mniejszy niż w rundzie 5
    expect(stateJumpAt(5, 3, look)).toBeLessThan(stateJumpAt(5, 3, split) * 0.7)
    // średnio nadal lepiej niż ostra granica
    expect(stateJumps(look)[2]).toBeLessThan(stateJumps(split)[2])
  })

  it('przejście „tylko na skrajach”: koniec słupka 3 · 3 jest ledwo zabarwiony, koniec 5 · 3 wyraźnie', () => {
    const stops = (load: Rating) => cloudFill(load, 3, withScheme('fade', 'edges')).match(/rgb\([^)]+\)/g)!
    const parse = (value: string) => value.match(/\d+/g)!.map(Number) as [number, number, number]
    const reach = (load: Rating) => colourDistance(parse(stops(load)[0]), parse(stops(load)[4]))
    expect(reach(3)).toBeLessThan(3)
    expect(reach(5)).toBeGreaterThan(reach(3) * 3)
    expect(stops(5)[0]).toBe(cloudColor(5, 3, withScheme('split')))
  })

  it('mapa ćwiartek: wszystkie cztery kroki stanu są do siebie podobne', () => {
    const jumps = stateJumps(withScheme('map'))
    expect(Math.max(...jumps) / Math.min(...jumps)).toBeLessThan(1.5)
  })

  it('kropka: środek = kolor słupka bez przyciemniania, pole = papier zabarwiony tym kolorem', () => {
    for (const scheme of SCHEME_IDS) {
      for (const [load, state] of PAIRS) {
        const dot = dotColors(load, state, withScheme(scheme))
        expect(dot.centre).toBe(cloudColor(load, state, withScheme(scheme)))
        expect(dot.field).not.toBe(dot.centre)
      }
    }
    expect(dotColors(null, 3)).toEqual({ field: 'var(--mg-color-paper)', centre: 'var(--mg-color-paper)' })
  })

  it('legenda narożników ma cztery pozycje w konwencji ćwiartek', () => {
    expect(cornerLegend(DEFAULT_LOOK).map(item => item.label)).toEqual(['lekko · dobrze', 'ciężko · dobrze', 'lekko · źle', 'ciężko · źle'])
  })

  it('podpowiedź niesie liczby i ćwiartkę, luka mówi „bez refleksji”', () => {
    expect(cloudTitle('body', '05–11.10', 5, 2)).toBe('Ciało · 05–11.10: obciążenie 5, stan 2 · tydzień trudny')
    expect(cloudTitle('tasks', '19–25.10', null, null)).toBe('Zadania · 19–25.10: bez refleksji')
  })

  it('każdy miesiąc próbki ma pięć tygodni na obszar; mieszany ma lukę, trudny ma parę 5 · 1', () => {
    const presets = buildMonthPresets()
    for (const preset of Object.values(presets)) {
      expect(preset.units).toHaveLength(5)
      expect(preset.compass).toHaveLength(5)
      for (const area of AREA_KEYS) expect(preset.series[area].map(p => p.weekRef)).toEqual(preset.units.map(u => u.ref))
    }
    expect(AREA_KEYS.every(area => presets.mixed.series[area][3].load == null)).toBe(true)
    expect(AREA_KEYS.some(area => presets.hard.series[area].some(p => p.load === 5 && p.state === 1))).toBe(true)
  })
})
