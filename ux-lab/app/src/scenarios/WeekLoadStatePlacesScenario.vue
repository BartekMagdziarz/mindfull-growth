<template>
  <section class="scenario-page concept-page lsp-page">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · refleksja tygodniowa · część 2</span>
        <h1>Wstęga w miejscu · gdzie naprawdę ją pokażemy</h1>
        <p>
          Ta sama wstęga (przejścia płynne, decyzja 20.09) osadzona w replikach czterech powierzchni produktu, w ich
          własnych stylach: tabela kalendarza rytmu, podsumowanie okresu, krok obszaru w refleksji tygodnia i kontekst
          dziennika w refleksji miesiąca. Dane to końcówka „opowieści” 24 tygodni: sierpień 2026 jako miesiąc,
          7–13 września jako bieżący tydzień.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Koncepcja · nie baseline</span>
    </header>

    <!-- A · Kalendarz rytmu ---------------------------------------------- -->
    <section class="lsp-block">
      <header class="lsp-block__head">
        <div>
          <span class="lab-eyebrow">A · Kalendarz rytmu</span>
          <h2>Tabela „Oceny tygodni”: cztery wiersze obszarów zamiast jednego wiersza par</h2>
          <p>
            Dziś spojrzenie „Oceny” ma jeden wiersz z czterema parami słupków w każdej komórce (pierwsza tabela).
            Ze wstęgą każdy obszar dostaje własny wiersz, a wstęga rozciąga się przez komórki tygodni tak samo jak
            linie serii liczbowych. Klik w tydzień nadal robi zoom. W skali roku wstęga zaczyna się tam, gdzie zaczynają
            się refleksje.
          </p>
        </div>
        <ul class="lsp-block__notes">
          <li>Wysokość wiersza wstęgi ≈ wiersza wykresu serii (104px), więc tabela nie zmienia rytmu.</li>
          <li>Papier w linie wstęgi jest bledszy niż linie tabeli; nazwy obszarów w tej samej kolumnie co serie.</li>
          <li>Rok: 12 kolumn miesięcy, wstęga przez kwiecień–wrzesień; wiersze wyższe (110px), bo 24 tygodnie w sześciu kolumnach potrzebują amplitudy. Przed kwietniem brak refleksji, po wrześniu przyszłość.</li>
        </ul>
      </header>

      <div class="cp mg-design-v2 lsp-frame">
        <p class="lsp-frame__cap">Miesiąc · sierpień 2026 · <b>dziś</b> (jeden wiersz par)</p>
        <div class="rb-board" style="--cols: 5; --sigma: 0px">
          <div class="rb-row rb-axis">
            <span class="rb-view"><AppIcon name="table_rows" class="rb-view__icon" /><span class="rb-view__text">Oceny tygodni</span><AppIcon name="expand_more" class="rb-view__chev" /></span>
            <span class="rb-axis__track" aria-hidden="true" />
            <button v-for="(w, i) in monthUnits" :key="w.ref" type="button" class="rb-axis__unit" :class="{ current: i === 4 }"><span>{{ w.label }}</span><strong>{{ w.sub }}</strong></button>
          </div>
          <section class="rb-cloud">
            <div class="rb-row rb-series rb-series--ratings">
              <span class="rb-name rb-name--series">Tygodnie<small> · Wysiłek i Stan</small></span>
              <div class="rb-series__cells" style="--cols: 5">
                <button v-for="(w, i) in monthUnits" :key="w.ref" type="button" class="rb-cell rb-cell--series">
                  <span class="lsp-mini">
                    <span v-for="a in AREA_KEYS" :key="a" class="lsp-mini__pair"><i class="e" :style="{ height: `${(monthPoints(a)[i].load ?? 0) * 20}%` }" /><i class="s" :style="{ height: `${(monthPoints(a)[i].state ?? 0) * 20}%` }" /></span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="cp mg-design-v2 lsp-frame">
        <p class="lsp-frame__cap">Miesiąc · sierpień 2026 · <b>ze wstęgą</b></p>
        <div class="rb-board" style="--cols: 5; --sigma: 0px">
          <div class="rb-row rb-axis">
            <span class="rb-view"><AppIcon name="table_rows" class="rb-view__icon" /><span class="rb-view__text">Oceny tygodni</span><AppIcon name="expand_more" class="rb-view__chev" /></span>
            <span class="rb-axis__track" aria-hidden="true" />
            <button v-for="(w, i) in monthUnits" :key="w.ref" type="button" class="rb-axis__unit" :class="{ current: i === 4 }"><span>{{ w.label }}</span><strong>{{ w.sub }}</strong></button>
          </div>
          <section class="rb-cloud">
            <div v-for="a in AREA_KEYS" :key="a" class="rb-row rb-series rb-series--plot">
              <span class="rb-name rb-name--series"><AppIcon :name="AREA_ICONS[a]" class="rb-name__icon rb-name__icon--small" /><span class="rb-name__text">{{ AREA_LABELS[a] }}<small> · obciążenie i stan</small></span></span>
              <div class="rb-series__cells lsp-ribbon-cells" style="--cols: 5">
                <button v-for="w in monthUnits" :key="w.ref" type="button" class="rb-cell rb-cell--series" :aria-label="`${AREA_LABELS[a]}, ${w.label} ${w.sub}`" />
                <div class="lsp-ribbon-layer"><LoadStateRibbon :points="monthPoints(a)" :label="AREA_LABELS[a]" :height="92" transition="smooth" /></div>
              </div>
            </div>
            <div class="rb-row rb-note"><span><i class="lsp-key lsp-key--load" /> obciążenie <i class="lsp-key lsp-key--state" /> stan · kolor = ćwiartka tygodnia</span></div>
          </section>
        </div>
      </div>

      <div class="cp mg-design-v2 lsp-frame">
        <p class="lsp-frame__cap">Rok · 2026 · <b>ze wstęgą</b></p>
        <div class="rb-board rb-board--year" style="--cols: 12; --sigma: 0px">
          <div class="rb-row rb-axis">
            <span class="rb-view"><AppIcon name="table_rows" class="rb-view__icon" /><span class="rb-view__text">Oceny tygodni</span><AppIcon name="expand_more" class="rb-view__chev" /></span>
            <span class="rb-axis__track" aria-hidden="true" />
            <button v-for="(m, i) in MONTHS" :key="m" type="button" class="rb-axis__unit" :class="{ current: i === 8, future: i > 8 }"><span>{{ m }}</span></button>
          </div>
          <section class="rb-cloud">
            <div v-for="a in AREA_KEYS" :key="a" class="rb-row rb-series rb-series--plot">
              <span class="rb-name rb-name--series"><AppIcon :name="AREA_ICONS[a]" class="rb-name__icon rb-name__icon--small" /><span class="rb-name__text">{{ AREA_LABELS[a] }}</span></span>
              <div class="rb-series__cells lsp-ribbon-cells" style="--cols: 12">
                <button v-for="(m, i) in MONTHS" :key="m" type="button" class="rb-cell rb-cell--series" :class="{ future: i > 8 }" :aria-label="`${AREA_LABELS[a]}, ${m}`" />
                <div class="lsp-ribbon-layer" style="grid-column: 4 / span 6"><LoadStateRibbon :points="series[a]" :label="AREA_LABELS[a]" :height="110" transition="smooth" /></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <!-- B · Podsumowanie okresu ------------------------------------------- -->
    <section class="lsp-block">
      <header class="lsp-block__head">
        <div>
          <span class="lab-eyebrow">B · Podsumowanie okresu</span>
          <h2>Karta „Ocena” nad tabelą: miesiąc pokazuje tygodnie, tydzień pokazuje ogon</h2>
          <p>
            Wysokość zdobywamy zamianą proporcji: karta oceny bierze szerszą kolumnę (dotąd miały ją kafle rodzin),
            a w środku dzieli się na słupki po lewej i cztery wstęgi jako małe multiplikacje 2 × 2 po prawej,
            każda ~58px wysokości i ~300px szerokości. Miesiąc: kompas + tygodnie miesiąca. Tydzień: pary
            obciążenie·stan + ostatnie 12 tygodni. Kafle rodzin ściskają się do węższej kolumny, nie tracąc treści.
          </p>
        </div>
        <ul class="lsp-block__notes">
          <li>Wstęgi w karcie są bez tooltipów; oś tygodni tylko pod dolnym rzędem multiplikacji. Szczegóły są w tabeli po kliknięciu „pokaż w tabeli”.</li>
          <li>Karta oceny nie rośnie w pionie (~200px jak dziś), rośnie w poziomie: 1.7fr zamiast 1fr. Kafle rodzin: 2 × 2 w 1fr, minimalna szerokość kafla ~240px.</li>
          <li>Rating-first zostaje spełnione dosłownie: ocena okresu jest największym elementem karty.</li>
        </ul>
      </header>

      <div class="cp mg-design-v2 lsp-frame">
        <p class="lsp-frame__cap">Miesiąc · sierpień 2026</p>
        <section class="ps">
          <header class="ps__head">
            <div class="ps__focus">
              <span class="ps__eyebrow">Fokus miesiąca</span>
              <button type="button" class="ps__chip"><span class="ps__orb"><AppIcon name="self_improvement" /></span><span>Spokojne ciało</span></button>
              <button type="button" class="ps__chip"><span class="ps__orb"><AppIcon name="diversity_1" /></span><span>Czas z bliskimi</span></button>
            </div>
            <div class="ps__actions">
              <button type="button" class="cp-btn"><AppIcon name="edit_calendar" />Podsumuj miesiąc</button>
              <button type="button" class="cp-btn cp-btn--quiet">Więcej<AppIcon name="expand_more" /></button>
            </div>
          </header>
          <div class="ps__grid ps__grid--wide-hero">
            <div class="ps__hero lsp-hero--split">
              <span class="ps__eyebrow">Ocena miesiąca</span>
              <button type="button" class="ps__drill" aria-label="Pokaż w tabeli"><AppIcon name="table_rows" /></button>
              <div class="lsp-hero__cols">
                <ul class="ps__bars" aria-label="Kompas">
                  <li v-for="c in COMPASS" :key="c.label"><span class="ps__col"><i class="s" :style="{ height: `${c.value * 20}%` }"><b>{{ c.value }}</b></i></span><small>{{ c.label }}</small></li>
                </ul>
                <div class="lsp-multiples">
                  <span class="ps__eyebrow lsp-multiples__cap">Tygodnie · obciążenie i stan</span>
                  <div v-for="a in AREA_KEYS" :key="a" class="lsp-multiples__cell">
                    <span><AppIcon :name="AREA_ICONS[a]" />{{ AREA_LABELS[a] }}</span>
                    <LoadStateRibbon :points="monthPoints(a)" :label="AREA_LABELS[a]" :height="58" transition="smooth" :show-axis="a === 'tasks' || a === 'closeOnes'" class="lsp-ribbon--quiet" />
                  </div>
                </div>
              </div>
            </div>
            <ul class="ps__fam">
              <li v-for="f in FAMILIES" :key="f.label" class="ps__tile" :style="{ '--fill': `${f.pct}%` }"><span class="ps__tile-label">{{ f.label }}</span><span class="ps__pct">{{ f.pct }}<span>%</span></span><i class="ps__blob" /></li>
            </ul>
          </div>
        </section>
      </div>

      <div class="cp mg-design-v2 lsp-frame">
        <p class="lsp-frame__cap">Tydzień · 7–13 września 2026</p>
        <section class="ps">
          <header class="ps__head">
            <div class="ps__focus">
              <span class="ps__eyebrow">Fokus tygodnia</span>
              <button type="button" class="ps__chip"><span class="ps__orb"><AppIcon name="directions_run" /></span><span>3 biegi</span></button>
              <button type="button" class="ps__chip"><span class="ps__orb"><AppIcon name="menu_book" /></span><span>Czytanie wieczorem</span></button>
              <button type="button" class="ps__chip"><span class="ps__orb"><AppIcon name="call" /></span><span>Telefon do mamy</span></button>
            </div>
            <div class="ps__actions">
              <button type="button" class="cp-btn"><AppIcon name="rate_review" />Podsumuj tydzień</button>
              <button type="button" class="cp-btn cp-btn--quiet">Więcej<AppIcon name="expand_more" /></button>
            </div>
          </header>
          <div class="ps__grid ps__grid--wide-hero">
            <div class="ps__hero lsp-hero--split">
              <span class="ps__eyebrow">Ocena tygodnia</span>
              <div class="lsp-hero__cols">
                <ul class="ps__bars ps__bars--pairs" aria-label="Obciążenie i stan per obszar">
                  <li v-for="a in AREA_KEYS" :key="a">
                    <span class="ps__col">
                      <i class="l" :style="{ height: `${(lastPoint(a).load ?? 0) * 20}%` }"><b>{{ lastPoint(a).load }}</b></i>
                      <i class="s" :style="{ height: `${(lastPoint(a).state ?? 0) * 20}%`, background: pairColor(lastPoint(a).load, lastPoint(a).state) }"><b>{{ lastPoint(a).state }}</b></i>
                    </span>
                    <small>{{ AREA_LABELS[a] }}</small>
                  </li>
                </ul>
                <div class="lsp-multiples">
                  <span class="ps__eyebrow lsp-multiples__cap">Ostatnie 12 tygodni</span>
                  <div v-for="a in AREA_KEYS" :key="a" class="lsp-multiples__cell">
                    <span><AppIcon :name="AREA_ICONS[a]" />{{ AREA_LABELS[a] }}</span>
                    <LoadStateRibbon :points="series[a].slice(-12)" :label="AREA_LABELS[a]" :height="58" transition="smooth" :show-axis="a === 'tasks' || a === 'closeOnes'" class="lsp-ribbon--quiet" />
                  </div>
                </div>
              </div>
            </div>
            <ul class="ps__fam">
              <li v-for="f in FAMILIES_WEEK" :key="f.label" class="ps__tile" :style="{ '--fill': `${f.pct}%` }"><span class="ps__tile-label">{{ f.label }}</span><span class="ps__pct">{{ f.pct }}<span>%</span></span><i class="ps__blob" /></li>
            </ul>
          </div>
        </section>
      </div>
    </section>

    <!-- C · Refleksja tygodnia · krok obszaru ------------------------------ -->
    <section class="lsp-block">
      <header class="lsp-block__head">
        <div>
          <span class="lab-eyebrow">C · Cichy rytuał · refleksja tygodnia</span>
          <h2>Krok „Ciało”: dwa słupki oceny i ogon dziesięciu tygodni</h2>
          <p>
            Prawdziwe słupki produktu (QuietRatingBar) z osiami Obciążenie i Stan; słupek stanu barwi się kolorem
            ćwiartki po obu ocenach. Wstęga to kontekst, nie kontrolka: ostatnie 10 tygodni tego obszaru, bieżący tydzień
            dorysowuje się na końcu po ocenie. Dwa układy: wstęga nad słupkami (C1) albo jako trzecia karta obok (C2).
            Kliknij w słupki, żeby zobaczyć, jak końcówka wstęgi reaguje.
          </p>
        </div>
        <ul class="lsp-block__notes">
          <li>Wstęga zastępuje „ducha” poprzedniego tygodnia: ostatni punkt historii mówi to samo, tylko z kontekstem.</li>
          <li>C1 trzyma szerokość kroku 760px i dodaje ~130px wysokości; C2 rozszerza krok do ~1040px, słupki się nie przesuwają.</li>
          <li>W C2 karta wstęgi ma ten sam papier co słupki (pole), więc czyta się jako trzeci „słupek” kontekstu.</li>
        </ul>
      </header>

      <div class="lsp-frame lsp-frame--ritual">
        <p class="lsp-frame__cap">C1 · wstęga nad słupkami</p>
        <div class="quiet-ritual mg-design-v2 lsp-ritual">
          <header class="qr-top">
            <button type="button" class="qr-icon" aria-label="Zamknij rytuał"><AppIcon name="close" /></button>
            <span>Refleksja tygodnia <b>·</b> 7–13 września</span>
            <span class="qr-save" role="status"><AppIcon name="check" />Zapisano</span>
          </header>
          <main class="qr-card">
            <header class="qr-heading"><h1>Jak było z ciałem?</h1></header>
            <section class="qr-ratings">
              <div class="lsp-tail-well">
                <header><AppIcon name="accessibility_new" /><span>Ciało · ostatnie 10 tygodni</span><small>{{ tailHint }}</small></header>
                <LoadStateRibbon :points="ritualPoints" label="Ciało" :height="84" show-axis transition="smooth" />
              </div>
              <div class="qr-bars">
                <div class="lsp-load"><QuietRatingBar v-model="live.load" label="Obciążenie" hint="Trening, choroba, krótkie noce, podróż — ile ciało ode mnie wymagało." high-label="Ciężko" low-label="Lekko" /></div>
                <div class="lsp-state" :style="{ '--lsp-pair': livePair }"><QuietRatingBar v-model="live.state" label="Stan" hint="Energia, sen, brak kontuzji — jak ciało czuje się na koniec tygodnia." high-label="Bardzo dobry" low-label="Bardzo słaby" /></div>
              </div>
              <div class="qr-tags">
                <h2><AppIcon name="sell" />Tagi<span> · 2</span></h2>
                <ul class="qr-tag-list"><li><span>krótkie noce</span><button type="button" aria-label="Usuń tag"><AppIcon name="close" /></button></li><li><span>bieg</span><button type="button" aria-label="Usuń tag"><AppIcon name="close" /></button></li></ul>
              </div>
            </section>
            <footer class="qr-footer">
              <button type="button" class="qr-icon qr-arrow" aria-label="Poprzedni krok"><AppIcon name="arrow_back" /></button>
              <nav aria-label="Etapy rytuału"><div class="qr-progress"><button v-for="n in 7" :key="n" type="button" :class="{ active: n === 2 }"><i /></button></div><span>2/7 · Ciało</span></nav>
              <button type="button" class="qr-icon qr-arrow qr-arrow--next" aria-label="Następny krok"><AppIcon name="arrow_forward" /></button>
            </footer>
          </main>
        </div>
      </div>

      <div class="lsp-frame lsp-frame--ritual">
        <p class="lsp-frame__cap">C2 · wstęga jako trzecia karta obok słupków</p>
        <div class="quiet-ritual mg-design-v2 lsp-ritual">
          <header class="qr-top">
            <button type="button" class="qr-icon" aria-label="Zamknij rytuał"><AppIcon name="close" /></button>
            <span>Refleksja tygodnia <b>·</b> 7–13 września</span>
            <span class="qr-save" role="status"><AppIcon name="check" />Zapisano</span>
          </header>
          <main class="qr-card">
            <header class="qr-heading"><h1>Jak było z ciałem?</h1></header>
            <section class="qr-ratings lsp-ratings--wide">
              <div class="qr-bars lsp-bars--three">
                <div class="lsp-load"><QuietRatingBar v-model="live.load" label="Obciążenie" hint="Trening, choroba, krótkie noce, podróż — ile ciało ode mnie wymagało." high-label="Ciężko" low-label="Lekko" /></div>
                <div class="lsp-state" :style="{ '--lsp-pair': livePair }"><QuietRatingBar v-model="live.state" label="Stan" hint="Energia, sen, brak kontuzji — jak ciało czuje się na koniec tygodnia." high-label="Bardzo dobry" low-label="Bardzo słaby" /></div>
                <article class="qr-axis lsp-tail-card">
                  <header><h2>Ostatnie tygodnie</h2></header>
                  <LoadStateRibbon :points="ritualPoints" label="Ciało" :height="150" show-axis transition="smooth" />
                  <p class="lsp-tail-card__verdict" :style="live.load && live.state ? { background: livePair, color: pairInk(live.load as Rating, live.state as Rating) } : undefined">{{ liveVerdict }}</p>
                </article>
              </div>
              <div class="qr-tags">
                <h2><AppIcon name="sell" />Tagi<span> · 2</span></h2>
                <ul class="qr-tag-list"><li><span>krótkie noce</span><button type="button" aria-label="Usuń tag"><AppIcon name="close" /></button></li><li><span>bieg</span><button type="button" aria-label="Usuń tag"><AppIcon name="close" /></button></li></ul>
              </div>
            </section>
            <footer class="qr-footer">
              <button type="button" class="qr-icon qr-arrow" aria-label="Poprzedni krok"><AppIcon name="arrow_back" /></button>
              <nav aria-label="Etapy rytuału"><div class="qr-progress"><button v-for="n in 7" :key="n" type="button" :class="{ active: n === 2 }"><i /></button></div><span>2/7 · Ciało</span></nav>
              <button type="button" class="qr-icon qr-arrow qr-arrow--next" aria-label="Następny krok"><AppIcon name="arrow_forward" /></button>
            </footer>
          </main>
        </div>
      </div>
    </section>

    <!-- D · Refleksja miesiąca · kontekst dziennika ------------------------- -->
    <section class="lsp-block">
      <header class="lsp-block__head">
        <div>
          <span class="lab-eyebrow">D · Cichy rytuał · refleksja miesiąca</span>
          <h2>Kontekst dziennika: sekcja „Z tygodni” jako cztery wstęgi</h2>
          <p>
            W kroku dziennika refleksji miesiąca prawa kolumna zbiera kontekst (kierunki, kompas, kotwice, emocje).
            Sekcja „Z tygodni” pokazuje dziś tylko rozwijane cytaty z tygodni. Cztery wstęgi po 5 tygodni dają obraz
            miesiąca zanim zaczniesz pisać; cytaty zostają pod nimi. W tej kolumnie brakuje szerokości, nie wysokości,
            więc wstęgi są wysokie (60px) i ułożone jedna pod drugą.
          </p>
        </div>
        <ul class="lsp-block__notes">
          <li>Kolumna kontekstu ma ~400px: wstęgi 60px wysokości z etykietą obszaru nad nimi, jedna wspólna oś tygodni; razem ~330px, tyle co pole tekstu.</li>
          <li>To samo pięć punktów co w karcie podsumowania miesiąca (B), więc języki się zgadzają.</li>
        </ul>
      </header>

      <div class="lsp-frame lsp-frame--ritual">
        <div class="quiet-ritual mg-design-v2 qm lsp-ritual">
          <header class="qr-top">
            <button type="button" class="qr-icon" aria-label="Zamknij rytuał"><AppIcon name="close" /></button>
            <span>Refleksja miesiąca <b>·</b> sierpień 2026</span>
            <span class="qr-save" role="status"><AppIcon name="check" />Zapisano</span>
          </header>
          <main class="qr-card">
            <header class="qr-heading"><h1>Co chcesz zapamiętać z tego miesiąca?</h1></header>
            <div class="qr-journal qr-journal--with-context">
              <div class="qr-journal-main">
                <textarea rows="14" aria-label="Wpis miesiąca" placeholder="Zacznij od tego, co najbardziej zostało…"></textarea>
              </div>
              <aside class="qm-context" aria-label="Kontekst miesiąca">
                <section>
                  <h3>Kompas</h3>
                  <div class="qm-mini-compass"><span v-for="c in COMPASS" :key="c.label"><i :style="{ height: `${c.value * 12}px` }" /><b>{{ c.value }}</b><small>{{ c.label }}</small></span></div>
                </section>
                <section>
                  <h3>Z tygodni</h3>
                  <div class="lsp-ctx-weeks">
                    <div v-for="a in AREA_KEYS" :key="a" class="lsp-ctx-weeks__row">
                      <span><AppIcon :name="AREA_ICONS[a]" />{{ AREA_LABELS[a] }}</span>
                      <LoadStateRibbon :points="monthPoints(a)" :label="AREA_LABELS[a]" :height="60" transition="smooth" class="lsp-ribbon--quiet" />
                    </div>
                    <div class="lsp-ps-weeks__axis" aria-hidden="true"><span v-for="w in monthUnits" :key="w.ref">{{ w.label }}</span></div>
                  </div>
                  <details><summary>3–9 sierpnia</summary><p>Tydzień wyjazdu, mało snu, ale dużo ruchu.</p></details>
                  <details><summary>24–30 sierpnia</summary><p>Rozmowa z M. wróciła spokój w domu.</p></details>
                </section>
              </aside>
            </div>
            <footer class="qr-footer">
              <button type="button" class="qr-icon qr-arrow" aria-label="Poprzedni krok"><AppIcon name="arrow_back" /></button>
              <nav aria-label="Etapy rytuału"><div class="qr-progress"><button v-for="n in 4" :key="n" type="button" :class="{ active: n === 4 }"><i /></button></div><span>4/4 · Dziennik</span></nav>
              <div class="qr-finish"><button type="button" class="qr-primary"><AppIcon name="done_all" />Zapisz refleksję</button></div>
            </footer>
          </main>
        </div>
      </div>
    </section>

    <!-- Gdzie nie ------------------------------------------------------------ -->
    <section class="lsp-block">
      <header class="lsp-block__head">
        <div>
          <span class="lab-eyebrow">Gdzie nie</span>
          <h2>Miejsca, w których wstęga nie ma sensu</h2>
          <p>
            <b>Dzisiaj</b>: prawa kolumna działa w skali dnia, kalendarz i „Najbliżej” nie mają miejsca na serię tygodni.
            <b>Karty tygodnia w widoku miesiąca</b> to jeden tydzień, więc zostają kafelki 4 × N z części 1.
            <b>Krok przeglądu refleksji tygodnia</b> mówi o faktach dnia po dniu, nie o ocenach.
          </p>
        </div>
      </header>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import QuietRatingBar from '@product/features/quiet-ritual/QuietRatingBar.vue'
import '@product/features/quiet-ritual/quiet-ritual.css'
import '@product/features/calendar-rhythm/rhythm.css'
import LoadStateRibbon from '~lab/components/load-state/LoadStateRibbon.vue'
import { AREA_ICONS, AREA_KEYS, AREA_LABELS, buildStorySeries, pairColor, pairInk, verdictSentence, type AreaKey, type Rating, type WeekPoint } from '~lab/lab/weekLoadState'

const series = buildStorySeries()
/** Sierpień 2026 = indeksy 18–22 opowieści (3.08 … 31.08); bieżący tydzień = 23 (7.09). */
const MONTH_FROM = 18
const monthPoints = (a: AreaKey): WeekPoint[] => series[a].slice(MONTH_FROM, MONTH_FROM + 5)
const lastPoint = (a: AreaKey): WeekPoint => series[a][series[a].length - 1]
const monthUnits = [
  { ref: 'w32', label: '3–9', sub: 'sie' },
  { ref: 'w33', label: '10–16', sub: 'sie' },
  { ref: 'w34', label: '17–23', sub: 'sie' },
  { ref: 'w35', label: '24–30', sub: 'sie' },
  { ref: 'w36', label: '31–6', sub: 'sie · wrz' },
]
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
const COMPASS = [
  { label: 'Balans', value: 3 },
  { label: 'Sens', value: 4 },
  { label: 'Rozwój', value: 4 },
  { label: 'Spójność', value: 3 },
  { label: 'Sprawczość', value: 4 },
]
const FAMILIES = [
  { label: 'Cele', pct: 60 },
  { label: 'Nawyki', pct: 71 },
  { label: 'Trackery', pct: 83 },
  { label: 'Intencje', pct: 50 },
]
const FAMILIES_WEEK = [
  { label: 'Cele', pct: 67 },
  { label: 'Nawyki', pct: 80 },
  { label: 'Trackery', pct: 100 },
  { label: 'Intencje', pct: 33 },
]

// C · bieżący tydzień „Ciało”, oceniany na żywo
const live = reactive<{ load: number | null; state: number | null }>({ load: null, state: null })
const history = series.body.slice(-10, -1)
const ritualPoints = computed<WeekPoint[]>(() => {
  const rated = live.load != null && live.state != null
  const current: WeekPoint = { weekRef: 'now', label: 'ten', load: (live.load ?? null) as Rating | null, state: (live.state ?? null) as Rating | null }
  return rated ? [...history, current] : [...history, { ...current, load: null, state: null }]
})
const livePair = computed(() => pairColor((live.load ?? null) as Rating | null, (live.state ?? null) as Rating | null))
const liveVerdict = computed(() => (live.load && live.state ? verdictSentence('body', live.load as Rating, live.state as Rating) : 'Oceń oba wymiary, a ten tydzień dorysuje się na końcu wstęgi.'))
const tailHint = computed(() => (live.load && live.state ? 'ten tydzień dorysowany na końcu' : 'ten tydzień jeszcze bez oceny'))
</script>

<style>
.lsp-page .concept-heading p b { font-weight: 800; }
.lsp-page .lsp-block { margin-bottom: 40px; }
.lsp-page .lsp-block__head { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 22px; align-items: start; margin-bottom: 14px; }
.lsp-page .lsp-block__head h2 { margin: 4px 0 6px; font-size: 20px; }
.lsp-page .lsp-block__head p { margin: 0; max-width: 760px; color: rgb(var(--neo-muted)); font-size: 13px; line-height: 1.55; }
.lsp-page .lsp-block__head p b { color: rgb(var(--color-on-surface)); font-weight: 800; }
.lsp-page .lsp-block__notes { margin: 0; padding: 12px 14px 12px 28px; border: 1px dashed rgb(var(--neo-border) / 0.55); border-radius: 17px 14px 18px 15px; color: rgb(var(--color-on-surface)); font-size: 12px; line-height: 1.5; }
.lsp-page .lsp-block__notes li + li { margin-top: 4px; }

/* ramka repliki: tło strony produktu, bez własnego cienia */
.lsp-page .lsp-frame { position: relative; margin: 0 0 18px; padding: 34px 20px 20px; border: 1px dashed rgb(var(--neo-border) / 0.55); border-radius: 22px 26px 21px 25px; background: var(--mg-color-canvas); }
.lsp-page .lsp-frame.cp { min-height: 0; padding: 34px 20px 20px; }
.lsp-page .lsp-frame__cap { position: absolute; top: 10px; left: 20px; margin: 0; color: rgb(var(--neo-muted)); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.lsp-page .lsp-frame__cap b { color: rgb(var(--color-primary-strong)); }

/* A · tabela kalendarza rytmu (kopia stylów scoped RhythmBoard) */
.lsp-page .rb-board { --name: 246px; --pad: 12px; display: grid; gap: 10px; min-width: 0; }
.lsp-page .rb-board--year { --name: 206px; }
.lsp-page .rb-row { display: grid; grid-template-columns: var(--name) repeat(var(--cols), minmax(0, 1fr)) var(--sigma); align-items: center; column-gap: 2px; padding: 0 var(--pad); }
.lsp-page .rb-axis { position: relative; margin: 2px 0 4px; }
.lsp-page .rb-view { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; justify-self: start; padding: 6px 12px 6px 8px; border-radius: 14px 17px 12px 16px; color: var(--mg-color-ink); font-size: 13px; font-weight: 800; }
.lsp-page .rb-view__icon { color: var(--cp-mark); font-size: 18px; }
.lsp-page .rb-view__chev { color: var(--mg-color-muted); font-size: 16px; }
.lsp-page .rb-axis__track { position: absolute; top: 0; bottom: 0; left: calc(var(--pad) + var(--name) - 2px); right: calc(var(--pad) - 4px); border-radius: 18px 15px 19px 16px; background: var(--cp-card); box-shadow: var(--mg-shadow-inset-sm); }
.lsp-page .rb-axis__unit { position: relative; display: grid; place-items: center; min-height: 36px; margin: 4px 0; padding: 3px 4px; border: 1px solid transparent; border-radius: 13px 16px 11px 17px; background: transparent; color: var(--mg-color-muted); font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
.lsp-page .rb-axis__unit strong { font-size: 10px; font-weight: 700; }
.lsp-page .rb-axis__unit.current { background: var(--cp-inner); color: var(--mg-color-ink); border-color: var(--cp-line); box-shadow: var(--mg-shadow-rhythm-card); transform: rotate(-.5deg); }
.lsp-page .rb-axis__unit.future { opacity: .6; }
.lsp-page .rb-cloud { padding: 8px 0 8px; border: 1px solid var(--cp-line); border-radius: 25px 30px 24px 28px; background: var(--cp-card); box-shadow: var(--mg-shadow-rhythm-card); }
.lsp-page .rb-name { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 8px; color: var(--mg-color-ink); font: inherit; text-align: left; }
.lsp-page .rb-name--series { padding-left: 14px; font-size: 13.5px; font-weight: 700; color: var(--mg-color-muted); }
.lsp-page .rb-name__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lsp-page .rb-name__icon { display: inline-grid; place-items: center; flex: none; width: 25px; height: 24px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--cp-mark); background: var(--cp-inner); font-size: 15px; }
.lsp-page .rb-cell { display: grid; place-items: center; min-height: 46px; border: 0; border-radius: 12px 16px 10px 14px; background: transparent; cursor: pointer; }
.lsp-page .rb-cell:hover { background: var(--cp-field); }
.lsp-page .rb-cell.future { opacity: .7; }
.lsp-page .rb-series { min-height: 70px; }
.lsp-page .rb-series__cells { position: relative; grid-column: 2 / span var(--cols); display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); column-gap: 2px; }
.lsp-page .rb-cell--series { min-height: 65px; }
.lsp-page .rb-series--plot .rb-series__cells { column-gap: 0; margin: 6px 0; }
.lsp-page .rb-series--plot .rb-cell--series { min-height: 104px; border-radius: 10px; }
.lsp-page .rb-note { min-height: 28px; color: var(--mg-color-muted); font-size: 11px; }
.lsp-page .rb-note > span { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; padding: 4px 14px 0; }
.lsp-page .lsp-key { display: inline-block; flex: none; width: 16px; height: 2px; background: rgb(var(--color-on-surface) / 0.45); }
.lsp-page .lsp-key--state { height: 2.5px; background: rgb(var(--sky-800)); margin-left: 8px; }
/* wstęga nad komórkami: komórki zostają jako strefy kliku, wstęga leży na wierzchu, ale przepuszcza hover do własnych stref */
.lsp-page .lsp-ribbon-layer { grid-column: 1 / -1; grid-row: 1; align-self: center; padding: 0 2px; }
.lsp-page .lsp-ribbon-cells .rb-cell--series { grid-row: 1; }
.lsp-page .lsp-ribbon-cells .rb-cell--series:nth-child(1) { grid-column: 1; }
/* „dziś”: cztery pary mini-słupków jak RhythmRatingsMini */
.lsp-page .lsp-mini { display: inline-flex; gap: 6px; align-items: flex-end; height: 36px; }
.lsp-page .lsp-mini__pair { display: inline-flex; gap: 2px; align-items: flex-end; height: 100%; }
.lsp-page .lsp-mini__pair i { display: inline-block; width: 6px; border-radius: 2px 2px 0 0; }
.lsp-page .lsp-mini__pair .e { background: var(--mg-color-effort); }
.lsp-page .lsp-mini__pair .s { background: var(--cp-accent); }

/* B · podsumowanie okresu (kopia stylów scoped RhythmPeriodSummary) */
.lsp-page .ps { display: grid; gap: 14px; padding: 16px 20px 16px; border: 1px solid var(--cp-line); border-radius: 25px 30px 24px 28px; background: var(--cp-card); box-shadow: var(--mg-shadow-rhythm-card); }
.lsp-page .ps__eyebrow { color: var(--cp-mark); font-size: 11px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.lsp-page .ps__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.lsp-page .ps__focus { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.lsp-page .ps__chip { display: inline-flex; align-items: center; gap: 9px; padding: 3px 12px 3px 4px; border: 1px solid var(--cp-line); border-radius: 17px 14px 18px 15px; background: var(--cp-inner); color: var(--mg-color-ink); font: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; box-shadow: var(--mg-shadow-rhythm-card); }
.lsp-page .ps__orb { display: grid; place-items: center; width: 30px; height: 29px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--cp-mark); background: var(--cp-inner); }
.lsp-page .ps__orb .material-symbols-outlined { font-size: 18px; }
.lsp-page .ps__actions { display: flex; flex: none; align-items: center; gap: 6px; }
.lsp-page .ps__grid { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(0, 1.7fr); gap: 14px; align-items: stretch; }
.lsp-page .ps__hero { position: relative; display: grid; align-content: start; gap: 10px; padding: 14px 18px 14px; border-radius: 17px 14px 18px 15px; background: var(--cp-field); }
.lsp-page .ps__drill { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 30px; height: 29px; border: 0; border-radius: 50%; background: transparent; color: var(--mg-color-muted); cursor: pointer; }
.lsp-page .ps__drill .material-symbols-outlined { font-size: 17px; }
.lsp-page .ps__bars { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; margin: 4px 0 0; padding: 0; list-style: none; }
.lsp-page .ps__bars li { display: grid; justify-items: center; gap: 6px; min-width: 0; }
.lsp-page .ps__col { display: inline-flex; gap: 5px; align-items: flex-end; height: 74px; }
.lsp-page .ps__col i { position: relative; display: inline-block; width: 22px; min-height: 3px; border-radius: 9px 7px 3px 4px / 8px 9px 3px 3px; background: var(--cp-accent); transform: rotate(-1.2deg); }
.lsp-page .ps__col i:nth-child(even) { transform: rotate(1deg); }
.lsp-page .ps__bars--pairs .ps__col i { width: 14px; }
.lsp-page .ps__col .l { background: rgb(var(--sky-800)); }
.lsp-page .ps__col i b { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -2px); color: var(--mg-color-ink); font-size: 10.5px; font-weight: 800; }
.lsp-page .ps__bars small { color: var(--mg-color-muted); font-size: 10.5px; font-weight: 800; text-align: center; }
.lsp-page .ps__fam { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 10px; margin: 0; padding: 0; list-style: none; }
.lsp-page .ps__tile { position: relative; display: grid; grid-template-columns: 1fr auto auto; align-items: center; column-gap: 12px; min-height: 74px; padding: 10px 16px 10px 18px; border-radius: 17px 14px 18px 15px; background: var(--cp-field); }
.lsp-page .ps__tile-label { color: var(--mg-color-ink); font-size: 16px; font-weight: 800; }
.lsp-page .ps__pct { color: var(--mg-color-ink); font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
.lsp-page .ps__pct span { margin-left: 1px; color: var(--mg-color-muted); font-size: 12px; font-weight: 800; }
.lsp-page .ps__blob { display: block; width: 44px; height: 42px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: linear-gradient(to top, var(--cp-accent) var(--fill), var(--cp-inner) var(--fill)); outline: 1px solid var(--cp-edge); outline-offset: -1px; transform: rotate(-4deg); }
/* nowe: karta oceny w szerszej kolumnie, wstęgi jako małe multiplikacje 2 × 2 */
.lsp-page .ps__grid--wide-hero { grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr); }
.lsp-page .lsp-hero__cols { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px 26px; align-items: start; }
.lsp-page .lsp-hero__cols > .ps__bars { margin-top: 18px; gap: 12px; }
.lsp-page .lsp-multiples { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 18px; }
.lsp-page .lsp-multiples__cap { grid-column: 1 / -1; }
.lsp-page .lsp-multiples__cell { display: grid; gap: 2px; min-width: 0; }
.lsp-page .lsp-multiples__cell > span { display: inline-flex; align-items: center; gap: 6px; color: var(--mg-color-muted); font-size: 11.5px; font-weight: 800; }
.lsp-page .lsp-multiples__cell > span .material-symbols-outlined { font-size: 15px; color: var(--cp-mark); }
/* stare: wstęgi tygodni w karcie oceny */
.lsp-page .lsp-ps-weeks { display: grid; gap: 4px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--cp-line); }
.lsp-page .lsp-ps-weeks__cap { margin-bottom: 2px; }
.lsp-page .lsp-ps-weeks__row { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 10px; }
.lsp-page .lsp-ps-weeks__row > span { display: inline-flex; align-items: center; gap: 6px; color: var(--mg-color-muted); font-size: 11.5px; font-weight: 800; }
.lsp-page .lsp-ps-weeks__row > span .material-symbols-outlined { font-size: 15px; color: var(--cp-mark); }
.lsp-page .lsp-ps-weeks__axis { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; margin-left: 94px; color: var(--mg-color-muted); font-size: 10px; font-style: italic; text-align: center; }
.lsp-page .lsp-ps-tail { display: grid; gap: 4px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--cp-line); }
.lsp-page .lsp-ps-tail__rows { display: grid; gap: 2px; }
.lsp-page .lsp-ps-tail__row { display: grid; grid-template-columns: 60px minmax(0, 1fr); align-items: center; gap: 8px; }
.lsp-page .lsp-ps-tail__row small { color: var(--mg-color-muted); font-size: 10.5px; font-weight: 800; }
/* cicha wstęga: bez hover-tipów i cienia, papier w linie zostaje */
.lsp-page .lsp-ribbon--quiet .ls-ribbon__hit { cursor: default; }
.lsp-page .lsp-ribbon--quiet .ls-ribbon__tip { display: none; }

/* C · cichy rytuał: ramka zamiast pełnego ekranu */
.lsp-page .lsp-frame--ritual { padding: 34px 0 0; background: var(--mg-color-canvas); }
.lsp-page .lsp-ritual { padding: 0 20px 20px; }
.lsp-page .lsp-ritual .qr-card { min-height: 0; }
/* w produkcie krok przewija się w kadrze 100vh; w ramce Labu pokazujemy całość */
.lsp-page .lsp-ritual .qr-ratings { max-height: none; height: auto; flex: none; overflow: visible; }
.lsp-page .lsp-ritual .qr-footer { margin-top: 30px; }
.lsp-page .lsp-ratings--wide { width: min(100%, 1040px); }
.lsp-page .lsp-bars--three { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.35fr); }
.lsp-page .lsp-load .qr-scale--vertical button.filled { background: rgb(var(--sky-800)); }
.lsp-page .lsp-state .qr-scale--vertical button.filled { background: var(--lsp-pair, var(--qr-accent)); }
.lsp-page .lsp-tail-well { display: grid; gap: 8px; margin-bottom: 22px; padding: 16px 26px 12px; background: var(--qr-field); border-radius: 21px 25px 19px 23px; }
.lsp-page .lsp-tail-well header { display: flex; align-items: center; gap: 8px; color: var(--qr-muted); font-size: 13px; font-weight: 700; }
.lsp-page .lsp-tail-well header .material-symbols-outlined { font-size: 17px; color: var(--qr-accent-strong); }
.lsp-page .lsp-tail-well header small { margin-left: auto; font-weight: 600; font-style: italic; }
.lsp-page .lsp-tail-card { display: grid; align-content: start; gap: 12px; }
.lsp-page .lsp-tail-card header { display: flex; }
.lsp-page .lsp-tail-card__verdict { margin: 0; padding: 8px 12px; border-radius: 12px; border: 1px dashed var(--qr-line); color: var(--qr-muted); font-size: 12.5px; font-weight: 650; line-height: 1.4; }
.lsp-page .lsp-tail-card__verdict[style] { border-style: solid; border-color: transparent; font-weight: 750; }

/* D · kontekst miesiąca */
.lsp-page .lsp-ctx-weeks { display: grid; gap: 6px; margin: 4px 0 10px; }
.lsp-page .lsp-ctx-weeks__row { display: grid; gap: 2px; }
.lsp-page .lsp-ctx-weeks__row > span { display: inline-flex; align-items: center; gap: 6px; color: var(--qr-muted); font-size: 11.5px; font-weight: 800; }
.lsp-page .lsp-ctx-weeks__row > span .material-symbols-outlined { font-size: 15px; color: var(--qr-accent-strong); }
.lsp-page .lsp-ctx-weeks .lsp-ps-weeks__axis { margin-left: 0; }
</style>
