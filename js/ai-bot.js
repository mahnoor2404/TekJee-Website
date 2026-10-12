/* AI page robot (Key features section), styled in styles.css:
   - hovering or tapping the robot: it waves and greets (.is-hi)
   - hovering, focusing or tapping a feature: it points at the list and says that item's data-say text (.is-talk)
   - its eyes follow the pointer anywhere over the section */
(function(){
  var stage = document.getElementById('aibStage');
  if (!stage) return;
  var section = stage.closest('section');
  var look = stage.querySelector('.aib-look');
  var art = stage.querySelector('.aib-art');
  var bubble = document.getElementById('aibSay');
  var text = bubble.querySelector('p');
  var items = Array.prototype.slice.call(section.querySelectorAll('.aib-list li'));
  var GREETING = "Hi, I'm your TEKJEE AI agent! Point at a feature and I'll tell you about it.";
  var speakTimer = null, tapTimer = null, activeItem = null;

  function say(line){
    text.textContent = line;
    bubble.classList.add('show');
    stage.classList.add('is-speaking');
    clearTimeout(speakTimer);
    speakTimer = setTimeout(function(){ stage.classList.remove('is-speaking'); }, Math.min(3200, line.length * 45));
  }
  function hush(){
    bubble.classList.remove('show');
    stage.classList.remove('is-speaking');
  }

  /* the robot itself */
  function hiOn(){ stage.classList.add('is-hi'); say(activeItem ? activeItem.getAttribute('data-say') : GREETING); }
  function hiOff(){ stage.classList.remove('is-hi'); if (!activeItem) hush(); }
  stage.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') hiOn(); });
  stage.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') hiOff(); });
  stage.addEventListener('click', function(){ /* touch screens have no hover, so a tap waves for a few seconds */
    hiOn();
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function(){ if (!stage.matches(':hover')) hiOff(); }, 3000);
  });

  /* the feature list */
  function talkOn(li){
    if (activeItem) activeItem.classList.remove('is-active');
    activeItem = li;
    li.classList.add('is-active');
    stage.classList.add('is-talk');
    say(li.getAttribute('data-say'));
  }
  function talkOff(li){
    if (activeItem !== li) return;
    li.classList.remove('is-active');
    activeItem = null;
    stage.classList.remove('is-talk');
    if (!stage.classList.contains('is-hi')) hush();
  }
  items.forEach(function(li){
    li.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') talkOn(li); });
    li.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') talkOff(li); });
    li.addEventListener('focus', function(){ talkOn(li); });
    li.addEventListener('blur', function(){ talkOff(li); });
    li.addEventListener('click', function(){ talkOn(li); });
  });

  /* eyes: shift up to 6 SVG units toward the pointer from the visor centre (200,106; viewBox starts at y -70, 400 wide) */
  section.addEventListener('pointermove', function(e){
    var r = art.getBoundingClientRect(), k = r.width / 400;
    var dx = e.clientX - (r.left + 200 * k), dy = e.clientY - (r.top + 176 * k);
    var d = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(6, d / 25);
    look.style.transform = 'translate(' + (dx / d * m).toFixed(2) + 'px,' + (dy / d * m).toFixed(2) + 'px)';
  });
  section.addEventListener('pointerleave', function(){ look.style.transform = ''; });
})();
