// ST-1409 — the acceptance check Astrid will run, in numbers.
const f=require(process.argv[2]+'/fingerprint.json');
const m=require(process.argv[2]+'/measure.json');
const key={home:'home',tasks:'tasks',family:'family',rewards:'rewards',settings:'settings',progress:'progress',households:'households','household-settings':'household-settings',invitations:'invitations'};
const row=(n)=>{
  const v=f[n+'@1440']; const q=m[n];
  const h=v.heads.find(x=>x.tag==='H1');
  const c=v.content;
  const ok=(b)=>b?'ok':'NO';
  return [n.padEnd(20),
    'width '+(c?Math.round(c.w):'-')+' @ x'+(c?Math.round(c.L):'-')+' '+ok(c&&Math.round(c.w)===880&&Math.round(c.L)===280),
    '| title '+(h?h.size+'/'+h.weight+' x'+Math.round(h.x):'none')+' '+ok(h&&h.size==='26px'&&h.weight==='800'&&Math.round(h.x)===280),
    '| band '+q.band,
  ].join(' ');
};
for(const n of Object.keys(key))console.log(row(n));
