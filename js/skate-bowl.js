import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';

const stage=document.querySelector('#stage');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#e9ecea');
const camera=new THREE.PerspectiveCamera(38,1,.1,200); camera.position.set(13,10,16);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; stage.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.target.set(0,2.6,0); controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0x000000,0x78817c,2));
const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(-8,13,9); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:'#dfe4e1',roughness:.95})); ground.rotation.x=-Math.PI/2; ground.position.y=-.04; ground.receiveShadow=true; scene.add(ground);
const grid=new THREE.GridHelper(30,30,0xbac4bf,0xd1d8d4); grid.position.y=-.025; scene.add(grid);

const P={diam:11,depth:1.6,height:4.2,thick:.22,holds:90,holdsize:.21};
const model=new THREE.Group(); scene.add(model);
let shellGroup,supportGroup,holdGroup,fenceGroup;
const matConcrete=new THREE.MeshStandardMaterial({color:0xc8c9c4,roughness:.86,side:THREE.DoubleSide});
const matDeck=new THREE.MeshStandardMaterial({color:0xaeb4af,roughness:.9,side:THREE.DoubleSide});
const matSupport=new THREE.MeshStandardMaterial({color:0xa9794d,roughness:.7});
const holdMats=['#24776d','#d18a43','#d2b8a0','#5d7187','#b45f50'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.78}));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>t*t*(3-2*t);
function bowlY(r,R,depth){
 // Broad, nearly flat pool floor; the curved transition begins farther out.
 const floorRadius=.42;
 const t=clamp((r/R-floorRadius)/(1-floorRadius),0,1);
 return -depth*(1-smooth(t));
}
function surfacePoint(r,a,offset=0){const R=P.diam/2;return new THREE.Vector3(Math.cos(a)*r,P.height+bowlY(r,R,P.depth)+offset,Math.sin(a)*r);}
function surfaceNormal(r,a){const eps=.01, p1=surfacePoint(r,a), p2=surfacePoint(Math.min(P.diam/2-.01,r+eps),a);const dr=p2.clone().sub(p1);const da=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));return new THREE.Vector3().crossVectors(da,dr).normalize();}
function makeShell(){
 shellGroup=new THREE.Group(); model.add(shellGroup);
 const R=P.diam/2, radial=100, around=192, pos=[],uv=[],idx=[];
 for(let j=0;j<=radial;j++){const r=R*j/radial;for(let i=0;i<=around;i++){const a=2*Math.PI*i/around;const p=surfacePoint(r,a);pos.push(p.x,p.y,p.z);uv.push(i/around,j/radial);}}
 for(let j=0;j<radial;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const shell=new THREE.Mesh(g,matConcrete);shell.castShadow=true;shell.receiveShadow=true;shellGroup.add(shell);
 // A subtle rolled coping and broad skating deck around the lip.
 const coping=new THREE.Mesh(new THREE.TorusGeometry(R-.035,.075,12,192),new THREE.MeshStandardMaterial({color:0x737d78,metalness:.25,roughness:.55}));coping.rotation.x=Math.PI/2;coping.position.y=P.height+.015;coping.castShadow=true;shellGroup.add(coping);
 const deck=new THREE.Mesh(new THREE.RingGeometry(R+.08,R+.8,192),matDeck);deck.rotation.x=-Math.PI/2;deck.position.y=P.height-.035;deck.receiveShadow=true;shellGroup.add(deck);
 // underside thickness lip: visible band around the perimeter
 const lip=new THREE.Mesh(new THREE.TorusGeometry(R-.02,.105,10,192),matConcrete);lip.rotation.x=Math.PI/2;lip.position.y=P.height-.04;shellGroup.add(lip);
}
function makeSupport(){
 supportGroup=new THREE.Group();model.add(supportGroup);
 // Wine-glass silhouette: broad circular foot, tapered stem, flared saddle under bowl.
 const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.45,.22,64),matSupport);base.position.y=.11;base.castShadow=true;supportGroup.add(base);
 const stemTop=P.height-P.depth-.05, stemBottom=.22;
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.34,.62,stemTop-stemBottom,48,1),matSupport);stem.position.y=(stemTop+stemBottom)/2;stem.castShadow=true;supportGroup.add(stem);
 const saddle=new THREE.Mesh(new THREE.CylinderGeometry(1.0,.34,.32,64),matSupport);saddle.position.y=stemTop-.12;saddle.castShadow=true;supportGroup.add(saddle);
}
function makeHolds(){
 holdGroup=new THREE.Group();model.add(holdGroup);
 const R=P.diam/2;
 // Avoid the very centre support and rim; scatter holds in staggered spiral bands.
 const count=P.holds, golden=Math.PI*(3-Math.sqrt(5));
 for(let i=0;i<count;i++){
   const u=(i+.5)/count, r=R*(.24+.68*Math.sqrt(u)), a=i*golden;
   const p=surfacePoint(r,a,-P.thick-.015), n=surfaceNormal(r,a).negate();
   const size=P.holdsize*(.72+((i*37)%11)/22);
   const geom=new THREE.IcosahedronGeometry(size,1);
   // Flatten the back against the bowl; irregular rotations give a natural hold field.
   geom.scale(1,.72,.88);
   const hold=new THREE.Mesh(geom,holdMats[i%holdMats.length]);hold.position.copy(p).addScaledVector(n,size*.28);
   hold.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);
   hold.rotateY((i*1.71)%6.28);hold.castShadow=true;holdGroup.add(hold);
 }
}
function makeFence(){
 fenceGroup=new THREE.Group();model.add(fenceGroup);
 const R=P.diam/2, fenceR=R+.72, fenceH=1.08, railR=.035;
 const railMat=new THREE.MeshStandardMaterial({color:0x53635f,metalness:.62,roughness:.38});
 const postMat=new THREE.MeshStandardMaterial({color:0x34443f,metalness:.55,roughness:.42});
 // Leave a clear access opening on the near side; the rest is guarded.
 const gapCenter=Math.PI/2, gapHalf=.18;
 const inGap=a=>Math.abs(Math.atan2(Math.sin(a-gapCenter),Math.cos(a-gapCenter)))<gapHalf;
 const rail=(y,r)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,railR,8,192),railMat);m.rotation.x=Math.PI/2;m.position.y=P.height+y;m.castShadow=true;fenceGroup.add(m);};
 // Rails are split into two arcs so the entrance remains open.
 for(const [y,radius] of [[.12,fenceR],[fenceH,fenceR]]){
   const pts=[];
   const n=220;
   for(let i=0;i<=n;i++){const a=2*Math.PI*i/n;if(!inGap(a))pts.push(new THREE.Vector3(fenceR*Math.cos(a),P.height+y,fenceR*Math.sin(a)));}
   let run=[];
   for(let i=0;i<pts.length;i++){run.push(pts[i]);if(i===pts.length-1||pts[i+1].distanceTo(pts[i])>.25){if(run.length>1){const curve=new THREE.CatmullRomCurve3(run);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,run.length*2),railR,8,false),railMat);mesh.castShadow=true;fenceGroup.add(mesh);}run=[];}}
 }
 // Closely spaced uprights form a simple open metal guard; omit uprights at the access gap.
 const postCount=72;
 for(let i=0;i<postCount;i++){
   const a=2*Math.PI*i/postCount;if(inGap(a))continue;
   const x=fenceR*Math.cos(a),z=fenceR*Math.sin(a);
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,fenceH,10),postMat);
   post.position.set(x,P.height+fenceH/2,z);post.castShadow=true;fenceGroup.add(post);
 }
 // Fine vertical infill rods between the main posts.
 for(let i=0;i<postCount*2;i++){
   const a=2*Math.PI*(i+.5)/(postCount*2);if(inGap(a))continue;
   const rod=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,fenceH-.12,6),railMat);
   rod.position.set(fenceR*Math.cos(a),P.height+fenceH/2,fenceR*Math.sin(a));fenceGroup.add(rod);
 }
}
function rebuild(){
 if(shellGroup)model.remove(shellGroup);if(supportGroup)model.remove(supportGroup);if(holdGroup)model.remove(holdGroup);if(fenceGroup)model.remove(fenceGroup);
 makeShell();makeSupport();makeHolds();makeFence();
 supportGroup.visible=document.querySelector('#showSupport').checked;
 shellGroup.visible=document.querySelector('#showShell').checked;
 holdGroup.visible=document.querySelector('#showHolds').checked;
 fenceGroup.visible=document.querySelector('#showFence').checked;
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
const ids=['diam','depth','height','thick','holds','holdsize'];
for(const id of ids){const el=document.getElementById(id),out=document.getElementById(id+'Out');const update=()=>{P[id]=+el.value;out.textContent=(id==='holds'?P[id]+' holds':P[id]+(id==='diam'||id==='depth'||id==='height'||id==='thick'?' m':' m'));};el.addEventListener('input',()=>{update();rebuild();});update();}
for(const [id,group] of [['showHolds','holdGroup'],['showSupport','supportGroup'],['showShell','shellGroup'],['showFence','fenceGroup']])document.getElementById(id).addEventListener('change',e=>{if(group==='holdGroup'&&holdGroup)holdGroup.visible=e.target.checked;if(group==='supportGroup'&&supportGroup)supportGroup.visible=e.target.checked;if(group==='shellGroup'&&shellGroup)shellGroup.visible=e.target.checked;if(group==='fenceGroup'&&fenceGroup)fenceGroup.visible=e.target.checked;});
rebuild();
function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);}frame();
const exportButton=document.getElementById('export');
const exportStatus=document.getElementById('status');
if(exportButton&&exportStatus) exportButton.addEventListener('click',()=>{
 exportStatus.textContent='Preparing STL…';
 try{const exporter=new STLExporter();const exportRoot=model.clone(true);exportRoot.traverse(o=>{if(o.isMesh)o.updateMatrixWorld(true);});exportRoot.updateMatrixWorld(true);
 // Convert scene Y-up to STL Z-up and place lowest point on the print bed.
 exportRoot.rotation.x=Math.PI/2;exportRoot.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(exportRoot);exportRoot.position.z-=box.min.z;exportRoot.updateMatrixWorld(true);
 const data=exporter.parse(exportRoot,{binary:true});const blob=new Blob([data],{type:'model/stl'});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='elevated-skate-bowl-overhang-climb.stl';a.click();URL.revokeObjectURL(url);exportStatus.textContent='STL export started.';
 }catch(err){console.error(err);exportStatus.textContent='Export failed. See browser console for details.';}
});
