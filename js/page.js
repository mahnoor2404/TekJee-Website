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

/* Explainer scenes (.xs): the SVG animation plays only while the scene is on screen */
(function(){
  var scenes = document.querySelectorAll('.xs');
  if (!scenes.length) return;
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(scenes, function(s){ s.classList.add('is-on'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ e.target.classList.toggle('is-on', e.isIntersecting); });
  }, {threshold: 0.25});
  Array.prototype.forEach.call(scenes, function(s){ io.observe(s); });

  /* on phones a wide scene scrolls sideways; follow the part that is animating (data-follow gives the
     scroll position for each of the 4 stages, 0 = left edge, 1 = right edge) until the visitor scrolls it */
  if (!document.getAnimations) return;
  Array.prototype.forEach.call(scenes, function(s){
    var box = s.querySelector('.xs-scroll'), pill = s.querySelector('.xs-steps li');
    var stops = (s.getAttribute('data-follow') || '').split(',').map(Number);
    if (!box || !pill || stops.length !== 4) return;
    var stage = -1, userMoved = false;
    ['touchstart', 'wheel', 'keydown'].forEach(function(ev){ box.addEventListener(ev, function(){ userMoved = true; }, {passive: true}); });
    setInterval(function(){
      var max = box.scrollWidth - box.clientWidth;
      if (userMoved || max < 8 || !s.classList.contains('is-on')) return;
      var anim = pill.getAnimations()[0];
      if (!anim || anim.currentTime == null) return;
      var now = Math.floor(((anim.currentTime + 10000) % 10000) / 2500);
      if (now === stage) return;
      stage = now;
      box.scrollTo({left: stops[stage] * max, behavior: 'smooth'});
    }, 200);
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

/* Service pages (Digital Marketing, Web Development): the cards move exactly like the service carousel on the home page
   (same timing, same 3D depth and tilt, same glow on the centred card). It starts once the section is on screen. */
(function(){
  var section = document.querySelector('#vm-included, #wd-builds');
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
      clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(function(el){ el.setAttribute('tabindex', '-1'); });
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

    /* recompute only when on screen and the track has moved (the card tweens are at rest during the dwell) */
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

/* booking requests and assistant chat transcripts are emailed by FormSubmit (formsubmit.co) to FORM_TO, with a copy to FORM_CC.
   A form on a new address or domain must be activated once from the email FormSubmit sends to FORM_TO
   on its first request; that email also gives a random alias that can replace the address in the URL. */
var FORM_ENDPOINT = 'https://formsubmit.co/ajax/ibrahimqadir35@gmail.com';
var FORM_CC = 'ibrahimqadir@tekjee.com';
/* TEKJEE WhatsApp (+92 347 1944273), in the international format wa.me links need */
var WHATSAPP_NUMBER = '923471944273';
var WHATSAPP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5l1.3-4a8.5 8.5 0 1 1 3.3 3z"/><path d="M9.2 8.3c-.4 2.9 3.5 6.9 6.5 6.5l.9-1.5-2-1.1-1 .8a4.7 4.7 0 0 1-2.6-2.6l.8-1-1.1-2z"/></svg>';

/* TEKJEE assistant: a small chat window. It answers from a built-in knowledge base about TEKJEE (no external AI service).
   It asks for the visitor's email first; when the chat ends (closed, or the visitor leaves the page) the whole
   conversation is emailed to the TEKJEE team through FormSubmit, with the visitor's email as the reply-to address. */
(function(){
  var bot = document.getElementById('tekBot');
  if (!bot) return;

  var LINKS = {vm:'virtual-marketing.html', camera:'camera-monitoring.html', backoffice:'camera-monitoring.html#back-office', crm:'crm-automation.html', services:'index.html#services', approach:'index.html#approach', faq:'index.html#faq', contact:'mailto:support@tekjee.com'};
  var LINK_LABELS = {vm:'Digital Marketing page', camera:'Camera Surveillance page', backoffice:'Back office support', crm:'CRM Automation page', services:'See all services', approach:'How a project works', faq:'Read the FAQ', contact:'Email TEKJEE'};

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
    {id:'vm', kw:['marketing','digital marketing','digital marketing services','digital marketing for small businesses','virtual marketing','social','social media','media','email marketing','ads','advertising','paid ads','content','campaign','campaigns','instagram','facebook','newsletter','promotion','branding','brand','logo','graphic design','graphic designing','design','tiktok','linkedin','geo'],
     text:'Digital Marketing is TEKJEE’s remote marketing service: GEO and SEO (with a focus on GEO), social media marketing, paid ads on every social platform, branding and graphic design, with regular reporting, for businesses without an in-house marketing team.', links:['vm']},
    {id:'ai', kw:['ai','artificial intelligence','ai automation','ai automation services','business ai automation','ai business automation','agentic ai','ai agents','ai agents for business','ai bots','virtual manager','automation','automate','automations','agent','agents','chatbot','chatbots','machine learning','ai workflow automation','workflow'],
     text:'TEKJEE’s AI Automation covers agentic AI, AI bots, a Virtual Manager and AI workflow automation that remove repetitive work from marketing, sales and operations.', links:['services']},
    {id:'web', kw:['website','websites','web','web development','development','developer','app','apps','design','wordpress','site','landing page','ecommerce','e commerce','store'],
     text:'TEKJEE designs and builds fast, responsive, custom websites and web apps in-house, made for lead generation and online sales, with speed and technical SEO built in.', links:['services']},
    {id:'back', kw:['back office','back office support','back office support services','back office outsourcing','virtual back office','virtual back office services','administrative support','admin','administration','data entry','scheduling','invoicing','invoices','paperwork','follow ups','follow up','outsourcing'],
     text:'TEKJEE’s back office support is part of Camera Surveillance & Back Office Support: the same team reconciles transactions, keeps your books, handles data entry and admin, and coordinates vendors.', links:['backoffice']},
    {id:'crm', kw:['crm','crm automation','crm workflow automation','sales automation','lead follow-up automation','lead follow up automation','automated lead management','zoho','zoho crm','salesforce','deploy','existing solution','customer management','leads','lead','pipeline','pipelines','customer records','customers','sales pipeline'],
     text:'TEKJEE sets up CRM Automation, including automation for companies on Zoho and Salesforce: CRM workflow automation, sales automation and lead follow-up automation. TEKJEE can also deploy existing CRM solutions you already have.', links:['crm']},
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
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var visitorEmail = '', sentLen = 0;
  try {
    visitorEmail = sessionStorage.getItem('tekBotEmail') || '';
    sentLen = +sessionStorage.getItem('tekBotSent') || 0;
  } catch(e){}

  function later(fn, ms){ var id = setTimeout(fn, ms); timers.push(id); return id; }
  function pose(p){ bot.setAttribute('data-pose', p); }
  function scrollDown(){ log.scrollTop = log.scrollHeight; }
  function save(){ try { sessionStorage.setItem('tekBotChat', JSON.stringify(history.slice(-40))); } catch(e){} }

  /* the message box takes the visitor's email until one is given, then normal messages */
  function emailMode(on){
    input.type = on ? 'email' : 'text';
    input.placeholder = on ? 'Your email address' : 'Type a message...';
    input.setAttribute('autocomplete', on ? 'email' : 'off');
  }
  function askEmail(){
    emailMode(true);
    botSay([{text: 'Before we start, what’s your email address? A copy of this chat goes to the TEKJEE team so they can follow up with you.'}]);
  }
  function takeEmail(text){
    if (!EMAIL_RE.test(text)){
      botSay([{text: 'That doesn’t look like an email address. Please type it like name@example.com.'}]);
      return;
    }
    visitorEmail = text;
    try { sessionStorage.setItem('tekBotEmail', visitorEmail); } catch(e){}
    emailMode(false);
    botSay([{text: 'Thanks! How can I help you today? Ask me about TEKJEE’s services, GEO or how to get started.'}], showChips);
  }

  /* true once the visitor has asked something (the email they typed doesn't count) */
  function asked(){ return history.some(function(m){ return m.f === 'me' && !m.e; }); }

  /* "Send this chat on WhatsApp": once the visitor has asked something, a link under the chat opens
     WhatsApp to TEKJEE's number with the conversation already typed in; the visitor presses Send */
  var waLink = document.createElement('a');
  waLink.className = 'bot-wa';
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  waLink.hidden = true;
  waLink.innerHTML = WHATSAPP_ICON + '<span>Send this chat to TEKJEE on WhatsApp</span>';
  form.parentNode.insertBefore(waLink, form);

  function whatsappText(){
    var lines = [];
    history.forEach(function(m){ if (!m.e) lines.push((m.f === 'me' ? 'Me: ' : 'TEKJEE assistant: ') + m.t); });
    /* keep the link a sensible length: the latest messages are kept, the oldest dropped */
    var body = '', cut = false;
    for (var i = lines.length - 1; i >= 0; i--){
      if (body.length + lines[i].length > 1800){ cut = true; break; }
      body = lines[i] + (body ? '\n\n' + body : '');
    }
    return 'Hi TEKJEE, here is my chat with your website assistant.\n' +
      (visitorEmail ? 'My email: ' + visitorEmail + '\n' : '') +
      'Page: ' + location.href + '\n\n' +
      (cut ? '(earlier messages left out)\n\n' : '') + body;
  }
  function updateWa(){
    waLink.hidden = !asked();
    if (!waLink.hidden) waLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(whatsappText());
  }

  /* emails the whole chat to the TEKJEE team, once there is something new since the last copy.
     sendBeacon (or a keepalive fetch) still delivers it while the page is being closed. */
  function sendTranscript(){
    if (!visitorEmail || history.length <= sentLen) return;
    if (!asked()) return;
    sentLen = history.length;
    try { sessionStorage.setItem('tekBotSent', String(sentLen)); } catch(e){}
    var data = new URLSearchParams();
    data.append('_subject', 'New chatbot conversation from ' + visitorEmail);
    data.append('_template', 'table');
    data.append('_cc', FORM_CC);
    data.append('_replyto', visitorEmail);
    data.append('Visitor email', visitorEmail);
    data.append('Sent from page', location.href);
    history.forEach(function(m, i){
      var n = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
      data.append(n + ' ' + (m.f === 'me' ? 'Visitor' : 'TEKJEE assistant'), m.t);
    });
    if (navigator.sendBeacon && navigator.sendBeacon(FORM_ENDPOINT, data)) return;
    fetch(FORM_ENDPOINT, {method: 'POST', body: data, keepalive: true, headers: {'Accept': 'application/json'}}).catch(function(){});
  }

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
    if (!silent){ history.push({f: from, t: text, l: links || []}); save(); updateWa(); }
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
    if (!visitorEmail){ history[history.length - 1].e = 1; save(); updateWa(); takeEmail(text); return; }
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
      updateWa();
      if (visitorEmail) showChips(); else askEmail();
      return;
    }
    pose('wave');
    if (!visitorEmail){
      botSay([{text: 'Hello! I’m the TEKJEE assistant.'}], askEmail);
      return;
    }
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
      sendTranscript();
    }
  }

  later(function(){ bubble.classList.add('show'); }, 1200);
  later(function(){ if (panel.hidden){ bubble.classList.remove('show'); pose('stand'); } }, 7500);
  btn.addEventListener('click', function(){ timers.forEach(clearTimeout); setOpen(panel.hidden); });
  bot.querySelector('.bot-close').addEventListener('click', function(){ setOpen(false); btn.focus(); });
  form.noValidate = true; /* the assistant checks the email itself, in the chat */
  form.addEventListener('submit', function(e){ e.preventDefault(); send(input.value); });
  btn.addEventListener('mouseenter', function(){ if (panel.hidden) pose('wave'); });
  btn.addEventListener('mouseleave', function(){ if (panel.hidden) pose('stand'); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  /* leaving the page (or closing the tab) also ends the chat */
  window.addEventListener('pagehide', sendTranscript);
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') sendTranscript(); });
})();

/* WhatsApp: a floating button (bottom left) that opens a WhatsApp chat with TEKJEE (WHATSAPP_NUMBER) */
(function(){
  var a = document.createElement('a');
  a.className = 'wa-float';
  a.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Hi TEKJEE, I would like to know more about your services.');
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'Message TEKJEE on WhatsApp');
  a.title = 'Chat on WhatsApp';
  a.innerHTML = WHATSAPP_ICON;
  document.body.appendChild(a);
})();

/* Services dropdown in the nav: hover opens it on desktop, click/tap toggles it,
   Escape or a click outside closes it */
(function(){
  var dd = document.querySelector('.nav-dd');
  if (!dd) return;
  var btn = dd.querySelector('.nav-dd-btn');
  function set(open){ dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  btn.addEventListener('click', function(e){ e.stopPropagation(); set(!dd.classList.contains('open')); });
  document.addEventListener('click', function(e){ if (!dd.contains(e.target)) set(false); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && dd.classList.contains('open')) { set(false); btn.focus(); }
  });
  dd.addEventListener('focusout', function(e){ if (!dd.contains(e.relatedTarget)) set(false); });
})();

/* Phone menu: below 720px the nav links are hidden, so a burger button (added next to the theme toggle)
   opens them as a panel under the header; Services expands inside it. Closes on a link tap, Escape,
   a tap outside, or when the window grows back to desktop width. */
(function(){
  var header = document.querySelector('header.nav');
  var links = header && header.querySelector('.nav-links');
  var inner = header && header.querySelector('.nav-inner');
  if (!links || !inner) return;
  links.id = links.id || 'navLinks';
  var btn = inner.querySelector('.nav-burger');
  if (!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-burger';
    btn.setAttribute('aria-controls', links.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="nb-1" d="M4 7h16"/><path class="nb-2" d="M4 12h16"/><path class="nb-3" d="M4 17h16"/></svg>';
    var toggle = inner.querySelector('.theme-toggle');
    inner.insertBefore(btn, toggle || inner.lastElementChild);
  }

  function set(open){
    header.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function(e){ e.stopPropagation(); set(!header.classList.contains('nav-open')); });
  links.addEventListener('click', function(e){ if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function(e){ if (!header.contains(e.target)) set(false); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && header.classList.contains('nav-open')) { set(false); btn.focus(); }
  });
  if (window.matchMedia) {
    var wide = window.matchMedia('(min-width: 721px)');
    var onWide = function(){ if (wide.matches) set(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  }
})();

/* BOOKING / START PROJECT card: opened by any [data-book] link
   ("Book a consult" buttons and the START A PROJECT nav button) */
(function(){
  var triggers = document.querySelectorAll('[data-book]');
  if (!triggers.length) return;

  var SERVICES = [
    'Camera Surveillance & Back Office Support',
    'Virtual Management',
    'AI Automation',
    'Web Design & Development',
    'CRM Automation',
    'Digital Marketing'
  ];
  /* preselect the service that matches the page the visitor is on */
  var PAGE_SERVICE = {
    'camera-monitoring': 0, 'gas-stations': 0, 'hotels-motels': 0, 'restaurants': 0, 'retail': 0, 'warehouses': 0,
    'virtual-manager': 1, 'ai-automation': 2, 'web-development': 3, 'crm-automation': 4, 'virtual-marketing': 5
  };
  var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  var EMAIL = 'support@tekjee.com';

  var overlay = document.createElement('div');
  overlay.className = 'book-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="book-card" role="dialog" aria-modal="true" aria-labelledby="bookTitle">' +
      '<div class="book-art" aria-hidden="true">' +
        '<canvas class="book-art-canvas"></canvas>' +
        '<div class="book-art-copy">' +
          '<p class="book-art-title">Tell us the goal,<br>we build the rest</p>' +
          '<p class="book-art-sub">One team for websites, AI, CRM, marketing and camera monitoring.</p>' +
        '</div>' +
      '</div>' +
      '<div class="book-main">' +
      '<button class="book-close" type="button" aria-label="Close">×</button>' +
      '<span class="book-eyebrow">BOOKING / START PROJECT</span>' +
      '<h2 id="bookTitle">Book a consult</h2>' +
      '<p>Tell TEKJEE a little about you and the service you need. TEKJEE replies within one business day.</p>' +
      '<form class="book-form" novalidate>' +
        '<div class="book-field"><label for="bookName">Full name</label>' +
          '<input id="bookName" name="name" type="text" autocomplete="name" required maxlength="100">' +
          '<span class="book-err" id="bookNameErr"></span></div>' +
        '<p class="book-hint" id="bookContactHint">Give us your email or phone number (at least one).</p>' +
        '<div class="book-field"><label for="bookEmail">Email address</label>' +
          '<input id="bookEmail" name="email" type="email" autocomplete="email" maxlength="150" aria-describedby="bookContactHint">' +
          '<span class="book-err" id="bookEmailErr"></span></div>' +
        '<div class="book-field"><label for="bookPhone">Phone number</label>' +
          '<input id="bookPhone" name="phone" type="tel" autocomplete="tel" maxlength="30" aria-describedby="bookContactHint">' +
          '<span class="book-err" id="bookPhoneErr"></span></div>' +
        '<div class="book-field"><label for="bookService">Service</label>' +
          '<select id="bookService" name="service" required>' +
            '<option value="">Select a service</option>' +
            SERVICES.map(function(s){ return '<option>' + s.replace(/&/g, '&amp;') + '</option>'; }).join('') +
          '</select>' +
          '<span class="book-err" id="bookServiceErr"></span></div>' +
        '<input class="book-honey" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button class="btn btn-primary book-submit" type="submit">Submit request</button>' +
        '<p class="book-err book-send-err" role="alert"></p>' +
        '<p class="book-note">Your request goes straight to the TEKJEE team.</p>' +
      '</form>' +
      '<div class="book-done" hidden>' +
        '<div class="book-tick" aria-hidden="true">✓</div>' +
        '<h2>Thanks — request received</h2>' +
        '<p>TEKJEE will get back to you within one business day. ' +
        'Need us sooner? Write to <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> or call +1 (646) 934-8855.</p>' +
        '<button class="btn btn-ghost book-done-close" type="button">Close</button>' +
      '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var card = overlay.querySelector('.book-card');
  var form = overlay.querySelector('.book-form');
  var done = overlay.querySelector('.book-done');
  var title = overlay.querySelector('#bookTitle');
  var fields = {
    name: form.querySelector('#bookName'),
    email: form.querySelector('#bookEmail'),
    phone: form.querySelector('#bookPhone'),
    service: form.querySelector('#bookService')
  };
  var lastFocus = null;
  /* the WebGL background is set up on first open, not on page load (shader compiling is slow on phones) */
  var art = null;

  function open(kind){
    if (!art) art = grainGradient(overlay.querySelector('.book-art-canvas'));
    lastFocus = document.activeElement;
    title.textContent = kind === 'project' ? 'Start a project' : kind === 'demo' ? 'Book a demo' : 'Book a consult';
    form.hidden = false; done.hidden = true;
    if (!fields.service.value && PAGE_SERVICE[page] !== undefined) fields.service.value = SERVICES[PAGE_SERVICE[page]];
    overlay.hidden = false;
    document.body.classList.add('book-lock');
    requestAnimationFrame(function(){ overlay.classList.add('show'); });
    art.start();
    fields.name.focus();
  }
  function close(){
    if (art) art.stop();
    overlay.classList.remove('show');
    overlay.hidden = true;
    document.body.classList.remove('book-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  Array.prototype.forEach.call(triggers, function(t){
    t.addEventListener('click', function(e){ e.preventDefault(); open(t.getAttribute('data-book')); });
  });
  overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
  overlay.querySelector('.book-close').addEventListener('click', close);
  overlay.querySelector('.book-done-close').addEventListener('click', close);
  document.addEventListener('keydown', function(e){
    if (overlay.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    /* keep keyboard focus inside the card */
    var f = Array.prototype.filter.call(card.querySelectorAll('button, a[href], input, select'), function(el){ return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* email and phone are each optional, but at least one of them is needed */
  function check(key){
    var el = fields[key], v = el.value.trim(), msg = '';
    if (!v && (key === 'email' || key === 'phone')) {
      if (!fields.email.value.trim() && !fields.phone.value.trim()) msg = 'Enter an email or a phone number.';
    }
    else if (!v) msg = 'This field is required.';
    else if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Enter a valid email address.';
    else if (key === 'phone' && v.replace(/\D/g, '').length < 7) msg = 'Enter a valid phone number.';
    else if (key === 'service' && SERVICES.indexOf(v) < 0) msg = 'Choose a service.';
    var err = document.getElementById(el.id + 'Err');
    err.textContent = msg;
    if (msg) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', err.id); }
    else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    return !msg;
  }
  Object.keys(fields).forEach(function(k){
    fields[k].addEventListener(k === 'service' ? 'change' : 'blur', function(){
      if (fields[k].value) check(k);
      /* filling one contact field clears the "email or phone" error on the other */
      if ((k === 'email' || k === 'phone') && fields[k].value.trim()) check(k === 'email' ? 'phone' : 'email');
    });
  });

  var submitBtn = form.querySelector('.book-submit');
  var sendErr = form.querySelector('.book-send-err');
  var honey = form.querySelector('.book-honey');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    sendErr.textContent = '';
    var bad = Object.keys(fields).filter(function(k){ return !check(k); });
    if (bad.length) { fields[bad[0]].focus(); return; }
    var d = {};
    Object.keys(fields).forEach(function(k){ d[k] = fields[k].value.trim(); });
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify({
        _subject: 'New booking request: ' + d.name + ' wants ' + d.service,
        _template: 'table',
        _cc: FORM_CC,
        _honey: honey.value,
        'Request': d.name + ' has requested "' + title.textContent + '" for ' + d.service + '.',
        'Request type': title.textContent,
        'Full name': d.name,
        'Email': d.email || '(not given)',
        'Phone': d.phone || '(not given)',
        'Service': d.service,
        'Sent from page': location.href
      })
    }).then(function(res){
      return res.json().then(function(j){ if (!res.ok || String(j.success) !== 'true') throw new Error(j.message || 'Send failed'); });
    }).then(function(){
      form.reset();
      form.hidden = true; done.hidden = false;
      done.querySelector('.book-done-close').focus();
    }).catch(function(){
      sendErr.innerHTML = 'Sorry, your request could not be sent. Please try again, or email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.';
    }).then(function(){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit request';
    });
  });
})();

/* Animated grain gradient for the booking card's left panel: soft colour blobs drift in from the corners
   (pastel and dark blue on navy) with a film-grain texture on top. Plain WebGL, no library.
   Runs only while the card is open; with reduced motion it draws a single still frame.
   Without WebGL the panel keeps its CSS gradient background. */
function grainGradient(canvas){
  var noop = {start: function(){}, stop: function(){}};
  var gl = canvas && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  if (!gl) return noop;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p*=2.02;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/r;vec2 q=uv*vec2(r.x/r.y,1.);',
    ' float w=fbm(q*1.6+vec2(t*.05,-t*.04));',
    ' float wb=fbm(q*2.4+w*1.4-vec2(t*.03));',
    /* distance to the nearest (gently drifting) corner, roughened by noise */
    ' vec2 c1=vec2(.02+.06*sin(t*.21),.98+.05*cos(t*.17)),c2=vec2(.98+.05*cos(t*.19),.02+.06*sin(t*.23));',
    ' vec2 c3=vec2(.96+.04*cos(t*.19),.97+.04*sin(t*.13)),c4=vec2(.03+.05*cos(t*.15),.03+.04*sin(t*.21));',
    ' float d=min(distance(uv,c3),distance(uv,c4));',
    ' float m=1.-smoothstep(.0,1.,d+.42*(wb-.5));',
    ' vec3 navy=vec3(.020,.051,.125),deep=vec3(.039,.184,.839),mid=vec3(.353,.580,.957),pastel=vec3(.749,.867,1.),ice=vec3(.918,.957,1.);',
    ' float k=clamp(m*1.15+.25*(w-.5),0.,1.);',
    ' vec3 col=mix(navy,deep,smoothstep(0.,.35,k));',
    ' col=mix(col,mid,smoothstep(.3,.6,k));',
    ' col=mix(col,pastel,smoothstep(.55,.82,k));',
    ' col=mix(col,ice,smoothstep(.85,1.,k));',
    ' col+=(h(gl_FragCoord.xy+fract(t)*91.)-.5)*.11;',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');
  function sh(type, src){ var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return noop;
  var prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return noop;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't');
  canvas.parentNode.classList.add('has-gl');

  var raf = 0, t0 = 0, seed = Math.random() * 40;
  function size(){
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(canvas.clientWidth * dpr), hgt = Math.round(canvas.clientHeight * dpr);
    if (w && hgt && (canvas.width !== w || canvas.height !== hgt)) { canvas.width = w; canvas.height = hgt; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(now){
    size();
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, seed + (now - t0) / 400); /* ~2.5x real time: visible drift */
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!still) raf = requestAnimationFrame(draw);
  }
  return {
    start: function(){ if (raf) return; t0 = performance.now(); raf = requestAnimationFrame(draw); },
    stop: function(){ cancelAnimationFrame(raf); raf = 0; }
  };
}
