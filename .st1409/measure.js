const fs=require('fs');const {PNG}=require('pngjs');
const dir=process.argv[2];
const YEL=[246,185,59];
const names=['home','tasks','family','rewards','settings','progress','households','household-settings','invitations'];
const out={};
for(const n of names){
  const f=`${dir}/${n}-1440.png`;
  if(!fs.existsSync(f)){console.log(n,'MISSING');continue;}
  const p=PNG.sync.read(fs.readFileSync(f));
  // ST-1409 round 2: the set is shot at deviceScaleFactor 2, as the signed-off
  // pictures and the guide's own numbers are. Measure in device pixels, report CSS.
  const sf=p.width/1440;
  const R=(v)=>Math.round((v/sf)*10)/10;
  let band=0;
  for(let y=0;y<p.height;y++){const i=(p.width*y+4)<<2;
    const d=Math.abs(p.data[i]-YEL[0])+Math.abs(p.data[i+1]-YEL[1])+Math.abs(p.data[i+2]-YEL[2]);
    if(d<20)band=y+1;else if(y>10)break;}
  // ink runs in the title column
  const runs=[];let cur=null;
  for(let y=0;y<Math.min(band+Math.round(10*sf),p.height);y++){
    let ink=0;
    for(let x=Math.round(280*sf);x<Math.round(780*sf);x++){const i=(p.width*y+x)<<2;
      const l=0.2126*p.data[i]+0.7152*p.data[i+1]+0.0722*p.data[i+2];
      if(l<110)ink++;}
    if(ink>0){if(!cur)cur={a:y,b:y};else cur.b=y;}else{if(cur){runs.push(cur);cur=null;}}
  }
  if(cur)runs.push(cur);
  // left/right edge of painted (white card) content below the band
  let L=9999,L2=-1;
  for(let y=band+Math.round(4*sf);y<Math.min(p.height,band+Math.round(600*sf));y++){
    for(let x=0;x<p.width;x++){const i=(p.width*y+x)<<2;
      if(p.data[i]>250&&p.data[i+1]>250&&p.data[i+2]>250){if(x<L)L=x;if(x>L2)L2=x;}}
  }
  out[n]={dpr:sf,band:R(band),runs:runs.map(r=>[R(r.a),R(r.b+1)]),white:[R(L),R(L2+1),R(L2+1-L)]};
  console.log(n.padEnd(22),'band',String(R(band)).padStart(6),'| title/sub runs',runs.slice(1).map(r=>`${R(r.a)}-${R(r.b+1)}`).join(' ').padEnd(24),'| white card span',L<9999?`${R(L)}..${R(L2+1)} (${R(L2+1-L)})`:'-');
}
fs.writeFileSync(`${dir}/measure.json`,JSON.stringify(out,null,1));
