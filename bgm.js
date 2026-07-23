/* ================================================================
   BGM — plays real audio files from assets/music/, one at a time,
   looping back to the first when one ends, so the corridor always
   has music playing. To add more music later: drop the file into
   assets/music/ and add one line to the TRACKS array below —
   nothing else needs to change.
   Controls: play/pause (walk-through toggle) and the ♪ button, which
   cycles the volume 끔 → 중간 → 크게 (mute → medium → loud), changing
   icon and size to match.
   ================================================================ */
(function(){
  const btnNext = document.getElementById('bgmVol');
  if (!btnNext) return;

  const TRACKS = [
    {
      file: 'assets/music/chopin_fantaisie_impromptu_op66.mp3',
      title: 'Fantaisie-Impromptu, Op. 66',
      composer: 'F. Chopin',
      performer: '김민기',
      license: 'CC BY 4.0',
      source: '공유마당 (gongu.copyright.or.kr), 한국저작권위원회',
    },
  ];

  const audio = new Audio();
  audio.preload = 'auto';

  // 음표 버튼: 클릭할 때마다 끔 → 중간 → 크게 순으로 순환 (아이콘도 함께 바뀜)
  const VOL_LEVELS = [0, 0.35, 0.85];
  const VOL_LABELS = ['음소거', '음량 중간', '음량 크게'];
  let volIndex = 1;
  audio.volume = VOL_LEVELS[volIndex];

  let order = TRACKS.map((_, i) => i);
  let pos = 0;
  let playing = false;
  let ducked = false;
  let fadeRaf = null;

  // smoothly ramps audio.volume toward `target` — used both for the normal
  // play/pause fade and for ducking under the lightbox
  function fadeVolumeTo(target, ms){
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    const start = audio.volume;
    const t0 = performance.now();
    if (ms <= 0){ audio.volume = target; return; }
    function step(now){
      const p = Math.min(1, (now - t0) / ms);
      audio.volume = start + (target - start) * p;
      if (p < 1) fadeRaf = requestAnimationFrame(step);
    }
    fadeRaf = requestAnimationFrame(step);
  }

  // 그림 팝업이 열리면 볼륨만 낮추고(재생은 유지), 닫히면 원래 볼륨으로
  // 복귀 — 재생 중이었다면 그 상태 그대로 이어서 들린다.
  function duck(on){
    ducked = on;
    fadeVolumeTo(on ? VOL_LEVELS[volIndex] * 0.24 : VOL_LEVELS[volIndex], 500);
    if (!on && playing && audio.paused) audio.play().catch(()=>{});
  }

  function renderNoteBtn(){
    btnNext.classList.toggle('muted', volIndex === 0);
    btnNext.classList.toggle('loud', volIndex === 2);
    btnNext.textContent = volIndex === 2 ? '♫' : '♪';
    btnNext.title = VOL_LABELS[volIndex];
    btnNext.setAttribute('aria-label', VOL_LABELS[volIndex]);
  }
  renderNoteBtn();

  function shuffle(){
    order = TRACKS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  shuffle();

  function loadTrack(i){
    pos = ((i % order.length) + order.length) % order.length;
    audio.src = TRACKS[order[pos]].file;
  }
  loadTrack(0);

  audio.addEventListener('ended', () => {
    loadTrack(pos + 1);
    if (playing) audio.play().catch(()=>{});
  });

  function setPlaying(on){
    playing = on;
    if (on){
      audio.play().catch(()=>{});
    } else {
      audio.pause();
    }
  }

  // the note button cycles the volume: 끔 → 중간 → 크게 → 끔 …
  btnNext.addEventListener('click', ()=>{
    volIndex = (volIndex + 1) % VOL_LEVELS.length;
    renderNoteBtn();
    fadeVolumeTo(ducked ? VOL_LEVELS[volIndex] * 0.24 : VOL_LEVELS[volIndex], 250);
  });

  // public API for the unified play/pause toggle in main.js
  window.BGM = {
    setPlaying,
    duck,
    get playing(){ return playing; },
    get tracks(){ return TRACKS; },
  };
})();
