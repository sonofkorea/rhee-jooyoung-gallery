const IMG_BASE = "assets/art/web3/";

/* ---------------- bio portrait: a slow float plays always (no mouse
   interaction), over one of his paintings picked at random each visit ---------------- */
(function(){
  const wrap = document.getElementById('bioPhoto');
  if (!wrap) return;
  const bg = wrap.querySelector('.bio-photo-bg');
  if (bg && typeof ARTWORKS !== 'undefined' && ARTWORKS.length){
    const pick = ARTWORKS[Math.floor(Math.random() * ARTWORKS.length)];
    bg.style.backgroundImage = `url('${IMG_BASE}${pick.file}')`;
  }
})();

/* ---------------- nav: every link scrolls smoothly to a sensible landing point ----------------
   "hold" targets (pinned stage-blocks) land partway into their scroll range, where the
   content is already fully visible — not on the blank frame at their very top.
   "top" targets (normal-flow sections, or the hero for "처음") just land at their top edge. */
document.querySelectorAll('a[data-jump]').forEach(link=>{
  link.addEventListener('click', (e)=>{
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const offsetRatio = link.dataset.jump === 'hold' ? 0.32 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY + target.offsetHeight * offsetRatio;
    window.scrollTo({ top, behavior:'smooth' });
  });
});

/* ---------------- progress bar ---------------- */
const progressBar = document.getElementById('progress');
function updateProgress(){
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  progressBar.style.width = pct + '%';
}

/* ---------------- hero dust particles ---------------- */
const dustWrap = document.getElementById('dust');
for (let i=0;i<38;i++){
  const s = document.createElement('i');
  const left = Math.random()*100;
  const dur = 9 + Math.random()*14;
  const delay = Math.random()*18;
  const size = 1.5 + Math.random()*3;
  s.style.left = left+'vw';
  s.style.bottom = (-5)+'vh';
  s.style.width = s.style.height = size+'px';
  s.style.animationDuration = dur+'s';
  s.style.animationDelay = delay+'s';
  dustWrap.appendChild(s);
}

/* ---------------- reveal on scroll ---------------- */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
}, {threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ================================================================
   APPROACH — one painting at a time. Each work rises out of the haze,
   tilts into full 3D presence dead-centre, holds large and sharp for a
   generous stretch, then recedes — while the next piece is already
   glimpsed, small and blurred, waiting at the edge. Rooms (grouped by
   theme) are separated by gates that part like doors.
   ================================================================ */
const corridorTrack = document.getElementById('corridorTrack');
const walkHint = document.getElementById('walkHint');
const walkBar = document.getElementById('walkBar');
const ambient = document.getElementById('ambient');

const PART_DEFS = [
  { series:'circle', tag:'Room I — 원의 세계', title:'원형의 오르피즘', desc:'원과 구, 겹쳐진 색띠로<br>화면을 분해하고 재구성한 초기 대표작들.' },
  { series:'music', tag:'Room II — 소리의 형태', title:'음악, 색채로 그리다', desc:'모차르트에서 드뷔시까지 —<br>선율의 진동을 캔버스 위 색선으로 옮긴 연작.' },
  { series:'landscape', tag:'Room III — 다시, 자연으로', title:'후기 풍경', desc:'화려한 색채선조를 지나,<br>화가가 다시 눈을 돌린 숲과 바다와 하늘.' },
];

function smoothstep(a,b,x){
  const t = Math.min(1, Math.max(0, (x-a)/(b-a)));
  return t*t*(3-2*t);
}

/* ================================================================
   STAGE SYSTEM — a reusable "one screen at a time" moment: a block
   is pinned, fades in, holds long enough to read, then dissolves
   before the next stage takes over. Used for the method note, the
   corridor intro, and every room gate.
   ================================================================ */
const stageBlocks = []; // {wrapEl, contentEl, onProgress?}
function registerStage(wrapEl, contentEl, onProgress){
  stageBlocks.push({ wrapEl, contentEl, onProgress });
}
function updateStages(){
  const vh = window.innerHeight;
  stageBlocks.forEach((stage)=>{
    const { wrapEl, contentEl, onProgress } = stage;
    const rect = wrapEl.getBoundingClientRect();
    if (rect.bottom < -300 || rect.top > vh + 300) return; // well offscreen, skip
    const scrollable = rect.height - vh;
    const p = Math.min(1, Math.max(0, (0 - rect.top) / (scrollable || 1)));
    // a longer plateau (0.15–0.88 instead of 0.2–0.8): the text has more time
    // to finish its line-by-line cascade, and holds well after the last line
    // lands before it starts to dissolve.
    const d = smoothstep(0, 0.15, p) * (1 - smoothstep(0.88, 1, p));
    contentEl.style.opacity = d.toFixed(3);
    contentEl.style.transform = `translateY(${((1-d)*26).toFixed(1)}px) scale(${(0.97+d*0.03).toFixed(3)})`;
    contentEl.style.filter = `blur(${((1-d)*6).toFixed(1)}px)`;

    // once the block is meaningfully visible, cascade any .lines paragraph in one line at a time
    if (!stage._linesEl) stage._linesEl = contentEl.querySelector('.lines');
    if (stage._linesEl && p > 0.16 && !stage._linesEl.classList.contains('in')){
      stage._linesEl.classList.add('in');
    }

    if (onProgress) onProgress(p, d);
  });
}

function makeDivider(def, n){
  const wrap = document.createElement('div');
  wrap.className = 'divider-wrap';
  const div = document.createElement('div');
  div.className = 'divider';
  div.innerHTML = `
    <div class="num serif">${n}</div>
    <div class="gate-panel left"></div>
    <div class="gate-panel right"></div>
    <div class="divider-inner">
      <div class="rule"></div>
      <span class="tag">${def.tag}</span>
      <h3 class="serif">${def.title}</h3>
      <p>${def.desc}</p>
    </div>`;
  wrap.appendChild(div);
  const inner = div.querySelector('.divider-inner');
  registerStage(wrap, inner, (p)=>{
    div.classList.toggle('in', p > 0.05); // doors part open once, early in the hold
  });
  return wrap;
}

const roomTitleEl = document.createElement('div');
roomTitleEl.className = 'room-title';
roomTitleEl.innerHTML = `<span class="k"></span><h4 class="serif"></h4>`;
document.body.appendChild(roomTitleEl);
const roomTitleK = roomTitleEl.querySelector('.k');
const roomTitleH = roomTitleEl.querySelector('h4');

/* ================================================================
   ROOM WALK — one continuous horizontal filmstrip per room, exactly
   like site 1's original walkthrough: a single sticky stage, a track
   of cards translated purely sideways by scroll, each card tilting
   in 3D as it passes the centre. No per-item pinned sections, no
   vertical motion anywhere — this is what makes it read as walking
   past a continuous row of paintings hung down a corridor, with
   several always in view at once.
   ================================================================ */
const dividerEls = [];
const roomWalks = []; // {el, track, cards:[{el,fig,color}], roomIdx, roomDef, dist}

function makeRoomWalk(items, roomIdx, roomDef){
  const wrap = document.createElement('div');
  wrap.className = 'room-walk';
  wrap.innerHTML = `<div class="room-walk-sticky"><div class="room-walk-track"></div></div>`;
  const track = wrap.querySelector('.room-walk-track');
  const cards = [];
  items.forEach((art)=>{
    const artIndex = ARTWORKS.indexOf(art);
    const card = document.createElement('div');
    card.className = 'walk-card';
    card.dataset.artIndex = artIndex;
    card.title = '클릭하면 크게 보기';
    card.innerHTML = `
      <div class="spot"></div>
      <figure>
        <div class="ph">
          <img src="${IMG_BASE}${art.file}" alt="${art.title}" loading="lazy" decoding="async">
          <div class="rim"></div>
        </div>
      </figure>
      <div class="cap">
        <span class="idx serif">${String(artIndex+1).padStart(2,'0')} / ${ARTWORKS.length}</span>
        <div class="t serif">${art.title}</div>
        <div class="m">${art.size} · ${art.medium}</div>
      </div>`;
    track.appendChild(card);
    cards.push({ el: card, fig: card.querySelector('figure'), cap: card.querySelector('.cap'), spot: card.querySelector('.spot'), color: art.color || [150,120,90] });
  });
  roomWalks.push({ el: wrap, track, cards, roomIdx, roomDef, dist: 0 });
  return wrap;
}

const frag = document.createDocumentFragment();
PART_DEFS.forEach((def, di) => {
  const dividerEl = makeDivider(def, di+1);
  dividerEls.push(dividerEl);
  frag.appendChild(dividerEl);

  const items = ARTWORKS.filter(a => a.series === def.series);
  frag.appendChild(makeRoomWalk(items, di, def));
});
corridorTrack.appendChild(frag);
corridorTrack.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// track when a gate/divider (which is mostly text) is on screen, so autoplay
// can slow down to reading pace there even at the fast "rabbit" setting
const activeDividers = new Set();
const dividerObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if (entry.isIntersecting) activeDividers.add(entry.target);
    else activeDividers.delete(entry.target);
  });
}, { threshold: 0.15 });
dividerEls.forEach(el => dividerObserver.observe(el));

// click any painting to open it full-size in the space viewer
corridorTrack.addEventListener('click', (e)=>{
  const card = e.target.closest('.walk-card');
  if (!card) return;
  const idx = parseInt(card.dataset.artIndex, 10);
  if (!isNaN(idx)) openLightbox(idx);
});

// each room's track needs real image widths to compute its scroll distance —
// measure once now, then again as each image finishes loading.
function layoutRoomWalks(){
  const vw = window.innerWidth, vh = window.innerHeight;
  roomWalks.forEach(rw=>{
    const trackW = rw.track.scrollWidth;
    const dist = Math.max(trackW - vw + vw*0.18, 0);
    rw.dist = dist;
    rw.el.style.height = (vh + dist) + 'px';
  });
}
layoutRoomWalks();
// the very first measurement can land before the stylesheet/layout has
// fully settled (card widths come from CSS, not the images, but the browser
// still needs a paint tick to commit them) — re-measure a beat later so
// `dist` never gets stuck at a near-zero value.
requestAnimationFrame(()=>{ layoutRoomWalks(); updateRoomWalks(); });
setTimeout(()=>{ layoutRoomWalks(); updateRoomWalks(); }, 300);
window.addEventListener('resize', layoutRoomWalks);
const roomWalkImgs = [...corridorTrack.querySelectorAll('.walk-card img')];
roomWalkImgs.filter(img=>!img.complete).forEach(img=>{
  img.addEventListener('load', ()=>{ layoutRoomWalks(); updateRoomWalks(); }, { once:true });
});

/* ---- active-set tracking via IntersectionObserver (perf) ---- */
const activeRoomWalks = new Set();
const roomWalkObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    const rw = roomWalks.find(r => r.el === entry.target);
    if (!rw) return;
    if (entry.isIntersecting) activeRoomWalks.add(rw);
    else activeRoomWalks.delete(rw);
  });
}, { rootMargin: '15% 0px 15% 0px', threshold:0 });
roomWalks.forEach(rw => roomWalkObserver.observe(rw.el));

let anyVisible = false;
let currentPeakD = -1; // exposed for the autoplay engine: how "in focus" the sharpest visible painting is

function updateRoomWalks(){
  const vh = window.innerHeight, vw = window.innerWidth;
  const centerX = vw / 2;
  let bestT = -1, bestColor = null, bestRoom = null;
  anyVisible = false;

  activeRoomWalks.forEach(rw=>{
    const rect = rw.el.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh) anyVisible = true;

    const scrolled = -rect.top;
    const progressed = Math.min(1, Math.max(0, scrolled / (rw.dist || 1)));
    // round to whole pixels — fractional translateX forces the GPU to keep
    // re-resampling every frame, which is what reads as a "sparkle" along
    // any hard light/dark edge in the artwork (e.g. a white canvas margin)
    const x = Math.round(-progressed * rw.dist);
    rw.track.style.transform = `translateX(${x}px)`;

    rw.cards.forEach(c=>{
      const r = c.el.getBoundingClientRect();
      if (r.right < -200 || r.left > vw + 200) return; // well off to the side, skip
      const cardCenter = r.left + r.width / 2;
      const delta = (cardCenter - centerX) / centerX;
      const clamped = Math.max(-1, Math.min(1, delta));
      const t = 1 - Math.abs(clamped); // 0 at the edges, 1 dead-centre
      const tEase = Math.pow(Math.max(0,t), 0.85);

      const rotY = clamped * -16;
      const scaleF = 0.8 + tEase * 0.3;
      const z = -Math.abs(clamped) * 110;

      c.fig.style.transform = `perspective(1400px) rotateY(${rotY.toFixed(1)}deg) translateZ(${z.toFixed(0)}px) scale(${scaleF.toFixed(3)})`;
      c.fig.style.filter = `brightness(${(0.55+tEase*0.5).toFixed(2)}) saturate(${(0.85+tEase*0.3).toFixed(2)})`;
      c.el.style.opacity = (0.3 + tEase*0.7).toFixed(3);

      const capO = Math.max(0, (tEase - 0.6))/0.4;
      c.cap.style.opacity = capO.toFixed(2);

      // a warm COB-style spotlight pools brighter directly above whichever
      // painting is nearest centre, as if a track light is following it
      if (c.spot) c.spot.style.opacity = (0.15 + tEase*0.75).toFixed(2);

      if (t > bestT){ bestT = t; bestColor = c.color; bestRoom = rw; }
    });
  });

  currentPeakD = Math.max(0, bestT);

  if (bestColor && bestT > 0.15){
    ambient.style.setProperty('--gc1', bestColor.join(','));
    const dim = bestColor.map(c=>Math.round(c*0.34));
    ambient.style.setProperty('--gc2', dim.join(','));
  }

  if (bestRoom && bestT > 0.25){
    roomTitleK.textContent = bestRoom.roomDef.tag;
    roomTitleH.textContent = bestRoom.roomDef.title;
    roomTitleEl.classList.add('show');
  } else {
    roomTitleEl.classList.remove('show');
  }

  // the hint only makes sense while the visitor is scrolling by hand — during
  // autoplay it can visually collide with the room title/caption (especially
  // when the page is zoomed in), so hide it whenever the walk drives itself
  walkHint.classList.toggle('show', anyVisible && !isPlaying);
  updateProgress();
}

/* ================================================================
   STATEMENT — one line at a time. The quote is pinned and scrolled
   through step by step: each line rises under candlelight, holds,
   then dissolves before the next line takes the stage.
   ================================================================ */
const statementStage = document.getElementById('statementStage');
const stmtLines = [...document.querySelectorAll('.stmt-line')];
// the last line gets a double-length slot, so it lingers on screen well
// after it finishes appearing instead of dissolving right away.
const STMT_WEIGHTS = stmtLines.map((_, i) => i === stmtLines.length - 1 ? 2.2 : 1);
const STMT_STARTS = (() => { let acc = 0; return STMT_WEIGHTS.map(w => { const s = acc; acc += w; return s; }); })();
const STMT_TOTAL = STMT_WEIGHTS.reduce((a,b)=>a+b, 0);

function updateStatement(){
  const vh = window.innerHeight;
  const rect = statementStage.getBoundingClientRect();
  if (rect.bottom < -200 || rect.top > vh + 200) return; // well offscreen, skip
  const scrollable = rect.height - vh;
  const p = Math.min(1, Math.max(0, (0 - rect.top) / (scrollable || 1)));
  const globalPos = p * STMT_TOTAL;
  stmtLines.forEach((el, i)=>{
    const w = STMT_WEIGHTS[i];
    const t = Math.min(1, Math.max(0, (globalPos - STMT_STARTS[i]) / w));
    // a wider hold (0.18–0.85 of this line's own slot) — slower to arrive, slower to leave
    const d = smoothstep(0, 0.18, t) * (1 - smoothstep(0.85, 1, t));
    el.style.opacity = d.toFixed(3);
    el.style.transform = `translateY(${((1-d)*18).toFixed(1)}px) scale(${(0.97+d*0.03).toFixed(3)})`;
    el.style.filter = `blur(${((1-d)*6).toFixed(1)}px)`;
  });
}

registerStage(document.getElementById('methodStage'), document.getElementById('methodContent'));
registerStage(document.getElementById('introStage'), document.getElementById('introContent'));

let ticking = false;
document.addEventListener('scroll', ()=>{
  if (!ticking){
    requestAnimationFrame(()=>{ updateRoomWalks(); updateStatement(); updateStages(); ticking = false; });
    ticking = true;
  }
}, {passive:true});
window.addEventListener('load', ()=>{ layoutRoomWalks(); updateRoomWalks(); updateStatement(); updateStages(); });
window.addEventListener('resize', ()=>{ updateRoomWalks(); updateStatement(); updateStages(); });
updateRoomWalks();
updateStatement();
updateStages();

/* ================= GRID GALLERY ================= */
const grid = document.getElementById('grid');
let currentFilter = 'all';

function renderGrid(){
  grid.innerHTML = '';
  ARTWORKS.forEach((art, i) => {
    if (currentFilter !== 'all' && art.series !== currentFilter) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="ph"><img src="${IMG_BASE}${art.file}" alt="${art.title}" loading="lazy" decoding="async"></div>
      <div class="meta">
        <div class="t serif">${art.title}</div>
        <div class="m">${art.size} · ${art.medium}</div>
      </div>`;
    card.addEventListener('click', ()=>openLightbox(i));
    grid.appendChild(card);
    requestAnimationFrame(()=> setTimeout(()=>card.classList.add('show'), (i%12)*35));
  });
}
renderGrid();

document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.f;
    renderGrid();
  });
});

/* ================= LIGHTBOX ================= */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbTitle = document.getElementById('lbTitle');
const lbMeta = document.getElementById('lbMeta');
let lbIndex = 0;

function openLightbox(i){
  lbIndex = i;
  showLightbox();
  lightbox.classList.add('open');
  setAutoplay(false, { skipBgm: true }); // stepping into deep space pauses the walk, but the music just ducks
  if (window.BGM) window.BGM.duck(true);
}
function showLightbox(){
  const art = ARTWORKS[lbIndex];
  lbImg.src = IMG_BASE + art.file;
  lbImg.alt = art.title;
  lbTitle.textContent = art.title;
  lbMeta.textContent = `${art.size} · ${art.medium}`;
  const c = art.color || [120,90,70];
  lightbox.style.setProperty('--gc1', c.join(','));
}
function closeLightbox(){
  lightbox.classList.remove('open');
  if (window.BGM) window.BGM.duck(false); // restores volume, and resumes playback if it was still going
}
document.getElementById('lbClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) closeLightbox(); });
document.getElementById('lbPrev').addEventListener('click', ()=>{ lbIndex = (lbIndex-1+ARTWORKS.length)%ARTWORKS.length; showLightbox(); });
document.getElementById('lbNext').addEventListener('click', ()=>{ lbIndex = (lbIndex+1)%ARTWORKS.length; showLightbox(); });
document.addEventListener('keydown', (e)=>{
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
});

/* ================================================================
   AUTOPLAY — a play button walks the visitor through the corridor
   automatically. Speed presets (turtle/person/rabbit) set the base
   glide speed; whichever painting is sharpest gets a long, deliberate
   pause at its peak before the walk continues.

   Play state lives in two places on purpose, not by accident:
     - isPlaying (here)   = is the corridor scrolling itself right now.
     - window.BGM.playing = is the music itself playing right now.
   They're kept in sync by setAutoplay() for the normal play/pause toggle,
   but they're allowed to diverge in the lightbox: opening it pauses the
   walk (isPlaying → false) while the music keeps going, just ducked
   (see openLightbox/closeLightbox and BGM.duck). Volume level (mute/
   medium/loud) is a third, independent axis owned entirely by bgm.js.
   If you're chasing a play-state bug, check which of these three you're
   actually looking at before assuming they're the same flag.
   ================================================================ */
const playerEl = document.getElementById('player');
const pPlayBtn = document.getElementById('pPlay');
const icPlay = pPlayBtn.querySelector('.ic-play');
const icPause = pPlayBtn.querySelector('.ic-pause');
const pTrackFill = document.getElementById('pTrackFill');
const speedBtns = document.querySelectorAll('.p-speed');

const SPEED_PX_PER_MS = { slow: 0.20, mid: 0.46, fast: 0.95 };
let speedKey = 'mid';
let isPlaying = false;
let lastTs = null;
let scrollRemainder = 0; // sub-pixel accumulator so slow holds still eventually move

function setAutoplay(on, opts){
  opts = opts || {};
  isPlaying = on;
  icPlay.style.display = on ? 'none' : '';
  icPause.style.display = on ? '' : 'none';
  playerEl.classList.toggle('collapsed', on); // extra controls slide away to the right while playing
  // the walk and the music start/stop together, except when stepping into
  // the lightbox — there the music should just duck, not stop (see openLightbox)
  if (!opts.skipBgm && window.BGM) window.BGM.setPlaying(on);
  lastTs = null;
  scrollRemainder = 0;
  if (on) requestAnimationFrame(autoplayTick);
}

pPlayBtn.addEventListener('click', ()=> setAutoplay(!isPlaying));

speedBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    speedBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    speedKey = btn.dataset.speed;
  });
});

// the visitor grabbing the wheel/touch themselves hands control back
['wheel','touchstart'].forEach(evt=>{
  window.addEventListener(evt, ()=>{ if (isPlaying) setAutoplay(false); }, { passive:true });
});

function autoplayTick(ts){
  if (!isPlaying) return;
  if (lastTs == null) lastTs = ts;
  const dt = Math.min(48, ts - lastTs); // clamp to avoid huge jumps after tab-switch
  lastTs = ts;

  // when a painting is at (or near) peak sharpness, glide almost to a stop
  const peak = Math.max(0, currentPeakD);
  const holdFactor = peak > 0.9 ? 0.045 : (1 - smoothstep(0.55, 0.9, peak) * 0.85);

  // reading a gate's text needs a human pace — even on "rabbit", cap at "person" speed there
  let baseSpeed = SPEED_PX_PER_MS[speedKey];
  if (activeDividers.size > 0) baseSpeed = Math.min(baseSpeed, SPEED_PX_PER_MS.mid);

  const speed = baseSpeed * holdFactor;

  // accumulate sub-pixel movement so a slow hold still creeps forward
  // instead of rounding to zero and stalling forever
  scrollRemainder += speed * dt;
  const step = Math.trunc(scrollRemainder);
  if (step !== 0){
    window.scrollBy(0, step);
    scrollRemainder -= step;
  }
  pTrackFill.style.width = (document.documentElement.scrollTop / (document.documentElement.scrollHeight - window.innerHeight) * 100) + '%';

  // reached the bottom — stop and reset to play icon
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4){
    setAutoplay(false);
    return;
  }
  requestAnimationFrame(autoplayTick);
}
