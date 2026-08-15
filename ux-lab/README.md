# Mindful Growth UX Lab

Samodzielny, lokalny workbench do badania i prototypowania UI/UX obok kanonicznego środowiska `dev:verify`.

## Uruchomienie

Z katalogu głównego uruchom `npm run dev:lab`. Verify otworzy się na porcie 5199, a Lab na 5201. `npm run dev:verify` i `npm run dev:lab:ui` pozwalają uruchomić serwery osobno.

`Ctrl+C` zatrzymuje oba serwery. Konflikt któregokolwiek portu kończy cały launcher z czytelnym błędem.

## Zawartość

- **Research** — zrzuty aktualnej aplikacji, przypięte adnotacje, luki modelu i wzorce zewnętrzne.
- **Mapa systemu** — interaktywna pętla: priorytet → mapa wsparcia → obiekty → Dzisiaj → refleksja → korekta.
- **Kreator priorytetu** — klikalny rytuał od znaczenia po utworzenie wybranych obiektów.
- **Hub priorytetu** — jakościowy progres, relacje wiele-do-wielu, dowody, miesięczne refleksje i coroczne potwierdzenie.
- **Widoki do pracy** — Dzisiaj, tydzień, miesiąc i rok oraz kompletne rytuały planowania/refleksji tygodniowej i miesięcznej. Wariant `sketchbook-v1` spina je jednym językiem wizualnym i progresywnym detalem.
- **Jak rozwijać Lab** — instrukcja dodawania kolejnych scenariuszy.

## Jak dodać kolejny eksperyment

1. Dodaj komponent eksperymentu w `app/src/experiments/`.
2. Zarejestruj wariant w `app/src/lab/registry.ts`.
3. Dodaj notatki UX w `app/src/lab/content.ts`.
4. Dołącz zrzuty do `app/public/research/`, jeżeli eksperyment opiera się na aktualnym UI.
5. Przetestuj główną ścieżkę i wszystkie viewporty zadeklarowane w zakresie eksperymentu, a wynik zapisz w `app/design-qa.md`.

Pełnoekranowy podgląd repliki ma postać `/preview/:viewId/:variantId/:presetId`; parametr `?viewport=mobile` ogranicza scenariusz do 390 px. Jest to również stabilna powierzchnia do automatycznych zrzutów.

## Kontrole przed przekazaniem

Z katalogu `ux-lab/app` uruchom:

```bash
npm run test
npm run build
```

Build automatycznie sprawdza granice importów przed typecheckiem i bundlowaniem.

## Granice izolacji

- Lab importuje tylko statyczne tokeny, czyste narzędzia i allowlistę prezentacyjnych komponentów Vue.
- Dane pochodzą z tego samego dev-only profilu `rich-v1`, który zasila verify, ale stan eksperymentu pozostaje w pamięci Labu.
- Repozytoria, store'y domenowe, Dexie i pełne widoki produktu są zabronione.
- Zrzuty są dowodami badawczymi, nie zależnością wykonawczą produktu.
- Każdy scenariusz powinien działać jako niezależny eksperyment w jednej wspólnej powłoce.

## Najważniejsza decyzja domenowa

Powiązanie obiektu z priorytetem jest osobnym bytem znaczeniowym. Docelowo powinno przechowywać co najmniej rolę, opis wkładu, oczekiwany sygnał, status i historię obowiązywania. Samo `priorityIds[]` nie wystarcza.
