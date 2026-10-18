/* Instagram reels gallery on the home page.
   Feed: the reels come from the Behold feed of @tekjee2019 (FEED_URL), so a new Instagram post shows up here
   on its own, newest first. The cards already in index.html are the fallback if the feed can't be loaded.
   The gallery has a fixed number of slots (3 columns of .ig-card); when there are fewer posts than slots,
   the extra slots repeat earlier reels (hidden from screen readers and the tab order).
   Scroll: a tall .ig-scroll holds a sticky full-screen stage. While it is pinned, the 3-column gallery
   zooms in then back out, and the columns drift up and down past each other (each .ig-col's data-y
   gives its start,end translate in %).
   Click: a card opens Instagram's captioned embed in a <dialog>, so it plays as on Instagram. */
(function(){
  var FEED_URL = 'https://feeds.behold.so/PiZfdvBCYO5CJrCNQVRZ';
  var section = document.getElementById('instagram');
  if (!section) return;
  var gallery = section.querySelector('.ig-gallery');
  var cols = Array.prototype.slice.call(section.querySelectorAll('.ig-col'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cards(){ return Array.prototype.slice.call(section.querySelectorAll('.ig-card')); }

  /* Instagram's embed in a 400px-wide iframe: a 54px header, then a 4:5 (400x500) media area.
     Scale that frame so the media area fills each 4:5 card exactly. */
  function fit(){
    var first = cards()[0];
    if (first) gallery.style.setProperty('--ig-s', (first.clientWidth / 400).toFixed(4));
  }
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(gallery);
  else window.addEventListener('resize', fit);

  /* "reel/CODE" or "p/CODE" from a post link; the cards' data-ig holds this path (a bare code means a reel) */
  function postPath(link){
    var m = /instagram\.com\/(reel|p|tv)\/([^/?#]+)/.exec(link || '');
    return m ? (m[1] === 'tv' ? 'reel' : m[1]) + '/' + m[2] : '';
  }
  function embedBase(path){ return 'https://www.instagram.com/' + (path.indexOf('/') < 0 ? 'reel/' + path : path) + '/'; }

  /* rebuild the slots from the feed: videos (reels) first by date, falling back to all posts if there are none */
  function render(posts){
    var list = posts.filter(function(p){ return p.mediaType === 'VIDEO' && postPath(p.permalink); });
    if (!list.length) list = posts.filter(function(p){ return postPath(p.permalink); });
    if (!list.length) return false;
    list.sort(function(a, b){ return (b.timestamp || '').localeCompare(a.timestamp || ''); });
    var n = list.length;
    var perCol = cols.map(function(col){ return col.querySelectorAll('.ig-card').length || 3; });
    cols.forEach(function(col, c){
      var html = '';
      for (var row = 0; row < perCol[c]; row++) {
        var k = row * cols.length + c, i = k % n, dup = k >= n;
        var path = postPath(list[i].permalink), url = embedBase(path);
        html += '<a class="ig-card" href="' + url + '" data-ig="' + path + '" data-i="' + i + '"' +
          (dup ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="Play Instagram reel ' + (i + 1) + ' of ' + n + '"') + '>' +
          '<span class="ig-frame"><iframe src="' + url + 'embed/" title="Instagram reel ' + (i + 1) + ' preview" loading="lazy" tabindex="-1" scrolling="no" aria-hidden="true"></iframe></span>' +
          '</a>';
      }
      col.innerHTML = html;
    });
    fit();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    return true;
  }

  /* the feed is fetched when the gallery gets near the screen (it sits far down the page), so it doesn't
     compete with the first paint; the cards already in the page show until it arrives */
  function loadFeed(){
    fetch(FEED_URL).then(function(res){ return res.ok ? res.json() : null; })
      .then(function(feed){ if (feed && feed.posts) render(feed.posts); })
      .catch(function(){ /* keep the reels already in the page */ });
  }
  if (window.fetch) {
    if ('IntersectionObserver' in window) {
      var feedIo = new IntersectionObserver(function(entries){
        if (entries[0].isIntersecting) { feedIo.disconnect(); loadFeed(); }
      }, {rootMargin: '1200px 0px'});
      feedIo.observe(section);
    } else loadFeed();
  }

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
    cols.forEach(function(col){
      var y = (col.getAttribute('data-y') || '0,0').split(',').map(Number);
      tl.fromTo(col, {yPercent: y[0]}, {yPercent: y[1], duration: 1}, 0);
    });
  }

  /* popup player; without <dialog> support the cards simply open Instagram */
  var modal = section.querySelector('.ig-modal');
  var player = modal && modal.querySelector('.ig-player iframe');
  if (!modal || typeof modal.showModal !== 'function') return;

  var reels = [], current = -1, opener = null;

  function show(i){
    current = (i + reels.length) % reels.length;
    player.src = embedBase(reels[current]) + 'embed/captioned/';
    player.title = 'Instagram reel ' + (current + 1) + ' of ' + reels.length;
  }
  function open(i){
    /* one entry per unique reel, read from the cards as they are now (static or from the feed) */
    reels = [];
    cards().forEach(function(card){
      var n = +card.getAttribute('data-i');
      if (!reels[n]) reels[n] = card.getAttribute('data-ig');
    });
    opener = document.activeElement;
    modal.showModal();
    show(i);
    document.documentElement.classList.add('ig-lock');
    modal.querySelector('.ig-close').focus();
  }
  function close(){ if (modal.open) modal.close(); }

  /* delegated, so it also works for cards rebuilt from the feed */
  gallery.addEventListener('click', function(e){
    var card = e.target.closest('.ig-card');
    if (!card) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; /* let new-tab clicks through */
    e.preventDefault();
    open(+card.getAttribute('data-i'));
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
