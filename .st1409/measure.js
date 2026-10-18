const fs=require('fs');const {PNG}=require('pngjs');
const dir=process.argv[2];
const YEL=[246,185,59];
const names=['home','tasks','family','rewards','settings','progress','households','household-settings','invitations'];
const out={};
for(const n of names){
  const f=`${dir}/${n}-1440.png`;
  if(!fs.existsSync(f)){console.log(n,'MISSING');continue;}
  const p=PNG.sync.read(fs.readFileSync(f));
  let band=0;
  for(let y=0;y<p.height;y++){const i=(p.width*y+4)<<2;
    const d=Math.abs(p.data[i]-YEL[0])+Math.abs(p.data[i+1]-YEL[1])+Math.abs(p.data[i+2]-YEL[2]);
    if(d<20)band=y+1;else if(y>10)break;}
  // ink runs in the title column
  const runs=[];let cur=null;
  for(let y=0;y<Math.min(band+10,p.height);y++){
    let ink=0;
    for(let x=280;x<780;x++){const i=(p.width*y+x)<<2;
      const l=0.2126*p.data[i]+0.7152*p.data[i+1]+0.0722*p.data[i+2];
      if(l<110)ink++;}
    if(ink>0){if(!cur)cur={a:y,b:y};else cur.b=y;}else{if(cur){runs.push(cur);cur=null;}}
  }
  if(cur)runs.push(cur);
  // left/right edge of painted (white card) content below the band
  let L=9999,R=-1;
  for(let y=band+4;y<Math.min(p.height,band+600);y++){
    for(let x=0;x<p.width;x++){const i=(p.width*y+x)<<2;
      if(p.data[i]>250&&p.data[i+1]>250&&p.data[i+2]>250){if(x<L)L=x;if(x>R)R=x;}}
  }
  out[n]={band,runs:runs.map(r=>[r.a,r.b+1]),white:[L,R+1,R+1-L]};
  console.log(n.padEnd(22),'band',String(band).padStart(4),'| title/sub runs',runs.slice(1).map(r=>`${r.a}-${r.b+1}`).join(' ').padEnd(22),'| white card span',L<9999?`${L}..${R+1} (${R+1-L})`:'-');
}
fs.writeFileSync(`${dir}/measure.json`,JSON.stringify(out,null,1));
