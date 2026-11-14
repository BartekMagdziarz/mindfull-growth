/**
 * Journal AI panel (2026-11-03, round 1). The user looked at „Dziennik z AI”
 * mid-conversation and saw three things that did not read right:
 *
 * - „Porozmawiaj w osobnym czacie” above the conversation — a second entry
 *   to AI with no stated difference from the conversation it sits on;
 * - „Propozycje tematów” — a quiet text toggle floating between the last
 *   message and the archive, reading like a heading, not a control;
 * - „Wcześniejsza rozmowa · 1 wiadomości” — a bare <details> BELOW the
 *   current messages although it is chronologically EARLIER (and „1
 *   wiadomości” is the wrong plural).
 *
 * This module is the pure state of the Lab scene: which variant puts which
 * element where, the sample conversation and the small rules (plural,
 * visible starters) the replica relies on. No product runtime.
 */

export type PanelVariant = 'current' | 'a' | 'b' | 'b2' | 'b3' | 'c' | 'd'
export type PanelState = 'before' | 'conversation' | 'reset'
export type SeparateChat = 'none' | 'top' | 'footer' | 'expand' | 'gear'
export type SeparateChatChoice = SeparateChat | 'auto'
export type ArchivePlace = 'bottom' | 'top' | 'gear'
export type TopicsPlace = 'toggle' | 'composer-disc' | 'below-field' | 'below-lines' | 'log-card' | 'gear'

export interface VariantDef {
  id: PanelVariant
  label: string
  short: string
  note: string
}

export const variants: VariantDef[] = [
  {
    id: 'current',
    label: 'Obecnie · trzy elementy między wiadomościami a polem',
    short: 'Obecnie',
    note: 'Stan z produktu (3.11.2026): chmura „Porozmawiaj w osobnym czacie” nad rozmową, cichy tekst „Propozycje tematów” pod ostatnią wiadomością, a pod nim surowe <details> „Wcześniejsza rozmowa · N wiadomości”. Wszystko w jednej przewijanej kolumnie.',
  },
  {
    id: 'a',
    label: 'A · Każdy element na swoim miejscu',
    short: 'A · Miejsca',
    note: 'Te same trzy funkcje, każda tam, gdzie się jej spodziewasz: wcześniejsza rozmowa zwinięta NA GÓRZE logu (chronologia), tematy pod dyskiem po lewej stronie pola odpowiedzi (jak „+” w czatach), osobny czat jako cichy wiersz pod polem. Zero zmian w produkcie poza panelem.',
  },
  {
    id: 'b',
    label: 'B · Jedno wejście: tematy i soczewki pod dyskiem',
    short: 'B · Jedno wejście',
    note: 'Jak A, ale osobny czat znika z panelu. Jego intencje (Inna perspektywa, Konkretne kroki, Pułapki myślenia) stają się „soczewkami” — startowymi czipami w TEJ rozmowie, w tym samym rzędzie co nieużyte tematy z historii, pod dyskiem z żarówką przy polu odpowiedzi. Rząd pojawia się na życzenie i zawija (tytuły tematów mieszczą się po dwa w linii; stały rząd miał 64 px — odrzucony po pomiarze). Wcześniejsza rozmowa na górze logu.',
  },
  {
    id: 'b2',
    label: 'B2 · Jedno wejście: propozycje w osobnym polu pod kompozytorem',
    short: 'B2 · Pole pod polem',
    note: 'Jak B (osobny czat znika, soczewki w tej rozmowie, wcześniejsza rozmowa na górze), ale propozycje nie wchodzą do kompozytora: log przechodzi wprost w pole odpowiedzi, a POD polem leży osobne, małe pole „Propozycje” w tonie mgły — nagłówek z żarówką i liczbą, pod nim małe czipy tematów i soczewek na papierze. Pole zwija się do jednego wiersza (nagłówek zostaje), a jego miejsce zabiera log, bo wysokość panelu jest stała. Pierwszy pomiar (czipy w rozmiarze sm): 6 czipów = 5 wierszy, 220 px, logowi zostało 156 px — stąd czipy xs.',
  },
  {
    id: 'b3',
    label: 'B3 · Jedno wejście: propozycje jako dwie linie pod kompozytorem',
    short: 'B3 · Dwie linie',
    note: 'Jak B2, ale bez czipów i bez nagłówka: osobne małe pole pod polem odpowiedzi to dwie linie tekstu — „Tematy” z tytułami rozdzielonymi kropką i „Soczewki” z trzema intencjami. Ciche akcje tekstowe (jak „Dodaj do wpisu” w dymku), najniższy koszt wysokości, bez zwijania. Sprawdzamy, czy tekst bez chmur jest nadal czytelny jako coś do kliknięcia.',
  },
  {
    id: 'c',
    label: 'C · Tematy w nurcie rozmowy',
    short: 'C · W nurcie',
    note: 'Propozycje tematów to wiadomość w logu, nie przycisk: karta „Rozmowa” z czipami pojawia się tam, gdzie AI je zaproponowało (na starcie i po każdym „Zaproponuj tematy” z opcji), i przewija się razem z historią. Pole odpowiedzi jest gołe. Wcześniejsza rozmowa na górze logu. Bez osobnego czatu.',
  },
  {
    id: 'd',
    label: 'D · Tylko rozmowa (reszta w opcjach)',
    short: 'D · Tylko rozmowa',
    note: 'Między nagłówkiem a polem odpowiedzi są wyłącznie wiadomości. Propozycje tematów, wcześniejsza rozmowa i osobny czat mieszkają w arkuszu opcji pod zębatką — tam, gdzie już dziś są „Zaproponuj tematy” i „Rozpocznij od aktualnych danych”. Najcichszy panel, najniższa odkrywalność tematów.',
  },
]

export const states: { id: PanelState; label: string }[] = [
  { id: 'before', label: 'Przed rozmową · tematy zaproponowane' },
  { id: 'conversation', label: 'W rozmowie · 3 wiadomości' },
  { id: 'reset', label: 'Po „Rozpocznij od aktualnych danych” · jak na zrzucie' },
]

export const separateChatChoices: { id: SeparateChatChoice; label: string }[] = [
  { id: 'auto', label: 'Jak w wariancie' },
  { id: 'none', label: 'Brak' },
  { id: 'top', label: 'Chmura nad rozmową (jak dziś)' },
  { id: 'footer', label: 'Cichy wiersz pod polem' },
  { id: 'expand', label: 'Ikona „W całym oknie” w nagłówku' },
  { id: 'gear', label: 'W opcjach pod zębatką' },
]

const separateDefaults: Record<PanelVariant, SeparateChat> = {
  current: 'top',
  a: 'footer',
  b: 'none',
  b2: 'none',
  b3: 'none',
  c: 'none',
  d: 'gear',
}

export function separateChatFor(variant: PanelVariant, choice: SeparateChatChoice): SeparateChat {
  return choice === 'auto' ? separateDefaults[variant] : choice
}

export function archivePlaceFor(variant: PanelVariant): ArchivePlace {
  if (variant === 'current') return 'bottom'
  if (variant === 'd') return 'gear'
  return 'top'
}

export function topicsPlaceFor(variant: PanelVariant): TopicsPlace {
  switch (variant) {
    case 'current':
      return 'toggle'
    case 'a':
    case 'b':
      return 'composer-disc'
    case 'b2':
      return 'below-field'
    case 'b3':
      return 'below-lines'
    case 'c':
      return 'log-card'
    case 'd':
      return 'gear'
  }
}

/** „wiadomość” differs only in the singular; 2+ and 5+ share „wiadomości”. */
export function messageCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'wiadomość' : 'wiadomości'}`
}

export interface Topic {
  id: string
  title: string
  invitation: string
  sources: number
}

export const topics: Topic[] = [
  {
    id: 'waiting',
    title: 'Czekanie na test',
    invitation:
      'Co w tych kilku dniach czekania jest dla Ciebie najtrudniejsze: myśli o wyniku, poczucie bezczynności czy coś innego? Jak to czujesz w ciele?',
    sources: 1,
  },
  {
    id: 'nina',
    title: 'Rozmowa z Niną o projekcie',
    invitation:
      'Tydzień temu pisałeś, że gdy mówisz o pomysłach, przyspieszasz, a Nina milknie. Czy od tamtej rozmowy udało się zrobić choć jedną pauzę?',
    sources: 2,
  },
  {
    id: 'sleep',
    title: 'Sen i wieczorne przewijanie',
    invitation:
      'W trzech z ostatnich pięciu wieczorów zapisałeś „przewijanie do późna”. Co się dzieje tuż przed sięgnięciem po telefon?',
    sources: 3,
  },
  {
    id: 'walk',
    title: 'Co dał spacer bez telefonu',
    invitation:
      'Po sobotnim spacerze bez telefonu oceniłeś dzień na 4 z 5. Co z tego spaceru dałoby się przenieść do zwykłego wtorku?',
    sources: 1,
  },
]

export interface Lens {
  id: string
  label: string
  prompt: string
}

/** The intentions of the separate chat, rephrased as first messages in THIS conversation. */
export const lenses: Lens[] = [
  { id: 'perspective', label: 'Inna perspektywa', prompt: 'Spójrz na ten wpis z innej perspektywy niż moja.' },
  { id: 'steps', label: 'Konkretne kroki', prompt: 'Jakie konkretne kroki wynikają z tego wpisu?' },
  { id: 'traps', label: 'Pułapki myślenia', prompt: 'Czy w tym wpisie widać jakieś pułapki myślenia?' },
]

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  topicId?: string
  topicTitle?: string
  sources?: number
}

export interface Sample {
  archived: Message[]
  current: Message[]
  usedTopicIds: string[]
}

const invitation = (topic: Topic, id: string): Message => ({
  id,
  role: 'assistant',
  text: topic.invitation,
  topicId: topic.id,
  topicTitle: topic.title,
  sources: topic.sources,
})

const earlier: Message[] = [
  {
    id: 'e1',
    role: 'assistant',
    text: 'Piszesz o wyniku, który przyjdzie za kilka dni. Co w Tobie najbardziej domaga się uwagi, gdy o tym myślisz?',
    topicId: 'waiting',
    topicTitle: 'Czekanie na test',
    sources: 1,
  },
  { id: 'e2', role: 'user', text: 'Chyba strach, że to coś poważnego. I złość, że tak długo to trwa.' },
  {
    id: 'e3',
    role: 'assistant',
    text: 'Strach i złość często chodzą parami. Który z nich jest głośniejszy teraz, gdy to piszesz?',
  },
  { id: 'e4', role: 'user', text: 'Złość. Na siebie, że poszedłem tak późno.' },
  {
    id: 'e5',
    role: 'assistant',
    text: 'Zatrzymajmy się przy „tak późno”. Skąd wiesz, że późno? Czy ktoś Ci to powiedział, czy to Twoja ocena?',
  },
  { id: 'e6', role: 'user', text: 'Moja. Nikt tak nie mówił.' },
]

export function sampleFor(state: PanelState, archivedCount = 1): Sample {
  if (state === 'before') return { archived: [], current: [], usedTopicIds: [] }
  if (state === 'conversation')
    return {
      archived: [],
      current: [
        invitation(topics[0]!, 'c1'),
        {
          id: 'c2',
          role: 'user',
          text: 'Chyba bezczynność. Mam wrażenie, że powinienem coś robić, a nie ma nic do zrobienia.',
        },
        {
          id: 'c3',
          role: 'assistant',
          text: 'Zatrzymajmy się przy „powinienem”. Skąd znasz ten głos? Czy pojawia się też wtedy, gdy czekanie nie zależy od Ciebie?',
        },
      ],
      usedTopicIds: ['waiting'],
    }
  return {
    archived: earlier.slice(0, Math.max(0, Math.min(archivedCount, earlier.length))),
    current: [invitation(topics[0]!, 'r1')],
    usedTopicIds: ['waiting'],
  }
}

export interface Starter {
  kind: 'topic' | 'lens'
  id: string
  label: string
  hint: string
}

/** What the composer may offer as a next move: unused topics, and in B / B2 also the lenses. */
export function startersFor(variant: PanelVariant, usedTopicIds: string[]): Starter[] {
  const unused = topics
    .filter(t => !usedTopicIds.includes(t.id))
    .map<Starter>(t => ({ kind: 'topic', id: t.id, label: t.title, hint: t.invitation }))
  if (variant !== 'b' && variant !== 'b2' && variant !== 'b3') return unused
  return [...unused, ...lenses.map<Starter>(l => ({ kind: 'lens', id: l.id, label: l.label, hint: l.prompt }))]
}

/** Canned replies so the replica can answer a sent message. */
export function cannedReply(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('perspektyw'))
    return 'Spróbujmy: gdyby ktoś bliski napisał ten wpis, co zauważyłbyś w nim jako pierwsze — niepokój czy troskę o siebie?'
  if (lower.includes('krok'))
    return 'Z wpisu wynika jeden mały krok: dziś wieczorem zapisać, o której godzinie myśli o wyniku są najgłośniejsze. Czy to wykonalne?'
  if (lower.includes('pułapk'))
    return 'Widzę jedno „powinienem” i jedno „na pewno”. To kandydaci na pułapkę powinności i wróżenie. Który z nich brzmi dla Ciebie znajomo?'
  return 'Słyszę to. Co z tego, co napisałeś, jest najbardziej Twoje — a co jest raczej cudzym głosem?'
}

export interface Decision {
  id: string
  title: string
  body: string
}

export const decisions: Decision[] = [
  {
    id: 'D1',
    title: 'Chronologia: wcześniejsza rozmowa na górze, nie na dole',
    body: 'Log czatu czyta się z góry na dół. Zwinięte „Wcześniejsza rozmowa · N wiadomości” jako cichy wiersz NAD bieżącymi wiadomościami, a pod nim włoskowa linia „Nowy kontekst”. Rozwinięte wiadomości są przygaszone (AI ich nie widzi). Obecnie: <details> na dole, pod najnowszą wiadomością. Poprawka liczby: „1 wiadomość”.',
  },
  {
    id: 'D2',
    title: 'Tematy przy polu odpowiedzi, bo to „co dalej”, nie „co było”',
    body: 'Propozycje tematów to następny ruch, więc należą do kompozytora, nie do logu. A i B: dysk z żarówką po lewej pola otwiera rząd czipów nad polem (jak „+” w czatach); B dokłada do rzędu trzy soczewki. Stały rząd nad polem odpadł po pomiarze: tytuły tematów mieszczą się po dwa w linii, więc trzy czipy i „+N” zajmowały 64 px i dociążały kompozytor. B2 (runda 2, na życzenie): czipy w osobnym małym polu POD kompozytorem, żeby log i pole odpowiedzi stykały się bezpośrednio; pole zwija się do nagłówka; B3 to samo pole jako dwie linie tekstu „Tematy” / „Soczewki” bez czipów. C: karta z czipami jako wiadomość w logu. D: tylko w opcjach. Czip = tytuł, zaproszenie w dymku; klik od razu zaczyna temat (zaproszenie staje się pierwszą wiadomością AI, jak dziś po „Porozmawiaj o tym”).',
  },
  {
    id: 'D3',
    title: 'Osobny czat: jedno wejście albo jasna różnica',
    body: 'Dziś panel i osobny czat to dwie rozmowy o tym samym wpisie, bez nazwanej różnicy. Osobny czat daje tylko: intencję, pełny ekran i „Zapisz/Wyjdź”. Rekomendacja: B — intencje jako soczewki w tej rozmowie, osobny czat znika. Jeśli ma zostać: cichy wiersz pod polem (A) albo ikona „W całym oknie” w nagłówku — ale wtedy musi to być TA SAMA rozmowa na większej scenie, nie druga.',
  },
  {
    id: 'D4',
    title: 'Trzy strefy panelu',
    body: 'Nagłówek (tytuł + zębatka + ew. „W całym oknie”) · log (wcześniejsza rozmowa → nowy kontekst → wiadomości → stan „Analizuję…”) · kompozytor (startery → pole z wyślij → ew. cichy wiersz). Między logiem a kompozytorem nie leży żaden luźny tekst ani przycisk.',
  },
  {
    id: 'D5',
    title: 'Przed rozmową bez zmian',
    body: 'Lista tematów z zaproszeniami i „Porozmawiaj o tym” jako stan pusty panelu zostaje we wszystkich wariantach — to nie ona była problemem. Zmienia się tylko to, co dzieje się po pierwszej wiadomości.',
  },
  {
    id: 'D6',
    title: 'Poza zakresem',
    body: 'Dymki, zębatka, arkusz opcji, „Dodaj do wpisu”, źródła i AiActivity bez zmian; scena replikuje ich kształt. Usunięcie ChatView i zapisanych rozmów z historii to osobna decyzja produktowa — scena pokazuje tylko, jak panel wygląda bez tego wejścia.',
  },
]
