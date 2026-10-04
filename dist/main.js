const hero = document.querySelector('.hero');
const grid = document.querySelector('#tiles');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width:700px)');
const turn = document.querySelector('#turn');
const flatBack=document.createElement('div');
flatBack.className='flat-back';
flatBack.setAttribute('aria-hidden','true');
flatBack.append(document.querySelector('#back-scene').content.cloneNode(true));
hero.append(flatBack);
let tiles = [], back = false, busy = false, flipTimer;

function syncSlices() {
  const rect = grid.getBoundingClientRect();
  grid.style.setProperty('--stage-width', `${rect.width}px`);
  grid.style.setProperty('--stage-height', `${rect.height}px`);
  tiles.forEach(tile => {
    tile.style.setProperty('--slice-x', `${tile.offsetLeft}px`);
    tile.style.setProperty('--slice-y', `${tile.offsetTop}px`);
  });
}
function buildGrid() {
  grid.replaceChildren();
  const cols = mobile.matches ? 3 : 6, rows = 6;
  tiles = Array.from({length:cols*rows}, (_,i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.setProperty('--delay', `${((i % cols) + Math.floor(i / cols)) * 28}ms`);
    for (const side of ['front','back']) {
      const face = document.createElement('div');
      face.className = `face ${side}`;
      face.append(document.querySelector(`#${side}-scene`).content.cloneNode(true));
      tile.append(face);
    }
    tile.addEventListener('pointerenter', e => {
      if(e.pointerType === 'mouse' && !back && !busy && !reducedMotion.matches && !tile.classList.contains('peek')) {
        tile.classList.add('peek');
        setTimeout(() => tile.classList.remove('peek'), 1200);
      }
    });
    grid.append(tile);
    return tile;
  });
  syncSlices();
}
function showSide(next, immediate=false) {
  if(busy || next === back) return;
  hero.classList.remove('is-static-back');
  back = next;
  busy = !immediate && !reducedMotion.matches;
  tiles.forEach(tile => tile.classList.remove('peek'));
  hero.classList.toggle('is-back',back);
  document.querySelector('#about').setAttribute('aria-hidden', String(!back));
  document.querySelector('#hero-title').setAttribute('aria-hidden',String(back));
  turn.textContent = back ? '返回首页' : '翻到介绍';
  turn.setAttribute('aria-label',back ? '翻回工作室首页' : '翻到工作室介绍');
  document.querySelector('#scroll-text').textContent = back ? 'SCROLL TO DISCOVER' : 'SCROLL TO EXPLORE';
  document.querySelector('.scroll').href = back ? '#team' : '#about';
  document.querySelector('.scroll').setAttribute('aria-label',back ? '查看团队与项目' : '了解一梦');
  clearTimeout(flipTimer);
  flipTimer = setTimeout(() => {busy=false;hero.classList.toggle('is-static-back',back);}, busy ? 1300 : 0);
}
turn.addEventListener('click',() => {window.scrollTo({top:0,behavior:'instant'}); showSide(!back);});
mobile.addEventListener('change',buildGrid);
new ResizeObserver(syncSlices).observe(grid);
function handleHeroWheel(e){
  if(e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
  if(window.scrollY <= 4 && (busy || (!back && e.deltaY>0) || (back && e.deltaY<0))) {
    e.preventDefault();
    if(!busy) showSide(e.deltaY>0);
  }
}
let wheelTrapActive=false;
function syncHeroWheelTrap(){
  const active=window.scrollY<=4;
  if(active===wheelTrapActive)return;
  wheelTrapActive=active;
  if(active)window.addEventListener('wheel',handleHeroWheel,{passive:false});
  else window.removeEventListener('wheel',handleHeroWheel);
}
window.addEventListener('scroll',syncHeroWheelTrap,{passive:true});
syncHeroWheelTrap();
let startTouch = null;
let touchConsumed = false;
hero.addEventListener('touchstart',e => {startTouch=e.touches[0].clientY;touchConsumed=false;}, {passive:true});
hero.addEventListener('touchmove',e => {
  if(touchConsumed){e.preventDefault();return;}
  if(startTouch===null || window.scrollY>4) return;
  const delta = startTouch-e.touches[0].clientY;
  if(busy || (!back && delta>12) || (back && delta< -12)) {
    e.preventDefault();
    touchConsumed=true;
    if(!busy) {showSide(delta>0); startTouch=null;}
  }
}, {passive:false});
hero.addEventListener('touchend',() => {startTouch=null;touchConsumed=false;}, {passive:true});
// Scrollbar dragging and browser-native keyboard scrolling also reveal the back.
let previousScroll = 0;
window.addEventListener('scroll',() => {
  const y=window.scrollY;
  if(!back && y>4 && y<hero.offsetHeight*.9){
    window.scrollTo({top:0,behavior:'instant'});
    if(!busy) showSide(true);
    previousScroll=0;
    return;
  } else if(back && y<=4 && previousScroll>20 && !busy){
    showSide(false);
  }
  previousScroll=y;
}, {passive:true});
document.addEventListener('keydown',e => {
  if(e.target.closest('input,textarea,select') || (e.key===' ' && e.target.closest('button,a')) || window.scrollY>4) return;
  const down = ['PageDown','ArrowDown',' '].includes(e.key), up = ['PageUp','ArrowUp'].includes(e.key);
  if((!back && down) || (back && up) || (busy && (up || down))) {e.preventDefault(); if(!busy) showSide(down);}
});
document.querySelectorAll('a[href="#about"]').forEach(a => a.addEventListener('click',e => {
  if(a.getAttribute('href')==='#team'){e.preventDefault();openSection('#team');return;}
  e.preventDefault(); window.scrollTo({top:0,behavior:'instant'}); showSide(true);
}));
document.querySelectorAll('a[href="#top"]').forEach(a => a.addEventListener('click',e => {
  e.preventDefault(); window.scrollTo({top:0,behavior:'instant'}); showSide(false);
}));
function openSection(hash, initial=false){
  const target=document.querySelector(hash);
  if(!target) return;
  if(!back) showSide(true,initial);
  window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY,behavior:initial||reducedMotion.matches?'instant':'smooth'});
  history.replaceState(null,'',hash);
}
document.querySelectorAll('a[href="#team"],a[href="#projects"],a[href="#capabilities"]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();openSection(a.getAttribute('href'));
}));
history.scrollRestoration='manual';
buildGrid();
window.addEventListener('load',() => {
  if(['#team','#projects','#capabilities'].includes(location.hash)) openSection(location.hash,true);
  else window.scrollTo({top:0,behavior:'instant'});
});

// Full-width project rows, with one detail region expanded at a time.
const projectRows=[...document.querySelectorAll('.project-row')];
const projectButtons=projectRows.map(row=>row.querySelector('.project-toggle'));
// Keep the real button label on the front; the back is a decorative duplicate.
projectButtons.forEach(button=>{
  const flipper=document.createElement('span');
  flipper.className='project-heading-flipper';
  const front=document.createElement('span');
  front.className='project-heading-face project-heading-front';
  front.append(...button.childNodes);
  const rear=front.cloneNode(true);
  rear.className='project-heading-face project-heading-back';
  rear.setAttribute('aria-hidden','true');
  flipper.append(front,rear);
  button.append(flipper);
});
let scrollIdleTimer,projectScrolling=false;
window.addEventListener('scroll',()=>{
  if(!projectScrolling)projectRows.forEach(row=>row.classList.remove('is-highlighted'));
  projectScrolling=true;
  clearTimeout(scrollIdleTimer);
  scrollIdleTimer=setTimeout(()=>{projectScrolling=false;},180);
},{passive:true});
function openProject(selected){
  projectRows.forEach((row,index)=>{
    const open=index===selected;
    row.classList.toggle('is-open',open);
    projectButtons[index].setAttribute('aria-expanded',String(open));
    const region=row.querySelector('.project-reveal');
    region.setAttribute('aria-hidden',String(!open));
    region.inert=!open;
  });
  if(document.body.classList.contains('has-custom-cursor'))updateCursorTarget(document.elementFromPoint(cursorX,cursorY));
}
projectButtons.forEach((button,index)=>{
  button.addEventListener('click',()=>{
    openProject(button.getAttribute('aria-expanded')==='true'?-1:index);
  });
  button.addEventListener('pointerenter',e=>{
    if(e.pointerType!=='mouse' || projectScrolling || !window.matchMedia('(hover:hover)').matches) return;
    button.closest('.project-row').classList.add('is-highlighted');
  });
  button.addEventListener('pointerleave',()=>button.closest('.project-row').classList.remove('is-highlighted'));
  button.addEventListener('keydown',e=>{
    let next=index;
    if(e.key==='ArrowDown') next=(index+1)%projectButtons.length;
    else if(e.key==='ArrowUp') next=(index+projectButtons.length-1)%projectButtons.length;
    else if(e.key==='Home') next=0;
    else if(e.key==='End') next=projectButtons.length-1;
    else return;
    e.preventDefault();projectButtons[next].focus();
  });
});
// Native cursors remain the fallback until a fine mouse pointer enters the page.
const cursor=document.querySelector('#custom-cursor');
const cursorSymbol=cursor.querySelector('.cursor-symbol');
const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)');
let cursorX=0,cursorY=0,cursorFrame=null,trailX=0,trailY=0,lastCursorTime=0;
function hideCursor(){if(cursorFrame!==null){cancelAnimationFrame(cursorFrame);cursorFrame=null;}lastCursorTime=0;document.body.classList.remove('has-custom-cursor');cursor.classList.remove('cursor-pressed');}
function updateCursorTarget(target){
  const control=target instanceof Element?target.closest('button,a,[role="button"]'):null;
  cursor.classList.toggle('cursor-interactive',Boolean(control));
  const darkSurface=target instanceof Element && target.closest('.hero,.project-visual,.project-row.is-open,.project-row.is-highlighted');
  cursor.classList.toggle('cursor-on-dark',Boolean(darkSurface));
  cursorSymbol.textContent='';
}
function drawCursor(time){
  const staticMotion=reducedMotion.matches;
  const dt=lastCursorTime?Math.min(time-lastCursorTime,40):16;
  const blend=staticMotion?1:1-Math.exp(-dt/65);
  trailX+=(cursorX-trailX)*blend;trailY+=(cursorY-trailY)*blend;
  const dx=cursorX-trailX,dy=cursorY-trailY;
  const base=cursor.classList.contains('cursor-interactive')?32:20;
  cursor.style.transform=`translate3d(${trailX}px,${trailY}px,0)`;
  cursor.style.setProperty('--cursor-width',`${base+Math.min(Math.abs(dx)*1.4,160)}px`);
  cursor.style.setProperty('--cursor-height',`${base+Math.min(Math.abs(dy)*.75,60)}px`);
  cursor.style.setProperty('--dot-x',`${dx}px`);cursor.style.setProperty('--dot-y',`${dy}px`);
  document.body.classList.add('has-custom-cursor');
  lastCursorTime=time;
  if(!staticMotion && Math.abs(dx)+Math.abs(dy)>.12){cursorFrame=requestAnimationFrame(drawCursor);}
  else{cursorFrame=null;lastCursorTime=0;}
}
window.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse' || !finePointer.matches){hideCursor();return;}
  cursorX=e.clientX;cursorY=e.clientY;
  if(!document.body.classList.contains('has-custom-cursor')){trailX=cursorX;trailY=cursorY;}
  updateCursorTarget(e.target);
  if(cursorFrame===null)cursorFrame=requestAnimationFrame(drawCursor);
},{passive:true});
window.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&finePointer.matches)cursor.classList.add('cursor-pressed');},{passive:true});
window.addEventListener('pointerup',()=>cursor.classList.remove('cursor-pressed'),{passive:true});
document.addEventListener('click',e=>updateCursorTarget(e.target));
document.documentElement.addEventListener('pointerleave',hideCursor);
window.addEventListener('blur',hideCursor);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hideCursor();});
document.addEventListener('keydown',e=>{if(e.key==='Tab')hideCursor();});
finePointer.addEventListener('change',()=>{if(!finePointer.matches)hideCursor();});

window.addEventListener('scroll',()=>{if(document.body.classList.contains('has-custom-cursor'))updateCursorTarget(document.elementFromPoint(cursorX,cursorY));},{passive:true});
