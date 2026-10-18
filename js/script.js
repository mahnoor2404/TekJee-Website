/* ---- hero video: plays on its own, independent of scroll (and of GSAP).
   Cycle: the hero clip (#heroVideo, plus an optional second clip #heroVideo2) plays with sound and no text on top;
   when the last clip ends the TEKJEE text fades in over its last frame,
   stays for 3 seconds, then hides again and the cycle restarts. ---- */
(function(){
  var hero = document.querySelector('.video-hero');
  var heroVideo = document.getElementById('heroVideo');
  var heroVideo2 = document.getElementById('heroVideo2');
  var soundBtn = document.getElementById('heroSound');
  if (!hero || !heroVideo) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEXT_HOLD_MS = 3000;

  if (reduceMotion){
    hero.classList.remove('text-hidden');
    if (soundBtn) soundBtn.hidden = true;
    heroVideo.addEventListener('loadedmetadata', function(){
      heroVideo.currentTime = Math.min(0.6, heroVideo.duration * 0.5);
    });
    if (heroVideo2) heroVideo2.preload = 'none';
    return;
  }

  var activeHero = heroVideo;
  var showingText = false;
  var onScreen = true;
  var restartTimer = null;
  /* sound is wanted by default; browsers may refuse to autoplay with sound
     until the visitor interacts, so we fall back to muted until they do */
  var soundOn = true;
  var userMuted = false;

  var updateSoundBtn = function(){
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Turn sound on');
  };

  var playActive = function(){
    if (showingText || !onScreen) return;
    activeHero.muted = !soundOn;
    activeHero.play().catch(function(){
      if (!activeHero.muted){
        soundOn = false;
        updateSoundBtn();
        activeHero.muted = true;
        activeHero.play().catch(function(){});
      }
    });
  };

  var showClip = function(clip){
    var other = clip === heroVideo ? heroVideo2 : heroVideo;
    clip.currentTime = 0;
    clip.classList.remove('is-hidden');
    if (other && other !== clip){
      other.pause();
      other.classList.add('is-hidden');
    }
    activeHero = clip;
    playActive();
  };

  var startCycle = function(){
    restartTimer = null;
    showingText = false;
    hero.classList.add('text-hidden');
    showClip(heroVideo);
  };

  var showText = function(){
    showingText = true;
    hero.classList.remove('text-hidden');
    restartTimer = setTimeout(startCycle, TEXT_HOLD_MS);
  };

  heroVideo.addEventListener('ended', heroVideo2 ? function(){ showClip(heroVideo2); } : showText);
  if (heroVideo2) heroVideo2.addEventListener('ended', showText);

  heroVideo.addEventListener('loadeddata', playActive, {once:true});
  playActive();

  var setSound = function(on){
    soundOn = on;
    activeHero.muted = !on;
    updateSoundBtn();
  };
  if (soundBtn){
    soundBtn.addEventListener('click', function(e){
      e.stopPropagation();
      userMuted = soundOn;
      setSound(!soundOn);
    });
  }
  /* first real interaction anywhere on the page unlocks sound */
  var unlockSound = function(){
    window.removeEventListener('pointerdown', unlockSound);
    window.removeEventListener('keydown', unlockSound);
    if (!soundOn && !userMuted) setSound(true);
  };
  window.addEventListener('pointerdown', unlockSound);
  window.addEventListener('keydown', unlockSound);
  updateSoundBtn();

  /* Pause the video (and its audio) while it's scrolled off-screen, so it
     isn't competing for frame budget with the scroll-linked animation
     further down. */
  if ('IntersectionObserver' in window){
    var heroObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        onScreen = entry.isIntersecting;
        if (onScreen) playActive();
        else activeHero.pause();
      });
    }, {threshold:0.01});
    heroObserver.observe(hero);
  }
})();

(function(){
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var servicesSection = document.getElementById('services');


  /* ---- particle morph: ~1100 small round particles, one colour, random
     sizes. They begin as a globe, then flow into a shape for whichever topic
     the text is on (marketing -> megaphone, AI -> chip, web -> browser, back office -> clipboard, CRM -> contact card, SEO -> magnifier, security -> camera).
     Each shape is drawn once on an offscreen canvas and sampled, so the
     particles really fly to points on the drawing. The step code further
     down just calls globe.morphTo(index) when the text changes. ---- */
  var globe = {morphTo: function(idx, done){ if (done) done(); }};
  (function(){
    var canvas = document.getElementById('globeCanvas');
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    var N = 1900;
    var TAU = Math.PI * 2;
    var MAX_DELAY = 0.38;

    /* ---- shape drawings (coords are -150..150 around the centre) ---- */
    var off = document.createElement('canvas');
    off.width = off.height = 320;
    var oc = off.getContext('2d', {willReadFrequently: true});

    function rr(c, x, y, w, h, r){
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
      c.stroke();
    }
    function line(c, x1, y1, x2, y2){ c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    function dot(c, x, y, r){ c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    function circ(c, x, y, r, a0, a1){ c.beginPath(); c.arc(x, y, r, a0 || 0, a1 === undefined ? TAU : a1); c.stroke(); }

    function lw(c, w){ c.lineWidth = w; }
    function drawMkt(c){
      lw(c, 12);
      c.beginPath(); c.moveTo(-66, -30); c.lineTo(36, -80); c.lineTo(36, 80); c.lineTo(-66, 30); c.closePath(); c.stroke();
      rr(c, -116, -30, 50, 60, 10);
      line(c, -84, 32, -70, 92);
      lw(c, 9);
      circ(c, 52, 0, 34, -0.9, 0.9);
      circ(c, 52, 0, 64, -0.9, 0.9);
    }
    function drawAI(c){
      lw(c, 11); rr(c, -78, -78, 156, 156, 24);
      lw(c, 9);
      for (var i = -1; i <= 1; i++){
        var p = i * 44;
        line(c, p, -78, p, -114); line(c, p, 78, p, 114);
        line(c, -78, p, -114, p); line(c, 78, p, 114, p);
      }
      c.font = 'bold 60px Arial, Helvetica, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('AI', 0, 5);
    }
    function drawWeb(c){
      lw(c, 12); rr(c, -125, -95, 250, 190, 22);
      lw(c, 8); line(c, -125, -50, 125, -50);
      dot(c, -98, -73, 6); dot(c, -72, -73, 6); dot(c, -46, -73, 6);
      lw(c, 11);
      c.beginPath();
      c.moveTo(-40, -2); c.lineTo(-80, 30); c.lineTo(-40, 62);
      c.moveTo(40, -2); c.lineTo(80, 30); c.lineTo(40, 62);
      c.moveTo(14, -14); c.lineTo(-14, 74);
      c.stroke();
    }
    function drawBack(c){
      lw(c, 11); rr(c, -72, -88, 144, 184, 16);
      lw(c, 10); rr(c, -30, -106, 60, 30, 8);
      lw(c, 9);
      [-32, 14, 60].forEach(function(y){
        c.beginPath(); c.moveTo(-48, y); c.lineTo(-38, y + 11); c.lineTo(-20, y - 11); c.stroke();
        line(c, 0, y, 52, y);
      });
    }
    function drawCRM(c){
      lw(c, 11); rr(c, -118, -80, 236, 160, 18);
      lw(c, 10); circ(c, -56, -20, 26);
      c.beginPath(); c.arc(-56, 64, 42, Math.PI, TAU); c.stroke();
      lw(c, 9);
      line(c, 8, -30, 88, -30); line(c, 8, 0, 88, 0); line(c, 8, 30, 58, 30);
    }
    function drawSEO(c){
      c.save();
      c.translate(-6, -6);
      lw(c, 13); circ(c, -14, -14, 64);
      lw(c, 18); line(c, 34, 34, 90, 90);
      lw(c, 9);
      c.beginPath();
      c.moveTo(-56, 12); c.lineTo(-36, -8); c.lineTo(-18, 6); c.lineTo(10, -34);
      c.stroke();
      /* arrowhead: two long, clearly separated legs at the tip */
      lw(c, 10);
      c.beginPath();
      c.moveTo(-14, -38); c.lineTo(12, -38); c.lineTo(12, -12);
      c.stroke();
      c.restore();
    }
    function drawCam(c){
      c.save();
      c.translate(-14, -24);
      lw(c, 11); rr(c, -80, -38, 146, 76, 20);
      lw(c, 8); rr(c, 66, -22, 30, 44, 8);
      lw(c, 9); circ(c, -20, 0, 24);
      dot(c, -20, 0, 8);
      dot(c, -62, -20, 6);
      lw(c, 11); rr(c, -126, -68, 14, 136, 6);
      lw(c, 9); line(c, -112, 0, -80, 0);
      lw(c, 8); circ(c, 100, 0, 30, -0.75, 0.75);
      circ(c, 100, 0, 52, -0.75, 0.75);
      c.restore();
      /* "24/7" as plain strokes: filled text turns into a blob at particle density */
      lw(c, 9);
      c.beginPath();
      c.moveTo(-74, 86); c.lineTo(-48, 86); c.lineTo(-48, 106); c.lineTo(-74, 106); c.lineTo(-74, 126); c.lineTo(-48, 126);
      c.moveTo(-32, 86); c.lineTo(-32, 106); c.lineTo(-6, 106);
      c.moveTo(-12, 86); c.lineTo(-12, 126);
      c.moveTo(20, 130); c.lineTo(36, 82);
      c.moveTo(52, 86); c.lineTo(78, 86); c.lineTo(60, 126);
      c.stroke();
    }

    function sample(drawFn){
      oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.clearRect(0, 0, 320, 320);
      oc.translate(160, 160);
      oc.strokeStyle = '#fff';
      oc.fillStyle = '#fff';
      oc.lineWidth = 3;
      oc.lineCap = 'round';
      oc.lineJoin = 'round';
      drawFn(oc);
      var data = oc.getImageData(0, 0, 320, 320).data, px = [];
      for (var y = 0; y < 320; y++){
        for (var x = 0; x < 320; x++){
          if (data[(y * 320 + x) * 4 + 3] > 150) px.push(x, y);
        }
      }
      var cnt = px.length / 2, out = [];
      for (var i = 0; i < N; i++){
        var k = Math.floor(Math.random() * cnt);
        out.push({
          x: (px[k * 2] - 160) / 150 + (Math.random() - 0.5) * 0.004,
          y: (px[k * 2 + 1] - 160) / 150 + (Math.random() - 0.5) * 0.004,
          z: (Math.random() - 0.5) * 0.06
        });
      }
      out.sort(function(a, b){ return Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x); });
      return out;
    }
    /* the shapes are only needed once the globe starts morphing, so they are sampled when the browser is idle
       (or on the first morph if that comes sooner) instead of during page load */
    var shapes = null;
    function getShapes(){
      if (!shapes) shapes = [sample(drawMkt), sample(drawAI), sample(drawWeb), sample(drawBack), sample(drawCRM), sample(drawSEO), sample(drawCam)];
      return shapes;
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(getShapes, {timeout: 4000});
    else setTimeout(getShapes, 1500);

    /* ---- particles: start as a globe (Fibonacci sphere) ---- */
    var cx = new Float32Array(N), cy = new Float32Array(N), cz = new Float32Array(N);
    var fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N);
    var tx = new Float32Array(N), ty = new Float32Array(N), tz = new Float32Array(N);
    var delay = new Float32Array(N), swirl = new Float32Array(N), zjit = new Float32Array(N);
    var size = new Float32Array(N), sizeS = new Float32Array(N), tone = new Float32Array(N), phase = new Float32Array(N);
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++){
      var yy = 1 - (i / (N - 1)) * 2;
      var ring = Math.sqrt(1 - yy * yy);
      var th = golden * i;
      cx[i] = Math.cos(th) * ring * 0.9;
      cy[i] = yy * 0.9;
      cz[i] = Math.sin(th) * ring * 0.9;
      size[i] = 0.5 + Math.pow(Math.random(), 2.2) * 2.7;
      sizeS[i] = 1.15 + Math.pow(Math.random(), 1.4) * 2.1;
      tone[i] = Math.random();
      phase[i] = Math.random() * TAU;
      swirl[i] = 0.7 + Math.random() * 0.5;
      zjit[i] = (Math.random() - 0.5) * 0.5;
    }

    /* ---- morphing ---- */
    var morph = {t: 1};
    var morphTween = null;
    var swirlDir = 1;
    var currentShape = -1;
    var mix = {v: 0};
    var spin = 0, spinFrozen = 0;

    function easeInOut(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function updatePositions(){
      var t = morph.t;
      for (var i = 0; i < N; i++){
        var lp = Math.min(1, Math.max(0, (t - delay[i]) / (1 - MAX_DELAY)));
        var e = easeInOut(lp);
        var x = fx[i] + (tx[i] - fx[i]) * e;
        var y = fy[i] + (ty[i] - fy[i]) * e;
        var arc = Math.sin(Math.PI * e);
        var ang = arc * swirl[i] * swirlDir;
        var ca = Math.cos(ang), sa = Math.sin(ang);
        cx[i] = x * ca - y * sa;
        cy[i] = x * sa + y * ca;
        cz[i] = fz[i] + (tz[i] - fz[i]) * e + arc * zjit[i];
      }
    }

    globe.morphTo = function(idx, done){
      var all = getShapes();
      var tgt = all[((idx % all.length) + all.length) % all.length];
      var order = [];
      for (var i = 0; i < N; i++){
        fx[i] = cx[i]; fy[i] = cy[i]; fz[i] = cz[i];
        order.push(i);
      }
      order.sort(function(a, b){ return Math.atan2(cy[a], cx[a]) - Math.atan2(cy[b], cx[b]); });
      for (var k = 0; k < N; k++){
        var p = order[k];
        tx[p] = tgt[k].x; ty[p] = tgt[k].y; tz[p] = tgt[k].z;
        delay[p] = MAX_DELAY * 0.78 * (k / N) + MAX_DELAY * 0.22 * Math.random();
      }
      swirlDir = -swirlDir;
      if (currentShape === -1){
        spinFrozen = ((spin % TAU) + TAU) % TAU;
        if (spinFrozen > Math.PI) spinFrozen -= TAU;
        gsap.to(mix, {v: 1, duration: 1.8, ease: 'power2.inOut'});
      }
      currentShape = idx;
      morph.t = 0;
      if (morphTween) morphTween.kill();
      morphTween = gsap.to(morph, {
        t: 1, duration: 1.9, ease: 'none',
        onUpdate: updatePositions,
        onComplete: function(){
          for (var j = 0; j < N; j++){ cx[j] = tx[j]; cy[j] = ty[j]; cz[j] = tz[j]; }
          if (done) done();
        }
      });
    };

    /* one shaded round bead, stamped for every particle */
    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    var sc = sprite.getContext('2d');
    var grad = sc.createRadialGradient(24, 22, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(120,182,250,1)');
    grad.addColorStop(1, 'rgba(11,87,184,1)');
    sc.fillStyle = grad;
    sc.beginPath(); sc.arc(32, 32, 30, 0, TAU); sc.fill();

    /* soft light-blue glow stamped behind each bead */
    var halo = document.createElement('canvas');
    halo.width = halo.height = 64;
    var hc = halo.getContext('2d');
    var hg = hc.createRadialGradient(32, 32, 0, 32, 32, 32);
    hg.addColorStop(0, 'rgba(11,87,184,0.55)');
    hg.addColorStop(0.35, 'rgba(11,87,184,0.22)');
    hg.addColorStop(1, 'rgba(11,87,184,0)');
    hc.fillStyle = hg;
    hc.fillRect(0, 0, 64, 64);

    /* ---- drawing ---- */
    var W = 0, H = 0, visible = true, last = 0;
    function resize(){
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t){
      if (!W || !H){ resize(); if (!W || !H) return; }
      var dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      if (currentShape === -1) spin += dt * 0.00035;

      var m = mix.v;
      var rotY = (currentShape === -1 ? spin : spinFrozen * (1 - m)) + Math.sin(t * 0.0007) * 0.1 * m;
      var tilt = 0.32 * (1 - m);
      var ca = Math.cos(rotY), sa = Math.sin(rotY), ct = Math.cos(tilt), st = Math.sin(tilt);
      var R = Math.min(W, H) * 0.46;
      var ox = W / 2, oy = H / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      for (var i = 0; i < N; i++){
        var x1 = cx[i] * ca + cz[i] * sa;
        var z1 = -cx[i] * sa + cz[i] * ca;
        var y2 = cy[i] * ct - z1 * st;
        var z2 = cy[i] * st + z1 * ct;
        var depth = (z2 + 1) / 2;
        var persp = 4 / (4 - z2);
        var px = ox + x1 * R * persp;
        var py = oy + y2 * R * persp;
        var amp = 0.22 * (1 - m) + 0.16 * m;
        var twinkle = 1 - amp * (0.5 + 0.5 * Math.sin(t * 0.002 + phase[i]));
        var aGlobe = 0.14 + 0.86 * Math.pow(Math.max(depth, 0), 1.6);
        var aShape = 0.62 + 0.38 * tone[i];
        var alpha = (aGlobe * (1 - m) + aShape * m) * twinkle;
        var r = (size[i] * (1 - m) + sizeS[i] * m) * (0.55 + 0.75 * depth) * persp;
        var spark = Math.pow(0.5 + 0.5 * Math.sin(t * 0.004 + phase[i] * 3), 6);
        var hr = r * (2.6 + spark * 1.5);
        ctx.globalAlpha = Math.min(1, alpha * (0.32 + 0.3 * m) * (0.7 + 0.6 * spark));
        ctx.drawImage(halo, px - hr, py - hr, hr * 2, hr * 2);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, px - r, py - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    resize();
    draw(0);
    window.addEventListener('resize', function(){ resize(); draw(performance.now()); });

    if (!reduceMotion){
      if ('IntersectionObserver' in window){
        new IntersectionObserver(function(entries){
          visible = entries[0].isIntersecting;
        }, {threshold: 0.01}).observe(canvas);
      }
      gsap.ticker.add(function(){
        if (visible) draw(performance.now());
      });
    }
  })();

  if (reduceMotion){
    if (servicesSection) servicesSection.classList.add('no-motion');
    document.querySelectorAll('[data-reveal]').forEach(function(el){
      gsap.set(el, {x:0, opacity:1, clearProps:'transform'});
    });
    gsap.set('.approach-line', {scaleX:1});
    gsap.set('.approach-step', {opacity:1, scale:1, y:0, clearProps:'transform'});
    gsap.set('.cta-wipe', {clipPath:'inset(0 0% 0 0)'});
    gsap.set('.cta-fade', {opacity:1, y:0, clearProps:'transform'});
    gsap.set('.cta-glow', {opacity:1, scale:1});
    gsap.set('footer .footer-inner > *', {opacity:1, y:0, clearProps:'transform'});
    return;
  }

  /* ---- alternating left/right text reveals ---- */
  document.querySelectorAll('[data-reveal]').forEach(function(el){
    var dir = el.getAttribute('data-reveal');
    var fromX = dir === 'left' ? -64 : 64;
    gsap.fromTo(el,
      {x: fromX, opacity: 0},
      {
        x: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse'
        }
      }
    );
  });

  /* ---- approach: connecting line draws left-to-right, steps and their
     numbers pop in staggered in sequence order (this is a process, so it
     reads left-to-right, not alternating like the other sections) ---- */
  gsap.fromTo('.approach-line',
    {scaleX:0},
    {
      scaleX:1, duration:1.1, ease:'power2.inOut',
      scrollTrigger:{trigger:'.approach-grid', start:'top 82%', toggleActions:'play none none reverse'}
    }
  );
  gsap.fromTo('.approach-step',
    {opacity:0, y:26},
    {
      opacity:1, y:0, duration:0.7, ease:'power3.out', stagger:0.16,
      scrollTrigger:{trigger:'.approach-grid', start:'top 82%', toggleActions:'play none none reverse'}
    }
  );
  gsap.fromTo('.approach-num',
    {opacity:0, scale:0.4},
    {
      opacity:1, scale:1, duration:0.5, ease:'back.out(2.4)', stagger:0.16, delay:0.15,
      scrollTrigger:{trigger:'.approach-grid', start:'top 82%', toggleActions:'play none none reverse'}
    }
  );

  /* ---- topic stepper: every couple of seconds the copy on the right
     moves to the next topic and the particles flow into that topic's shape ---- */
  (function(){
    var panelStack = document.querySelector('.prism-panel-stack');
    var panels = gsap.utils.toArray('.prism-panel');
    var dots = gsap.utils.toArray('.prism-dot');
    if (!panels.length) return;

    panelStack.classList.add('js-ready');

    function setActivePanel(idx){
      panels.forEach(function(p, i){ p.classList.toggle('is-active', i === idx); });
      dots.forEach(function(d, i){ d.classList.toggle('is-active', i === idx); });
    }
    setActivePanel(0);

    var totalSteps = 0;
    var isVisible = false;
    var started = false;
    var prismTimer = null;

    function scheduleNext(){
      if (prismTimer) prismTimer.kill();
      if (!isVisible) return;
      prismTimer = gsap.delayedCall(1.8, nextTopic);
    }
    function nextTopic(){
      if (!isVisible) return;
      totalSteps++;
      var idx = ((totalSteps % panels.length) + panels.length) % panels.length;
      setActivePanel(idx);
      globe.morphTo(idx, scheduleNext);
    }
    function start(){
      started = true;
      globe.morphTo(0, scheduleNext);
    }

    var prismSection = document.getElementById('why');
    if ('IntersectionObserver' in window && prismSection){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          isVisible = entry.isIntersecting;
          if (prismTimer) prismTimer.kill();
          if (isVisible){
            if (!started) prismTimer = gsap.delayedCall(0.5, start);
            else scheduleNext();
          }
        });
      }, {threshold:0.2}).observe(prismSection);
    } else {
      isVisible = true;
      start();
    }
  })();

  gsap.fromTo('#why .prism-stage',
    {opacity:0, scale:0.8},
    {
      opacity:1, scale:1, duration:1, ease:'power3.out',
      scrollTrigger:{trigger:'#why', start:'top 78%', toggleActions:'play none none reverse'}
    }
  );
  gsap.fromTo('#why .prism-content > *',
    {opacity:0, y:20},
    {
      opacity:1, y:0, duration:0.7, ease:'power3.out', stagger:0.12,
      scrollTrigger:{trigger:'#why', start:'top 78%', toggleActions:'play none none reverse'}
    }
  );

  /* ---- CTA: heading wipes in left-to-right like light sweeping across
     it, a soft glow blooms behind the copy, then actions fade up ---- */
  gsap.fromTo('.cta-wipe',
    {clipPath:'inset(0 100% 0 0)'},
    {
      clipPath:'inset(0 0% 0 0)', duration:1, ease:'power4.inOut',
      scrollTrigger:{trigger:'.cta', start:'top 75%', toggleActions:'play none none reverse'}
    }
  );
  gsap.fromTo('.cta-glow',
    {opacity:0, scale:0.6},
    {
      opacity:1, scale:1, duration:1.4, ease:'power2.out',
      scrollTrigger:{trigger:'.cta', start:'top 75%', toggleActions:'play none none reverse'}
    }
  );
  gsap.fromTo('.cta-fade',
    {opacity:0, y:16},
    {
      opacity:1, y:0, duration:0.7, ease:'power3.out', stagger:0.12, delay:0.3,
      scrollTrigger:{trigger:'.cta', start:'top 75%', toggleActions:'play none none reverse'}
    }
  );

  /* ---- footer: quiet fade-up as it arrives ---- */
  gsap.fromTo('footer .footer-inner > *',
    {opacity:0, y:14},
    {
      opacity:1, y:0, duration:0.6, ease:'power2.out', stagger:0.1,
      scrollTrigger:{trigger:'footer', start:'top 92%', toggleActions:'play none none reverse'}
    }
  );

  /* ---- autoplaying 3D coverflow carousel — runs on its own timer, has
     nothing to do with page scroll (no ScrollTrigger, no pin). The card
     set is duplicated once so the loop can wrap with no visible seam. ---- */
  var track = document.getElementById('carouselTrack');
  var viewport = document.querySelector('.carousel-viewport');

  if (track && viewport){
    var originalCards = Array.prototype.slice.call(track.querySelectorAll('.service-card'));
    originalCards.forEach(function(card){
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(function(el){ el.removeAttribute('id'); });
      clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(function(el){ el.setAttribute('tabindex', '-1'); });
      track.appendChild(clone);
    });

    var cards = gsap.utils.toArray(track.querySelectorAll('.service-card'));
    var cardBase = [];
    var viewportWidth = 0;
    var slotWidth = 0;
    var centerOffset = 0;

    /* All per-frame layout is precomputed here (on load/resize only) so the
       running loop never calls getBoundingClientRect — that forced layout
       read on every tick was the actual source of the earlier stutter. */
    function remeasure(){
      var vRect = viewport.getBoundingClientRect();
      viewportWidth = vRect.width;
      var currentX = gsap.getProperty(track, 'x') || 0;
      cardBase = cards.map(function(card){
        var r = card.getBoundingClientRect();
        return { left: r.left - vRect.left - currentX, width: r.width };
      });
      slotWidth = cardBase.length > 1 ? (cardBase[1].left - cardBase[0].left) : (cardBase[0] ? cardBase[0].width : 1);
      /* Without spacer elements, card 0 sits flush at the track's own left
         edge, not centered in the viewport — this is the offset needed so
         "step 0" and "the card the 3D math says is centered" are the same
         card. Every x we animate the track to includes this constant. */
      centerOffset = cardBase[0] ? (viewportWidth / 2 - cardBase[0].left - cardBase[0].width / 2) : 0;
    }
    remeasure();
    gsap.set(track, {x: centerOffset});

    var cardQuick = cards.map(function(card){
      return {
        scaleTo: gsap.quickTo(card, 'scale', {duration:0.4, ease:'power2.out'}),
        opacityTo: gsap.quickTo(card, 'opacity', {duration:0.4, ease:'power2.out'}),
        rotYTo: gsap.quickTo(card, 'rotationY', {duration:0.4, ease:'power2.out'}),
        zTo: gsap.quickTo(card, 'z', {duration:0.4, ease:'power2.out'})
      };
    });

    /* Depth is keyed to "slots from center" (a continuous, fractional card
       count) rather than raw pixels, so every card a step further out is
       visibly a step further back — a fanned stack receding to either
       side, apex (the centered card) pushed toward the screen. */
    var ROT_STEP = 30, ROT_MAX = 66;
    var Z_STEP = 95, Z_MAX = 360, Z_POP = 55;
    var SCALE_STEP = 0.1, SCALE_MIN = 0.58;
    var OP_STEP = 0.13, OP_MIN = 0.28;

    /* The glow is derived from this exact same live position on every
       frame — not a separately-tracked step count — so the card that gets
       the light border is, by construction, always the same card the 3D
       math is treating as centered. Two numbers can drift out of sync;
       one number can't disagree with itself. */
    function setFocusedCard(idx){
      cards.forEach(function(card, i){
        card.classList.toggle('is-focused', i === idx);
      });
    }
    var focusedIdx = -1;

    function updateCardFocus(trackX){
      var centerX = viewportWidth / 2;
      var minAbsSlot = Infinity;
      var minIdx = 0;
      cardBase.forEach(function(base, i){
        var cardCenter = base.left + base.width / 2 + trackX;
        var slot = (cardCenter - centerX) / slotWidth;
        var absSlot = Math.abs(slot);
        var scale = gsap.utils.clamp(SCALE_MIN, 1.14, 1.14 - absSlot * SCALE_STEP);
        var opacity = gsap.utils.clamp(OP_MIN, 1, 1 - absSlot * OP_STEP);
        var rotY = gsap.utils.clamp(-ROT_MAX, ROT_MAX, slot * -ROT_STEP);
        var z = gsap.utils.clamp(-Z_MAX, Z_POP, Z_POP - absSlot * Z_STEP);
        cardQuick[i].scaleTo(scale);
        cardQuick[i].opacityTo(opacity);
        cardQuick[i].rotYTo(rotY);
        cardQuick[i].zTo(z);
        if (absSlot < minAbsSlot){ minAbsSlot = absSlot; minIdx = i; }
      });
      if (minIdx !== focusedIdx){
        focusedIdx = minIdx;
        setFocusedCard(focusedIdx);
      }
    }

    /* Steps one card-width at a time with a hold in between — reads as
       something advancing it deliberately, not a continuous drift. */
    var STEP_DURATION = 0.6;
    var DWELL = 1.1;
    var stepIndex = 0;
    var activeTween = null;
    var running = true;

    function advanceStep(){
      if (!running) return;
      stepIndex++;
      activeTween = gsap.to(track, {
        x: centerOffset - stepIndex * slotWidth,
        duration: STEP_DURATION,
        ease: 'power3.inOut',
        onComplete: function(){
          if (stepIndex >= originalCards.length){
            stepIndex = 0;
            gsap.set(track, {x: centerOffset});
          }
          scheduleNext();
        }
      });
    }
    function scheduleNext(){
      if (!running) return;
      activeTween = gsap.delayedCall(DWELL, advanceStep);
    }
    scheduleNext();

    /* only recompute while the carousel is on screen and the track has actually moved: during the
       dwell (and off screen) the card tweens are already at rest, so re-issuing them every frame was wasted work */
    var lastX = null;
    gsap.ticker.add(function(){
      if (!running) return;
      var x = gsap.getProperty(track, 'x');
      if (x === lastX) return;
      lastX = x;
      updateCardFocus(x);
    });

    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          running = entry.isIntersecting;
          if (activeTween) running ? activeTween.resume() : activeTween.pause();
        });
      }, {threshold:0.01}).observe(track);
    }

    var resizeTimer;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function(){
        if (activeTween) activeTween.kill();
        stepIndex = 0;
        gsap.set(track, {x:0});
        remeasure();
        gsap.set(track, {x: centerOffset});
        updateCardFocus(centerOffset);
        scheduleNext();
      }, 200);
    });

    updateCardFocus(centerOffset);
  }
})();
