/* Web development hero: a website drawn as stacked 3D layers (frame, nav, hero banner, cards).
   Layers assemble on load, tilt toward the pointer and peel apart as the hero scrolls away.
   Falls back to the static <img> in .wd-hero-media when WebGL is unavailable. */
(function(){
  var hero = document.querySelector('.wd-hero');
  var stage = hero && hero.querySelector('.wd-hero-media');
  if (!hero || !stage || typeof THREE === 'undefined') return;

  var canvas = document.createElement('canvas');
  canvas.className = 'wd-hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
  } catch (e) { return; }
  hero.insertBefore(canvas, hero.firstChild);

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width:600px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 0.92;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  /* soft studio environment so glass and clearcoat pick up highlights */
  (function(){
    var envScene = new THREE.Scene();
    var g = new THREE.SphereGeometry(20, 32, 16);
    var cols = [], pos = g.attributes.position, top = new THREE.Color('#ffffff'), bot = new THREE.Color('#8fb8ee');
    for (var i = 0; i < pos.count; i++) {
      var t = (pos.getY(i) / 20 + 1) / 2, c = bot.clone().lerp(top, t);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.BackSide})));
    var box = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), new THREE.MeshBasicMaterial({color: 0xffffff}));
    box.position.set(-6, 10, 6); box.lookAt(0, 0, 0); envScene.add(box);
    var box2 = box.clone(); box2.position.set(10, 2, 8); box2.lookAt(0, 0, 0); envScene.add(box2);
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  })();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9cc2f0, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(-4, 6, 9); scene.add(key);
  var rim = new THREE.DirectionalLight(0x7fb6ff, 0.6);
  rim.position.set(6, -2, -4); scene.add(rim);

  /* ---------- palette (light / dark) ---------- */
  var PAL = {
    light: {frame:'#e9f2fd', bar:'#d3e4f8', soft:'#b7d1f1', accent:'#0a2fd6', mid:'#4f95ec', card:'#f7fbff', white:'#ffffff', glass:'#8fc0ff', dust:'#3f7fe0', glow:'#5a9cff'},
    dark:  {frame:'#1b2e4b', bar:'#22395b', soft:'#35527c', accent:'#2f6bff', mid:'#5ab4ff', card:'#203657', white:'#eaf3ff', glass:'#5ab4ff', dust:'#7cc4ff', glow:'#2f6bff'}
  };
  var mats = {};
  function lin(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }
  ['frame','bar','soft','accent','mid','card','white'].forEach(function(k){
    mats[k] = new THREE.MeshPhysicalMaterial({roughness: 0.42, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.55});
  });
  mats.frame.transparent = true; mats.frame.opacity = 0.94;
  mats.accent.roughness = 0.3; mats.accent.clearcoat = 1;
  var glassMat = new THREE.MeshPhysicalMaterial({roughness: 0.06, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.72, envMapIntensity: 1.1});
  var dustMat = new THREE.PointsMaterial({size: 0.05, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true});

  function applyTheme(){
    var p = document.documentElement.getAttribute('data-theme') === 'dark' ? PAL.dark : PAL.light;
    Object.keys(mats).forEach(function(k){ mats[k].color.copy(lin(p[k])); });
    glassMat.color.copy(lin(p.glass));
    dustMat.color.copy(lin(p.dust));
    glowMat.color.copy(lin(p.glow));
    requestRender();
  }

  /* ---------- the layered website ---------- */
  function slab(w, h, d, r){
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var b = Math.min(0.025, d / 3);
    var geo = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8});
    geo.translate(0, 0, -d / 2);
    return geo;
  }

  var site = new THREE.Group();
  var layers = [];
  function add(x, y, w, h, d, r, mat, L, geo){
    var m = new THREE.Mesh(geo || slab(w, h, d, r), mats[mat]);
    m.position.set(x, y, 0);
    m.userData = {L: L, x: x, y: y, seed: Math.random() * 6.28, d: d};
    site.add(m); layers.push(m);
    return m;
  }
  add(0, 0, 6.2, 4.2, 0.18, 0.24, 'frame', 0);
  add(0, 1.79, 6.0, 0.42, 0.06, 0.13, 'bar', 0.5);
  add(0.35, 1.79, 3.6, 0.2, 0.05, 0.1, 'frame', 0.9);
  var dotGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20); dotGeo.rotateX(Math.PI / 2);
  [-2.72, -2.5, -2.28].forEach(function(dx){ add(dx, 1.79, 0, 0, 0.05, 0, 'soft', 0.9, dotGeo); });
  add(0, 1.3, 5.7, 0.2, 0.05, 0.08, 'soft', 1.0);
  add(-0.68, 0.38, 4.35, 1.4, 0.14, 0.16, 'accent', 2.2);
  add(-1.8, 0.68, 1.75, 0.17, 0.05, 0.08, 'white', 2.9);
  add(-1.97, 0.4, 1.4, 0.12, 0.05, 0.06, 'white', 2.9).material = mats.bar;
  add(-2.12, 0.02, 1.05, 0.26, 0.08, 0.13, 'white', 3.4);
  add(2.17, 0.38, 1.55, 1.4, 0.1, 0.16, 'mid', 1.6);
  [[-1.97, 1.3], [0, 1.85], [1.97, 1.45]].forEach(function(c){
    var cx = c[0], L = c[1];
    add(cx, -1.2, 1.78, 1.3, 0.08, 0.14, 'card', L);
    add(cx, -0.9, 1.5, 0.5, 0.05, 0.08, 'mid', L + 0.6);
    add(cx - 0.25, -1.36, 1.0, 0.1, 0.04, 0.05, 'soft', L + 0.45);
    add(cx - 0.4, -1.56, 0.7, 0.1, 0.04, 0.05, 'soft', L + 0.45);
  });

  /* soft glow behind the build, doubles as a contact shadow */
  var glowTex = (function(){
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  var glowMat = new THREE.MeshBasicMaterial({map: glowTex, transparent: true, opacity: 0.45, depthWrite: false});
  var glow = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), glowMat);
  glow.position.set(0.4, -0.5, -1.6);
  site.add(glow);

  /* floating glass shapes, echoing the brand video */
  var shapes = [
    {g: new THREE.IcosahedronGeometry(0.5, 0), p: [3.75, 2.25, 1.3]},
    {g: new THREE.TorusGeometry(0.38, 0.14, 20, 48), p: [-3.8, -1.75, 1.6]},
    {g: new THREE.OctahedronGeometry(0.42, 0), p: [3.95, -1.85, 0.7]},
    {g: new THREE.BoxGeometry(0.42, 0.42, 0.42), p: [-3.5, 2.35, -0.4]},
    {g: new THREE.SphereGeometry(0.2, 32, 16), p: [1.4, 2.85, 2.3]},
    {g: new THREE.TetrahedronGeometry(0.3, 0), p: [-1.2, -2.75, 2.0]}
  ].map(function(s, i){
    var m = new THREE.Mesh(s.g, glassMat);
    m.position.fromArray(s.p);
    m.userData = {p: s.p.slice(), seed: i * 1.7, spin: 0.2 + (i % 3) * 0.12};
    site.add(m);
    return m;
  });

  scene.add(site);

  /* depth dust across the whole hero */
  var dustCount = small ? 260 : 620, dustPos = new Float32Array(dustCount * 3);
  for (var i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 30;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 2] = -8 + Math.random() * 12;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------- layout: pin the build to the .wd-hero-media box ---------- */
  var base = {x: 0, y: 0, s: 1};
  function layout(){
    var w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    var perPx = worldH / h;
    var hr = hero.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    base.x = (sr.left - hr.left + sr.width / 2 - w / 2) * perPx;
    base.y = -(sr.top - hr.top + sr.height / 2 - h / 2) * perPx;
    base.s = (sr.width * perPx) / 7.6;
    requestRender();
  }

  /* ---------- state + motion ---------- */
  var state = {explode: reduceMotion ? 0.25 : 2.6, intro: reduceMotion ? 1 : 0, scroll: 0};
  var pointer = {x: 0, y: 0, tx: 0, ty: 0};

  function update(t){
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    var ex = state.explode + state.scroll * 1.7;
    var s = base.s * (0.88 + 0.12 * state.intro);
    site.scale.setScalar(s);
    site.position.set(base.x, base.y - (1 - state.intro) * 0.6 + state.scroll * 0.8, 0);
    site.rotation.y = -0.34 + pointer.x * 0.22 - state.scroll * 0.35 + (1 - state.intro) * 0.5;
    site.rotation.x = 0.14 - pointer.y * 0.14 + state.scroll * 0.25;
    site.rotation.z = -0.02 - state.scroll * 0.05;
    layers.forEach(function(m){
      var u = m.userData, bob = reduceMotion ? 0 : Math.sin(t * 0.9 + u.seed) * 0.03 * u.L;
      m.position.z = 0.09 + u.L * 0.07 + u.L * ex * 0.55 + bob + (u.L ? u.d / 2 : 0);
      m.position.x = u.x * (1 + state.scroll * 0.05);
      m.position.y = u.y * (1 + state.scroll * 0.05);
    });
    shapes.forEach(function(m){
      var u = m.userData;
      m.rotation.x = t * u.spin + u.seed; m.rotation.y = t * u.spin * 0.8;
      m.position.y = u.p[1] + (reduceMotion ? 0 : Math.sin(t * 0.7 + u.seed) * 0.12);
      m.position.z = u.p[2] + state.scroll * 1.2;
      m.scale.setScalar(Math.max(0.001, state.intro));
    });
    glowMat.opacity = 0.45 * state.intro;
    dust.rotation.y = t * 0.012 + pointer.x * 0.05;
    dust.position.y = state.scroll * 1.5;
  }

  var running = false, visible = true, raf = 0, clock = new THREE.Clock(), needsRender = false;
  function frame(){
    raf = 0;
    update(reduceMotion ? 0 : clock.getElapsedTime());
    renderer.render(scene, camera);
    if (!hero.classList.contains('is-3d')) hero.classList.add('is-3d');
    if (running) raf = requestAnimationFrame(frame);
  }
  function requestRender(){ if (!raf) raf = requestAnimationFrame(frame); }
  function setRunning(on){
    on = on && visible && !document.hidden && !reduceMotion;
    if (on === running) return;
    running = on;
    if (on) { clock.start(); requestRender(); }
  }

  applyTheme();
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);
  else window.addEventListener('resize', layout);
  new MutationObserver(applyTheme).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

  if (!reduceMotion) {
    window.addEventListener('pointermove', function(e){
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, {passive: true});
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){ visible = entries[0].isIntersecting; setRunning(true); }).observe(hero);
    }
    document.addEventListener('visibilitychange', function(){ setRunning(!document.hidden); });
    setRunning(true);

    if (typeof gsap !== 'undefined') {
      gsap.to(state, {explode: 0.25, duration: 2.2, ease: 'expo.out', delay: 0.2});
      gsap.to(state, {intro: 1, duration: 1.6, ease: 'power3.out', delay: 0.1});
      if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({
          trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
          onUpdate: function(s){ state.scroll = s.progress; }
        });
      }
    } else {
      state.explode = 0.25; state.intro = 1;
    }
  }
})();
