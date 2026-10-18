// ST-1410 — the acceptance check Astrid will run, in numbers.
const f = require(process.argv[2] + '/fingerprint.json');
const m = require(process.argv[2] + '/measure.json');
const NAMES = ['child-my-tasks','child-my-rewards','setup-wizard','login','register','child-login','forgot-password','reset-password','invitation-accept'];
// Rule 3 keeps 34 px only on «Logg inn» and «Opprett konto»
const BIG = new Set(['login', 'register']);
const row = (n) => {
  const v = f[n + '@1440'];
  const q = m[n] || {};
  const h = v.heads.find((x) => x.tag === 'H1');
  const c = v.content;
  const want = BIG.has(n) ? '34px' : '26px';
  const ok = (b) => (b ? 'ok' : 'NO');
  const widthOk = BIG.has(n) ? true : c && Math.round(c.w) === 880 && Math.round(c.L) === 280;
  return [
    n.padEnd(20),
    'width ' + (c ? Math.round(c.w) : '-') + ' @ x' + (c ? Math.round(c.L) : '-') + ' ' + ok(widthOk),
    '| title ' + (h ? h.size + '/' + h.weight + ' x' + Math.round(h.x) : 'none') + ' ' + ok(h && h.size === want && h.weight === '800'),
    '| band ' + (q.band === undefined ? '-' : q.band),
    '| buttons ' + Object.keys(v.buttons).map((k) => k.split('|').slice(0, 2).join('/')).join(' '),
  ].join(' ');
};
for (const n of NAMES) console.log(row(n));
