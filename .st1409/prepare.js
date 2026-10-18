// ST-1409 — name the pictures as the task asks, and build the thumbnails the sheet uses.
const fs=require('fs');const {PNG}=require('pngjs');
const S=process.env.PAPERCLIP_RUN_SCRATCH_DIR;
const OUT=__dirname+'/out';
fs.mkdirSync(OUT,{recursive:true});
const PAGES=[
 ['hjemme','home','Hjemme'],
 ['oppgaver','tasks','Oppgaver'],
 ['familie','family','Familie'],
 ['belonninger','rewards','Belønninger (forelder)'],
 ['innstillinger','settings','Innstillinger'],
 ['fremgang','progress','Fremgang'],
 ['husholdninger','households','Husholdninger'],
 ['husholdningsinnstillinger','household-settings','Husholdningsinnstillinger'],
 ['invitasjoner','invitations','Invitasjoner'],
];
// crop to a common height so the pair reads at one scale
const CROP=1100;
const crop=(src,dst,h)=>{
  const p=PNG.sync.read(fs.readFileSync(src));
  const H=Math.min(h,p.height);
  const o=new PNG({width:p.width,height:h});
  o.data.fill(246); // #F6F6F4-ish paper under a short page
  for(let y=0;y<h;y++)for(let x=0;x<p.width;x++){
    const d=(h*0+y)*p.width*4+x*4;
    if(y<H){const si=(y*p.width+x)<<2;o.data[d]=p.data[si];o.data[d+1]=p.data[si+1];o.data[d+2]=p.data[si+2];o.data[d+3]=255;}
    else {o.data[d]=246;o.data[d+1]=246;o.data[d+2]=244;o.data[d+3]=255;}
  }
  fs.writeFileSync(dst,PNG.sync.write(o));
  return {full:p.height};
};
const rows=[];
for(const [slug,name,label] of PAGES){
  const now=`${S}/final/${name}-1440.png`;
  const todaySrc=name==='progress'?`${S}/today/progress-loaded-1440.png`:`${S}/today/${name}-1440.png`;
  fs.copyFileSync(now,`${OUT}/rules-${slug}-1440.png`);
  const a=crop(todaySrc,`${OUT}/t-today-${slug}.png`,CROP);
  const b=crop(now,`${OUT}/t-rules-${slug}.png`,CROP);
  rows.push({slug,label,todayH:a.full,rulesH:b.full});
  console.log(label.padEnd(30),'today',a.full,'→ with the rules',b.full);
}
fs.writeFileSync(OUT+'/rows.json',JSON.stringify(rows,null,1));
