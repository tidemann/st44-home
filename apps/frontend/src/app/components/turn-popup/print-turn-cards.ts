import '@angular/localize/init';

export interface TurnCard {
  taskName: string;
  points: number;
  qrDataUrl: string;
  link: string;
  householdName: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The printed card of an «Etter tur» chore (ST-2075, «Printed card and NFC sticker» on
 * ST-2066): four A6 cards (105 × 148 mm) on one A4 sheet with cut marks. One for the
 * place, one spare, two for the next chores. Printed without scaling the code is 52 mm.
 */
export function cardSheetHtml(card: TurnCard): string {
  const name = escapeHtml(card.taskName);
  const sub = escapeHtml($localize`:@@turnCard.sub:Etter tur · ${card.points}:points: poeng`);
  const scan = escapeHtml($localize`:@@turnCard.scan:Skann koden når du er ferdig`);
  const how = escapeHtml(
    $localize`:@@turnCard.how:Hold kameraet over koden. Telefonen åpner Diddit, og poengene er dine.`,
  );
  const foot = escapeHtml(
    [card.householdName, card.link.replace(/^https?:\/\//, '')].filter(Boolean).join(' · '),
  );
  const one = `
    <section class="card">
      <header><span class="mark">✓</span><span class="word">Diddit</span></header>
      <h1>${name}</h1>
      <p class="sub">${sub}</p>
      <img class="qr" src="${card.qrDataUrl}" alt="" />
      <p class="scan">${scan}</p>
      <p class="how">${how}</p>
      <p class="foot">${foot}</p>
    </section>`;
  return `<!doctype html>
<html lang="no"><head><meta charset="utf-8"><title>${name}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #17120a; }
  .sheet { width: 210mm; height: 297mm; display: grid;
    grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; }
  .card { position: relative; display: flex; flex-direction: column; align-items: center;
    padding: 0 8mm 6mm; text-align: center; border: 0.2mm dashed #b8b8b0; }
  header { align-self: stretch; margin: 0 -8mm 6mm; height: 24mm; padding: 0 8mm;
    display: flex; align-items: center; gap: 3mm; background: #f6b93b;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .mark { width: 11mm; height: 11mm; border-radius: 3mm; background: #17120a; color: #f6b93b;
    display: flex; align-items: center; justify-content: center; font-size: 7mm; font-weight: 700; }
  .word { font-size: 7mm; font-weight: 700; letter-spacing: -0.02em; }
  h1 { margin: 0; font-size: 6mm; line-height: 1.15; letter-spacing: -0.02em; }
  .sub { margin: 1.5mm 0 4mm; font-size: 3.4mm; color: #555e64; }
  .qr { width: 52mm; height: 52mm; image-rendering: pixelated; }
  .scan { margin: 4mm 0 1mm; font-size: 3.8mm; font-weight: 600; }
  .how { margin: 0; font-size: 3mm; line-height: 1.4; color: #555e64; }
  .foot { margin: auto 0 0; font-size: 2.6mm; color: #555e64; }
</style></head>
<body><main class="sheet">${one}${one}${one}${one}</main></body></html>`;
}

/** Opens the sheet in a new window and the print dialog, as the child QR card does */
export function printTurnCards(card: TurnCard): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(cardSheetHtml(card));
  win.document.close();
  // A written about:blank window has no reliable load event; the inline image is ready by then
  setTimeout(() => win.print(), 300);
}
