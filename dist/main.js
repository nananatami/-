const hero = document.querySelector('.hero');
const grid = document.querySelector('#tiles');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width:700px)');
const turn = document.querySelector('#turn');
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
  flipTimer = setTimeout(() => {busy=false;}, busy ? 1300 : 0);
}
turn.addEventListener('click',() => {window.scrollTo({top:0,behavior:'instant'}); showSide(!back);});
mobile.addEventListener('change',buildGrid);
new ResizeObserver(syncSlices).observe(grid);
window.addEventListener('wheel',e => {
  if(e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
  if(window.scrollY <= 4 && (busy || (!back && e.deltaY>0) || (back && e.deltaY<0))) {
    e.preventDefault();
    if(!busy) showSide(e.deltaY>0);
  }
}, {passive:false});
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
let hoverTimer;
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
    clearTimeout(hoverTimer);
    openProject(button.getAttribute('aria-expanded')==='true'?-1:index);
  });
  button.addEventListener('pointerenter',e=>{
    if(e.pointerType!=='mouse' || !window.matchMedia('(hover:hover)').matches) return;
    clearTimeout(hoverTimer);
    hoverTimer=setTimeout(()=>openProject(index),180);
  });
  button.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));
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
  const darkSurface=target instanceof Element && target.closest('.hero,.project-visual,.project-row.is-open,.project-row:hover');
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

// Horizontal bands open with scroll, then join into one continuous business page.
const businessPage=document.querySelector('#team');
const clamp01=value=>Math.max(0,Math.min(1,value));
let bandFrame=null;
function paintBusinessBands(){
  bandFrame=null;
  const viewport=document.documentElement.clientHeight;
  const top=businessPage.getBoundingClientRect().top;
  const progress=clamp01((viewport-top)/(viewport*.55));
  if(reducedMotion.matches || progress>=1){
    businessPage.style.maskImage='none';
    businessPage.style.setProperty('--project-entrance','1');
    return;
  }
  const bandHeight=viewport*.11;
  const stops=['transparent 0px'];
  for(let i=0;i<4;i++){
    const local=clamp01(progress*1.35-(3-i)*.08);
    const eased=local*local*(3-2*local);
    const start=i*bandHeight;
    const edge=start+Math.max(0,bandHeight*(1-eased)-2);
    stops.push('transparent '+start+'px','transparent '+edge+'px','#000 '+edge+'px','#000 '+((i+1)*bandHeight)+'px');
  }
  stops.push('#000 100%');
  businessPage.style.maskImage='linear-gradient(to bottom,'+stops.join(',')+')';
  const entrance=clamp01((progress-.72)/.28);
  businessPage.style.setProperty('--project-entrance',String(entrance*entrance*(3-2*entrance)));
}
function queueBusinessBands(){
  if(bandFrame===null)bandFrame=requestAnimationFrame(paintBusinessBands);
}
window.addEventListener('scroll',queueBusinessBands,{passive:true});
window.addEventListener('resize',queueBusinessBands,{passive:true});
reducedMotion.addEventListener('change',queueBusinessBands);
paintBusinessBands();
