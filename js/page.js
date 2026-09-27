(function(){
  document.documentElement.classList.add('pg-js');
  var els = document.querySelectorAll('.pg-reveal');
  Array.prototype.forEach.call(els, function(el){
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty('--d', (Math.min(idx, 6) * 0.07) + 's');
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -6% 0px'});
    Array.prototype.forEach.call(els, function(el){ io.observe(el); });
  } else {
    Array.prototype.forEach.call(els, function(el){ el.classList.add('in'); });
  }
  /* whole service card is clickable (the inner link stays keyboard-focusable) */
  document.addEventListener('click', function(e){
    var card = e.target.closest && e.target.closest('[data-href]');
    if (!card || e.target.closest('a')) return;
    location.href = card.getAttribute('data-href');
  });
})();

/* AI section video: muted, loops, plays only while it is on screen */
(function(){
  var v = document.querySelector('.ai-video');
  if (!v) return;
  v.muted = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
      else v.pause();
    });
  }, {threshold: 0.25}).observe(v);
})();

/* Virtual Marketing page: the "what is included" cards move exactly like the service carousel on the home page
   (same timing, same 3D depth and tilt, same glow on the centred card). It starts once the section is on screen. */
(function(){
  var section = document.getElementById('vm-included');
  if (!section || typeof gsap === 'undefined') return;
  var viewport = section.querySelector('.carousel-viewport'), track = section.querySelector('.carousel-track');
  if (!viewport || !track) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce){ section.classList.add('no-motion'); return; }

  var started = false;
  function start(){
    if (started) return;
    started = true;

    var originalCards = Array.prototype.slice.call(track.querySelectorAll('.service-card'));
    originalCards.forEach(function(card){
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    var cards = gsap.utils.toArray(track.querySelectorAll('.service-card'));
    var cardBase = [], viewportWidth = 0, slotWidth = 0, centerOffset = 0;

    function remeasure(){
      var vRect = viewport.getBoundingClientRect();
      viewportWidth = vRect.width;
      var currentX = gsap.getProperty(track, 'x') || 0;
      cardBase = cards.map(function(card){
        var r = card.getBoundingClientRect();
        return { left: r.left - vRect.left - currentX, width: r.width };
      });
      slotWidth = cardBase.length > 1 ? (cardBase[1].left - cardBase[0].left) : (cardBase[0] ? cardBase[0].width : 1);
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

    var ROT_STEP = 30, ROT_MAX = 66;
    var Z_STEP = 95, Z_MAX = 360, Z_POP = 55;
    var SCALE_STEP = 0.1, SCALE_MIN = 0.58;
    var OP_STEP = 0.13, OP_MIN = 0.28;
    var focusedIdx = -1;

    function updateCardFocus(trackX){
      var centerX = viewportWidth / 2, minAbsSlot = Infinity, minIdx = 0;
      cardBase.forEach(function(base, i){
        var cardCenter = base.left + base.width / 2 + trackX;
        var slot = (cardCenter - centerX) / slotWidth;
        var absSlot = Math.abs(slot);
        cardQuick[i].scaleTo(gsap.utils.clamp(SCALE_MIN, 1.14, 1.14 - absSlot * SCALE_STEP));
        cardQuick[i].opacityTo(gsap.utils.clamp(OP_MIN, 1, 1 - absSlot * OP_STEP));
        cardQuick[i].rotYTo(gsap.utils.clamp(-ROT_MAX, ROT_MAX, slot * -ROT_STEP));
        cardQuick[i].zTo(gsap.utils.clamp(-Z_MAX, Z_POP, Z_POP - absSlot * Z_STEP));
        if (absSlot < minAbsSlot){ minAbsSlot = absSlot; minIdx = i; }
      });
      if (minIdx !== focusedIdx){
        focusedIdx = minIdx;
        cards.forEach(function(card, i){ card.classList.toggle('is-focused', i === focusedIdx); });
      }
    }

    var STEP_DURATION = 0.6, DWELL = 1.1;
    var stepIndex = 0, activeTween = null, running = true;
    function advanceStep(){
      if (!running) return;
      stepIndex++;
      activeTween = gsap.to(track, {
        x: centerOffset - stepIndex * slotWidth,
        duration: STEP_DURATION,
        ease: 'power3.inOut',
        onComplete: function(){
          if (stepIndex >= originalCards.length){ stepIndex = 0; gsap.set(track, {x: centerOffset}); }
          scheduleNext();
        }
      });
    }
    function scheduleNext(){ if (!running) return; activeTween = gsap.delayedCall(DWELL, advanceStep); }
    scheduleNext();

    gsap.ticker.add(function(){ if (running) updateCardFocus(gsap.getProperty(track, 'x')); });

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
        if (!viewport.getBoundingClientRect().width) return;
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

  /* measure only when the section is actually visible (the page view can start hidden) */
  function ready(){ return viewport.getBoundingClientRect().width > 0; }
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting && ready()){ io.disconnect(); setTimeout(start, 80); }
      });
    }, {threshold: 0.01});
    io.observe(viewport);
  } else if (ready()) start();
})();

/* light / dark toggle: storm blue and white. The header already set data-theme from
   localStorage synchronously (see the inline script at the top of <header class="nav">)
   so there is no flash; this just wires up the button and keeps localStorage in sync. */
(function(){
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var root = document.documentElement;
  function sync(){
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  sync();
  btn.addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'dark' ? null : 'dark';
    if (next) root.setAttribute('data-theme', next); else root.removeAttribute('data-theme');
    try { localStorage.setItem('tekjeeTheme', next || 'light'); } catch (e) {}
    sync();
  });
})();

/* TEKJEE assistant: a small chat window. It answers from a built-in knowledge base about TEKJEE (no server, no external service). */
(function(){
  var bot = document.getElementById('tekBot');
  if (!bot) return;

  var LINKS = {vm:'virtual-marketing.html', services:'index.html#services', approach:'index.html#approach', faq:'index.html#faq', contact:'mailto:support@tekjee.com'};
  var LINK_LABELS = {vm:'Digital Marketing page', services:'See all services', approach:'How a project works', faq:'Read the FAQ', contact:'Email TEKJEE'};

  /* ---- knowledge base: keywords (whole words or phrases; longer phrases weigh more) -> answer ---- */
  var INTENTS = [
    {id:'greet', kw:['hi','hii','hello','hey','hola','salam','assalam','yo','good morning','good afternoon','good evening'], short:true,
     text:'Hello! How can I help you today? You can ask about TEKJEE’s services, GEO or how to get started.'},
    {id:'thanks', kw:['thanks','thank you','thx','thankyou','ok thanks'], short:true, text:'You’re welcome! Is there anything else I can help you with?'},
    {id:'bye', kw:['bye','goodbye','see you','see ya'], short:true, text:'Goodbye! Come back any time.'},
    {id:'self', kw:['who are you','your name','are you a bot','are you human','are you ai','are you real','what are you'],
     text:'I’m the TEKJEE assistant, a helper built into this website. I can answer questions about TEKJEE’s services, GEO and how to get started. I’m not a person, so for anything detailed the team is at support@tekjee.com.', links:['contact']},
    {id:'pricing', kw:['price','prices','pricing','cost','costs','quote','how much','budget','fee','fees','rates','estimate','cheap','expensive','charge'],
     text:'Prices depend on the service and the size of the project. TEKJEE scopes each project with a fixed estimate after a short call, so the best next step is to book a consult and say what you need.', links:['contact']},
    {id:'contact', kw:['contact','email','book','consult','consultation','call','phone','number','reach','talk','meeting','speak','get started','start','hire','hours','open','business hours','support'],
     text:'You can reach TEKJEE at support@tekjee.com or by phone at +1 (646) 934-8855. Tell the team which service you need and they will scope it on a call.', links:['contact']},
    {id:'seo', kw:['seo','geo','local seo','technical seo','generative engine','generative engine optimization','answer engine','answer engine optimization','ai search optimization','ai search visibility','chatgpt','gemini','perplexity','rank','ranking','google','search','search engine','visibility'],
     text:'SEO, Local SEO and Technical SEO help a website rank in search engines such as Google. GEO (Generative Engine Optimization) and Answer Engine Optimization help a business get named and cited in answers from AI assistants such as ChatGPT, Gemini and Perplexity. TEKJEE offers both.', links:['faq','services']},
    {id:'social', kw:['instagram','linkedin','facebook','social media pages','follow','socials'], text:'You can find TEKJEE on Instagram, LinkedIn and Facebook. The icons are in the Get in Touch section at the bottom of the home page.', links:['contact']},
    {id:'vm', kw:['marketing','digital marketing','digital marketing services','digital marketing for small businesses','virtual marketing','social','social media','media','email marketing','ads','advertising','paid ads','content','campaign','campaigns','instagram','facebook','newsletter','promotion'],
     text:'Digital Marketing is TEKJEE’s remote marketing service: social media management, email and content campaigns, SEO and paid ads with regular reporting, for businesses without an in-house marketing team.', links:['vm']},
    {id:'ai', kw:['ai','artificial intelligence','ai automation','ai automation services','business ai automation','ai business automation','agentic ai','ai agents','ai agents for business','ai bots','virtual manager','automation','automate','automations','agent','agents','chatbot','chatbots','machine learning','ai workflow automation','workflow'],
     text:'TEKJEE’s AI Automation covers agentic AI, AI bots, a Virtual Manager and AI workflow automation that remove repetitive work from marketing, sales and operations.', links:['services']},
    {id:'web', kw:['website','websites','web','web development','development','developer','app','apps','design','wordpress','site','landing page','ecommerce','e commerce','store'],
     text:'TEKJEE designs and builds fast, responsive, custom websites and web apps in-house, made for lead generation and online sales, with speed and technical SEO built in.', links:['services']},
    {id:'back', kw:['back office','back office support','back office support services','back office outsourcing','virtual back office','virtual back office services','administrative support','admin','administration','data entry','scheduling','invoicing','invoices','paperwork','follow ups','follow up','outsourcing'],
     text:'TEKJEE’s back office support covers back office outsourcing: data entry, admin, scheduling, follow-ups and invoicing, so business owners are free of paperwork.', links:['services']},
    {id:'crm', kw:['crm','crm automation','crm workflow automation','sales automation','lead follow-up automation','lead follow up automation','automated lead management','customer management','leads','lead','pipeline','pipelines','customer records','customers','sales pipeline'],
     text:'TEKJEE sets up CRM Automation: CRM workflow automation, sales automation, lead follow-up automation and automated lead management, so every lead and customer record lives in one system.', links:['services']},
    {id:'camera', kw:['camera','cameras','camera monitoring','virtual camera monitoring','live camera monitoring','live camera surveillance','remote camera monitoring','remote video surveillance','commercial camera monitoring','business security camera monitoring','ai video monitoring','gas station camera monitoring','retail store camera monitoring','warehouse camera monitoring','restaurant camera monitoring','hotel camera monitoring','motel camera monitoring','surveillance','cctv','security','monitoring','nvr','24/7','247','alarm','footage'],
     text:'TEKJEE provides Camera Monitoring: virtual and live camera monitoring, remote video surveillance and AI video monitoring with 24/7 alerts and secure cloud or NVR storage, for gas stations, retail stores, warehouses, restaurants, hotels and motels.', links:['services']},
    {id:'process', kw:['process','steps','how does it work','how do you work','how does a project work','how it works','workflow steps','timeline','how long'],
     text:'Every TEKJEE project follows four steps: assess your needs, design and build the solution, deploy it into your tools or premises, then monitor and improve it after launch.', links:['approach']},
    {id:'services', kw:['services','service','offer','what do you do','provide','solutions','what can you do','what do you offer','products','help'],
     text:'TEKJEE offers seven services: digital marketing, AI automation, web development, back office support, CRM automation, SEO and GEO, and camera monitoring. Which one would you like to know more about?', links:['services','vm']},
    {id:'who', kw:['tekjee','company','about','about tekjee','what is tekjee','who is tekjee','who are you guys'],
     text:'TEKJEE is a digital solutions company that provides digital marketing, AI automation, web development, back office support, CRM automation, SEO and GEO, and camera monitoring through a single team.', links:['services']},
    {id:'where', kw:['where','location','address','office','country','city','located','visit','directions'],
     text:'TEKJEE is at 426 Kirby Street, Lake Charles, LA 70601, serving businesses across the US and UK. You can also call +1 (646) 934-8855 or email support@tekjee.com.', links:['contact']}
  ];
  var FALLBACK = 'I’m not sure about that one. I can help with TEKJEE’s services (digital marketing, AI automation, web development, back office support, CRM automation, SEO and GEO, camera monitoring) and getting started. For anything else, the team can help at support@tekjee.com.';
  var CHIPS = ['What services do you offer?', 'What is GEO?', 'Tell me about Digital Marketing', 'How do I get started?'];

  function norm(s){ return ' ' + s.toLowerCase().replace(/[^a-z0-9\/ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }
  function answer(msg){
    var t = norm(msg), words = t.trim().split(' ').length, best = null, bestScore = 0;
    INTENTS.forEach(function(it){
      if (it.short && words > 4) return;
      var score = 0;
      it.kw.forEach(function(k){ if (t.indexOf(' ' + k + ' ') > -1) score += k.split(' ').length; });
      if (score > bestScore){ bestScore = score; best = it; }
    });
    return best ? {text: best.text, links: best.links || []} : {text: FALLBACK, links: ['contact']};
  }

  /* ---- chat window ---- */
  var btn = bot.querySelector('.bot-btn'), panel = document.getElementById('tekBotPanel'), bubble = document.getElementById('tekBotBubble');
  var log = document.getElementById('tekBotLog'), chips = document.getElementById('tekBotChips');
  var form = document.getElementById('tekBotForm'), input = document.getElementById('tekBotInput');
  var timers = [], busy = false, started = false, history = [];

  function later(fn, ms){ var id = setTimeout(fn, ms); timers.push(id); return id; }
  function pose(p){ bot.setAttribute('data-pose', p); }
  function scrollDown(){ log.scrollTop = log.scrollHeight; }
  function save(){ try { sessionStorage.setItem('tekBotChat', JSON.stringify(history.slice(-40))); } catch(e){} }

  function addMsg(from, text, links, silent){
    var el = document.createElement('div');
    el.className = 'bot-msg ' + (from === 'me' ? 'from-me' : 'from-bot');
    el.appendChild(document.createTextNode(text));
    (links || []).forEach(function(k){
      var a = document.createElement('a');
      a.className = 'bot-link'; a.href = LINKS[k]; a.textContent = LINK_LABELS[k];
      el.appendChild(a);
    });
    log.appendChild(el);
    scrollDown();
    if (!silent){ history.push({f: from, t: text, l: links || []}); save(); }
    return el;
  }
  function typing(){
    var el = document.createElement('div');
    el.className = 'bot-msg from-bot';
    el.innerHTML = '<span class="bot-typing"><i></i><i></i><i></i></span>';
    log.appendChild(el); scrollDown();
    return el;
  }
  function botSay(list, done){
    busy = true; pose('question');
    (function next(i){
      if (i >= list.length){ busy = false; pose('stand'); if (done) done(); return; }
      var t = typing();
      later(function(){
        log.removeChild(t);
        addMsg('bot', list[i].text, list[i].links);
        next(i + 1);
      }, 550 + Math.min(list[i].text.length * 7, 900));
    })(0);
  }
  function showChips(){
    chips.innerHTML = '';
    CHIPS.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c;
      b.addEventListener('click', function(){ send(c); });
      chips.appendChild(b);
    });
  }
  function send(text){
    text = (text || '').trim();
    if (!text || busy) return;
    addMsg('me', text);
    input.value = '';
    chips.innerHTML = '';
    var r = answer(text);
    botSay([r], showChips);
  }
  function intro(){
    started = true;
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('tekBotChat') || 'null'); } catch(e){}
    if (saved && saved.length){
      history = saved;
      saved.forEach(function(m){ addMsg(m.f, m.t, m.l, true); });
      showChips();
      return;
    }
    pose('wave');
    botSay([
      {text: 'Hello! I’m the TEKJEE assistant.'},
      {text: 'How can I help you today? Ask me about TEKJEE’s services, GEO or how to get started.'}
    ], showChips);
  }
  function setOpen(open){
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    bubble.classList.remove('show');
    if (open){
      if (!started) intro(); else pose('stand');
      later(function(){ input.focus(); }, 60);
      scrollDown();
    } else {
      pose('stand');
    }
  }

  later(function(){ bubble.classList.add('show'); }, 1200);
  later(function(){ if (panel.hidden){ bubble.classList.remove('show'); pose('stand'); } }, 7500);
  btn.addEventListener('click', function(){ timers.forEach(clearTimeout); setOpen(panel.hidden); });
  bot.querySelector('.bot-close').addEventListener('click', function(){ setOpen(false); btn.focus(); });
  form.addEventListener('submit', function(e){ e.preventDefault(); send(input.value); });
  btn.addEventListener('mouseenter', function(){ if (panel.hidden) pose('wave'); });
  btn.addEventListener('mouseleave', function(){ if (panel.hidden) pose('stand'); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
})();
