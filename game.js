'use strict';
// All positions are in tile units. Actors travel along graph edges, never through walls.
const C={lav:'#D3D3FF',purple:'#CEB5FF',sky:'#8EC1DE',blue:'#80A8FF'}, D=[[0,-1],[-1,0],[0,1],[1,0]], T=24;
const MAP=[
'#####################',
'#o........#........o#',
'#.###.###.#.###.###.#',
'#...................#',
'#.###.#.#####.#.###.#',
'#.....#...#...#.....#',
'#####.###.#.###.#####',
'#......... .........#',
'#.###.#.###.#.###.#.#',
'......#.....#........',
'#.###.#.###.#.###.#.#',
'#......... .........#',
'#####.###.#.###.#####',
'#.....#...#...#.....#',
'#.###.#.#####.#.###.#',
'#...................#',
'#.###.###.#.###.###.#',
'#o........#........o#',
'#####################'];
const $=id=>document.getElementById(id), key=(x,y)=>`${x},${y}`, rand=a=>a[Math.floor(Math.random()*a.length)];
class Maze{
 constructor(){this.w=MAP[0].length;this.h=MAP.length;this.dots=new Map();this.cells=[];MAP.forEach((r,y)=>[...r].forEach((v,x)=>{if(v!=='#'){this.cells.push([x,y]);if(v==='.'||v==='o')this.dots.set(key(x,y),v)}}));}
 next(x,y,d){let [dx,dy]=D[d],nx=x+dx,ny=y+dy;if(y===9)nx=(nx+this.w)%this.w;return MAP[ny]&&MAP[ny][nx]&&MAP[ny][nx]!=='#'?[nx,ny]:null;}
 options(x,y){return D.map((_,d)=>d).filter(d=>this.next(x,y,d));}
 // Breadth-first distances guarantee legal routing, including tunnel edges.
 distances(tx,ty){const q=[[tx,ty]],m=new Map([[key(tx,ty),0]]);for(let i=0;i<q.length;i++){let [x,y]=q[i];for(const d of this.options(x,y)){let n=this.next(x,y,d),k=key(...n);if(!m.has(k)){m.set(k,m.get(key(x,y))+1);q.push(n)}}}return m;}
 nearest(x,y){return this.cells.reduce((a,b)=>Math.abs(b[0]-x)+Math.abs(b[1]-y)<Math.abs(a[0]-x)+Math.abs(a[1]-y)?b:a);}
 draw(ctx,t){ctx.fillStyle='#000';ctx.fillRect(0,0,this.w*T,this.h*T);ctx.strokeStyle=C.purple;ctx.lineWidth=2;ctx.shadowColor=C.purple;ctx.shadowBlur=7;for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(MAP[y][x]==='#'){const a=x*T,b=y*T;ctx.beginPath();if(MAP[y-1]?.[x]!=='#'){ctx.moveTo(a,b+2);ctx.lineTo(a+T,b+2)}if(MAP[y+1]?.[x]!=='#'){ctx.moveTo(a,b+T-2);ctx.lineTo(a+T,b+T-2)}if(MAP[y][x-1]!=='#'){ctx.moveTo(a+2,b);ctx.lineTo(a+2,b+T)}if(MAP[y][x+1]!=='#'){ctx.moveTo(a+T-2,b);ctx.lineTo(a+T-2,b+T)}ctx.stroke()}ctx.shadowBlur=0;for(const [k,v] of this.dots){let [x,y]=k.split(',').map(Number);ctx.fillStyle=v==='o'?C.lav:C.blue;ctx.beginPath();ctx.arc((x+.5)*T,(y+.5)*T,v==='o'?4.5+Math.sin(t*6):2,0,Math.PI*2);ctx.fill()}}
}
class Actor{
 constructor(x,y,d){Object.assign(this,{x,y,d,p:0,next:null});}
 pos(){let [dx,dy]=D[this.d];return [this.x+dx*this.p,this.y+dy*this.p];}
 move(dt,speed,maze,choose,arrive){let left=dt*speed;while(left>1e-8){if(!this.next){let d=choose();if(d==null)return;this.d=d;this.next=maze.next(this.x,this.y,d);if(!this.next)return;}let step=Math.min(left,1-this.p);this.p+=step;left-=step;if(this.p>=1-1e-8){[this.x,this.y]=this.next;this.p=0;this.next=null;if(arrive?.()===false)return;}}}
}
class Pacman extends Actor{
 constructor(){super(10,11,1);this.queued=1;}
 update(dt,g){this.move(dt,g.playerSpeed,g.maze,()=>g.maze.next(this.x,this.y,this.queued)?this.queued:g.maze.next(this.x,this.y,this.d)?this.d:null,()=>{g.eat();return g.state==='playing'});}
 draw(ctx,t,death=0){let [x,y]=this.pos(),angle=[-Math.PI/2,Math.PI,Math.PI/2,0][this.d],mouth=death?Math.min(Math.PI,death*Math.PI):.13+.38*Math.abs(Math.sin(t*14));sprite(ctx,x,y,()=>{ctx.fillStyle=C.blue;ctx.shadowColor=C.blue;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,T*.41,angle+mouth,angle+2*Math.PI-mouth);ctx.closePath();ctx.fill()});}
}
class Ghost extends Actor{
 constructor(i,x,y){super(x,y,3);this.i=i;this.home=[x,y];this.safe=0;}
 update(dt,g){this.safe=Math.max(0,this.safe-dt);this.move(dt,g.ghostSpeed*(g.power>0&&!this.safe ? .65 : 1),g.maze,()=>{let opts=g.maze.options(this.x,this.y),rev=(this.d+2)%4;if(opts.length>1)opts=opts.filter(d=>d!==rev);if(!opts.length)return null;if(g.power>0&&!this.safe)return rand(opts);let [px,py]=g.player.pos(),[dx,dy]=D[g.player.d];let corners=[[1,1],[19,1],[19,17],[1,17]],target;if(g.scatter)target=corners[this.i];else if(this.i===0)target=[px,py];else if(this.i===1)target=[px+dx*4,py+dy*4];else if(this.i===2)target=corners[Math.floor(g.elapsed/5)%4];else return rand(opts);let dist=g.maze.distances(...g.maze.nearest(...target));return opts.sort((a,b)=>(dist.get(key(...g.maze.next(this.x,this.y,a)))??999)-(dist.get(key(...g.maze.next(this.x,this.y,b)))??999))[0]});}
 draw(ctx,t,power){let [x,y]=this.pos(),fright=power>0&&!this.safe; sprite(ctx,x,y,()=>{ctx.globalAlpha=this.safe ? .45 : 1;ctx.fillStyle=fright?(power<2&&Math.floor(t*8)%2?C.lav:C.purple):C.sky;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;let r=T*.39;ctx.beginPath();ctx.arc(0,-1,r,Math.PI,0);ctx.lineTo(r,r);for(let i=0;i<3;i++){ctx.lineTo(r-(i+.5)*2*r/3,r-3-Math.sin(t*10+i)*1.5);ctx.lineTo(r-(i+1)*2*r/3,r)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';for(const e of [-4,4]){ctx.beginPath();ctx.ellipse(e,-2,3.2,4,0,0,7);ctx.fill()}ctx.fillStyle='#000';for(const e of [-4,4]){ctx.beginPath();ctx.arc(e+D[this.d][0]*1.4,-2+D[this.d][1]*1.4,1.5,0,7);ctx.fill()}ctx.fillStyle='#000';for(let i=0;i<=this.i;i++)ctx.fillRect(-4+i*2.5,5,1.4,1.4)});}
}
function sprite(ctx,x,y,draw){for(const shift of [-MAP[0].length,0,MAP[0].length]){let xx=x+shift;if(xx< -1||xx>MAP[0].length)continue;ctx.save();ctx.translate((xx+.5)*T,(y+.5)*T);draw();ctx.restore()}}
class Sound{
 constructor(){this.muted=false;this.beat=0;this.index=0;}
 unlock(){try{this.ctx??=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{})}catch{}}
 tone(f,d=.08,vol=.04,delay=0,end=f){if(this.muted||!this.ctx||this.ctx.state!=='running')return;let a=this.ctx,o=a.createOscillator(),v=a.createGain(),t=a.currentTime+delay;o.type='triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(v).connect(a.destination);o.start(t);o.stop(t+d);}
 play(s){const seq={dot:[330],power:[330,440,660],ghost:[440,660,880],fruit:[523,784],death:[440,220,110],level:[392,523,659,784]};(seq[s]||[]).forEach((f,i)=>this.tone(f,.12,.055,i*.09));}
 music(dt){this.beat-=dt;if(this.beat<=0){this.beat=.25;this.tone([110,165,131,196,110,165,147,196][this.index++%8],.18,.012)}}
}
class Game{
 constructor(){this.canvas=$('board');this.ctx=this.canvas.getContext('2d');this.sound=new Sound();this.best=0;try{this.best=Number(localStorage.getItem('neon-maze-best'))||0}catch{}this.state='start';this.score=0;this.level=1;this.lives=3;this.maze=new Maze();this.resetActors();this.particles=[];this.popups=[];this.t=0;this.shake=0;this.resize();this.hud();this.bind();this.last=performance.now();requestAnimationFrame(t=>this.frame(t));}
 resize(){let d=Math.min(3,window.devicePixelRatio||1);this.canvas.width=this.maze.w*T*d;this.canvas.height=this.maze.h*T*d;this.ctx.setTransform(d,0,0,d,0,0);}
 resetActors(){this.player=new Pacman();this.ghosts=[[9,7],[11,7],[9,9],[11,9]].map(([x,y],i)=>new Ghost(i,x,y));this.power=0;this.combo=0;this.elapsed=0;this.scatter=true;this.fruit=null;this.fruitTimer=8+Math.random()*10;this.invincible=1.5;}
 start(){this.sound.unlock();this.difficulty=$('difficulty').value;this.score=0;this.level=1;this.lives=3;this.newLevel();}
 newLevel(){this.maze=new Maze();this.resetActors();this.particles=[];this.popups=[];this.ready();}
 ready(){this.state='ready';this.timer=3.5;this.overlay('Ready!','3',null);this.hud();}
 overlay(title,msg,action){$('overlay').hidden=false;$('heading').textContent=title;$('message').textContent=msg;$('settings').hidden=!(this.state==='start'||this.state==='over');$('action').hidden=!action;$('action').textContent=action||'';$('restart').hidden=this.state!=='paused';}
 hud(){for(const [id,v] of [['score',this.score],['best',this.best],['level',this.level]])$(id).textContent=String(v).padStart(id==='level'?2:5,'0');$('lives').textContent='● '.repeat(this.lives).trim()||'0';}
 add(n){this.score+=n;if(this.score>this.best){this.best=this.score;try{localStorage.setItem('neon-maze-best',this.best)}catch{}}this.hud();}
 burst(x,y,n=6){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=15+Math.random()*65;this.particles.push({x:(x+.5)*T,y:(y+.5)*T,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45})}}
 popup(x,y,n){this.popups.push({x:(x+.5)*T,y:(y+.5)*T,n,life:1});}
 eat(){let {x,y}=this.player,k=key(x,y),v=this.maze.dots.get(k);if(v){this.maze.dots.delete(k);this.add(v==='o'?50:10);this.burst(x,y,v==='o'?18:4);this.sound.play(v==='o'?'power':'dot');if(v==='o'){this.power=Math.max(3,8-(this.level-1)*.45);this.combo=0;}}if(this.fruit&&x===this.fruit.x&&y===this.fruit.y){let n=100*this.level;this.add(n);this.popup(x,y,n);this.burst(x,y,20);this.sound.play('fruit');this.fruit=null;}if(!this.maze.dots.size){this.state='complete';this.sound.play('level');this.overlay('Maze cleared!','Next level: '+(this.level+1),'Next level');}}
 collision(){let [x,y]=this.player.pos();for(const ghost of this.ghosts){let [gx,gy]=ghost.pos(),dx=Math.abs(x-gx);dx=Math.min(dx,this.maze.w-dx);if(Math.hypot(dx,y-gy)>.65||ghost.safe>0)continue;if(this.power>0){let n=200*2**this.combo++;this.add(n);this.popup(gx,gy,n);this.burst(gx,gy,22);this.sound.play('ghost');Object.assign(ghost,{x:ghost.home[0],y:ghost.home[1],p:0,next:null,safe:Math.max(2,this.power)});}else if(this.invincible<=0){this.state='dying';this.timer=1;this.lives--;this.shake=.4;this.sound.play('death');this.hud();break;}}}
 update(dt){if(this.state==='ready'){this.timer-=dt;$('message').textContent=this.timer>.5?Math.ceil(this.timer-.5):'GO!';if(this.timer<=0){this.state='playing';$('overlay').hidden=true;}return;}if(this.state==='dying'){this.timer-=dt;if(this.timer<=0){if(this.lives){this.resetActors();this.ready()}else{this.state='over';this.overlay('Game over','Final score: '+this.score,'Play again')}}return;}if(this.state!=='playing')return;this.elapsed+=dt;this.power=Math.max(0,this.power-dt);this.invincible=Math.max(0,this.invincible-dt);this.scatter=this.elapsed%27<7;let diff={Easy:.78,Normal:1,Hard:1.17}[this.difficulty];this.playerSpeed=6.5+Math.min(1.4,(this.level-1)*.15);this.ghostSpeed=Math.min(8.8,(5.1+(this.level-1)*.32)*diff);this.sound.music(dt);if(this.fruit){this.fruit.life-=dt;if(this.fruit.life<=0)this.fruit=null;}else{this.fruitTimer-=dt;if(this.fruitTimer<=0){let [x,y]=rand(this.maze.cells.filter(([x,y])=>Math.abs(x-this.player.x)+Math.abs(y-this.player.y)>4));this.fruit={x,y,life:9};this.fruitTimer=12+Math.random()*15;}}this.player.update(dt,this);if(this.state!=='playing')return;for(const ghost of this.ghosts)ghost.update(dt,this);this.collision();}
 draw(){let c=this.ctx;c.save();c.clearRect(0,0,this.maze.w*T,this.maze.h*T);if(this.shake>0)c.translate(Math.random()*8-4,Math.random()*8-4);this.maze.draw(c,this.t);if(this.fruit){sprite(c,this.fruit.x,this.fruit.y,()=>{c.fillStyle=C.sky;c.shadowColor=C.sky;c.shadowBlur=10;c.beginPath();c.arc(-3,2,5,0,7);c.arc(4,2,5,0,7);c.fill();c.strokeStyle=C.lav;c.beginPath();c.moveTo(-3,-2);c.lineTo(2,-9);c.lineTo(4,-2);c.stroke()})}for(const g of this.ghosts)g.draw(c,this.t,this.power);this.player.draw(c,this.t,this.state==='dying'?1-this.timer:0);for(const p of this.particles){c.globalAlpha=Math.max(0,p.life/.45);c.fillStyle=C.blue;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1;for(const p of this.popups){c.globalAlpha=Math.min(1,p.life*2);c.fillStyle=C.lav;c.font='bold 14px system-ui';c.textAlign='center';c.fillText('+'+p.n,p.x,p.y)}c.restore();}
 frame(now){let dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;if(this.state!=='paused'){this.t+=dt;this.shake=Math.max(0,this.shake-dt);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt}this.particles=this.particles.filter(p=>p.life>0);for(const p of this.popups){p.life-=dt;p.y-=22*dt}this.popups=this.popups.filter(p=>p.life>0); // Small physics steps prevent tunneling at high speed.
 for(let left=dt;left>1e-8;){let step=Math.min(left,1/120);this.update(step);left-=step;}}this.draw();requestAnimationFrame(t=>this.frame(t));}
 pause(){if(this.state==='paused'){this.state=this.previous;if(this.state==='ready')this.overlay('Ready!','Get set',null);else $('overlay').hidden=true;$('pause').textContent='Pause';}else if(['playing','ready'].includes(this.state)){this.previous=this.state;this.state='paused';this.overlay('Paused','Take your time.','Resume');$('pause').textContent='Resume';}}
 mute(){this.sound.unlock();this.sound.muted=!this.sound.muted;$('mute').textContent=this.sound.muted?'Sound off':'Sound on';}
 direction(d){this.player.queued=d;}
 bind(){const keys={arrowup:0,w:0,arrowleft:1,a:1,arrowdown:2,s:2,arrowright:3,d:3};window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(['SELECT','BUTTON'].includes(e.target.tagName)&&k===' ')return;if(e.target.tagName==='SELECT'&&this.state==='start')return;if(k in keys){e.preventDefault();this.direction(keys[k]);}else if(k==='p'||k===' '){e.preventDefault();if(!e.repeat)this.pause()}else if(k==='m'&&!e.repeat)this.mute()});$('action').onclick=()=>{if(this.state==='paused')this.pause();else if(this.state==='complete'){this.level++;this.newLevel()}else this.start();};$('restart').onclick=()=>{$('pause').textContent='Pause';this.start()};$('pause').onclick=()=>this.pause();$('mute').onclick=()=>this.mute();document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();this.direction(Number(b.dataset.dir))}));let origin=null;this.canvas.addEventListener('pointerdown',e=>{origin=[e.clientX,e.clientY];this.canvas.setPointerCapture(e.pointerId)});this.canvas.addEventListener('pointermove',e=>{if(!origin)return;let dx=e.clientX-origin[0],dy=e.clientY-origin[1];if(Math.hypot(dx,dy)>15){this.direction(Math.abs(dx)>Math.abs(dy)?dx>0?3:1:dy>0?2:0);origin=[e.clientX,e.clientY]}});for(const event of ['pointerup','pointercancel'])this.canvas.addEventListener(event,()=>origin=null);document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','ready'].includes(this.state))this.pause()});window.addEventListener('resize',()=>this.resize());}
}
new Game();