const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const ui = { score: document.querySelector('#score'), rings: document.querySelector('#rings'), time: document.querySelector('#time'), overlay: document.querySelector('#overlay') };
const keys = {}; let started = false, muted = false, last = 0, elapsed = 0, camera = 0, score = 0, ringCount = 0, flash = 0;
const groundY = 570;
const player = { x: 130, y: groundY - 65, vx: 0, vy: 0, w: 48, h: 64, onGround: false, facing: 1, inv: 0, spin: 0 };
const platforms = [
  { x: -100, y: 570, w: 620, h: 170 }, { x: 600, y: 535, w: 300, h: 205 }, { x: 1010, y: 450, w: 230, h: 290 }, { x: 1330, y: 570, w: 520, h: 170 }, { x: 1950, y: 510, w: 220, h: 230 }, { x: 2250, y: 430, w: 250, h: 310 }, { x: 2600, y: 570, w: 660, h: 170 }
];
const ringSpots = [[245,470],[290,430],[335,405],[380,430],[425,470],[670,455],[720,420],[770,405],[820,420],[870,455],[1060,370],[1110,335],[1160,370],[1435,475],[1480,440],[1525,415],[1570,440],[1615,475],[2020,420],[2070,385],[2120,420],[2310,350],[2360,315],[2410,350],[2730,475],[2780,440],[2830,415],[2880,440],[2930,475]].map(([x,y])=>({x,y,taken:false,bob:Math.random()*6}));
const bots = [{x:760,y:493,dir:1,home:760},{x:1540,y:528,dir:-1,home:1540},{x:2050,y:468,dir:1,home:2050},{x:2800,y:528,dir:-1,home:2800}];
let checkpoint = 80, complete = false;
function tone(freq, duration=.08, type='square') { if (muted || !window.AudioContext) return; const ac = tone.ac || (tone.ac = new AudioContext()); const o=ac.createOscillator(), g=ac.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.06,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+duration); }
function rect(x,y,w,h,c) { ctx.fillStyle=c;ctx.fillRect(Math.round(x-camera),Math.round(y),w,h); }
function ellipse(x,y,rx,ry,c) { ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x-camera,y,rx,ry,0,0,Math.PI*2);ctx.fill(); }
function drawHill(x,y,size,color) { ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-camera-size,y);ctx.quadraticCurveTo(x-camera,y-size,x-camera+size,y);ctx.lineTo(x-camera+size,y+90);ctx.lineTo(x-camera-size,y+90);ctx.fill(); }
function drawWorld() {
  ctx.clearRect(0,0,W,H); const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#5fe0ef');sky.addColorStop(.66,'#80e8d7');sky.addColorStop(.67,'#4acb6d');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.8)'; [[130,150],[500,90],[940,175],[1320,95]].forEach(([x,y])=>{x-=camera*.18;ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.arc(x+28,y-12,34,0,Math.PI*2);ctx.arc(x+62,y,23,0,Math.PI*2);ctx.fill();});
  for(let i=-2;i<9;i++) drawHill(i*260+80,440,145,'#36b77a'); for(let i=-2;i<9;i++) drawHill(i*360-camera*.11,500,180,'#198e73');
  for (const p of platforms) { rect(p.x,p.y,p.w,p.h,'#a9512a'); rect(p.x,p.y,p.w,16,'#f1d752'); rect(p.x,p.y+16,p.w,7,'#6dbb45'); for(let x=p.x+18;x<p.x+p.w;x+=38) rect(x,p.y+30,12,7,'#d97833'); }
  for(let x=80;x<3300;x+=150) { const px=x-camera;ctx.fillStyle='#188b4a';ctx.fillRect(px,520,8,50);ctx.beginPath();ctx.arc(px+4,512,25,0,Math.PI*2);ctx.fill(); }
  ringSpots.forEach(r=>{if(r.taken)return; const yy=r.y+Math.sin(elapsed*4+r.bob)*4;ctx.strokeStyle='#ffd829';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(r.x-camera,yy,11,16,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff4a1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(r.x-camera-2,yy-2,8,12,0,0,Math.PI*2);ctx.stroke();});
  bots.forEach(b=>drawBot(b)); drawFinish(); drawPlayer();
  if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H);}
}
function drawPlayer(){ const x=player.x-camera, y=player.y; ctx.save();ctx.translate(x+24,y+34);if(player.spin){ctx.rotate(elapsed*22*player.facing);} ctx.scale(player.facing,1); ctx.fillStyle='#1766d1';ctx.beginPath();ctx.ellipse(0,2,25,30,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-14,-10);ctx.lineTo(-30,-25);ctx.lineTo(-20,-2);ctx.moveTo(0,-20);ctx.lineTo(-8,-40);ctx.lineTo(12,-20);ctx.moveTo(14,-12);ctx.lineTo(31,-26);ctx.lineTo(22,-1);ctx.fill(); ctx.fillStyle='#f3bd8d';ctx.beginPath();ctx.ellipse(10,11,16,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(8,-9,9,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172051';ctx.beginPath();ctx.arc(11,-7,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e73533';ctx.fillRect(-23,25,21,10);ctx.fillRect(7,25,22,10);ctx.fillStyle='#fff';ctx.fillRect(-20,25,13,3);ctx.fillRect(10,25,14,3);ctx.restore(); }
function drawBot(b){const x=b.x-camera,y=b.y;ctx.fillStyle='#e34a38';ctx.fillRect(x-20,y+10,40,18);ctx.beginPath();ctx.arc(x,y+10,20,Math.PI,0);ctx.fill();ctx.fillStyle='#d7e9f1';ctx.fillRect(x-12,y+5,8,7);ctx.fillRect(x+5,y+5,8,7);ctx.fillStyle='#26344e';ctx.fillRect(x-17,y+28,12,7);ctx.fillRect(x+6,y+28,12,7);}
function drawFinish(){const x=3160-camera;ctx.fillStyle='#e8e9e7';ctx.fillRect(x,350,9,220);ctx.fillStyle='#f23b42';ctx.beginPath();ctx.moveTo(x+9,355);ctx.lineTo(x+90,375);ctx.lineTo(x+9,414);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x+20,375,31,13);}
function reset(){player.x=checkpoint;player.y=groundY-65;player.vx=0;player.vy=0;player.inv=1.5;camera=Math.max(0,player.x-200);}
function update(dt){if(!started)return; elapsed+=dt;flash=Math.max(0,flash-dt*2);player.inv=Math.max(0,player.inv-dt); const accel=1650,max=500;if(keys.ArrowLeft||keys.KeyA){player.vx-=accel*dt;player.facing=-1;}if(keys.ArrowRight||keys.KeyD){player.vx+=accel*dt;player.facing=1;}if(!(keys.ArrowLeft||keys.KeyA||keys.ArrowRight||keys.KeyD))player.vx*=Math.pow(.0008,dt);player.vx=Math.max(-max,Math.min(max,player.vx));player.vy+=1550*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;player.onGround=false; for(const p of platforms){if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+32&&player.vy>=0){player.y=p.y-player.h;player.vy=0;player.onGround=true;}}
  player.spin=!player.onGround; if(player.y>780) reset(); camera+=((player.x-W*.34)-camera)*Math.min(1,dt*4);camera=Math.max(0,Math.min(camera,2020));
  ringSpots.forEach(r=>{if(!r.taken&&Math.hypot(player.x+24-r.x,player.y+30-r.y)<39){r.taken=true;ringCount++;score+=100;tone(920,.05,'sine');}});
  bots.forEach((b,i)=>{b.x+=b.dir*75*dt;if(Math.abs(b.x-b.home)>70)b.dir*=-1;if(Math.abs(player.x+24-b.x)<38&&Math.abs(player.y+35-b.y)<47){if(player.vy>100&&player.y+player.h<b.y+18){bots.splice(i,1);player.vy=-600;score+=500;tone(180,.12,'square');}else if(!player.inv){ringCount=Math.max(0,ringCount-10);tone(100,.18,'sawtooth');reset();}}});
  if(player.x>1210&&checkpoint<1200){checkpoint=1260;score+=1000;tone(650,.12,'triangle');}if(player.x>3110&&!complete){complete=true;started=false; score+=5000;ui.overlay.innerHTML='<div class="title-mark" style="font-size:72px">STAGE<br><em>CLEAR!</em></div><p>YOU RAN THE COAST IN '+formatTime(elapsed)+'</p><button id="start">PLAY AGAIN <span>↻</span></button>';ui.overlay.classList.remove('hidden');document.querySelector('#start').onclick=restart;tone(660,.2,'square');setTimeout(()=>tone(880,.3,'square'),180);}
  ui.score.textContent=String(score).padStart(6,'0');ui.rings.textContent=String(ringCount).padStart(2,'0');ui.time.textContent=formatTime(elapsed);
}
function formatTime(t){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function loop(t){const dt=Math.min(.035,(t-last)/1000||0);last=t;update(dt);drawWorld();requestAnimationFrame(loop);} requestAnimationFrame(loop);
function jump(){if(started&&player.onGround){player.vy=-655;player.onGround=false;tone(320,.08,'square');}}
function restart(){ringSpots.forEach(r=>r.taken=false);score=0;ringCount=0;elapsed=0;checkpoint=80;complete=false;bots.splice(0,bots.length,...[{x:760,y:493,dir:1,home:760},{x:1540,y:528,dir:-1,home:1540},{x:2050,y:468,dir:1,home:2050},{x:2800,y:528,dir:-1,home:2800}]);reset();started=true;ui.overlay.classList.add('hidden');}
document.querySelector('#start').onclick=restart;document.querySelector('#sound').onclick=()=>{muted=!muted;document.querySelector('#sound').textContent=muted?'♩':'♫';};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space','KeyA','KeyD'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Space')jump();});addEventListener('keyup',e=>keys[e.code]=false);document.querySelectorAll('[data-key]').forEach(b=>{const code=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[code]=true;if(code==='Space')jump();});b.addEventListener('pointerup',()=>keys[code]=false);b.addEventListener('pointerleave',()=>keys[code]=false);});
