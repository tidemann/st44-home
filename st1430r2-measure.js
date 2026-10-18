// ST-1430 round 2 — measured in the rendered pixels of the new right-hand halves.
// Re-measures what the round-1 review (ST-1443) sent back, and keeps a control on what
// it passed. usage: node st1430r2-measure.js
const fs = require('fs');
const { PNG } = require('pngjs');

const D = 2; // deviceScaleFactor
const read = (p) => PNG.sync.read(fs.readFileSync(p));
const px = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
const lum = (c) => {
  const v = c.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

// leftmost column inside a CSS box that carries ink
const firstInkX = (img, box) => {
  for (let x = Math.round(box.x * D); x < Math.round((box.x + box.w) * D); x++) {
    for (let y = Math.round(box.y * D); y < Math.round((box.y + box.h) * D); y++) {
      const c = px(img, x, y);
      if (c[0] < 170 && c[1] < 170 && c[2] < 170) return Math.round((x / D) * 10) / 10;
    }
  }
  return null;
};

const out = [];
const say = (s) => {
  out.push(s);
  console.log(s);
};

const fp = JSON.parse(fs.readFileSync('.st1430/rules2/fingerprint.json', 'utf8'));

say('# ST-1430 round 2 — the numbers the review sent back, re-measured');
say('');
say('Everything below is read off `.st1430/rules2/*.png` and `.st1430/press/*.png`');
say('(1440 × 900, deviceScaleFactor 2) and the DOM fingerprints taken in the same frame.');
say('');

// ---- A2 / A3 — the text box ---------------------------------------------------------
say('## A2 and A3 — the text box is the same field as the others');
say('');
say('| Popup | text box | fill (pixels) | first ink | inset | edge | round 1 |');
say('| --- | --- | --- | --- | --- | --- | --- |');
for (const [name, label] of [
  ['ny-oppgave', '«Beskrivelse»'],
  ['rediger-oppgave', '«Beskrivelse»'],
  ['inviter', '«Personlig melding»'],
]) {
  const img = read(`.st1430/rules2/${name}.png`);
  const t = (fp[name].fields || []).find((f) => f.tag === 'TEXTAREA');
  // fill: 40 px in, 6 px below the top edge — inside the box, clear of its border and text
  const fill = px(img, Math.round((t.x + 40) * D), Math.round((t.y + 6) * D));
  const ink = firstInkX(img, { x: t.x + 5, y: t.y + 8, w: t.w - 10, h: t.h - 16 });
  const inset = ink === null ? null : Math.round((ink - t.x) * 10) / 10;
  const r1 = name === 'inviter' ? '183 px wide, ~2 px inset, Paper' : 'Paper `#F6F6F4`';
  say(`| ${label} (${name}) | **${t.w} × ${t.h} px** at x ${t.x} | ${hex(fill)} | x ${ink} | **${inset} px** | ${t.border} | ${r1} |`);
}

// the e-post field in the same popup, as the control the review used
const e = (fp['inviter'].fields || []).find((f) => f.type === 'email');
if (e) {
  const img = read('.st1430/rules2/inviter.png');
  const ink = firstInkX(img, { x: e.x + 5, y: e.y + 8, w: e.w - 10, h: e.h - 16 });
  say('');
  say(`Control, the e-post field in the same popup: **${e.w} × ${e.h} px** at x ${e.x}, first ink x ${ink} = **${Math.round((ink - e.x) * 10) / 10} px** inset. The text box and the field are now the same column and the same inset.`);
}

// ---- control on rules 1 and 2 --------------------------------------------------------
say('');
say('## Control — rules 1, 2 and 8 still hold after the round-2 changes');
say('');
say('| Popup | surface | air over / under | title |');
say('| --- | --- | --- | --- |');
for (const [name, v] of Object.entries(fp)) {
  if (!v.surface) continue;
  const s = v.surface;
  const offer = name === 'varsler' || name === 'hjemskjerm';
  const air = offer
    ? `right ${s.right} / bottom ${s.bottom} px`
    : `${s.y} / ${Math.round((900 - (s.y + s.h)) * 10) / 10} px`;
  say(`| ${name} | x ${s.x}, y ${s.y}, **${s.w} × ${s.h} px** | ${air} | ${v.title ? v.title.size : '—'} |`);
}

// edges measured in the pixels, in a window around the popup — a full-row scan reads the
// page behind the veil as if it were the edge
say('');
say('| Popup | left edge / right edge (pixels, windowed) | width | edge colour |');
say('| --- | --- | --- | --- |');
for (const [name, v] of Object.entries(fp)) {
  if (!v.surface) continue;
  const img = read(`.st1430/rules2/${name}.png`);
  const s0 = v.surface;
  const y = Math.round((s0.y + s0.h / 2) * D);
  const win = 8;
  const dark = (x) => {
    const c = px(img, x, y);
    return c[0] < 170 && c[1] < 170 && c[2] < 170;
  };
  let left = null;
  for (let x = Math.round((s0.x - win) * D); x <= Math.round((s0.x + win) * D); x++) if (dark(x)) { left = x; break; }
  let right = null;
  for (let x = Math.round((s0.x + s0.w + win) * D); x >= Math.round((s0.x + s0.w - win) * D); x--) if (dark(x)) { right = x; break; }
  const col = left === null ? null : px(img, left, y);
  say(`| ${name} | x ${left === null ? '—' : left / D} … ${right === null ? '—' : (right + 1) / D} | **${left === null || right === null ? '—' : (right + 1 - left) / D} px** | ${col ? hex(col) : '—'} |`);
}

// ---- rule 4, the press state ---------------------------------------------------------
const pf = JSON.parse(fs.readFileSync('.st1430/press/press-fingerprint.json', 'utf8'));
say('');
say('## Rule 4 — the six popups, pressed on an incomplete form');
say('');
say('| Popup | main action | fill | `disabled` | field in error | the line under that field |');
say('| --- | --- | --- | --- | --- | --- |');
for (const [name, v] of Object.entries(pf)) {
  const m = (v.mainAction || [])[0];
  const f = (v.flaggedFields || [])[0];
  const er = (v.errors || []).find((x) => x.color === 'rgb(164, 58, 22)') || (v.errors || [])[0];
  const img = read(`.st1430/press/${name}-press.png`);
  // the fill, read in the pixels at the centre of the action
  const fillPx = m ? px(img, Math.round((m.x + m.w / 2) * D), Math.round((m.y + 8) * D)) : null;
  const inkRatio = er ? ratio([164, 58, 22], [255, 255, 255]) : null;
  const rgbOf = (str) => (str.match(/\d+/g) || []).slice(0, 3).map(Number);
  const labelRatio = m ? ratio(rgbOf(m.label), fillPx) : null;
  say(
    `| ${name} | «${m ? m.t : '—'}» ${m ? m.w + ' × ' + m.h + ' px' : ''} | ${fillPx ? hex(fillPx) : '—'}, label ${labelRatio}:1 | **${m ? m.disabled : '?'}** | ${f ? '#' + f.id + ' ' + f.border : '—'} | «${er ? er.t : '—'}» ${er ? er.size + ' ' + er.color + ', ' + inkRatio + ':1' : ''} |`,
  );
}

// ---- rule 6: what the closed field is, and what it is not ----------------------------
say('');
say('## Rule 6 — the closed field, which is all a picture can hold');
say('');
say('| Popup | `<select>` | appearance | caret | height |');
say('| --- | --- | --- | --- | --- |');
for (const [name, v] of Object.entries(fp)) {
  const sel = (v.fields || []).filter((f) => f.tag === 'SELECT');
  for (const s of sel) say(`| ${name} | yes | ${s.appearance} | ${s.caret} | ${s.h} px |`);
}

fs.writeFileSync('.st1430/round2-measurements.md', out.join('\n') + '\n');
console.log('\nwritten: .st1430/round2-measurements.md');
