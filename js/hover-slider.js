/* Web development "hover slider": hovering, focusing or tapping a service title makes it active.
   The active title's letters roll up one after another, and its image wipes in over the previous one.
   Markup: .hs-title buttons (role=tab), .hs-img images and .hs-cap captions, matched by data-i. */
(function(){
  var root = document.querySelector('.hs-section');
  if (!root) return;
  var titles = Array.prototype.slice.call(root.querySelectorAll('.hs-title'));
  var imgs = Array.prototype.slice.call(root.querySelectorAll('.hs-img'));
  var caps = Array.prototype.slice.call(root.querySelectorAll('.hs-cap'));
  var active = 0;

  /* split each title into letters, each a two-line stack (current + incoming copy) */
  titles.forEach(function(btn){
    var text = btn.textContent.trim();
    btn.setAttribute('aria-label', text);
    btn.textContent = '';
    var wrap = document.createElement('span');
    wrap.className = 'hs-letters';
    wrap.setAttribute('aria-hidden', 'true');
    var i = 0;
    text.split(' ').forEach(function(word, w){
      if (w) wrap.appendChild(document.createTextNode(' '));
      var wordEl = document.createElement('span');
      wordEl.className = 'hs-word'; /* letters of a word never wrap apart */
      Array.prototype.forEach.call(word, function(ch){
        var c = document.createElement('span');
        c.className = 'hs-ch';
        c.style.setProperty('--d', (i++ * 0.022).toFixed(3) + 's');
        c.innerHTML = '<span class="hs-a"></span><span class="hs-b"></span>';
        c.firstChild.textContent = ch; c.lastChild.textContent = ch;
        wordEl.appendChild(c);
      });
      i++;
      wrap.appendChild(wordEl);
    });
    btn.appendChild(wrap);
  });
  root.classList.add('hs-ready');

  function setActive(i){
    if (i === active) return;
    var prev = active;
    active = i;
    titles.forEach(function(t, n){
      var on = n === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    imgs.forEach(function(img, n){
      img.classList.toggle('is-prev', n === prev);
      img.classList.toggle('is-active', n === i);
    });
    caps.forEach(function(c, n){ c.classList.toggle('is-active', n === i); });
  }

  titles.forEach(function(t, i){
    t.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') setActive(i); });
    t.addEventListener('focus', function(){ setActive(i); });
    t.addEventListener('click', function(){ setActive(i); });
  });

  /* arrow keys move between titles (roving tabindex, as for any tab list) */
  root.querySelector('.hs-list').addEventListener('keydown', function(e){
    var k = e.key, n = titles.length, next = -1;
    if (k === 'ArrowDown' || k === 'ArrowRight') next = (active + 1) % n;
    else if (k === 'ArrowUp' || k === 'ArrowLeft') next = (active - 1 + n) % n;
    else if (k === 'Home') next = 0;
    else if (k === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    titles[next].focus();
  });
})();
