/* Instagram reels gallery on the home page.
   Scroll: a tall .ig-scroll holds a sticky full-screen stage. While it is pinned, the 3-column gallery
   zooms in then back out, and the columns drift up and down past each other (each .ig-col's data-y
   gives its start,end translate in %).
   Click: a card opens Instagram's captioned embed in a <dialog>, so it plays as on Instagram.
   To add a reel, copy an .ig-card in index.html and change the reel code in href, data-ig and iframe src,
   and give it the next data-i. */
(function(){
  var section = document.getElementById('instagram');
  if (!section) return;
  var gallery = section.querySelector('.ig-gallery');
  var allCards = Array.prototype.slice.call(section.querySelectorAll('.ig-card'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Instagram's embed in a 400px-wide iframe: a 54px header, then a 4:5 (400x500) media area.
     Scale that frame so the media area fills each 4:5 card exactly. */
  function fit(){
    if (!allCards.length) return;
    gallery.style.setProperty('--ig-s', (allCards[0].clientWidth / 400).toFixed(4));
  }
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(gallery);
  else window.addEventListener('resize', fit);

  /* intro lines fade up one after another when the heading comes into view */
  var intro = section.querySelector('.ig-intro');
  if ('IntersectionObserver' in window && !reduceMotion) {
    intro.classList.add('ig-wait');
    var io = new IntersectionObserver(function(entries){
      if (entries[0].isIntersecting) { intro.classList.add('ig-go'); io.disconnect(); }
    }, {threshold: 0.3});
    io.observe(intro);
  }

  /* scroll choreography */
  if (!reduceMotion && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    section.classList.add('ig-motion');
    var tl = gsap.timeline({
      defaults: {ease: 'none'},
      scrollTrigger: {trigger: section.querySelector('.ig-scroll'), start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true}
    });
    tl.fromTo(gallery, {scale: 0.86}, {scale: 1.1, duration: 0.5, ease: 'sine.inOut'}, 0)
      .to(gallery, {scale: 0.94, duration: 0.5, ease: 'sine.inOut'}, 0.5);
    Array.prototype.forEach.call(section.querySelectorAll('.ig-col'), function(col){
      var y = (col.getAttribute('data-y') || '0,0').split(',').map(Number);
      tl.fromTo(col, {yPercent: y[0]}, {yPercent: y[1], duration: 1}, 0);
    });
  }

  /* popup player; without <dialog> support the cards simply open Instagram */
  var modal = section.querySelector('.ig-modal');
  var player = modal && modal.querySelector('.ig-player iframe');
  if (!modal || typeof modal.showModal !== 'function') return;

  /* one entry per unique reel (the gallery repeats a few to fill its columns) */
  var reels = [];
  allCards.forEach(function(card){
    var i = +card.getAttribute('data-i');
    if (!reels[i]) reels[i] = card.getAttribute('data-ig');
  });
  var current = -1, opener = null;

  function show(i){
    current = (i + reels.length) % reels.length;
    player.src = 'https://www.instagram.com/reel/' + reels[current] + '/embed/captioned/';
    player.title = 'Instagram reel ' + (current + 1) + ' of ' + reels.length;
  }
  function open(i){
    opener = document.activeElement;
    modal.showModal();
    show(i);
    document.documentElement.classList.add('ig-lock');
    modal.querySelector('.ig-close').focus();
  }
  function close(){ if (modal.open) modal.close(); }

  allCards.forEach(function(card){
    card.addEventListener('click', function(e){
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; /* let new-tab clicks through */
      e.preventDefault();
      open(+card.getAttribute('data-i'));
    });
  });
  modal.querySelector('.ig-close').addEventListener('click', close);
  Array.prototype.forEach.call(modal.querySelectorAll('.ig-step'), function(btn){
    btn.addEventListener('click', function(){ show(current + +btn.getAttribute('data-step')); });
  });
  modal.addEventListener('click', function(e){ if (e.target === modal) close(); }); /* backdrop click */
  modal.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });
  modal.addEventListener('close', function(){
    player.src = 'about:blank'; /* stops playback */
    document.documentElement.classList.remove('ig-lock');
    if (opener && opener.focus) opener.focus();
  });
})();
