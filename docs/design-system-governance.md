# Design system — zasady i procesy utrzymania

Stan: propozycja z 2026-10-18 (sesja „3 propozycje design systemu”). Dokument
opisuje, JAK utrzymywać i rozwijać design system niezależnie od tego, która
propozycja wizualna (Cirrus / Stratus / Cumulus — `ideas/html-plans/2026-10-18-design-system-proposals.html`)
zostanie wybrana. Źródło prawdy dla wartości tokenów i anatomii pozostaje
`src/design-system/README.md`; ten dokument jest źródłem prawdy dla PROCESU.

## 1. Po co i co obejmuje

Cel: jeden język wizualny (lekkość błękitnego nieba z puszystymi chmurkami)
w każdym widoku, przy minimalnym koszcie dodawania nowych funkcji.

W zakresie: tokeny (kolor, typografia, odstępy, kształt, głębia, ruch,
fokus, warstwy), anatomie (`.mg-v2-*`), komponenty (`Ds*`, `App*`),
szablony stron (PageContainer/PageHeader, ExercisePage, QuietRitualShell,
DsWizardShell, MicroExerciseRunner), reguły treści (eyebrow/tytuł/meta,
liczby w tooltipach), dostępność, ikony Organic Outline B.

Poza zakresem: logika domenowa, kopie tekstów, kolory danych domenowych
(ćwiartki emocji, części IFS) — te mają WŁASNE tokeny semantyczne, ale ich
dobór jest decyzją domeny, nie systemu.

## 2. Architektura warstw (jak w W3C Design Tokens / Style Dictionary)

```
prymitywy      --sky-100 … --sky-800, --rose-*, --lav-*, --mint-*, --amber-*   (src/styles/tokens.css)
   ↓ motyw (data-theme) nadpisuje TYLKO prymitywy
semantyka      --mg-color-canvas/surface/mist/paper/ink/muted/primary(-strong/-fill)/border/field-border
               --mg-font-size-xs…2xl, --mg-weight-body/label/title, --mg-space-*, --mg-radius-*, --mg-shadow-*
   ↓ anatomie czytają wyłącznie semantykę
anatomie       .mg-v2-surface / -button / -pill / -field / -tile / -icon-board / -page-head / -section-head / -stepper …
   ↓ komponenty renderują anatomie, nie własne style
komponenty     DsButton, DsField, DsSurface, DsSegmentedControl, AppCard, AppButton, AppDialog, PageHeader …
   ↓ widoki składają komponenty + szablony
widoki         bez kolorów, cieni, promieni, font-family, rozmiarów fontu w <style scoped>
```

Reguły nazewnictwa:
- token semantyczny: `--mg-<kategoria>-<rola>[-<odmiana>][-<stan>]`, np. `--mg-color-primary-fill-hover`;
- token komponentowy (rzadko, tylko dla cieni pochodnych): `--mg-<komponent>-<rola>`, np. `--mg-shadow-egp-raise`;
- anatomia: `.mg-v2-<blok>[__element][--modyfikator]` (BEM);
- nie dodajemy nowej kategorii bez wpisu w słowniku (§9).

Motywy (Aktualny / Mgła Nieba / Chmura Wschodu) żyją wyłącznie na warstwie
prymitywów. Jeżeli motyw potrzebuje zmiany semantyki (np. innego cienia),
to sygnał, że semantyka ma za mało ról, a nie powód do nadpisywania `.mg-*`.

## 3. Zasady projektowe (niezmienne, niezależne od propozycji)

1. **Drabinka tonalna, jeden kierunek głębi.** Niebo (strona) → karta →
   mgła (pole/chip) → papier (wnętrze/hover). Im głębiej, tym bielej; nigdy
   z powrotem w niebieski, nigdy do czystej bieli (średnia kanału ≥ 249 =
   błąd `whitescan`).
2. **Jedna rodzina cieni.** Karta pierwszego poziomu ma cień; zagnieżdżona
   nie. Wklęsłość tylko dla kontrolek (segment, stan wciśnięty, check).
3. **Jedna skala typografii.** Sześć rozmiarów (xs/sm/md/lg/xl/2xl), trzy
   wagi (body/label/title), jedna rodzina (Nunito). Zakaz `text-[Npx]`,
   zakaz rozmiarów < xs poza etykietami wykresów (osobny token `--mg-font-size-chart`).
4. **Dwa atramenty + jeden akcent.** `ink` (treść), `muted` (meta),
   `primary-strong` (interaktywne etykiety). Statusy: rose (źle/termin),
   good, warn — zawsze z tekstem lub ikoną, nigdy sam kolor.
5. **Kształt = rola.** Nośnik pojedynczej ikony = koło organiczne; karta =
   `radius-lg`; pole = `radius-sm`; przycisk = `radius-button`; chip = pigułka;
   słupki/panele ilustracyjne = `radius-sketch`. Żadnych ręcznych promieni.
6. **Kolory danych z jednej drabinki.** Wykresy: `data-fill`, `state`,
   `state-soft`, `effort-fill`, linie `sky-800`. Ćwiartki emocji i części
   IFS mają własne tokeny semantyczne w pastelach tych samych rodzin.
7. **Mało słów, zero liczb na wierzchu.** Eyebrow + tytuł + jedna akcja;
   liczby i ułamki do tooltipów/aria, chyba że są celem widoku (Σ w rytmie).
8. **Dostępność jak w WCAG 2.2 AA.** Tekst ≥ 4,5:1, elementy UI ≥ 3:1,
   `:focus-visible` wszędzie, `prefers-reduced-motion`, nazwa dostępna
   dla każdej akcji bez tekstu. Wyjątek świadomy: biała etykieta na
   `primary-fill` (~3,3:1) — tylko na przyciskach ≥ 13 px / wadze label.
9. **Desktop 1512 × 982 @2x to jedyny sędzia.** Każda decyzja wizualna jest
   oceniana na zrzutach żywych widoków w tym oknie, nie na mockupach.

## 4. Co wolno, czego nie wolno (egzekwowane automatycznie)

| Warstwa | Wolno | Nie wolno |
| --- | --- | --- |
| widok (`src/views`, `src/features`, `src/components/**`) | klasy anatomii, komponenty, `var(--mg-*)`, układ (grid/flex/gap/padding z `--mg-space-*`) | `#hex`, `rgb()`, `box-shadow` literalny, `font-family`, `font-size` w px/rem, `border-radius` literalny, klasy `neo-*`, `rounded-*`/`shadow-*`/`text-[…]` Tailwinda |
| anatomia (`base.css`) | tylko `var(--mg-*)`; stany hover/focus/pressed/disabled/selected | wartości literalne, selektory per widok |
| semantyka (`design-system/tokens.css`) | `rgb(var(--sky-*))`, `color-mix` na prymitywach | nowe hexy |
| prymitywy (`styles/tokens.css`) | triplety RGB w skalach 50–800 | wartości poza skalą („jednorazowy błękit”) |
| adaptery (`adapters.css`) | tymczasowe mostki `neo-*` → `mg-v2-*` z datą i właścicielem | nowe konsumenty mostków |

Strażnik `scripts/check-design-system.mjs` rozszerzamy z listy `guardedRoots`
na CAŁE `src/` w trzech krokach (§6, kamień K2), dodając do reguł:
`font-size` literalny, `border-radius` literalny, `rounded-*` i `shadow-*`
Tailwinda poza `rounded-full`, `text-[…]`. Każdy wyjątek = wpis w
`exemptPaths` z komentarzem „dlaczego” i terminem.

## 5. Procesy

### 5.1 Zmiana tokenu (wartości lub roli)

1. Zapis decyzji (3–8 zdań) w `docs/design-decisions.md`: kontekst, decyzja,
   konsekwencje, data. To jedyny log; README opisuje stan, log — powód.
2. Wpływ: `node ideas/design-system-2026-10/capture.mjs --tag <nazwa> --lite --style <nakładka>`
   + `node ideas/design-system-2026-10/analyze.mjs <nazwa>` — zrzuty
   1512 × 982 @2x i spis rozkładu wartości. Porównanie z `baseline`.
3. Kontrast: dla zmienionych par tekst/tło policzyć WCAG (skrypt
   `analyze.mjs --contrast` — do dodania w K1).
4. Wdrożenie w tokenach, nigdy w widoku. Jeżeli widok „potrzebuje innego”,
   dodaje się rolę semantyczną, nie wartość lokalną.

### 5.2 Nowy wzorzec / komponent („reguła dwóch”)

- Wzorzec trafia do systemu, gdy ma ≥ 2 realnych konsumentów albo jest
  szablonem strony. Do tego czasu żyje w feature na tokenach.
- Definition of Done komponentu:
  1. anatomia w `base.css` (sam CSS, bez Vue) + komponent `Ds*`/`App*`;
  2. komplet stanów: default / hover / focus-visible / pressed / selected /
     disabled / loading (jeśli dotyczy) / error (pola);
  3. a11y: rola, nazwa, klawiatura, `aria-*` dla stanu;
  4. wpis w README (anatomia, kiedy używać, czego nie robić) + wpis w
     galerii `/dev/design` (K3);
  5. test jednostkowy renderowania wariantów + wpis w `contracts.ts`;
  6. brak literałów (strażnik zielony).

### 5.3 Nowy widok

Szablon obowiązkowy: `PageContainer` (reading/default/wide/focus) +
`PageHeader`; ćwiczenie = `ExercisePage` lub `MicroExerciseRunner`; rytuał =
`QuietRitualShell`; kreator = `DsWizardShell` / `ExerciseStepper`.
Przed PR: zrzut na 5199 w kanonicznym oknie i porównanie z sąsiednim
widokiem tej samej rodziny (np. nowy kreator obok Zapisu myśli).

### 5.4 Deprecjacja

1. Oznaczyć w README sekcją „Wycofywane” (nazwa, zastępnik, data, liczba
   konsumentów z `grep -rl`).
2. Mostek w `adapters.css` (jeśli trzeba), by stare konsumenty wyglądały
   jak nowe.
3. Migracja konsumentów partiami (po rodzinach widoków), każda partia =
   osobny commit + zrzuty.
4. Usunięcie klasy/komponentu i mostka, gdy `grep` zwraca 0.
Aktualna lista do wycofania: rodzina `neo-*` w `main.css` (157 plików
używa, 54 klasy), utility `shadow-neu-*` z Tailwinda, symetryczne
`rounded-2xl/3xl` na kartach, `font-black`/900, rozmiary `text-[9px]`.

### 5.5 Przegląd (review) zmian UI

Checklista recenzenta (człowiek lub Codex/Claude):
- [ ] zrzut przed/po w 1512 × 982 @2x, ten sam stan danych (seed);
- [ ] `npm run check:design-system` zielony, zero nowych wyjątków;
- [ ] `whitescan` bez nowych trafień;
- [ ] census: liczba odrębnych rozmiarów fontu / promieni / cieni na
      zmienionych trasach nie wzrosła;
- [ ] każdy nowy kolor ma rolę semantyczną i wpis w decyzjach;
- [ ] stany komponentu kompletne; fokus widoczny;
- [ ] teksty PL (format dat przez `Intl` z locale aplikacji — dziś część
      widoków pokazuje „Today, 11:00 AM”).

## 6. Bramki jakości i kamienie milowe

| Bramka | Narzędzie | Próg |
| --- | --- | --- |
| typy i testy | `npx vue-tsc --noEmit`, `npx vitest run` | 0 błędów |
| literały | `scripts/check-design-system.mjs` | 0 naruszeń w `guardedRoots` |
| biel | `whitescan` (z `capture.mjs` — flaga `--white`, K1) | 0 elementów ≥ 249 poza akcentami |
| rozproszenie | `analyze.mjs` na `--lite` | ≤ 8 rozmiarów fontu, ≤ 3 wagi, ≤ 12 promieni, ≤ 6 cieni, ≤ 12 kolorów tekstu |
| kontrast | `analyze.mjs --contrast` (K1) | 100 % par ≥ 4,5:1 (tekst), ≥ 3:1 (UI) |
| regresja wizualna | Playwright `toHaveScreenshot` na 12 złotych trasach, 1512 × 982 @2x (K2) | diff ≤ 0,2 % pikseli |

Kamienie:
- **K0 (teraz):** baseline zrzutów i census zapisane (`ideas/design-system-2026-10/shots/baseline`).
- **K1 (tydzień 1):** wybór propozycji; tokeny i mostki wdrożone w
  `tokens.css`/`base.css`/`adapters.css`; `--contrast` i `--white` w
  analizatorze; census ≤ progów na trasach `--lite`.
- **K2 (tygodnie 2–4):** strażnik na całym `src/`; złote zrzuty; migracja
  `neo-*` rodzinami (ćwiczenia → profil/historia → czat/logowanie).
- **K3 (miesiąc 2):** galeria `/dev/design` (anatomie + tokeny + stany,
  tylko DEV); usunięcie `neo-*` z `main.css`; README = pełna dokumentacja.
- **K4 (stale):** przegląd kwartalny (§7).

## 7. Rytm

- **Każdy commit UI:** checklista §5.5.
- **Co tydzień (sesja agenta):** `capture --lite` + `analyze` na `main`;
  różnice względem poprzedniego tygodnia do `docs/backlog.md`.
- **Co kwartał:** audyt tokenów (nieużywane → usunąć; `grep -rho "var(--mg-[a-z-]*)" | sort | uniq -c`),
  przegląd decyzji, aktualizacja progów §6 w dół.

## 8. Role i narzędzia

Jeden właściciel (użytkownik) podejmuje decyzje wizualne; agenci (Claude,
Codex) wykonują zmiany i dowodzą ich zrzutami. Zasady dla agentów do
wpięcia w `CLAUDE.md` po akceptacji:
- przed stylowaniem: przeczytaj `src/design-system/README.md`, użyj
  anatomii; literał = błąd;
- po stylowaniu: `check:design-system`, zrzut 1512 × 982 @2x, census;
- nie wprowadzaj wariantu „na ten jeden widok” — zaproponuj rolę tokenu.

## 9. Słownik

canvas — tło strony (niebo) · surface — karta, jedyny poziom z cieniem ·
mist — pole/chip (mgła) · paper — wnętrze/hover (papier) · ink — atrament
treści · muted — atrament meta · primary / primary-strong / primary-fill —
akcent / etykieta interaktywna / wypełnienie akcji głównej · raised /
raised-sm — cień karty / cień nakładki lub kontrolki · inset — wklęsłość
kontrolki · organic — koło organiczne (ikony) · sketch — szkicowany
prostokąt (słupki) · eyebrow — mała nagłówkowa etykieta nad tytułem · meta —
cicha linia faktów pod tytułem · tile — płytka katalogu / Dzisiaj.

## 10. Odniesienia do praktyk rynkowych

- W3C Design Tokens Community Group — format tokenów i warstwy
  (prymityw → semantyka → komponent); Style Dictionary jako ewentualny
  build JSON → CSS, gdy tokeny będą potrzebne poza CSS (wykresy w JS).
- Brad Frost, *Atomic Design* — reguła „wzorzec po dwóch użyciach”.
- Nathan Curtis (EightShapes) — modele wkładu, deprecjacja, wersjonowanie.
- WCAG 2.2 AA — kontrast, fokus, ruch.
- Chromatic / Playwright `toHaveScreenshot` — regresja wizualna na
  kanonicznym oknie.
- ADR (Architecture Decision Records) — lekki log decyzji zamiast
  przepisywania README.
