/* Camera surveillance page: "Retail owners / Motels & hotels" tabs (arrow keys move between them). */
(function(){
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.cam-tab'));
  if (!tabs.length) return;
  function select(i, focus){
    tabs.forEach(function(t, n){
      var on = n === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ select(i); });
    t.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    });
  });
})();
