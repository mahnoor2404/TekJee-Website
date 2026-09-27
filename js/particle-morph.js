
/* Reusable version of the home page's particle globe. Every <canvas data-particles="shapeKey1,shapeKey2,..."
   data-labels="Label one|Label two"> on the page gets its own instance, auto-cycling through the named
   shapes (drawn once each, from SHAPE_LIB below) with the same swirl/morph/bead-and-halo look as the
   home page globe. A single shape just holds and spins gently, no cycling glitch. */
(function(){
  if (typeof gsap === 'undefined') return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- shape helpers (identical primitives to the home page globe) ---- */
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
  function dot(c, x, y, r){ c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  function circ(c, x, y, r, a0, a1){ c.beginPath(); c.arc(x, y, r, a0 || 0, a1 === undefined ? Math.PI * 2 : a1); c.stroke(); }
  function lw(c, w){ c.lineWidth = w; }

  var SHAPE_LIB = {
    camera: function(c){
      c.save(); c.translate(-14, -24);
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
    },
    shield: function(c){
      lw(c, 12);
      c.beginPath();
      c.moveTo(0, -92); c.lineTo(84, -58); c.lineTo(84, 10);
      c.quadraticCurveTo(84, 74, 0, 100); c.quadraticCurveTo(-84, 74, -84, 10);
      c.lineTo(-84, -58); c.closePath(); c.stroke();
      lw(c, 14);
      c.beginPath(); c.moveTo(-38, 4); c.lineTo(-8, 36); c.lineTo(46, -30); c.stroke();
    },
    robot: function(c){
      lw(c, 11); rr(c, -70, -60, 140, 120, 26);
      lw(c, 9); line(c, 0, -60, 0, -92); dot(c, 0, -96, 8);
      lw(c, 10); circ(c, -30, -6, 16); circ(c, 30, -6, 16);
      dot(c, -30, -6, 5); dot(c, 30, -6, 5);
      lw(c, 9); c.beginPath(); c.moveTo(-26, 34); c.quadraticCurveTo(0, 54, 26, 34); c.stroke();
    },
    workflow: function(c){
      lw(c, 13); circ(c, 0, 0, 78, -2.4, 1.9);
      c.beginPath(); c.moveTo(60, -58); c.lineTo(86, -30); c.lineTo(48, -22); c.closePath(); c.fill();
      lw(c, 9); dot(c, 0, 0, 10);
      line(c, -34, 0, 34, 0); line(c, 0, -34, 0, 34);
    },
    funnel: function(c){
      lw(c, 12);
      c.beginPath(); c.moveTo(-90, -70); c.lineTo(90, -70); c.lineTo(20, 20); c.lineTo(20, 86); c.lineTo(-20, 86); c.lineTo(-20, 20); c.closePath(); c.stroke();
      lw(c, 8); line(c, -70, -40, 70, -40);
    },
    contact: function(c){
      lw(c, 12); rr(c, -100, -66, 200, 132, 18);
      lw(c, 9); circ(c, -50, 0, 26);
      lw(c, 8); line(c, -10, -26, 70, -26); line(c, -10, -2, 70, -2); line(c, -10, 22, 40, 22);
    },
    back: function(c){
      lw(c, 11); rr(c, -72, -88, 144, 184, 16);
      lw(c, 10); rr(c, -30, -106, 60, 30, 8);
      lw(c, 9);
      [-32, 14, 60].forEach(function(y){
        c.beginPath(); c.moveTo(-48, y); c.lineTo(-38, y + 11); c.lineTo(-20, y - 11); c.stroke();
        line(c, 0, y, 52, y);
      });
    },
    invoice: function(c){
      lw(c, 11); rr(c, -70, -94, 140, 188, 14);
      lw(c, 8);
      [-58, -28, 2, 32].forEach(function(y){ line(c, -46, y, 46, y); });
      lw(c, 12);
      c.beginPath(); c.moveTo(-30, 70); c.lineTo(-6, 94); c.lineTo(44, 30); c.stroke();
    },
    gaspump: function(c){
      lw(c, 12); rr(c, -50, -90, 100, 160, 14);
      lw(c, 9); rr(c, -34, -74, 68, 40, 8);
      lw(c, 10);
      c.beginPath(); c.moveTo(50, -40); c.quadraticCurveTo(96, -40, 96, 0); c.lineTo(96, 60); c.stroke();
      dot(c, 96, 66, 10);
      lw(c, 8); line(c, -60, 70, 60, 70);
    },
    bag: function(c){
      lw(c, 12);
      c.beginPath(); c.moveTo(-70, -40); c.lineTo(70, -40); c.lineTo(58, 96); c.lineTo(-58, 96); c.closePath(); c.stroke();
      lw(c, 10); c.beginPath(); c.arc(0, -40, 34, Math.PI, 0); c.stroke();
    },
    crate: function(c){
      lw(c, 11); rr(c, -90, -20, 70, 96, 10); rr(c, 10, -60, 80, 136, 10);
      lw(c, 8); line(c, -55, -20, -55, 76); line(c, 50, -60, 50, 76);
    },
    plate: function(c){
      lw(c, 11); circ(c, 10, 10, 74); circ(c, 10, 10, 34);
      lw(c, 10);
      line(c, -96, -70, -96, -10); line(c, -84, -70, -84, -10); line(c, -72, -70, -72, -10);
      line(c, -84, -10, -84, 96);
    },
    bed: function(c){
      lw(c, 12); rr(c, -96, -10, 192, 70, 14);
      lw(c, 9); rr(c, -96, -46, 60, 46, 10);
      lw(c, 11); line(c, -104, 60, -104, 96); line(c, 104, 60, 104, 96);
    }
  };

  function initOne(canvas){
    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;
    var keys = (canvas.dataset.particles || 'camera').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var labels = (canvas.dataset.labels || '').split('|').map(function(s){ return s.trim(); }).filter(Boolean);
    var labelEl = canvas.dataset.labelTarget ? document.getElementById(canvas.dataset.labelTarget) : null;
    var N = parseInt(canvas.dataset.count, 10) || 1200;
    var TAU = Math.PI * 2, MAX_DELAY = 0.38;

    var off = document.createElement('canvas');
    off.width = off.height = 320;
    var oc = off.getContext('2d', {willReadFrequently: true});

    function sample(drawFn){
      oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.clearRect(0, 0, 320, 320);
      oc.translate(160, 160);
      oc.strokeStyle = '#fff'; oc.fillStyle = '#fff';
      oc.lineWidth = 3; oc.lineCap = 'round'; oc.lineJoin = 'round';
      drawFn(oc);
      var data = oc.getImageData(0, 0, 320, 320).data, px = [];
      for (var y = 0; y < 320; y++) for (var x = 0; x < 320; x++) if (data[(y * 320 + x) * 4 + 3] > 150) px.push(x, y);
      var cnt = px.length / 2, out = [];
      for (var i = 0; i < N; i++){
        var k = Math.floor(Math.random() * cnt);
        out.push({x: (px[k*2]-160)/150 + (Math.random()-0.5)*0.004, y: (px[k*2+1]-160)/150 + (Math.random()-0.5)*0.004, z: (Math.random()-0.5)*0.06});
      }
      out.sort(function(a,b){ return Math.atan2(a.y,a.x) - Math.atan2(b.y,b.x); });
      return out;
    }
    var shapes = keys.map(function(k){ return sample(SHAPE_LIB[k] || SHAPE_LIB.camera); });

    var cx = new Float32Array(N), cy = new Float32Array(N), cz = new Float32Array(N);
    var fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N);
    var tx = new Float32Array(N), ty = new Float32Array(N), tz = new Float32Array(N);
    var delay = new Float32Array(N), swirl = new Float32Array(N), zjit = new Float32Array(N);
    var size = new Float32Array(N), sizeS = new Float32Array(N), tone = new Float32Array(N), phase = new Float32Array(N);
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++){
      var yy = 1 - (i/(N-1))*2, ring = Math.sqrt(1-yy*yy), th = golden*i;
      cx[i]=Math.cos(th)*ring*0.9; cy[i]=yy*0.9; cz[i]=Math.sin(th)*ring*0.9;
      size[i]=0.5+Math.pow(Math.random(),2.2)*2.7; sizeS[i]=1.15+Math.pow(Math.random(),1.4)*2.1;
      tone[i]=Math.random(); phase[i]=Math.random()*TAU; swirl[i]=0.7+Math.random()*0.5; zjit[i]=(Math.random()-0.5)*0.5;
    }

    var morph = {t:1}, morphTween=null, swirlDir=1, currentShape=-1, mix={v:0}, spin=0, spinFrozen=0;
    function easeInOut(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
    function updatePositions(){
      var t = morph.t;
      for (var i=0;i<N;i++){
        var lp = Math.min(1, Math.max(0, (t-delay[i])/(1-MAX_DELAY)));
        var e = easeInOut(lp);
        var x = fx[i]+(tx[i]-fx[i])*e, y = fy[i]+(ty[i]-fy[i])*e;
        var arc = Math.sin(Math.PI*e), ang = arc*swirl[i]*swirlDir;
        var ca=Math.cos(ang), sa=Math.sin(ang);
        cx[i]=x*ca-y*sa; cy[i]=x*sa+y*ca; cz[i]=fz[i]+(tz[i]-fz[i])*e+arc*zjit[i];
      }
    }
    function morphTo(idx){
      var tgt = shapes[((idx % shapes.length) + shapes.length) % shapes.length];
      var order = [];
      for (var i=0;i<N;i++){ fx[i]=cx[i]; fy[i]=cy[i]; fz[i]=cz[i]; order.push(i); }
      order.sort(function(a,b){ return Math.atan2(cy[a],cx[a]) - Math.atan2(cy[b],cx[b]); });
      for (var k=0;k<N;k++){ var p=order[k]; tx[p]=tgt[k].x; ty[p]=tgt[k].y; tz[p]=tgt[k].z; delay[p]=MAX_DELAY*0.78*(k/N)+MAX_DELAY*0.22*Math.random(); }
      swirlDir = -swirlDir;
      if (currentShape === -1){
        spinFrozen = ((spin % TAU) + TAU) % TAU; if (spinFrozen > Math.PI) spinFrozen -= TAU;
        gsap.to(mix, {v:1, duration:1.8, ease:'power2.inOut'});
      }
      currentShape = idx; morph.t = 0;
      if (morphTween) morphTween.kill();
      morphTween = gsap.to(morph, {t:1, duration:1.9, ease:'none', onUpdate:updatePositions, onComplete:function(){
        for (var j=0;j<N;j++){ cx[j]=tx[j]; cy[j]=ty[j]; cz[j]=tz[j]; }
        if (labelEl && labels[idx]) { labelEl.textContent = labels[idx]; }
        scheduleNext();
      }});
      if (labels.length > 1 && labelEl) labelEl.textContent = labels[idx] || '';
    }
    var cycleTimer = null;
    function scheduleNext(){
      if (shapes.length < 2 || reduceMotion) return;
      if (cycleTimer) cycleTimer.kill();
      cycleTimer = gsap.delayedCall(2.6, function(){ morphTo((currentShape + 1) % shapes.length); });
    }

    var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var sc = sprite.getContext('2d');
    var grad = sc.createRadialGradient(24,22,2,32,32,30);
    grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(0.4,'rgba(120,182,250,1)'); grad.addColorStop(1,'rgba(11,87,184,1)');
    sc.fillStyle = grad; sc.beginPath(); sc.arc(32,32,30,0,TAU); sc.fill();

    var halo = document.createElement('canvas'); halo.width = halo.height = 64;
    var hc = halo.getContext('2d');
    var hg = hc.createRadialGradient(32,32,0,32,32,32);
    hg.addColorStop(0,'rgba(11,87,184,0.55)'); hg.addColorStop(0.35,'rgba(11,87,184,0.22)'); hg.addColorStop(1,'rgba(11,87,184,0)');
    hc.fillStyle = hg; hc.fillRect(0,0,64,64);

    var W=0,H=0,visible=true,last=0;
    function resize(){
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio||1, 2);
      W = rect.width; H = rect.height; if (!W||!H) return;
      canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function draw(t){
      if (!W||!H){ resize(); if (!W||!H) return; }
      var dt = last ? Math.min(t-last,64) : 16; last = t;
      if (currentShape === -1) spin += dt*0.00035;
      var m = mix.v;
      var rotY = (currentShape===-1 ? spin : spinFrozen*(1-m)) + Math.sin(t*0.0007)*0.1*m;
      var tilt = 0.32*(1-m);
      var ca=Math.cos(rotY), sa=Math.sin(rotY), ct=Math.cos(tilt), st=Math.sin(tilt);
      var R = Math.min(W,H)*0.46, ox=W/2, oy=H/2;
      ctx.clearRect(0,0,W,H); ctx.globalCompositeOperation='source-over';
      for (var i=0;i<N;i++){
        var x1=cx[i]*ca+cz[i]*sa, z1=-cx[i]*sa+cz[i]*ca;
        var y2=cy[i]*ct-z1*st, z2=cy[i]*st+z1*ct;
        var depth=(z2+1)/2, persp=4/(4-z2);
        var px=ox+x1*R*persp, py=oy+y2*R*persp;
        var amp=0.22*(1-m)+0.16*m;
        var twinkle=1-amp*(0.5+0.5*Math.sin(t*0.002+phase[i]));
        var aGlobe=0.14+0.86*Math.pow(Math.max(depth,0),1.6), aShape=0.62+0.38*tone[i];
        var alpha=(aGlobe*(1-m)+aShape*m)*twinkle;
        var r=(size[i]*(1-m)+sizeS[i]*m)*(0.55+0.75*depth)*persp;
        var spark=Math.pow(0.5+0.5*Math.sin(t*0.004+phase[i]*3),6);
        var hr=r*(2.6+spark*1.5);
        ctx.globalAlpha=Math.min(1, alpha*(0.32+0.3*m)*(0.7+0.6*spark));
        ctx.drawImage(halo, px-hr, py-hr, hr*2, hr*2);
        ctx.globalAlpha=alpha;
        ctx.drawImage(sprite, px-r, py-r, r*2, r*2);
      }
      ctx.globalAlpha=1;
    }
    resize();
    if (reduceMotion){
      morphTo(0);
      cx.set(tx); cy.set(ty); cz.set(tz); mix.v = 1; draw(0);
      return;
    }
    draw(0);
    window.addEventListener('resize', function(){ resize(); draw(performance.now()); });
    var started = false;
    function start(){ if (started) return; started = true; morphTo(0); }
    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        visible = entries[0].isIntersecting;
        if (visible) start();
        if (cycleTimer) visible ? cycleTimer.resume() : cycleTimer.pause();
      }, {threshold:0.15}).observe(canvas);
    } else start();
    gsap.ticker.add(function(){ if (visible) draw(performance.now()); });
  }

  function ready(){
    document.querySelectorAll('canvas[data-particles]').forEach(initOne);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
