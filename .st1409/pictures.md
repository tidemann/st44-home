# Diddit på skjerm — de 8 sidereglene, tegnet (foreldresidene, 1 av 2)

**Signert bilde (spesifikasjonen):** `docs/design/diddit/reference/desktop-07-opsjon-A-1440.png`
(familiens hjem på 1440), med `desktop-10-anbefalt-A-1024.png`, `desktop-12-anbefalt-A-mine-oppgaver-1440.png`
og `desktop-15-side-om-side-godkjent-vs-forslag.png` (Stig, ST-890, 11.10).
**Veileder:** `docs/design/diddit/DESIGN-GUIDE.md` → *Desktop and tablet — layout A*.
**Målt i dag:** [ST-1345](/ST/issues/ST-1345#document-review).

Ni bilder, ett per side, 1440 px, lys modus, norsk innhold, samme oppdiktede familie som i
ST-1345. De 8 reglene fra [ST-1370](/ST/issues/ST-1370) er lagt på, og ingenting annet.

## Runde 2 — hva som er gjort etter Astrids gjennomgang

Astrid målte geometrien i pikslene og fant alle åtte reglene i orden; den delen er ikke gjort om
igjen. Dette er endret:

1. **Hele settet er tegnet på nytt i `deviceScaleFactor: 2`** — samme oppløsning som de signerte
   bildene og som alle tallene i veilederen. Ni sider, verste tilfelle og begge oversiktsarkene.
2. **Begge halvdelene i et par viser nå samme tilstand.** Den faste 2,6 s-ventingen er byttet med
   en *settle*: nettverket i ro, ingen «Laster/Henter»-tekst igjen, ingen plassholderrad igjen.
   «I dag»-Belønninger sto og lastet og «i dag»-Invitasjoner var tom mot fulle høyresider; begge er
   nå fulle på begge sider.
3. **Plassholderradene på Belønninger har fått sitt eget bilde:**
   `rules-belonninger-laster-1440.png`. Regel 7-påstanden i tabellen under står ikke lenger uten
   vedlegg — `/redemptions` holdes åpen mens siden fotograferes.
4. Fire småting: «Rolle: Forelder» har mellomrommet sitt igjen (`&ngsp;`);
   Husholdningsinnstillinger har **én** hovedknappbredde, ikke 378 og 346; «Ukens ledere» rangerer
   nå den med flest gjorte oppgaver først; og tallet i Husholdninger-linja under stemmer med bildet.
5. WCAG-avsnittet er rettet: det utløpte invitasjonskortet er ikke lenger dekket av «ingen
   kontrastmåling er svekket», det står på lista over ting reglene ikke rører.

To ting som endrer utseendet går til **Maria**, ikke inn i en retting — se *Til Maria* nederst.

## Hvordan de er laget

Sidene er **appen selv**, ikke en tegning: `ng serve` på `origin/main` (51f41dc) i et eget
arbeidstre, med reglene lagt på i koden og API-et mokket med oppdiktede data. Det betyr at
«ingenting annet er endret» kan leses rett ut av diffen i stedet for å måtte tros.
Grenen er `ida/st-1409-rules-pictures` (36959a9) — **den skal ikke til main**; dette er bilder.

**Venstre halvdel i oversiktsarkene** er den samme siden på **51f41dc uten reglene**, tegnet i
samme kjøring, med samme mokkede familie, samme `deviceScaleFactor: 2` og samme venting som
høyresiden. (Runde 1 kalte dem «ST-1345s egne skjermbilder»; det var upresist — de er tegnet her,
av det samme utgangspunktet ST-1345 målte.) Paret skiller seg derfor bare på reglene.

Skriptene: `st1409-shoot.js` (sidene), `st1409-worst.js` (verste tilfelle),
`.st1409/measure.js` og `.st1409/audit.js` (tallene), `.st1409/sheet.js` og
`.st1409/worstsheet.js` (arkene). `measure.js` regner nå i enhetspiksler og rapporterer CSS-piksler.

## Tallene Astrid sjekker — alle ni sider

Målt på nytt på DPR 2-bildene; tallene er de samme som i runde 1.

| Side | Bilde | Bredde @ x | Tittel | Felt | Spalter |
| --- | --- | --- | --- | --- | --- |
| Hjemme | `rules-hjemme-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **259** | 428 + 24 + 428 |
| Oppgaver | `rules-oppgaver-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | 428 + 24 + 428 |
| Familie | `rules-familie-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Belønninger | `rules-belonninger-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | 428 + 24 + 428 |
| Innstillinger | `rules-innstillinger-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | 428 + 24 + 428 |
| Fremgang | `rules-fremgang-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **227** | 428 + 24 + 428 |
| Husholdninger | `rules-husholdninger-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Husholdningsinnstillinger | `rules-husholdningsinnstillinger-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Invitasjoner | `rules-invitasjoner-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |

259 på Hjemme og 227 på Fremgang er **ikke** unntak: feltet slutter 17 px under det laveste det
bærer, og de to sidene bærer mer enn en tittel og en underlinje (barnekortene, de tre tallene).
191 er feltet med bare tittel og underlinje, som regel 2 sier. Spaltene måles i DOM-en til
428,0 + 24,0 + 428,0 på alle fire tospaltede sider.

Tiende bilde: **`rules-belonninger-laster-1440.png`** — Belønninger mens den laster, med regel 7s
grå plassholderrader. Samme felt (191) og samme 880 @ 280.

Oversikt i dag mot med reglene: `rules-overview-1.png` (Hjemme, Oppgaver, Familie, Belønninger,
Innstillinger) og `rules-overview-2.png` (Fremgang, Husholdninger, Husholdningsinnstillinger,
Invitasjoner).

## Én linje per side: hvilke regler endret den, og hva jeg valgte

| Side | Hva reglene gjorde | Åpent valg jeg tok |
| --- | --- | --- |
| **Hjemme** | **Ingenting.** Den traff alle åtte fra før — 880 på x 280, 26/800, felt 259, 428 + 24 + 428. Bildet er med for å vise at reglene lar den stå. | — |
| **Oppgaver** | 1 (800 → 880, x 320 → 280), 4 (én bred stabel → to spalter), 5 («Ny oppgave» 736 → 428 og ut av midten av lista). | Spaltene er delt som desktop A deler familiens hjem: **Forfalt + I dag til venstre, Gjort i dag + Alle oppgaver til høyre**, og «+ Ny oppgave» under sin egen spalte. |
| **Familie** | 1 (1200 på x 120 → 880 på x 280), 4 (én 428-spalte), 5 («+ Legg til barn» 1136 → 428, «+ Inviter» 33 → 36 px). | Regel 4 lar «én gruppe, kort liste» velge: jeg tok **én 428-spalte**, ikke to, siden siden har én gruppe. |
| **Belønninger** | 1 (1200 på x 120 → 880 på x 280), 4 (to spalter), 5 (kortknappene 50–54 → 36/10), 7 (lastetilstanden «Henter ønsker…» → grå plassholderrader, se `rules-belonninger-laster-1440.png`). | Spaltene: **venter på svar til venstre, besvart og tidligere til høyre**. Fanestripa «Ønsker / Belønninger» er **ikke rørt** — den er ST-1345 F10, ikke en av de 8 reglene; den er nå 880 bred fordi regel 1 flyttet rammen. |
| **Innstillinger** | 1 (600 på x 420 → 880 på x 280), 4 (to spalter), 7 («Varsler er ikke klare ennå» får kortets tittellinje + én setning i stedet for en 20 px display-overskrift). | Spaltene: **profil og husstand til venstre, varsler, konto og om til høyre**. |
| **Fremgang** | 4 (én 880-spalte → to 428), 7 (feiltilstanden var en hvit stripe fra kant til kant, 0–1440; nå det hvite kortet i spalta, med «Prøv igjen» som hovedknapp; lasting er plassholderrader). | **Fremgang var riktig fra før** på 1, 2, 3. Regel 4 sier to spalter «når siden har grupper», og den har to (Ukens ledere, Prestasjoner) — så jeg delte den. **Dette er det ene stedet reglene endrer en side ST-1345 kalte riktig — se *Til Maria*.** |
| **Husholdninger** | 2 (ikke noe gult felt → tittel og «1 husstand» i feltet, 80 → 191), 3 (`#15181C` og midtstilt → 26/800 ink, venstre), 4 (én 428-spalte), 5 («+ Ny husholdning» 46,4 → 49/13 i spaltas bredde, «Endre»/«Slett» 44 → 36/10), 7 (tom tilstand → hvitt kort), 8 (👥 og 👶 → Diddits eget ikon; 🏠 fjernet). | Underlinja er **«N husstander»** — i bildet står det «1 husstand», fordi familien i mokken har én. Jeg brukte **familie-ikonet for medlemmer** og lot barnetallet stå uten ikon — ikonsettet har ikke noe barn-ikon, og å låne «hjem» til barn ville vært å finne på et ikon. **«+ Ny husholdning» står over lista — se *Til Maria*.** |
| **Husholdningsinnstillinger** | 2 (80 → 191, tittel og «N medlemmer» i feltet), 3 (32/600 → 26/800), 1 (768 på x 336 → 880 på x 280), 4 (én 428-spalte — den er et skjema), 5 (høyder 36–65 og radier 4/6/8 → 36/10 og 49/13; de tre hovedknappene er nå **én** bredde), 7 (lasting → plassholderrader; «Ingen invitasjoner sendt» → hvitt kort). | Én spalte, ikke to: regel 4 sier «én 428 for et skjema». **Hovedknappbredden:** regel 5 sier «så bred som spalta si». Alle tre hovedknappene på siden står inne i hvite kort, så de er **378 px** — kortets innhold i 428-spalta — og ikke 428. Runde 1 hadde 378 og 346 fordi barne-komponenten la 16 px til inni kortet; det er ryddet, så de tre er like. |
| **Invitasjoner** | 2 (80 → 191), 3 (en `<h2>` på 36/800 og ingen `<h1>` → 26/800 i feltet, og siden har en `<h1>`), 1 (768 på x 336 → 880 på x 280), 4 (én 428-spalte), 5 («Oppdater» radius 4 → 36/10; «Godta»/«Avslå» 45,6 → 36/10), 7 (tom tilstand → hvitt kort), 8 («Rolle:**Parent**» → «Rolle: Forelder», med mellomrommet). | Underlinja: **«N invitasjoner»**, «Ingen ventende» når det er tomt. |

## Verste tilfelle (`rules-verste-tilfelle.png`)

De samme ni sidene med husstandsnavn «Familien Tangen-Hagerup Mikkelsborg» (35 tegn), **seks**
barn i stedet for tre, oppgavetitler på 62 tegn, tre husstander i lista, og tomme lister der
sidene har en tom tilstand.

- **Ingenting renner ut vannrett:** `scrollWidth = 1440` på alle ni, og alle ni holder 880 @ 280,
  26/800 og spaltene sine.
- Tittelen brekker til **tre linjer** på Hjemme og feltet blir stående på 259, fordi barnekortene
  fortsatt er det laveste i feltet. Fire barnekort og en «+2 barn til»-flis, som veilederen sier.
- Lange oppgavetitler brekker til to linjer i en høyere rad (veilederens regel, ikke `desktop-14`s
  avkuttede linje).
- **Verste tilfelle fant en feil i mitt eget første utkast:** regel 5-blokka satte `revert` på
  `.page-title-menu`, og `revert` ruller forbi komponentens egen `all: unset` — så husstandsnavnet
  som tittel falt til nettleserens 13,3 px / 400. Det vises bare når forelderen er i **mer enn én**
  husstand, altså aldri i normalbildet. Rettet i d0680d6; menyens egne kontroller står ikke i
  regel 5-lista, så unntaket var ren skade.

## Fem ting reglene ikke rører

Disse er **ikke** blant de 8, og er derfor med i bildene som de er i dag. De er Marias/Stigs valg,
ikke mine:

1. **Fanestripa inne i Belønninger** (ST-1345 F10) — to fanemønstre på samme side. Regel 1 gjorde
   den 880 bred i stedet for 1137, men den er fortsatt en understreket stripe, ikke en chip-rad.
2. **Husholdningsinnstillinger har kort inni kort og doble overskrifter** («Husholdningsmedlemmer»
   rett over «Inviter noen», «Barn» rett over «Barneadministrasjon») — ST-1345 F12 sier siden
   trenger en egen skisse fordi den overlapper Familie og Innstillinger. Reglene retter rammen og
   knappene, ikke innholdet.
3. **«Alder: 0 (Født )»** på Husholdningsinnstillinger er en ødelagt tekststreng (F12), ikke en
   layoutfeil. Den står igjen i bildet.
4. **Det utløpte invitasjonskortet er nedtonet med `opacity`** (`rules-invitasjoner-1440.png`,
   «Hytta på Geilo»). Astrid målte brødteksten til **3,37:1** (`#848B8E` på `#FCFCFB`) og den grå
   «Utløpt»-knappen til **2,98:1** — begge under 4,5:1. Det er kortets gjennomsiktighet, ikke en av
   de 8 reglene, så jeg rettet ikke utseendet. **Marias avgjørelse.** Den vanlige fiksen innenfor
   utseendet er å tone ned med en mørkere grå tekst i stedet for `opacity` på hele kortet.
5. **«Administrator»-brikka på Husholdninger er fortsatt rosa**, en farge som ikke står i paletten
   (F11). Regel 5 nevner bare hjørnet på en brikke (9 px), ikke fargen, så jeg lot den stå.

## Til Maria — to ting som endrer utseendet

Begge er **ikke** rettet i bildene; de står slik de står, så avgjørelsen kan tas på et bilde.

1. **Regel 4 deler Fremgang i to spalter.** Siden var riktig på 1, 2 og 3 i ST-1345, og dette er
   det ene stedet i settet der reglene endrer en side som allerede var kalt riktig. Vil Stig heller
   ha Fremgang som i dag (én 880-spalte), er det én linje å ta bort.
2. **«+ Ny husholdning» står over lista** på Husholdninger, mens det signerte desktop A legger
   hovedknappen **under** spalta («+ Ny oppgave» er «a block in the flow»). Reglene sier ikke hvor
   knappen skal stå, så bildet er ikke i strid med dem — men det er den ene siden i settet der
   hovedknappen ikke står der det signerte bildet setter den.

## WCAG

Ingen ny farge, ingen ny skrift, ingen ny komponent i noen av bildene; alt er verdier veilederen
alt bærer. To ting ble **bedre** av reglene:

- **Invitasjoner har nå en `<h1>`** (2.4.6 Overskrifter og ledetekster) — den hadde bare en `<h2>`.
- **Regel 6** fjerner den bleke hovedknappen. På foreldresidene slo den bare ut i dialogene;
  de grå blindveiene ST-1345 målte (2,67:1 på veiviserens «Neste») ligger i **del 2**
  ([ST-1410](/ST/issues/ST-1410)), sammen med barne- og innloggingssidene.

**Ingen av de 8 reglene svekker en kontrastmåling:** ink på gult er 10,57:1 som før, og underlinja
i feltet er ink, ikke den grå `#555E64` som bare er 3,76:1 der.

Det settet likevel viser, og som reglene **ikke** rører, er det nedtonede, utløpte
invitasjonskortet på 3,37:1 og 2,98:1 (punkt 4 over). Det er en egen avgjørelse for Maria, ikke en
retting i denne runden.
