# Diddit på skjerm — de 8 sidereglene, tegnet (barne-, oppsett- og innloggingssidene, 2 av 2)

**Signert bilde (spesifikasjonen):** `docs/design/diddit/reference/desktop-07-opsjon-A-1440.png`,
`desktop-12-anbefalt-A-mine-oppgaver-1440.png` (barnets oppgaveskjerm) og
`login-19-desktop-1440x900.png` (innloggingen). **Veileder:** `docs/design/diddit/DESIGN-GUIDE.md`
→ *Desktop and tablet — layout A* og *The login screen*. **Målt i dag:**
[ST-1345](/ST/issues/ST-1345#document-review). **Del 1:** [ST-1409](/ST/issues/ST-1409#document-pictures).

Ni bilder, ett per side, 1440 px, lys modus, norsk innhold, samme oppdiktede familie som i del 1.
De 8 reglene fra [ST-1370](/ST/issues/ST-1370) er lagt på, og ingenting annet.

> **Runde 2 (Astrids gjennomgang).** Tre ting er endret siden første innlevering, ingenting annet:
> (1) regel 7 på «Mine oppgaver (barn)» har fått sitt eget par bilder — lastetilstanden, i dag mot
> med reglene; (2) det hvite skjemakortet som er borte på fem sider står nå under **Valgene som
> skal til Maria**, med grunnen; (3) invitasjonens ledetekst gjentok ikke lenger underlinja ordrett,
> og de to småtingene Astrid noterte er skrevet inn. Arkene sier nå under hvert like par at
> halvdelene er like med vilje.

## Hvordan de er laget

Som i del 1: sidene er **appen selv**, ikke en tegning. `ng serve` på `origin/main` (51f41dc) i to
arbeidstrær — ett uten reglene (venstre halvdel i arkene) og ett med dem — API-et mokket med
oppdiktede data, `deviceScaleFactor: 2`, og den samme *settle*-ventingen som i runde 2 av del 1
(nettverket i ro, ingen «Laster/Henter», ingen plassholderrad). Begge halvdelene i hvert par er
tegnet i samme kjøring. Gren `ida/st-1410-rules-pictures` (**04a950f**, runde 2) — **ikke for main.**
Skriptene: `st1410-shoot.js`, `.st1410/measure.js`, `.st1410/audit.js`, `.st1410/cols.js`,
`.st1410/worst.js`, `.st1410/sheet.js`, `.st1410/worstsheet.js` og — nytt i runde 2 —
`.st1410/laster.js` (lastetilstanden, med sin egen måling i `laster-probe.json`).
`st1410-shoot.js` tar nå `ST1410_ONLY=<side>` så én side kan tegnes om igjen alene.

## Tallene Astrid sjekker

Målt i pikslene på DPR 2-filene (felt, tittelblekk) og i DOM-en (bredde, spalter, knapper).

| Side | Bilde | Innhold @ x | Tittel | Felt | Spalter |
| --- | --- | --- | --- | --- | --- |
| Mine oppgaver (barn) | `rules-mine-oppgaver-barn-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **270** | 428 + 24 + 428 |
| Belønninger (barn) | `rules-belonninger-barn-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **282** | 428 + 24 + 428 |
| Ny husstand (veiviser) | `rules-ny-husstand-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Logg inn | `rules-logg-inn-1440.png` | gult panel + skjema ✅ | **34**/800 ✅ (regel 3) | eget merkeområde | login-19 |
| Opprett konto | `rules-opprett-konto-1440.png` | gult panel + skjema ✅ | **34**/800 ✅ (regel 3) | eget merkeområde | login-19 |
| Barnas innlogging | `rules-barnas-innlogging-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Glemt passord | `rules-glemt-passord-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Sett nytt passord | `rules-sett-nytt-passord-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Invitasjon (lenke) | `rules-invitasjon-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |

- **Hovedknappen** måler **428 × 49, hjørne 13,0, etikett 16,5**, gul `rgb(246,185,59)` med blekk
  `rgb(23,18,10)`, `opacity: 1` og `disabled: false` på alle fem skjemasidene. På «Logg inn» og
  «Opprett konto» er den 382 × 49 / 13 / 16,5 — innloggingsbildets egen spaltebredde, urørt.
- **Spaltene** måles i DOM-en til **428 @ x 280 og 428 @ x 732** på begge barnesidene: 428 + 24 + 428.
- **Luften under underlinja** er **20 px** på alle fire feltene som bare bærer tittel og underlinje
  (ST-1065-regelen), og feltet ender 17 px under det laveste det bærer: 191.
- `scrollWidth = 1440` på alle ni.

Oversikt i dag mot med reglene: `rules-overview-1.png` (Mine oppgaver, Belønninger, Ny husstand,
Logg inn, Opprett konto) og `rules-overview-2.png` (Barnas innlogging, Glemt passord, Sett nytt
passord, Invitasjon). Under de tre parene som er like — «Mine oppgaver», «Logg inn» og «Opprett
konto» — står det nå én linje om at halvdelene er like med vilje, og hvor endringen er å se.

### Regel 7 på «Mine oppgaver (barn)»: det tiende og ellevte bildet

Astrid hadde rett: regel 7 var den eneste endringen jeg hevdet på den siden, og ingen fil viste
den — den innlastede siden traff reglene 1–4 fra før, så paret i arket er identisk. Her er
tilstanden der regelen faktisk gjelder, tegnet i begge halvdeler på samme måte som resten:

| | Fil | Hva som står der | Felt |
| --- | --- | --- | --- |
| I dag (51f41dc) | `today-mine-oppgaver-barn-laster-1440.png` | en snurrende ring og setningen «Laster oppgavene dine...» | **128** |
| Med reglene | `rules-mine-oppgaver-barn-laster-1440.png` | **tre plassholderrader**: hvite kort på **880 @ x 280**, hver **68 px høy med 13 px hjørne**, med en grå strek der oppgavenavnet kommer | **128** |

Det er regel 7s andre setning, ordrett: «While loading, it shows grey placeholder rows, not a
sentence.» Radene har samme **bredde, høyde og hjørne** som oppgaveradene de er i ferd med å bli
(880 @ x 280, 68 px, hjørne 13, 8 px mellom) — men ikke samme **plass**: de står øverst på siden,
der oppgavene får en seksjonsetikett over seg. `scrollWidth = 1440` i begge.

**Luften over radene er sidens egen, 21 px** (runde 2, Astrid). Regel 7 sier ingenting om plassen
over radene, så den skal ikke endres av regelen. Jeg målte den innlastede siden i nettleseren:
feltet slutter på **269,8**, `.page-content` begynner i samme punkt, og luften kommer fra det
første elementet i spalta — seksjonsetiketten, med `margin-top: 21px` (boks 290,8, blekk 294, altså
Astrids 24 px til blekket; første kort 314,6 = 44,8). De 21 pikslene er altså et tall som allerede
står i sidens CSS, ikke et jeg har funnet på. Plassholderradene tar nå den samme luften:

| Bilde | Felt slutter | Første hvite kort | Luft |
| --- | --- | --- | --- |
| **med reglene (rettet)** | 128 | **149** | **21 px** |
| med reglene (forrige runde) | 128 | 128 | 0 px |
| i dag, samme tilstand | 128 | snurrering 186,5 | 58,5 px |

Målt i pikslene på selve fila (DPR 2, kolonne x 700): siste gule rad 128, første hvite 149, og
imellom sidens papir `#F6F6F4`. Det andre tallet — 44,8, der første kort lander når siden er
innlastet — ville reservert plass til en etikett som ikke er tegnet mens det laster, så jeg valgte
sidens første-element-luft.

Regelen er skrudd til der den gjelder: `.page-content > .r7-skeleton:first-child`. **Kontroll på
del 1s side** (forelderens «Belønninger», fanen «Ønsker», godkjent bilde): feltet 191, radene
**262,6**, `margin-top: 0px`, og velgeren treffer **0 elementer** der — radene ligger i
`.requests-tab`, bak fanerada, så del 1s bilde kan ikke flytte seg. Målingen ligger i
`.st1410/luft3.js` → `luft-etter.json`.

**Én ting jeg fant da jeg målte dette, og som ingen av de 8 reglene retter:** mens siden laster,
bærer det gule feltet bare underlinja («søndag 18. oktober») og ingen tittel, så feltet er **128 px**
i stedet for 270. Grunnen er at barnets navn — som *er* tittelen på den siden (desktop-12) —
kommer i det samme svaret som oppgavelista. Jeg målte begge halvdelene: **128 px i dag og 128 px
med reglene**, altså uendret av regel 7, og det er ikke noe jeg har innført. Regel 2 sier likevel at
hver side bærer tittel og underlinje i feltet. Hva feltet skal vise før navnet er kjent, er et
spørsmål til Maria, ikke noe de 8 reglene svarer på.

## Én linje per side: hvilke regler endret den, og hva jeg valgte

| Side | Hva reglene gjorde | Åpent valg jeg tok |
| --- | --- | --- |
| **Mine oppgaver (barn)** | **Nesten ingenting** — den traff 1, 2, 3 og 4 fra før (880 @ 280, 26/800, felt 270, to 428-spalter), som ST-1345 sa. Bare **7**: lastingen var «Laster oppgavene dine…» og feilen bar tekst; nå er det plassholderrader og det hvite kortet. Paret i arket er derfor likt — det er meningen. | — |
| **Belønninger (barn)** | 1 (600 på x 420 → 880 på x 280), 4 (én stabel → to spalter), 7 («Henter belønninger…» → plassholderrader; «Ingen belønninger ennå!» og feilen → det hvite kortet med tittellinje, setning og hovedknapp). | Spaltene: **det du kan be om til venstre, det du har bedt om til høyre** (venter / hentet før / nei denne gangen). Feltet er **282** som i dag, og poengtallet står igjen der det står. |
| **Ny husstand (veiviser)** | 1 (480 på x 504 → 880 på x 280), 2 (bare fanerad, 80 → 191 med tittel og underlinje), 3 (30/800 inne i kortet → 26/800 i feltet), 4 (ett 428-skjema), 5 («Neste» 60,8 høy med 18 px etikett → 49/13/16,5 i spaltas bredde), 6 («Neste» var blek og grå, 2,67:1, før du skrev — nå gul fra start), 8 (🔔 over «Slå på påminnelser» er fjernet). | **Stegets eget spørsmål er sidetittelen** («Hva heter familien?»), med **«Steg 1 av 4»** som underlinje — samme ord som sto inni kortet, flyttet dit regel 2 sier. Framdriftsstreken (de fire strekene) står øverst i spalta. |
| **Logg inn** | **Ingenting.** Reglene 5–8 holdt allerede: hovedknapp 49/13/16,5, omrissknappene like store, øyet 44/10, gul knapp fra start med sjekk på trykk, norsk tekst, Diddit-merket. Bildet er med for å vise at reglene lar siden stå. | Regel 3 lar den beholde 34 px; regel 1 og 2 gjelder den ikke — veilederen gir innloggingen sitt eget merkeområde («no band; it has its own brand area»), det **634 px gule panelet**. |
| **Opprett konto** | **Ingenting**, samme som «Logg inn» — den deler `login.css`. | Som over. |
| **Barnas innlogging** | 1 (480 på x 512 → 880 på x 280), 2 (ikke noe gult noe sted → felt 191), 3 (40/800 → 26/800), 4 (ett 428-skjema), 5 («🚀 Logg inn» 78,4 høy med 24 px etikett → 49/13/16,5), 6 (knappen var blek og grå, 3,48:1, før du skrev), 8 (📧 🔐 🙈 og raketten er borte; øyet er tegnet; «Spor en forelder» → «**Spør** en forelder»). | Samme ord i feltet som i dag: «Velkommen tilbake!» / «La oss komme i gang med oppgavene dine». |
| **Glemt passord** | 1 (480 på x 528 → 880 på x 280), 2 (felt 191), 3 (30/800 engelsk → 26/800), 4 (ett 428-skjema), 5 + 6 («Send Reset Link» var blek, 3,48:1 → «Send lenke», gul, 49/13/16,5), 7 (kvitteringen er det hvite kortet), 8 (**hele siden var engelsk**: «Forgot Your Password?», «Enter your email and we'll send you a link…», «Email Address», «Send Reset Link», «Back to login»; og tekst-«Diddit!» → merket + ordmerket i feltet). | Tittelen er **«Glemt passord»** (sidenavnet i oppgaven) med underlinja **«Vi sender deg en lenke»**; den engelske setningen er flyttet ned som skjemaets ledetekst på norsk. |
| **Sett nytt passord** | 1 (400 på x 552 → 880 på x 280), 2 (felt 191), 3 (**24/600 `#15181C`, midtstilt** — appens letteste sidetittel → 26/800 blekk, venstre), 4 (ett 428-skjema), 5 (knappen var 336 × 49,6 med **6 px hjørne**), 6 (og **grå `#ECECE8`** — nå gul fra start), 7 (kvitteringen er det hvite kortet), 8 (👁️ / 👁️‍🗨️ → det tegnede øyet). | Underlinja: **«Velg et passord du husker»**. Knappen heter «Sett passordet» (samme handling som «Tilbakestill passord», i sidens egen tittelform). |
| **Invitasjon (lenke)** | 1 (440 på x 532 → 880 på x 280), 2 (felt 191), 3 (ingen 26/800-tittel → «Invitasjon»), 4 (én 428-spalte med de to handlingene), 5 (begge knappene 49/13/16,5 — hovedknapp og omriss), 7 (feil og kvittering er det samme hvite kortet), 8 (**hele siden var engelsk**: «Household Invitation», «You've been invited…», «Accept Invitation», «Decline»). | Begge halvdelene i paret viser **innlogget** tilstand (godta/avslå), ikke «logg inn først». Underlinja: «Du er invitert inn i en husstand». |

## Valgene som skal til Maria

### 1. Det hvite kortet rundt skjemaet er borte på fem sider

**«Ny husstand», «Barnas innlogging», «Glemt passord», «Sett nytt passord» og «Invitasjon» legger
feltene rett på papiret.** Ingen av de 8 reglene ber om det, og jeg skrev det ikke ned første
gang. Her er det, som det valget det er.

I dag står hver av de fem i sitt eget hvite kort (veiviseren i et 480 px kort, barnas innlogging i
et 480 px, og så videre). Med reglene er kortet borte: `r4-form` setter etikett, felt og knapp
rett i 428-spalta, med `background: transparent` der kortet var.

**Hvorfor jeg valgte det:**

- **Det signerte innloggingsbildet gjør det samme.** `login-19` har ikke noe kort rundt skjemaet:
  `main.paper > .column > h1 + form` legger feltene rett på papiret. Disse fem er skjemaer av
  samme slag, og rett ved siden av «Logg inn» i settet.
- **Regel 7 gir det hvite kortet en jobb.** Kortet er tomt-, laste- og feiltilstanden. Bruker
  skjemaet det også, betyr hvitt kort to ting på samme side. På «Glemt passord» og «Sett nytt
  passord» står begge på skjermen etter hverandre — skjemaet, så kvitteringen.
- **Regel 4 nevner bare spalta**, ikke noe kort: «One 428 px column for a form or a short list.»

**Hvorfor det likevel er Marias avgjørelse:** del 1, som er godkjent, **beholder kortet rundt
skjemagruppa** — «Profil» på Innstillinger står i sin `settings-card`. Stig ser de to settene
sammen, og da leser forskjellen som en inkonsekvens og ikke som et valg. De to utfallene:

| | Hva som skjer | Følge |
| --- | --- | --- |
| **A — som nå** | de fem skjemasidene uten kort, som `login-19` | del 1s «Profil» har kort, del 2s skjemaer ikke |
| **B — kortet tilbake** | de fem skjemaene i et hvitt 428-kort | likt del 1; men da må regel 7 få en annen form for tomt/laster/feil, ellers er hvitt kort to ting |

Jeg anbefaler **A** og er klar til å tegne **B** på en halvtime hvis Maria vil ha det. Dette er en
endring av utseendet, så det er ikke min avgjørelse.

### 2. De fire innloggingssidene får Diddit-merket i sitt eget gule felt

Regel 1 sier at en sides
venstre kant er venstre kant av Diddit-merket **i menyen** — og disse fire sidene har ingen meny.
Jeg lot dem bære merket selv: den samme 80 px gule raden som menyens fanerad, samme 880 px, samme
oppsett (merke 36 + ordmerke 26/800 blekk), uten faner og uten initialmerke, siden ingen er logget
inn ennå. Da får både regel 1 (venstre kant = merket, x 280) og regel 2 (tittel og underlinje i
det gule feltet, 191) noe å feste seg i, uten å finne på noe nytt: hver verdi er hentet fra
`app-top-tabs` eller fra innloggingsbildet.

Alternativet var å gi dem innloggingens **634 px gule panel**. Det ville vært nærmere
`login-19`, men det er regel 3 som peker den andre veien: den gir bare «Logg inn» og «Opprett
konto» unntak, og sier dermed at de andre innloggingssidene ikke er innloggingsbildet.

## Verste tilfelle (`rules-verste-tilfelle-2.png`)

Barnenavn på 28 tegn, seks oppgaver med 66 tegns titler, **tom** belønningsliste med 1480 poeng på
kontoen, husstandsnavn på 44 tegn i veiviseren, og de tre innloggingsskjemaene **trykket tomme**.

- **Ingenting renner ut vannrett:** `scrollWidth = 1440` i alle seks, tittelen står på 26/800 @ 280
  og spaltene på 428 + 24 + 428 (ett 428-skjema på innloggingssidene).
- **Regel 6 er det man ser best:** ingen av de tre skjemaene er en blindvei. Knappen er gul fra
  start, og trykket skriver feilen under feltet den gjelder — «Vennligst oppgi en gyldig
  e-postadresse», «Passordet må være minst 8 tegn», «Passordene samsvarer ikke».
- Lange oppgavetitler brekker til to linjer i en høyere rad; den tomme belønningslista er det
  hvite kortet, ikke en bar setning.

## Tre ting reglene ikke rører

1. **Barnas to felt er fortsatt ulike** (ST-1345 **F8**): «Mine oppgaver» setter poengtallet til
   høyre for navnet (desktop-12), «Belønninger» stabler det under underlinja, derav 270 mot 282.
   Ingen av de 8 reglene sier hvor i feltet poengtallet skal stå, så jeg flyttet det ikke.
2. **Fanestripa «Ønsker / Belønninger»** finnes ikke på barnets side; den er foreldrenes (del 1).
3. **Veiviserens steg 2–5** (QR-koder, oppgavevalg, påminnelser) er de samme sidene som i dag, med
   reglenes ramme rundt. Bildet viser steg 1, som er det siden åpner på.
   **Vær klar over** (Astrids notat): 🔔-en over «Slå på påminnelser» er tatt bort i koden som
   regel 8 ber om, men den sto på **påminnelsessteget**, og det steget er ikke tegnet. Påstanden
   står derfor i teksten uten et bilde bak seg. De andre emojiene i punktet (📧 🔐 🙈, raketten,
   👁️) er på sider som *er* tegnet.

**Og én ting jeg rettet etter Astrids notat:** invitasjonens ledetekst sto «Du er invitert inn i en
husstand. Vil du godta invitasjonen?» rett under en underlinje som sa «Du er invitert inn i en
husstand» — den samme setningen to ganger. Regel 2 er den som flyttet setningen opp i feltet, så
gjentakelsen er min; ledeteksten er nå bare spørsmålet: **«Vil du godta invitasjonen?»**
`rules-invitasjon-1440.png` og `rules-overview-2.png` er tegnet på nytt etter den rettelsen.

## WCAG

Ingen ny farge, ingen ny skrift, ingen ny komponent: feltetiketten er 13 px `#15181C` på hvitt,
ledeteksten `#555E64` på papiret (6,12:1), lenkene `#8A5A00`, feillinja rusten `#A43A16`, og blekk
på gult er 10,57:1 som før.

**Tre ting ble bedre av reglene:**

- **W2 · 3.1.1 Språk:** «Glemt passord» og invitasjonssiden var engelske inne i en norsk app. Nå er
  de norske.
- **W4 · 1.1.1:** emojiene som ikoner er borte — 📧 🔐 🙈 og raketten på barnas innlogging, 👁️ på
  «Sett nytt passord», 🔔 i veiviseren. En skjermleser leste dem opp ved navn.
- **Regel 6 fjerner de grå blindveiene ST-1345 målte:** veiviserens «Neste» (2,67:1), barnas
  «Logg inn» (3,48:1) og «Send Reset Link» (3,48:1). Knappen er gul fra start, og sjekken skjer på
  trykket, som innloggingen alltid har gjort.
