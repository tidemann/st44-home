const {PNG}=require('pngjs');const fs=require('fs');
const [src,out,x,y,w,h,s]=process.argv.slice(2);
const p=PNG.sync.read(fs.readFileSync(src));
const X=+x*2,Y=+y*2,W=+w*2,H=+h*2,S=+(s||1);
const o=new PNG({width:W*S,height:H*S});
for(let j=0;j<H*S;j++)for(let i=0;i<W*S;i++){
  const si=((Y+Math.floor(j/S))*p.width+(X+Math.floor(i/S)))<<2, di=(j*W*S+i)<<2;
  for(let k=0;k<4;k++)o.data[di+k]=p.data[si+k];
}
fs.writeFileSync(out,PNG.sync.write(o));
console.log('wrote',out,W*S,'x',H*S);
