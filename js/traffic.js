const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const $=id=>document.getElementById(id);
const DYN=[5.4796,51.4399]; // lon, lat of Dynamo (approximate)
const merc=(lon,lat)=>{const s=Math.sin(lat*Math.PI/180);return [(lon+180)/360,0.5-Math.log((1+s)/(1-s))/(4*Math.PI)]};
const D=merc(...DYN), MPU=40075016.686*Math.cos(DYN[1]*Math.PI/180);
const ANG=-18*Math.PI/180;
const loc=(x,y)=>[D[0]+(x*Math.cos(ANG)-y*Math.sin(ANG))/MPU, D[1]-(x*Math.sin(ANG)+y*Math.cos(ANG))/MPU];
const DOOR=loc(0,-17);

// seeded random
let seed=7;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const rr=(a,b)=>a+rnd()*(b-a);
const gauss=()=>(rnd()+rnd()+rnd()+rnd()-2)*1.2;

// ---------- geography (simplified) ----------
const NL=[[4.85,52.97],[4.70,52.85],[4.62,52.62],[4.58,52.46],[4.53,52.37],[4.43,52.24],[4.27,52.10],[4.12,51.98],[3.92,51.84],[3.85,51.76],[3.70,51.65],[3.55,51.60],[3.45,51.57],[3.58,51.45],[3.38,51.37],[3.60,51.30],[3.95,51.21],[4.24,51.36],[4.28,51.45],[4.45,51.47],[4.78,51.40],[4.95,51.43],[5.10,51.38],[5.25,51.32],[5.48,51.30],[5.60,51.20],[5.72,51.18],[5.78,51.05],[5.75,50.92],[5.69,50.80],[5.70,50.75],[5.84,50.76],[6.02,50.75],[6.08,50.86],[6.00,50.93],[6.05,51.00],[6.18,51.10],[6.08,51.20],[6.17,51.36],[6.22,51.55],[6.05,51.75],[5.95,51.82],[6.15,51.86],[6.40,51.83],[6.45,51.92],[6.75,51.92],[6.83,51.98],[6.99,52.22],[7.07,52.40],[7.03,52.64],[7.20,52.82],[7.20,53.05],[7.05,53.18],[7.20,53.25],[6.93,53.32],[6.60,53.36],[6.20,53.40],[5.90,53.40],[5.60,53.31],[5.42,53.18],[5.33,53.07],[5.05,52.94]];
const LAKE=[[5.05,52.93],[5.33,53.06],[5.40,52.86],[5.65,52.80],[5.62,52.62],[5.45,52.50],[5.30,52.42],[5.10,52.35],[4.97,52.38],[5.03,52.55],[5.07,52.70]];
const CITIES=[['Amsterdam',4.895,52.37],['Rotterdam',4.48,51.92],['Den Haag',4.31,52.08],['Utrecht',5.12,52.09],['Groningen',6.57,53.22],['Leeuwarden',5.80,53.20],['Zwolle',6.08,52.52],['Enschede',6.89,52.22],['Arnhem',5.90,51.98],['Nijmegen',5.85,51.84],['Den Bosch',5.30,51.70],['Tilburg',5.09,51.556],['Breda',4.78,51.59],['Maastricht',5.69,50.85],['Venlo',6.17,51.37],['Heerlen',5.98,50.89],['Antwerp',4.40,51.22],['Düsseldorf',6.78,51.23]];
const ENTRY={N:[[5.48,51.49],[5.481,51.4455]],W:[[5.40,51.455],[5.470,51.4425]],E:[[5.56,51.445],[5.488,51.4425]],S:[[5.47,51.385],[5.478,51.4375]]};
const ROUTES=[
['N',260,[4.895,52.37],[5.12,52.09],[5.30,51.70],[5.42,51.56]],
['W',200,[4.48,51.92],[4.78,51.59],[5.09,51.556]],
['W',150,[4.31,52.08],[4.48,51.92],[4.78,51.59],[5.09,51.556]],
['N',170,[5.12,52.09],[5.30,51.70],[5.42,51.56]],
['N',70,[5.90,51.98],[5.85,51.84],[5.62,51.66]],
['N',70,[5.85,51.84],[5.62,51.66]],
['N',60,[6.57,53.22],[6.09,52.52],[5.90,51.98],[5.62,51.66]],
['N',40,[5.80,53.20],[5.95,52.80],[6.08,52.52],[5.90,51.98],[5.62,51.66]],
['N',60,[6.08,52.52],[5.90,51.98],[5.62,51.66]],
['N',40,[6.89,52.22],[6.30,52.05],[5.90,51.98],[5.62,51.66]],
['N',110,[5.30,51.70],[5.42,51.56]],
['W',120,[5.09,51.556]],
['W',100,[4.78,51.59],[5.09,51.556]],
['W',70,[4.40,51.22],[4.95,51.33],[5.25,51.38]],
['S',90,[5.69,50.85],[5.71,51.25],[5.55,51.35]],
['S',40,[5.98,50.89],[5.80,51.15],[5.60,51.33]],
['E',70,[6.17,51.37],[5.85,51.42],[5.66,51.48]],
['E',50,[6.78,51.23],[6.17,51.37],[5.85,51.42],[5.66,51.48]]
];

// ---------- path generation ----------
function spline(P,n){const o=[];for(let i=0;i<P.length-1;i++){const a=P[Math.max(0,i-1)],b=P[i],c=P[i+1],d=P[Math.min(P.length-1,i+2)];
 for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=j=>0.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3);o.push([f(0),f(1)])}}
 o.push(P[P.length-1]);return o}
function mkPath(pts){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])});return {pts,b:[x0,y0,x1,y1]}}
const national=[];
ROUTES.forEach(r=>{
  const wp=r.slice(2).concat(ENTRY[r[0]]).map(p=>merc(...p)).concat([DOOR]);
  for(let i=0;i<r[1];i++){
    const P=wp.map((p,j)=>j===0||j===wp.length-1?p:[p[0]+gauss()*0.00006,p[1]+gauss()*0.00006]);
    const s=spline(P,14),amp=gauss()*0.00028,w=gauss()*0.00018,ph=rnd()*6.28,fr=rr(2,6),N=s.length-1;
    const out=s.map((p,j)=>{const q=s[Math.min(N,j+1)],o=s[Math.max(0,j-1)];let dx=q[0]-o[0],dy=q[1]-o[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
      const t=j/N,env=Math.pow(Math.sin(Math.PI*t),0.8),off=(amp+w*Math.sin(t*fr*3.14+ph))*env;return [p[0]-dy*off,p[1]+dx*off]});
    national.push(mkPath(out));
  }
});
// interior of the building (illustrative layout, metres in local coordinates)
const ROOMS=[['Dance floor',[-12,12,-2,10],50],['Bar',[14,24,-6,6],20],['Stage',[-9,9,11,16],10],['Toilets',[-24,-15,2,10],8],['Cloakroom',[-24,-15,-8,-2],7],['Smoking area',[26,34,-12,-2],5]];
const inside=[];
for(let i=0;i<1100;i++){
  let r=rnd()*100,room=ROOMS[0];for(const R of ROOMS){if(r<R[2]){room=R;break}r-=R[2]}
  const pick=R=>[rr(R[1][0],R[1][1]),rr(R[1][2],R[1][3])];
  const L=[[0,-17],[rr(-6,6),-12],[rr(-8,8),-6]];
  if(rnd()<0.5)L.push(pick(ROOMS[Math.floor(rnd()*3)]));
  L.push(pick(room));if(rnd()<0.35)L.push(pick(ROOMS[0]));
  const s=spline(L.map(p=>loc(p[0],p[1])),8);
  inside.push(mkPath(s.map(p=>[p[0]+gauss()*0.25/MPU,p[1]+gauss()*0.25/MPU])));
}
// shuffle so the density slider thins evenly
function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}
shuf(national);shuf(inside);
const nlPoly=NL.map(p=>merc(...p)),lakePoly=LAKE.map(p=>merc(...p));

// ---------- view ----------
let W=0,H=0,dpr=1;const view={cx:0.515,cy:0.33,z:7};let minZ=6,maxZ=21;
const S=()=>256*Math.pow(2,view.z);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function resize(){dpr=window.devicePixelRatio||1;const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);fitNL(true);draw()}
function fitNL(setMin){const a=merc(3.1,50.6),b=merc(7.4,53.7);const s=Math.min(W*0.94/(b[0]-a[0]),H*0.94/(a[1]-b[1]));const z=Math.log2(s/256);if(setMin)minZ=z-0.4;if(setMin||arguments.length===0){view.z=z;view.cx=(a[0]+b[0])/2;view.cy=(a[1]+b[1])/2}return z}
function zoomAt(px,py,dz){const s0=S(),mx=view.cx+(px-W/2)/s0,my=view.cy+(py-H/2)/s0;view.z=clamp(view.z+dz,minZ,maxZ);const s1=S();view.cx=mx-(px-W/2)/s1;view.cy=my-(py-H/2)/s1}
let anim=null;
function flyTo(cx,cy,z,ms=1000){const f={cx:view.cx,cy:view.cy,z:view.z},t0=performance.now();anim=t0;
 const step=now=>{if(anim!==t0)return;let k=clamp((now-t0)/ms,0,1);k=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;view.cx=f.cx+(cx-f.cx)*k;view.cy=f.cy+(cy-f.cy)*k;view.z=f.z+(z-f.z)*k;paint();if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}

// ---------- drawing ----------
const tileCache={};
function drawTiles(){const z0=clamp(Math.round(view.z),0,19),n=Math.pow(2,z0),s=S(),ts=s/n;
 const x0=Math.floor((view.cx-W/2/s)*n),x1=Math.floor((view.cx+W/2/s)*n),y0=Math.floor((view.cy-H/2/s)*n),y1=Math.floor((view.cy+H/2/s)*n);
 if((x1-x0+1)*(y1-y0+1)>80)return;
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){if(y<0||y>=n)continue;const xx=((x%n)+n)%n,key=z0+'/'+xx+'/'+y;let im=tileCache[key];
  if(!im){im=new Image();im.onload=draw;im.src='https://tile.openstreetmap.org/'+key+'.png';tileCache[key]=im}
  if(im.complete&&im.naturalWidth)ctx.drawImage(im,(x/n-view.cx)*s+W/2,(y/n-view.cy)*s+H/2,ts+0.6,ts+0.6)}}
const sc=p=>[(p[0]-view.cx)*S()+W/2,(p[1]-view.cy)*S()+H/2];
function poly(P,fill){ctx.beginPath();P.forEach((p,i)=>{const q=sc(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
const fade=(a,b)=>clamp((view.z-a)/(b-a),0,1);
function strokePaths(list,n,alpha,width){
  const s=S(),vx0=view.cx-W/2/s,vx1=view.cx+W/2/s,vy0=view.cy-H/2/s,vy1=view.cy+H/2/s;
  ctx.globalAlpha=alpha;ctx.lineWidth=width;
  for(let i=0;i<n;i++){const P=list[i],b=P.b;if(b[2]<vx0||b[0]>vx1||b[3]<vy0||b[1]>vy1)continue;
    ctx.beginPath();const p=P.pts;ctx.moveTo((p[0][0]-view.cx)*s+W/2,(p[0][1]-view.cy)*s+H/2);
    for(let j=1;j<p.length;j++)ctx.lineTo((p[j][0]-view.cx)*s+W/2,(p[j][1]-view.cy)*s+H/2);ctx.stroke()}
  ctx.globalAlpha=1}
function paint(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation='source-over';
  const useTiles=$('tiles').checked;
  ctx.fillStyle='#0e1620';ctx.fillRect(0,0,W,H);
  if(useTiles){drawTiles();ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H)}
  else{poly(nlPoly,'#1d2733');poly(lakePoly,'#0e1620');ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();nlPoly.forEach((p,i)=>{const q=sc(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});ctx.closePath();ctx.stroke()}
  // building (fades in when zoomed)
  const bf=fade(15.5,17.5);
  if(bf>0){ctx.globalAlpha=bf;const C=[[-25,-17],[25,-17],[25,17],[-25,17]].map(p=>sc(loc(...p)));
    ctx.fillStyle='rgba(255,255,255,.05)';ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=2;ctx.beginPath();C.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;
    ROOMS.forEach(R=>{const b=R[1],q=[[b[0],b[2]],[b[1],b[2]],[b[1],b[3]],[b[0],b[3]]].map(p=>sc(loc(...p)));ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke()});
    ctx.globalAlpha=1}
  // lines
  const a=+$('alpha').value,dn=Math.round(national.length*$('dens').value),di=Math.round(inside.length*$('dens').value);
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffe600';ctx.lineJoin='round';ctx.lineCap='round';
  strokePaths(national,dn,a,1.2);
  strokePaths(inside,di,clamp(a*2.2,0.05,0.6),1+clamp((view.z-16)*0.45,0,3.5));
  ctx.globalCompositeOperation='source-over';
  // glow at Dynamo when zoomed out
  const g=sc(D),gr=22*(1-fade(12,15));
  if(gr>1){const gg=ctx.createRadialGradient(g[0],g[1],0,g[0],g[1],gr);gg.addColorStop(0,'rgba(255,240,120,.9)');gg.addColorStop(1,'rgba(255,230,0,0)');ctx.fillStyle=gg;ctx.fillRect(g[0]-gr,g[1]-gr,gr*2,gr*2)}
  // labels
  ctx.font='11px system-ui,sans-serif';ctx.textBaseline='middle';
  if(!useTiles||true){const lf=1-fade(10,12.5);ctx.globalAlpha=lf;ctx.fillStyle='rgba(255,255,255,.85)';
    CITIES.forEach(c=>{const q=sc(merc(c[1],c[2]));ctx.beginPath();ctx.arc(q[0],q[1],2.2,0,6.3);ctx.fill();ctx.fillText(c[0],q[0]+6,q[1])});ctx.globalAlpha=1}
  ctx.fillStyle='#fff';ctx.font='600 12px system-ui,sans-serif';
  const df=1-fade(17.5,19);ctx.globalAlpha=df;ctx.fillText('Dynamo Eindhoven',g[0]+10,g[1]-10);ctx.globalAlpha=1;
  const rf=fade(18.8,19.8);if(rf>0){ctx.globalAlpha=rf;ctx.font='11px system-ui,sans-serif';ctx.textAlign='center';
    ROOMS.forEach(R=>{const b=R[1],q=sc(loc((b[0]+b[1])/2,(b[2]+b[3])/2));ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillText(R[0],q[0],q[1])});
    const d=sc(DOOR);ctx.fillText('Entrance',d[0],d[1]+14);ctx.textAlign='left';ctx.globalAlpha=1}
  ctx.textAlign='left';
}
let queued=false;function draw(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}

// ---------- interaction ----------
const ptrs=new Map();
cv.addEventListener('pointerdown',e=>{anim=null;cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY])});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const pv=ptrs.get(e.pointerId),r=cv.getBoundingClientRect();
  if(ptrs.size===1){view.cx-=(e.clientX-pv[0])/S();view.cy-=(e.clientY-pv[1])/S()}
  else if(ptrs.size===2){const o=[...ptrs.entries()].find(([id])=>id!==e.pointerId)[1];const d0=Math.hypot(pv[0]-o[0],pv[1]-o[1]),d1=Math.hypot(e.clientX-o[0],e.clientY-o[1]);if(d0>0&&d1>0)zoomAt((e.clientX+o[0])/2-r.left,(e.clientY+o[1])/2-r.top,Math.log2(d1/d0))}
  ptrs.set(e.pointerId,[e.clientX,e.clientY]);draw()});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>ptrs.delete(e.pointerId)));
cv.addEventListener('wheel',e=>{e.preventDefault();anim=null;const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,-e.deltaY*0.0022);draw()},{passive:false});
$('zi').onclick=()=>{zoomAt(W/2,H/2,0.7);draw()};$('zo').onclick=()=>{zoomAt(W/2,H/2,-0.7);draw()};
$('bNL').onclick=()=>{const a=merc(3.1,50.6),b=merc(7.4,53.7);flyTo((a[0]+b[0])/2,(a[1]+b[1])/2,fitNL())};
$('bEH').onclick=()=>flyTo(D[0],D[1],12.2);
$('bDyn').onclick=()=>flyTo(D[0],D[1],19.6,1600);
['dens','alpha'].forEach(i=>$(i).oninput=draw);$('tiles').onchange=draw;
window.addEventListener('resize',resize);
resize();
