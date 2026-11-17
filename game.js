(()=>{"use strict";
const c=document.getElementById("gameCanvas"),ctx=c.getContext("2d"),$=id=>document.getElementById(id);
const levelEl=$("level"),targetEl=$("bottles"),ammoEl=$("bullets"),scoreEl=$("score"),bestEl=$("best"),msg=$("message"),count=$("countdown"),cross=$("crosshair"),hint=$("hint");
let W=0,H=0,dpr=1,round=1,score=0,best=Number(localStorage.getItem("digShooterBest")||0),ammo=0,targets=[],particles=[],shots=[],running=false,paused=false,sound=true,mouse={x:0,y:0},last=0,timeLeft=0,combo=0,roundConfig;
const rounds=[
 // Easier overall: fewer targets, more ammo, larger targets and slower movement.
 // Each round still increases difficulty through speed, target count and smaller size.
 {name:"LIVE THROW",targets:7,ammo:13,speed:.72,time:0,size:1.15,types:["bottle","bird","plate"]},
 {name:"RAPID THROW",targets:8,ammo:15,speed:.82,time:0,size:1.10,types:["bottle","bird","plate"]},
 {name:"CROSSING SKY",targets:10,ammo:17,speed:.94,time:55,size:1.06,types:["bird","plate","bottle"]},
 {name:"CLAY & GLASS",targets:12,ammo:19,speed:1.06,time:52,size:1.02,types:["bottle","plate","bird"]},
 {name:"FULL RANGE",targets:14,ammo:22,speed:1.18,time:48,size:.98,types:["bottle","bird","plate"]},
 {name:"REACTION",targets:16,ammo:25,speed:1.30,time:45,size:.94,types:["bird","plate","bottle"]},
 {name:"FINAL RANGE",targets:19,ammo:29,speed:1.44,time:42,size:.90,types:["bottle","bird","plate"]}
];
function resize(){const r=c.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(!mouse.x){mouse.x=W/2;mouse.y=H*.45}positionCrosshair()}
addEventListener("resize",resize);
function pad(n){return String(Math.max(0,Math.floor(n))).padStart(6,"0")}
function hud(){levelEl.textContent=round;targetEl.textContent=targets.filter(t=>t.alive).length+"/"+targets.length;ammoEl.textContent=ammo;scoreEl.textContent=pad(score);bestEl.textContent=pad(best)}
function makeTargets(){targets=[];const q=roundConfig;for(let i=0;i<q.targets;i++){const type=q.types[i%q.types.length],side=i%2===0?1:-1;targets.push({type,alive:true,delay:i*.16,phase:i*.77,side,size:q.size*(type==="bird"?.88:type==="plate"?.92:1),speed:q.speed*(.9+Math.random()*.2),spin:Math.random()*6.28,age:0})}}
function startRound(n){round=n;roundConfig=rounds[Math.min(n-1,rounds.length-1)];ammo=roundConfig.ammo;timeLeft=roundConfig.time;combo=0;makeTargets();running=false;paused=false;hud();hint.textContent="EASY START • SHOOT BOTTLES • BIRDS • CLAY PLATES";let v=3;count.classList.remove("hidden");count.textContent=v;const timer=setInterval(()=>{v--;if(v>0)count.textContent=v;else{clearInterval(timer);count.textContent="GO";setTimeout(()=>{count.classList.add("hidden");running=true},450)}},650)}
function playSound(kind){if(!sound)return;try{window.audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.connect(g);g.connect(audioCtx.destination);o.type=kind==="shot"?"square":"sine";o.frequency.setValueAtTime(kind==="shot"?120:kind==="hit"?720:160,t);o.frequency.exponentialRampToValueAtTime(kind==="shot"?55:kind==="hit"?260:80,t+.12);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start();o.stop(t+.13)}catch(e){}}
function burst(x,y,hit){for(let i=0;i<(hit?24:8);i++){const a=Math.random()*Math.PI*2,v=(hit?2.2:1)+Math.random()*4;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:1,size:hit?2+Math.random()*3:1+Math.random()*2})}}
function finish(win,reason){running=false;if(win){const bonus=Math.round(ammo*18+combo*30+(timeLeft?timeLeft*7:0));score+=bonus;if(score>best){best=score;localStorage.setItem("digShooterBest",best)}hud();setTimeout(()=>showPanel("ROUND "+round+" CLEARED",round<rounds.length?roundConfig.name+" • BONUS +"+bonus:"MASTER RANGE COMPLETE • BONUS +"+bonus,round<rounds.length?"NEXT ROUND →":"PLAY AGAIN",()=>startRound(round<rounds.length?round+1:1)),400)}else{setTimeout(()=>showPanel("ROUND FAILED",reason+"<br>Targets remaining: "+targets.filter(t=>t.alive).length,"RETRY ROUND",()=>startRound(round)),400)}}
function showPanel(title,text,button,action){msg.innerHTML="<h2>"+title+"</h2><p>"+text+"</p><button>"+button+"</button>";msg.classList.remove("hidden");msg.querySelector("button").onclick=()=>{msg.classList.add("hidden");action()}}
function getTargetPosition(t,now){const p=Math.max(0,now-t.delay)*.001*t.speed*.85+t.phase;const travel=(Math.sin(p)+1)/2;let x,y;
 if(t.type==="bottle"){x=W*.14+t.side*W*.56*travel;y=H*.52-H*.34*Math.sin(travel*Math.PI);y+=Math.sin(p*2.1)*8}
 else if(t.type==="plate"){x=W*.18+t.side*W*.64*travel;y=H*.49-H*.30*Math.sin(travel*Math.PI)+Math.cos(p*1.7)*16}
 else{x=W*.10+t.side*W*.78*travel;y=H*.28+Math.sin(p*1.35)*H*.18}
 return{x,y}}
function shoot(){if(!running||paused||ammo<=0)return;ammo--;shots.push({x:W/2,y:H-48,tx:mouse.x,ty:mouse.y,life:0});playSound("shot");
 let hit=null,nearest=Infinity;for(const t of targets){if(!t.alive||t.age<.12)continue;const p=getTargetPosition(t,performance.now()),r=(t.type==="bird"?22:t.type==="plate"?25:24)*t.size,d=Math.hypot(mouse.x-p.x,mouse.y-p.y);if(d<r&&d<nearest){nearest=d;hit=t}}
 if(hit){hit.alive=false;combo++;const points=(hit.type==="bird"?180:hit.type==="plate"?150:120)+combo*20;score+=points;burst(mouse.x,mouse.y,true);playSound("hit")}else{combo=0;score=Math.max(0,score-12);burst(mouse.x,mouse.y,false);playSound("miss")}hud();if(!targets.some(t=>t.alive))finish(true,"");else if(ammo===0)finish(false,"Out of bullets.")}
function update(now,dt){if(!running||paused)return;for(const t of targets){if(t.alive)t.age+=dt*1000}if(timeLeft){timeLeft-=dt;if(timeLeft<=0){timeLeft=0;finish(false,"Time expired.")}}for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=.08;p.life-=dt*1.8}particles=particles.filter(p=>p.life>0);for(const s of shots)s.life+=dt*8;shots=shots.filter(s=>s.life<1)}
function drawBackground(){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#14283b");sky.addColorStop(.48,"#172638");sky.addColorStop(1,"#0b1420");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W*.68,H*.25,4,W*.68,H*.25,H*.7);glow.addColorStop(0,"#b8d9d51c");glow.addColorStop(1,"#b8d9d500");ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 // Distant range silhouettes and soft lane lights.
 ctx.fillStyle="#0b1724";for(let i=0;i<9;i++){const bw=W*.045,bh=H*(.10+(i%3)*.045),x=i*W/8-bw/2;ctx.fillRect(x,H*.58-bh,bw,bh)}
 ctx.strokeStyle="#9fc6d018";ctx.lineWidth=1;for(let i=0;i<7;i++){const x=W*(.12+i*.12);ctx.beginPath();ctx.moveTo(x,H*.60);ctx.lineTo(W/2+(x-W/2)*1.7,H);ctx.stroke()}
 const floor=ctx.createLinearGradient(0,H*.59,0,H);floor.addColorStop(0,"#233747");floor.addColorStop(.12,"#172938");floor.addColorStop(1,"#0a121d");ctx.fillStyle=floor;ctx.fillRect(0,H*.60,W,H*.40);
 ctx.strokeStyle="#c4e0e51c";ctx.lineWidth=1;for(let y=H*.66;y<H;y+=Math.max(22,H*.045)){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle="#a8d9d522";ctx.fillRect(0,H*.598,W,2);
 ctx.fillStyle="#c7f36b";ctx.fillRect(W*.08,H*.62,W*.035,2);ctx.fillRect(W*.88,H*.62,W*.035,2);
}
function drawThrower(now){
 const y=H*.59;ctx.save();ctx.translate(58,y);
 ctx.fillStyle="#0006";ctx.beginPath();ctx.ellipse(0,65,32,7,0,0,Math.PI*2);ctx.fill();
 const jacket=ctx.createLinearGradient(-18,-38,18,22);jacket.addColorStop(0,"#526477");jacket.addColorStop(1,"#1b2b3b");
 ctx.fillStyle="#d4b59a";ctx.beginPath();ctx.arc(0,-57,14,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#18212a";ctx.beginPath();ctx.arc(0,-62,15,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle=jacket;ctx.beginPath();ctx.roundRect(-16,-41,32,60,8);ctx.fill();
 ctx.strokeStyle="#9db0bf";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(9,-25);ctx.lineTo(30,-9);ctx.lineTo(45,-24);ctx.stroke();
 ctx.strokeStyle="#26394a";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-8,15);ctx.lineTo(-22,59);ctx.moveTo(8,15);ctx.lineTo(23,59);ctx.stroke();
 ctx.fillStyle="#9db0bf";ctx.font="800 8px 'DM Sans',system-ui";ctx.textAlign="center";ctx.fillText("RANGE CREW",0,79);ctx.restore()
}
function drawTarget(t,now){
 if(!t.alive||t.age<0)return;const p=getTargetPosition(t,now),s=t.size;
 ctx.save();ctx.translate(p.x,p.y);
 ctx.fillStyle="#02081255";ctx.beginPath();ctx.ellipse(3,25*s,22*s,5*s,0,0,Math.PI*2);ctx.fill();
 ctx.rotate(t.spin+t.age*.004*t.speed);ctx.scale(s,s);
 if(t.type==="bottle"){
  const glass=ctx.createLinearGradient(-17,0,17,0);glass.addColorStop(0,"#6f9b91");glass.addColorStop(.22,"#d5f1d9");glass.addColorStop(.48,"#6ea99a");glass.addColorStop(.72,"#e4f3d9");glass.addColorStop(1,"#47736f");
  ctx.shadowColor="#a4e7d2aa";ctx.shadowBlur=14;ctx.fillStyle=glass;ctx.beginPath();ctx.roundRect(-15,-2,30,30,7);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#47776f";ctx.beginPath();ctx.roundRect(-8,-18,16,18,3);ctx.fill();ctx.fillStyle="#d4e6d4";ctx.fillRect(-10,-23,20,5);ctx.fillStyle="#ffffff99";ctx.fillRect(-10,3,3,20);
  ctx.strokeStyle="#e8fff044";ctx.lineWidth=1;ctx.strokeRect(-12,1,24,26);
 }else if(t.type==="plate"){
  ctx.shadowColor="#e8c47799";ctx.shadowBlur=13;ctx.fillStyle="#e8c477";ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#a56f3c";ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f7e2a8";ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff8d8";ctx.lineWidth=2;ctx.stroke();
 }else{
  ctx.shadowColor="#67d9d0aa";ctx.shadowBlur=12;ctx.fillStyle="#172630";ctx.beginPath();ctx.ellipse(0,0,11,7,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#67d9d0";ctx.beginPath();ctx.ellipse(-14,-3,16,5,-.45,0,Math.PI*2);ctx.ellipse(14,-3,16,5,.45,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#dcefe7";ctx.beginPath();ctx.arc(5,-2,2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e8c477";ctx.beginPath();ctx.moveTo(9,1);ctx.lineTo(25,5);ctx.lineTo(9,7);ctx.fill();
 }
 ctx.restore()
}
function drawGun(){
 const gx=W/2,gy=H-17,ang=Math.atan2(mouse.y-(H-75),mouse.x-gx);ctx.save();ctx.translate(gx,gy);ctx.rotate(ang+Math.PI/2);
 ctx.shadowColor="#000b";ctx.shadowBlur=15;ctx.fillStyle="#0a111a";ctx.beginPath();ctx.roundRect(-12,-66,24,67,6);ctx.fill();ctx.shadowBlur=0;
 const metal=ctx.createLinearGradient(-10,0,10,0);metal.addColorStop(0,"#344655");metal.addColorStop(.45,"#a9bbc5");metal.addColorStop(1,"#263746");
 ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(-9,-76,18,29,4);ctx.fill();ctx.fillStyle="#182b38";ctx.beginPath();ctx.roundRect(-11,-3,22,43,5);ctx.fill();
 ctx.strokeStyle="#c7f36b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-63);ctx.lineTo(6,-63);ctx.stroke();ctx.restore()
}
function render(now){ctx.clearRect(0,0,W,H);drawBackground();drawThrower(now);for(const t of targets)drawTarget(t,now);for(const s of shots){const e=Math.min(1,s.life),px=s.x+(s.tx-s.x)*e,py=s.y+(s.ty-s.y)*e;ctx.strokeStyle="#f4d27b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(px,py);ctx.stroke()}for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle="#d6a84a";ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;drawGun();if(running&&timeLeft){ctx.fillStyle="#fff";ctx.font="800 13px system-ui";ctx.textAlign="right";ctx.fillText(Math.ceil(timeLeft)+"s",W-18,26);ctx.fillStyle="#d6a84a";ctx.fillRect(18,18,(W-36)*Math.max(0,timeLeft/roundConfig.time),3)}}
function loop(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;update(now,dt);render(now);requestAnimationFrame(loop)}
function move(e){const r=c.getBoundingClientRect(),p=e.touches?e.touches[0]:e;mouse.x=Math.max(0,Math.min(W,p.clientX-r.left));mouse.y=Math.max(0,Math.min(H,p.clientY-r.top));positionCrosshair()}
function positionCrosshair(){cross.style.left=mouse.x+"px";cross.style.top=mouse.y+"px"}
c.addEventListener("pointermove",move);c.addEventListener("pointerdown",e=>{move(e);shoot()});
$("pauseBtn").onclick=()=>{if(!running)return;paused=!paused;$("pauseBtn").textContent=paused?"▶":"Ⅱ";hint.textContent=paused?"PAUSED":"THROWER ACTIVE • TRACK THE AIRBORNE TARGETS"};
$("soundBtn").onclick=()=>{sound=!sound;$("soundBtn").textContent=sound?"🔊":"🔇"};
$("restartBtn").onclick=()=>{msg.classList.add("hidden");startRound(1)};
resize();startRound(1);requestAnimationFrame(loop);
})();