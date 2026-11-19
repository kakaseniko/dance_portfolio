import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const P={W:5,D:4,perf:4,aud:8,seed:3,H:2.6,t:0.15};
const SL=[['g-people','perf','Performers',1,10,1,'',],['g-people','aud','Audience',0,20,1,''],['g-people','seed','Layout seed',1,30,1,''],
['g-room','W','Room width',4,8,.5,' m'],['g-room','D','Room depth',3.5,6,.5,' m']];
for(const [g,k,l,mn,mx,st,u] of SL){
  const r=document.createElement('div');r.className='row';
  r.innerHTML=`<label for="s-${k}">${l}</label><output></output><input type="range" id="s-${k}" min="${mn}" max="${mx}" step="${st}" value="${P[k]}">`;
  document.getElementById(g).appendChild(r);
  const i=r.querySelector('input'),o=r.querySelector('output');
  const sh=()=>o.textContent=(st<1?(+P[k]).toFixed(1):P[k])+u;sh();
  i.addEventListener('input',()=>{P[k]=+i.value;sh();build()});
}

const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,500);
camera.position.set(0,11,15);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.target.set(0,1,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.1));
const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(6,14,10);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:1,far:45});
scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.16}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.1;ground.receiveShadow=true;scene.add(ground);
const syncTheme=()=>{scene.background=new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--stage').trim()||'#eef0ef')};
syncTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncTheme);
new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.75});
const MAT={wall:M(0xe9e4da),floor:M(0xc49a6c),rug:M(0x6d7f8c),sofa:M(0x5b6b73),wood:M(0x8a6a4a),plant:M(0x4f8a4f),pot:M(0xb8693f),lamp:M(0xf0e2b0),
perf:M(0x2b8f88),aud:M(0xd9822b),skin:M(0xe0b896),
glass:new THREE.MeshStandardMaterial({color:0x9fc4d8,transparent:true,opacity:.14,roughness:.1,depthWrite:false}),
roof:new THREE.MeshStandardMaterial({color:0xe9e4da,transparent:true,opacity:.45,depthWrite:false})};

function box(g,mat,x,y,z,w,h,d,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;g.add(m);return m}
function label(text,x,y,z){
  const c=document.createElement('canvas');c.width=512;c.height=128;const x2=c.getContext('2d');
  x2.fillStyle='rgba(247,248,247,.9)';x2.beginPath();x2.roundRect(8,16,496,96,24);x2.fill();
  x2.fillStyle='#1a1f1e';x2.font='600 46px sans-serif';x2.textAlign='center';x2.textBaseline='middle';x2.fillText(text,256,66);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));
  s.scale.set(4.4,1.1,1);s.position.set(x,y,z);s.renderOrder=5;return s;
}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function person(mat,dance){
  const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CapsuleGeometry(.2,1,4,10),mat);b.position.y=.7;b.castShadow=true;g.add(b);
  const h=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),MAT.skin);h.position.y=1.62;h.castShadow=true;g.add(h);
  if(dance){g.userData.arms=[1,-1].map(s=>{const p=new THREE.Group();p.position.set(s*.27,1.2,0);
    const a=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.5,3,6),mat);a.position.y=-.3;a.castShadow=true;p.add(a);g.add(p);return p})}
  return g;
}

let model=null,dancers=[];
function build(){
  if(model){model.traverse(o=>o.geometry&&o.geometry.dispose());scene.remove(model)}
  const {W,D,H,t}=P;model=new THREE.Group();dancers=[];
  const total=2*W+3*t,backZ=-(D/2+t/2),cxs=[-(W/2+t/2),W/2+t/2];
  box(model,MAT.floor,0,-.05,0,total,.1,D+2*t);
  box(model,MAT.wall,0,H/2,backZ,total,H,t);
  for(const x of[-(W+t),0,W+t])box(model,MAT.wall,x,H/2,0,t,H,D+t);
  const glassGroup=new THREE.Group(),roofGroup=new THREE.Group();model.add(glassGroup,roofGroup);
  glassGroup.name='glass';roofGroup.name='roof';
  roofGroup.visible=document.getElementById('roof').checked;
  glassGroup.visible=document.getElementById('glass').checked;
  box(roofGroup,MAT.roof,0,H+.05,0,total,.1,D+2*t,false);
  for(const cx of cxs){
    const gp=new THREE.Mesh(new THREE.PlaneGeometry(W,H),MAT.glass);gp.position.set(cx,H/2,D/2+t/2);glassGroup.add(gp);
    box(glassGroup,MAT.wall,cx,H-.04,D/2+t/2,W,.08,.06,false);box(glassGroup,MAT.wall,cx,.04,D/2+t/2,W,.08,.06,false);
    // furniture
    const f=new THREE.Group();f.position.x=cx;model.add(f);
    const sx=-W/2+1.2,tz=-D/2+1.7;
    box(f,MAT.rug,sx,.01,tz,2.4,.02,1.6,false);
    box(f,MAT.sofa,sx,.22,-D/2+.5,2,.44,.9);box(f,MAT.sofa,sx,.7,-D/2+.15,2,.5,.2);
    box(f,MAT.sofa,sx-.95,.4,-D/2+.5,.2,.8,.9);box(f,MAT.sofa,sx+.95,.4,-D/2+.5,.2,.8,.9);
    box(f,MAT.wood,sx,.2,tz,1.1,.4,.6);
    box(f,MAT.wood,W/2-.8,1,-D/2+.25,1.2,2,.4);
    const ch=box(f,MAT.sofa,W/2-.9,.25,.5,.8,.5,.8);box(f,MAT.sofa,W/2-.9-.3,.65,.5,.2,.5,.8);
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.2,.15,.35,12),MAT.pot);pot.position.set(W/2-.3,.18,D/2-.4);pot.castShadow=true;f.add(pot);
    const pl=new THREE.Mesh(new THREE.SphereGeometry(.35,12,10),MAT.plant);pl.position.set(W/2-.3,.75,D/2-.4);pl.castShadow=true;f.add(pl);
    box(f,MAT.wood,-W/2+.25,.8,.9,.04,1.6,.04);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,.3,12),MAT.lamp);sh.position.set(-W/2+.25,1.65,.9);f.add(sh);
  }
  // people positions (local to room)
  const avoid=[[-W/2+1.2,-D/2+.5,1.1,.5],[W/2-.8,-D/2+.25,.65,.3],[-W/2+1.2,-D/2+1.7,.6,.35],[W/2-.9,.5,.45,.45],[W/2-.3,D/2-.4,.25,.25],[-W/2+.25,.9,.2,.2]];
  const R=rng(P.seed),taken=[];
  const spot=()=>{let x,z;for(let n=0;n<300;n++){x=(R()-.5)*(W-.7);z=(R()-.5)*(D-.7);
    if(avoid.some(a=>Math.abs(x-a[0])<a[2]+.3&&Math.abs(z-a[1])<a[3]+.3))continue;
    if(taken.some(p=>Math.hypot(p[0]-x,p[1]-z)<(n<200?.7:.45)))continue;break}
    taken.push([x,z]);return[x,z]};
  const perfs=Array.from({length:P.perf},spot),auds=Array.from({length:P.aud},spot);
  const cen=perfs.reduce((a,p)=>[a[0]+p[0]/perfs.length,a[1]+p[1]/perfs.length],[0,0]);
  const facing=perfs.map(()=>R()*Math.PI*2);
  const place=(cx,[x,z],mat,dance,ry)=>{const p=person(mat,dance);p.position.set(cx+x,0,z);p.rotation.y=ry;p.userData.base=ry;p.userData.ph=R()*6.28;model.add(p);if(dance)dancers.push(p)};
  perfs.forEach((p,i)=>place(cxs[0],p,MAT.perf,true,facing[i]));
  auds.forEach(p=>place(cxs[0],p,MAT.aud,false,Math.atan2(cen[0]-p[0],cen[1]-p[1])));
  perfs.forEach((p,i)=>place(cxs[1],p,MAT.perf,true,facing[i]));
  // audience outside Room B, facing the glass
  const perRow=Math.max(1,Math.floor((W-.4)/.7));let rows=0;
  for(let i=0;i<P.aud;i++){const row=Math.floor(i/perRow);rows=row+1;const inRow=Math.min(perRow,P.aud-row*perRow);
    const col=i%perRow,x=(col-(inRow-1)/2)*.7;place(cxs[1],[x,D/2+.9+row*.8],MAT.aud,false,Math.PI)}
  //model.add(label('Room A · shared space',cxs[0],H+.9,0),label('Room B · audience outside',cxs[1],H+.9,0));
  scene.add(model);
  const A=W*D,pa=P.perf+P.aud;
  const specs=document.getElementById('specs');
  if(specs) specs.innerHTML=[
    ['Each room',`${W} × ${D} m`],['Floor area',`${A.toFixed(1)} m²`],
    ['A: inside',`${P.perf} perf + ${P.aud} aud`],['A: m² per person',(A/pa).toFixed(2)],
    ['B: inside',`${P.perf} perf`],['B: m² per performer',(A/P.perf).toFixed(2)],
    ['B: audience outside',`${P.aud} in ${rows} row${rows===1?'':'s'}`]
  ].map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('');
}
document.getElementById('glass').addEventListener('change',e=>{const g=model.getObjectByName('glass');if(g)g.visible=e.target.checked});
document.getElementById('roof').addEventListener('change',e=>{const g=model.getObjectByName('roof');if(g)g.visible=e.target.checked});
const anim=document.getElementById('anim');

function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);resize();build();
renderer.setAnimationLoop(now=>{
  const s=now/1000;
  for(const p of dancers){
    const on=anim.checked,k=on?Math.sin(s*5+p.userData.ph):0;
    p.position.y=on?Math.abs(k)*.06:0;p.rotation.y=p.userData.base+(on?Math.sin(s*2+p.userData.ph)*.5:0);
    const [l,r]=p.userData.arms;l.rotation.z=.25+(on?(k+1)*.8:0);r.rotation.z=-(.25+(on?(1-k)*.8:0));
  }
  controls.update();renderer.render(scene,camera);
});
