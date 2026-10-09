/* Looping hero videos (web development, CRM, AI automation, digital marketing): each video plays once,
   then its short end card (e.g. "Design. Build. Rank.") shows for 3 seconds before the video restarts.
   Sound is on by default, like the home page hero: browsers may refuse to autoplay with sound until the
   visitor interacts, so the video falls back to muted and the first click or key press turns sound on.
   The speaker button in the corner toggles it. Pauses while the hero is off screen.
   With reduced motion it stays on the poster frame and shows the end card. */
(function(){
  var HOLD = 3000;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/>' +
    '<path class="snd-on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' +
    '<path class="snd-off" d="m23 9-6 6M17 9l6 6"/></svg>';

  Array.prototype.forEach.call(document.querySelectorAll('.wd-hero-video video'), function(video){
    var frame = video.closest('.wd-hero-video');
    var timer = 0, visible = true, soundOn = true, userMuted = false;

    if (reduce) { video.muted = true; frame.classList.add('show-end'); return; }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hero-sound';
    btn.innerHTML = ICON;
    frame.appendChild(btn);
    function syncBtn(){
      btn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      btn.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Turn sound on');
    }
    function setSound(on){ soundOn = on; video.muted = !on; syncBtn(); }
    syncBtn();

    function play(){
      video.muted = !soundOn;
      var p = video.play();
      if (p && p.catch) p.catch(function(){
        if (!video.muted) { setSound(false); video.play().catch(function(){}); }
      });
    }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      userMuted = soundOn;
      setSound(!soundOn);
      if (soundOn && video.paused && visible && !timer) play();
    });
    function unlock(){
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      if (!soundOn && !userMuted) setSound(true);
    }
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    video.addEventListener('ended', function(){
      frame.classList.add('show-end');
      timer = setTimeout(function(){
        timer = 0;
        frame.classList.remove('show-end');
        video.currentTime = 0;
        if (visible) play();
      }, HOLD);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){
        visible = entries[0].isIntersecting;
        if (!visible) video.pause();
        else if (!timer && !frame.classList.contains('show-end')) play();
      }, {threshold: 0.2}).observe(frame);
    } else {
      play();
    }
  });
})();
