const fs=require('fs');const {PNG}=require('pngjs');
const S=process.env.S;
const files=['home-1440.png','tasks-1440.png','family-1440.png','rewards-1440.png','settings-1440.png','progress-loaded-1440.png','households-1440.png','household-settings-1440.png','invitations-1440.png'];
const YEL=[246,185,59];
for(const f of files){
  const p=PNG.sync.read(fs.readFileSync(`${S}/today/${f}`));
  const sf=p.width/1440; // device scale
  // band height: yellow run at x=4
  let band=0;
  for(let y=0;y<p.height;y++){const i=(p.width*y+4)<<2;
    const d=Math.abs(p.data[i]-YEL[0])+Math.abs(p.data[i+1]-YEL[1])+Math.abs(p.data[i+2]-YEL[2]);
    if(d<20)band=y+1;else if(y>10)break;}
  // ink runs in the title column (container x 280..700 at css) inside band
  const x0=Math.round(280*sf),x1=Math.round(760*sf);
  const runs=[];let cur=null;
  for(let y=0;y<Math.min(band+Math.round(60*sf),p.height);y++){
    let ink=0;
    for(let x=x0;x<x1;x++){const i=(p.width*y+x)<<2;
      const l=0.2126*p.data[i]+0.7152*p.data[i+1]+0.0722*p.data[i+2];
      if(l<110)ink++;}
    if(ink>0){if(!cur)cur={a:y,b:y};else cur.b=y;}
    else{if(cur){runs.push(cur);cur=null;}}
  }
  if(cur)runs.push(cur);
  console.log(f.padEnd(30),'scale',sf,'band',(band/sf).toFixed(1),'runs:',runs.map(r=>`${(r.a/sf).toFixed(1)}-${((r.b+1)/sf).toFixed(1)}`).join(' '));
}
