/* Mistress Eva (plantilla Divana v2): todo lo interactivo menos la escena 3D */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const PHONE = '33780977306';
  const wa = msg => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  $$('[data-wa]').forEach(a => { a.href = wa(a.dataset.wa); });

  const toast = (() => {
    const el = $('#toast');
    let t = 0;
    return msg => { el.textContent = msg; el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 3200); };
  })();

  /* ---------- Sonido (todo sintetizado, apagado por defecto) ---------- */
  const sound = (() => {
    let ctx = null, on = store.get('eva-son') === '1';
    const btn = $('.snd');
    const ensure = () => {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const env = (g, t0, a, peak, dcy) => { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + a + dcy); };
    const noise = dur => {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = b; return s;
    };
    const tone = (freq, dur, vol, type = 'sine', lp = 0) => {
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq; env(g, t, .005, vol, dur);
      let n = o;
      if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
      n.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .05);
    };
    const fx = {
      crack() {
        const t = ctx.currentTime, s = noise(.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 1800; env(g, t, .003, .9, .16);
        s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + .3);
        const o = ctx.createOscillator(), g2 = ctx.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(300, t + .05); env(g2, t, .001, .22, .05);
        o.connect(g2).connect(ctx.destination); o.start(t); o.stop(t + .08);
      },
      door() {
        const t = ctx.currentTime, s = noise(2.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.setValueAtTime(110, t); f.frequency.linearRampToValueAtTime(420, t + 1.9); env(g, t, .3, .7, 1.9);
        s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + 2.3);
        const o = ctx.createOscillator(), lf = ctx.createBiquadFilter(), g2 = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(46, t + 2); lf.type = 'lowpass'; lf.frequency.value = 300; env(g2, t, .3, .16, 1.8);
        o.connect(lf).connect(g2).connect(ctx.destination); o.start(t); o.stop(t + 2.3);
      },
      tick() { tone(880, .05, .06); },
      good() { tone(660, .08, .1, 'triangle'); setTimeout(() => tone(990, .1, .1, 'triangle'), 70); },
      bad() { tone(140, .3, .2, 'sawtooth', 600); },
      win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .18, .09, 'triangle'), i * 110)); }
    };
    const sync = () => { btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Couper le son' : 'Activer le son'); };
    const play = name => { if (!on || !ensure()) return; try { fx[name](); } catch (e) {} };
    const set = v => { on = v; store.set('eva-son', v ? '1' : '0'); sync(); if (v) ensure(); };
    btn.addEventListener('click', () => { set(!on); play('crack'); });
    sync();
    return { play, set, get on() { return on; } };
  })();

  /* ---------- Carga y puertas del Palacio ---------- */
  const gate = $('#gate'), loader = $('.loader', gate);
  const nav = $('#nav'), lb = $('#lb'), legal = $('#legal');
  const syncLock = () => d.body.classList.toggle('locked', !gate.classList.contains('done') || nav.classList.contains('open') || lb.classList.contains('open') || (legal && legal.classList.contains('open')));
  const heelPath = $('.heel-draw path');
  if (heelPath) heelPath.style.setProperty('--len', Math.ceil(heelPath.getTotalLength()));
  const gateSound = $('#gate-sound');
  gateSound.checked = sound.on;
  const verified = store.get('eva-majeur') === '1';

  let shown = 0;
  const setP = v => { shown = Math.max(shown, v); $('#pct').textContent = Math.round(shown * 100); $('#bar').style.setProperty('--p', shown); };
  const fake = setInterval(() => setP(Math.min(.92, shown + .03 + Math.random() * .05)), 90);
  const heroLoaded = new Promise(r => { if (window.evaHeroLoaded) r(); else addEventListener('eva:hero-loaded', r, { once: true }); });
  Promise.race([
    Promise.all([heroLoaded, d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, reduce ? 300 : 1900))]),
    new Promise(r => setTimeout(r, 7000))
  ]).then(() => { clearInterval(fake); setP(1); setTimeout(afterLoad, 380); });

  const ready = () => { root.classList.add('is-ready'); d.body.classList.add('ready'); dispatchEvent(new Event('eva:ready')); };
  const finishGate = () => { gate.classList.add('done'); gate.setAttribute('aria-hidden', 'true'); syncLock(); onScroll(); };
  function afterLoad() {
    loader.classList.add('hide');
    if (verified) { gate.classList.add('skip'); ready(); setTimeout(finishGate, 850); return; }
    gate.classList.add('ask');
    $('#gate-yes').focus({ preventScroll: true });
  }
  $('#gate-yes').addEventListener('click', () => {
    store.set('eva-majeur', '1');
    sound.set(gateSound.checked);
    if (gateSound.checked) { sound.play('crack'); setTimeout(() => sound.play('door'), 260); }
    gate.classList.remove('ask');
    gate.classList.add('opening');
    setTimeout(ready, reduce ? 0 : 500);
    setTimeout(finishGate, reduce ? 60 : 2150);
  });

  /* ---------- Cabecera, barra de progreso y botón flotante ---------- */
  const hdr = $('.hdr'), fab = $('.fab'), bar = $('.progress');
  let ticking = false;
  function onScroll() {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    hdr.classList.toggle('solid', y > 30);
    fab.classList.toggle('show', y > innerHeight * .8);
    bar.style.setProperty('--p', max > 0 ? y / max : 0);
    words();
    palace();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });

  /* ---------- Menú móvil ---------- */
  const burger = $('.burger');
  const setMenu = open => {
    nav.classList.toggle('open', open); burger.classList.toggle('x', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    syncLock();
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Cursor propio y botones magnéticos ---------- */
  if (fine && !reduce) {
    const dot = $('.cur-dot'), ring = $('.cur-ring');
    let x = -100, y = -100, rx = x, ry = y;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (rx < -50) { rx = e.clientX; ry = e.clientY; d.body.classList.add('has-cursor'); }
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
    const loop = () => { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`; requestAnimationFrame(loop); };
    loop();
    d.addEventListener('pointerover', e => ring.classList.toggle('big', !!e.target.closest('a, button, [data-tilt], .ring-stage, #sig-canvas')));
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .32}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Aparición al bajar ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- Manifiesto: las palabras se encienden al bajar ---------- */
  const wordsEl = $('#words');
  let wordSpans = [];
  if (wordsEl) {
    const frag = d.createDocumentFragment();
    [...wordsEl.childNodes].forEach(node => {
      const hot = node.nodeType === 1;
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
        const s = d.createElement('span');
        s.className = hot ? 'w hot' : 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
    });
    wordsEl.textContent = '';
    wordsEl.appendChild(frag);
    wordSpans = $$('.w', wordsEl);
    if (reduce) wordSpans.forEach(s => s.classList.add('on'));
  }
  function words() {
    if (!wordSpans.length || reduce) return;
    const r = wordsEl.getBoundingClientRect(), vh = innerHeight;
    const n = Math.round(clamp((vh * .85 - r.top) / (r.height + vh * .3), 0, 1) * wordSpans.length);
    wordSpans.forEach((s, i) => s.classList.toggle('on', i < n));
  }

  /* ---------- Foto con inclinación 3D ---------- */
  if (fine && !reduce) $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('moving');
      el.style.setProperty('--ry', `${(px - .5) * 16}deg`);
      el.style.setProperty('--rx', `${(.5 - py) * 12}deg`);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('moving'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- El Palacio: recorrido lateral al bajar (ordenador) ---------- */
  const palaceEl = $('#palacio'), track = $('.palace-track'), rooms = $$('.room', track), pbar = $('.palace-progress span');
  const desk = matchMedia('(min-width: 901px)');
  let overflow = 0;
  function palaceSize() {
    if (!desk.matches) { palaceEl.style.height = ''; track.style.transform = ''; overflow = 0; return; }
    overflow = Math.max(0, track.scrollWidth - innerWidth);
    palaceEl.style.height = `${innerHeight + overflow}px`;
  }
  function palace() {
    if (!overflow) return;
    const r = palaceEl.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, palaceEl.offsetHeight - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * overflow}px, 0, 0)`;
    pbar.style.setProperty('--pp', p);
    if (reduce || r.bottom < 0 || r.top > innerHeight) return;
    const cx = innerWidth / 2;
    rooms.forEach(el => {
      const b = el.getBoundingClientRect(), o = clamp((b.left + b.width / 2 - cx) / innerWidth, -1, 1);
      el.style.setProperty('--ry', `${o * -24}deg`);
      el.style.setProperty('--s', 1 - Math.abs(o) * .08);
      el.style.setProperty('--px', `${o * -40}px`);
    });
  }
  palaceSize();
  addEventListener('resize', () => { palaceSize(); onScroll(); });
  addEventListener('load', () => { palaceSize(); onScroll(); });

  /* ---------- Cartas que se giran (en móvil, al tocar) ---------- */
  $$('.flip:not(.intro)').forEach(f => {
    f.addEventListener('click', e => { if (e.target.closest('a')) return; if (!matchMedia('(hover: hover)').matches) { f.classList.toggle('on'); sound.play('tick'); } });
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('on'); } });
  });

  /* ---------- La carta: rueda 3D de prácticas ---------- */
  const CARTA = [
    { n: 'Esprit', d: 'Votre tête est la première chose qui m\'appartient.', t: ['Contrôle total', 'Domination psychologique', 'Contrôle de l\'orgasme', 'Edging', 'Tease and denial', 'Orgasme ruiné', 'Chasteté', 'Féminisation', 'Dress-up', 'Jeux de rôle', 'Hypno-domination', 'Interrogatoire', 'Puppy training'] },
    { n: 'Corps', d: 'Discipline et douleur, à mon rythme.', t: ['Fessée', 'Flagellation', 'Canne', 'Châtiment corporel', 'CBT', 'Ballbusting', 'Trampling', 'Gifles', 'Torture des tétons', 'Cire', 'Jeux de température'] },
    { n: 'Liens', d: 'Immobile, aveugle et sans échappatoire.', t: ['Bondage', 'Shibari', 'Momification', 'Sac de couchage en caoutchouc', 'Camisole de force', 'Suspension', 'Cage', 'Pilori', 'Bondage de contrainte', 'Privation sensorielle'] },
    { n: 'Gadgetry', d: 'Mes machines, mes règles.', t: ['Machines de traite', 'Venus 2000', 'F-machine', 'Électrostimulation', 'Surcharge sensorielle', 'Medical play', 'Needle play', 'Massage prostatique'] },
    { n: 'Fétiches', d: 'Mon latex, mes bottes et mes caprices.', t: ['Latex', 'Heavy rubber', 'Vac-suit', 'Cuir', 'Masque à gaz', 'Adoration des pieds et des bottes', 'Body worship', 'Queening', 'Strap-on', 'Pegging'] },
    { n: 'Duo et distance', d: 'Servez-moi à deux, ou de loin.', t: ['Duo avec une amie Dominatrice', 'Soumission synchronisée', 'Domination financière', 'Webcam', 'Appel vocal', 'Échanges écrits', 'Aftercare'] }
  ];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ringEl = $('#ring'), stageEl = $('#ring-stage'), tagsEl = $('#ring-tags');
  ringEl.innerHTML = CARTA.map((c, i) => `<button type="button" class="ring-item" style="--i:${i}" data-i="${i}"><span class="n">${ROMAN[i]}</span><span><b>${c.n}</b><small>${c.d}</small></span><span class="cnt">${c.t.length} pratiques</span></button>`).join('');
  const ringItems = $$('.ring-item', ringEl);
  const STEP = 360 / CARTA.length;
  let ringCur = 0, rot = 0;
  const select = (i, silent) => {
    ringCur = ((i % CARTA.length) + CARTA.length) % CARTA.length;
    rot += ((((-ringCur * STEP) - rot) % 360) + 540) % 360 - 180;
    ringEl.style.setProperty('--rot', `${rot}deg`);
    ringItems.forEach((el, k) => { el.classList.toggle('on', k === ringCur); el.setAttribute('aria-pressed', k === ringCur); });
    tagsEl.innerHTML = CARTA[ringCur].t.map((t, k) => `<li style="--k:${k}">${t}</li>`).join('');
    if (!silent) sound.play('tick');
  };
  select(0, true);
  $('#ring-prev').addEventListener('click', () => select(ringCur - 1));
  $('#ring-next').addEventListener('click', () => select(ringCur + 1));
  let dragX = null, startRot = 0, moved = false;
  stageEl.addEventListener('pointerdown', e => { dragX = e.clientX; startRot = rot; moved = false; });
  stageEl.addEventListener('pointermove', e => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    if (!moved && Math.abs(dx) > 6) { moved = true; ringEl.classList.add('drag'); try { stageEl.setPointerCapture(e.pointerId); } catch (err) {} }
    if (moved) { rot = startRot + dx * .32; ringEl.style.setProperty('--rot', `${rot}deg`); }
  });
  const endDrag = () => { if (dragX === null) return; dragX = null; if (moved) { ringEl.classList.remove('drag'); select(Math.round(-rot / STEP)); } };
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);
  ringEl.addEventListener('click', e => { if (moved) { moved = false; return; } const b = e.target.closest('.ring-item'); if (b) select(+b.dataset.i); });
  stageEl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') select(ringCur + 1); if (e.key === 'ArrowLeft') select(ringCur - 1); });

  /* ---------- Pestañas de juegos ---------- */
  const gtabs = $$('.game-tabs [role="tab"]');
  gtabs.forEach(t => t.addEventListener('click', () => {
    gtabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).classList.toggle('active', on); });
    if (t.id !== 'tab-obey') game.pause();
    sound.play('tick');
  }));

  /* ---------- Test: ¿Qué clase de esclavo eres? ---------- */
  const TYPES = {
    soumis: ['Soumis dévoué', 'Vous êtes né pour obéir. Il ne vous manquait qu\'une Maîtresse calme et précise pour vous l\'apprendre.'],
    latex: ['Poupée de latex', 'Votre seconde peau est en caoutchouc. Chez moi, vous serez enveloppé, lustré et exposé.'],
    captif: ['Captif consentant', 'Sangles, sac, camisole : vous n\'êtes jamais aussi libre que lorsque vous ne pouvez plus bouger.'],
    patient: ['Patient docile', 'Blouse, gants et instruments. L\'infirmière Eva sait exactement ce dont vous avez besoin.'],
    sissy: ['Sissy en devenir', 'Robe, lingerie et talons. Entre mes mains, votre alter ego va enfin prendre vie.'],
    trait: ['Trait sous contrôle', 'Edging, machines et frustration. Vous jouirez quand Je le déciderai… ou jamais.']
  };
  const QS = [
    ['Vous entrez dans le studio. Que faites-vous en premier ?', [['Je me mets à genoux et j\'attends ses ordres', 'soumis'], ['Je cherche du regard la combinaison de latex', 'latex'], ['Je regarde les sangles et les chaînes', 'captif'], ['Je m\'assois sur la table d\'examen', 'patient']]],
    ['Votre fantasme secret, c\'est…', [['Qu\'elle me maquille et m\'habille en femme', 'sissy'], ['Être relié à l\'une de ses machines', 'trait'], ['Être enfermé dans un sac de caoutchouc', 'captif'], ['Lui obéir sans jamais poser de question', 'soumis']]],
    ['Chez la Maîtresse, ce qui vous obsède, c\'est…', [['Le crissement de son latex', 'latex'], ['Ses gants et ses instruments', 'patient'], ['Sa lingerie… pour la porter', 'sissy'], ['Son calme quand elle vous fait attendre', 'trait']]],
    ['Si vous désobéissez, vous préférez…', [['La camisole, sans discuter', 'captif'], ['Faire le ménage en tenue de soubrette', 'sissy'], ['Une frustration de plusieurs jours', 'trait'], ['Un examen très approfondi', 'patient']]],
    ['Quel cadeau lui feriez-vous ?', [['Une nouvelle tenue en latex', 'latex'], ['Mon obéissance absolue', 'soumis'], ['La clé de ma cage de chasteté', 'trait'], ['Une paire de talons… à ma taille', 'sissy']]],
    ['Où est votre place dans le studio ?', [['À genoux, à ses côtés', 'soumis'], ['Momifié dans un coin', 'captif'], ['Sur la table médicale', 'patient'], ['Sous une couche de caoutchouc', 'latex']]]
  ];
  const quizEl = $('#quiz');
  let qi = 0, qScore = {};
  const dots = n => `<div class="q-dots">${QS.map((_, k) => `<i class="${k < n ? 'done' : ''}"></i>`).join('')}</div>`;
  const qIntro = () => {
    quizEl.innerHTML = `<div class="q-card in q-result"><span class="k">Le test de la Maîtresse · ${QS.length} questions</span><p class="t">Quel soumis êtes-vous ?</p><p>Répondez sincèrement. La Maîtresse sait toujours quand vous mentez.</p><div class="row"><button class="btn btn-red" type="button" data-q="start">Commencer le test</button></div></div>`;
  };
  const qRender = () => {
    if (qi >= QS.length) return qResult();
    const [q, answers] = QS[qi];
    quizEl.innerHTML = `${dots(qi)}<div class="q-card in"><span class="q-num">Question ${qi + 1} sur ${QS.length}</span><p class="q-text">${q}</p><div class="q-answers">${answers.map((a, k) => `<button type="button" data-t="${a[1]}"><b>${'ABCD'[k]}</b>${a[0]}</button>`).join('')}</div></div>`;
  };
  const qResult = () => {
    const top = Object.keys(qScore).sort((a, b) => qScore[b] - qScore[a])[0] || 'soumis';
    const [t, p] = TYPES[top];
    quizEl.innerHTML = `${dots(QS.length)}<div class="q-card in q-result"><span class="k">La Maîtresse a tranché. Vous êtes…</span><p class="t">${t}</p><p>${p}</p><div class="row"><a class="btn btn-red" href="${wa(`Maîtresse, j'ai fait votre test et je suis : ${t}. Puis-je m'adresser à vous ?`)}" target="_blank" rel="noopener">Présentez-vous ainsi</a><button class="btn btn-ghost" type="button" data-q="again">Refaire le test</button></div></div>`;
    sound.play('win');
  };
  quizEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-t]');
    if (b) {
      qScore[b.dataset.t] = (qScore[b.dataset.t] || 0) + 1;
      sound.play('tick');
      const card = $('.q-card', quizEl);
      card.classList.remove('in'); card.classList.add('out');
      $$('button', card).forEach(x => { x.disabled = true; });
      qi++;
      setTimeout(qRender, reduce ? 0 : 400);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) { sound.play(q.dataset.q === 'start' ? 'crack' : 'tick'); qi = 0; qScore = {}; qRender(); }
  });
  qIntro();

  /* ---------- Juego: La Diosa ordena ---------- */
  const game = (() => {
    const ICONS = {
      latigo: ['le fouet', 'Fouet', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 42 9-10"/><path d="m13 35 5 5M15 31l3 3"/><path d="M19 29c5-9 15-14 20-10s0 12-8 11-9-7-3-11c3-2 7-1 8 1"/></svg>'],
      tacon: ['le talon', 'Talon', '<svg viewBox="0 0 114 110" fill="currentColor" aria-hidden="true"><path d="M2 102 C14 94 30 84 44 82 C66 78 92 44 104 8 C110 9 112 15 110 22 C108 52 106 84 105.5 106 L103.5 106 C103.5 84 102.5 54 99 34 C86 50 62 98 38 104 L8 104.6 Q3 104.6 2 102 Z"/></svg>'],
      collar: ['le collier', 'Collier', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="24" cy="18" rx="16" ry="7"/><path d="M8 18v5c0 3.9 7.2 7 16 7s16-3.1 16-7v-5"/><path d="M24 30v3"/><circle cx="24" cy="37.5" r="4.5"/></svg>'],
      esposas: ['les menottes', 'Menottes', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="30" r="9"/><circle cx="34" cy="30" r="9"/><circle cx="14" cy="30" r="4.5"/><circle cx="34" cy="30" r="4.5"/><path d="M19 22.5c2-4.5 8-4.5 10 0"/></svg>']
    };
    const KEYS = Object.keys(ICONS);
    const RANKS = [
      [0, 'Soumis indiscipliné', 'Pas un seul ordre bien exécuté. Il vous faut une main ferme… et j\'en ai une.'],
      [5, 'Soumis à l\'essai', 'Vous avez du potentiel, mais vous vous dispersez encore. Il vous manque du dressage.'],
      [10, 'Soumis obéissant', 'Vous savez écouter et vous taire. Je commence à vous remarquer.'],
      [18, 'Soumis exemplaire', 'Peu arrivent jusqu\'ici. Vous méritez de vous agenouiller dans mon studio.'],
      [26, 'Propriété de Mistress Eva', 'Obéissance absolue. Vous m\'appartenez : présentez-vous à Moi.']
    ];
    const box = $('#game'), pad = $('#g-pad'), orderEl = $('#g-order'), em = $('em', orderEl), strong = $('strong', orderEl);
    const timerEl = $('#g-timer'), over = $('#g-over'), livesEl = $('#g-lives'), scoreEl = $('#g-score'), bestEl = $('#g-best');
    const heart = c => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.9 3.8 4.3 7.3C19.5 16.4 12 21 12 21Z"/></svg>`;
    let order = KEYS.slice(), state = 'idle', score = 0, lives = 3, round = null, raf = 0, timer = 0;
    let best = parseInt(store.get('eva-record'), 10) || 0;
    bestEl.textContent = best;
    const drawPad = () => { pad.innerHTML = order.map((k, i) => `<button type="button" class="g-btn" data-k="${k}">${ICONS[k][2]}${ICONS[k][1]}<kbd>${i + 1}</kbd></button>`).join(''); };
    const drawLives = () => { livesEl.innerHTML = [0, 1, 2].map(i => heart(i < lives ? '' : 'lost')).join(''); livesEl.setAttribute('aria-label', `${lives} vies`); };
    drawPad(); drawLives();
    const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

    function next() {
      if (state !== 'play') return;
      if (score >= 8 && Math.random() < .45) { order.sort(() => Math.random() - .5); drawPad(); }
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      const obey = Math.random() < (score < 3 ? .8 : .68);
      round = { k, obey, t0: performance.now(), dur: Math.max(850, 2400 - score * 70), done: false };
      orderEl.classList.remove('pop'); void orderEl.offsetWidth; orderEl.classList.add('pop');
      em.textContent = obey ? 'Eva ordonne :' : '';
      strong.textContent = `Touchez ${ICONS[k][0]}`;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (state !== 'play' || !round || round.done) return;
      const left = 1 - (now - round.t0) / round.dur;
      timerEl.style.setProperty('--t', Math.max(0, left));
      if (left <= 0) { round.done = true; return round.obey ? fail(null, 'Trop lent.') : win(null); }
      raf = requestAnimationFrame(tick);
    }
    const flash = (btn, cls) => { if (!btn) return; btn.classList.remove('good', 'bad'); void btn.offsetWidth; btn.classList.add(cls); setTimeout(() => btn.classList.remove(cls), 450); };
    function win(btn) { score++; scoreEl.textContent = score; flash(btn, 'good'); sound.play(btn ? 'good' : 'tick'); later(next, 280); }
    function fail(btn, msg) {
      lives--; drawLives(); flash(btn, 'bad'); sound.play('bad');
      box.classList.remove('hurt'); void box.offsetWidth; box.classList.add('hurt');
      if (btn && navigator.vibrate) navigator.vibrate(120);
      em.textContent = 'Punition !'; strong.textContent = msg;
      if (lives <= 0) return later(end, 700);
      later(next, 1000);
    }
    function press(k, btn) {
      if (state !== 'play' || !round || round.done) return;
      round.done = true;
      cancelAnimationFrame(raf);
      if (!round.obey) return fail(btn, 'Je ne l\'ai pas ordonné.');
      if (k !== round.k) return fail(btn, 'Ce n\'est pas ce que j\'ai demandé.');
      win(btn);
    }
    function start() {
      state = 'play'; score = 0; lives = 3; round = null; order = KEYS.slice();
      drawPad(); drawLives(); scoreEl.textContent = 0; over.hidden = true;
      timerEl.style.setProperty('--t', 1);
      em.textContent = ''; strong.textContent = 'Attention…';
      sound.play('crack');
      later(next, 900);
    }
    function end() {
      state = 'over'; cancelAnimationFrame(raf); timerEl.style.setProperty('--t', 0);
      const record = score > best;
      if (record) { best = score; store.set('eva-record', best); bestEl.textContent = best; }
      const [, t, p] = RANKS.filter(r => score >= r[0]).pop();
      over.innerHTML = `<span class="score">${score} ${score === 1 ? 'ordre exécuté' : 'ordres exécutés'}${record ? ' · nouveau record' : ''}</span><p class="t">${t}</p><p>${p}</p><div class="row"><button class="btn btn-red" type="button" data-g="start">Rejouer</button><a class="btn btn-ghost" href="${wa(`Maîtresse, j'ai exécuté ${score} ordres à votre jeu d'obéissance. Mon rang : ${t}. Puis-je m'adresser à vous ?`)}" target="_blank" rel="noopener">Montrez-le à la Maîtresse</a></div>`;
      over.hidden = false;
      sound.play(score >= 10 ? 'win' : 'bad');
    }
    function pause() {
      if (state !== 'play') return;
      state = 'paused'; cancelAnimationFrame(raf); clearTimeout(timer);
      over.innerHTML = `<h3>Pause</h3><p>La Maîtresse vous attend. Ne la faites pas trop attendre.</p><div class="row"><button class="btn btn-red" type="button" data-g="resume">Reprendre</button></div>`;
      over.hidden = false;
    }
    over.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      if (b.dataset.g === 'start') start();
      if (b.dataset.g === 'resume') { over.hidden = true; state = 'play'; later(next, 500); }
    });
    $('#g-start').dataset.g = 'start';
    pad.addEventListener('pointerdown', e => { const b = e.target.closest('.g-btn'); if (b) { e.preventDefault(); press(b.dataset.k, b); } });
    pad.addEventListener('click', e => { if (e.detail !== 0) return; const b = e.target.closest('.g-btn'); if (b) press(b.dataset.k, b); });
    d.addEventListener('keydown', e => {
      if (state !== 'play') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) { e.preventDefault(); const k = order[n - 1]; press(k, $(`[data-k="${k}"]`, pad)); }
    });
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) pause(); }, { threshold: .3 }).observe(box);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    return { pause };
  })();

  /* ---------- Contrato de sumisión ---------- */
  const DESEOS = ['Contrôle total', 'Latex', 'Heavy rubber', 'Bondage', 'Momification', 'Machines de traite', 'Électrostimulation', 'Contrôle de l\'orgasme', 'Chasteté', 'Medical play', 'Féminisation', 'Fessée', 'CBT', 'Trampling', 'Strap-on', 'Privation sensorielle'];
  const chipsEl = $('#c-deseos');
  chipsEl.innerHTML = DESEOS.map(x => `<button type="button" class="chip" aria-pressed="false">${x}</button>`).join('');
  const F = { alias: $('#c-alias'), limites: $('#c-limites'), palabra: $('#c-palabra'), dispo: $('#c-dispo'), adulto: $('#c-adulto') };
  let tipo = 'au studio';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  $('#doc-date').textContent = `Paris, le ${today}`;
  const listEs = arr => arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} et ${arr[arr.length - 1]}`;
  const vals = () => ({
    alias: F.alias.value.trim(),
    deseos: listEs($$('.chip[aria-pressed="true"]', chipsEl).map(b => b.textContent.toLowerCase())),
    limites: F.limites.value.trim(),
    palabra: F.palabra.value.trim(),
    dispo: F.dispo.value.trim()
  });
  const setV = (k, val, fallback) => { const el = $(`.doc .v[data-k="${k}"]`); el.textContent = val || fallback; el.classList.toggle('empty', !val); };
  function updateDoc() {
    const v = vals();
    setV('alias', v.alias, '________');
    setV('tipo', tipo, tipo);
    setV('deseos', v.deseos, 'ce qu\'Elle décidera');
    setV('limites', v.limites, 'celles dont nous parlerons avant de commencer');
    setV('palabra', v.palabra, '________');
    setV('dispo', v.dispo, 'quand la Maîtresse l\'ordonnera');
  }
  const clauses = () => {
    const v = vals();
    return [
      `Je soussigné, ${v.alias}, me soumets à Mistress Eva, de mon plein gré et en étant majeur.`,
      `Je sollicite une séance ${tipo}.`,
      `Je souhaite que la Maîtresse dispose de moi pour : ${v.deseos || 'ce qu\'Elle décidera'}.`,
      `Mes limites sont : ${v.limites || 'celles dont nous parlerons avant de commencer'}. La Maîtresse les respectera toujours.`,
      `Mon safe word est « ${v.palabra} ». Dès que je le prononce, tout s'arrête.`,
      `Je suis disponible : ${v.dispo || 'quand la Maîtresse l\'ordonnera'}.`,
      'J\'accepte d\'obéir, de respecter ses règles et de lui rendre le tribut qu\'Elle fixera.'
    ];
  };
  $('#c-tipo').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#c-tipo button').forEach(x => x.setAttribute('aria-pressed', x === b));
    tipo = b.dataset.v; sound.play('tick'); updateDoc();
  });
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
    sound.play('tick'); updateDoc();
  });
  [F.alias, F.limites, F.palabra, F.dispo].forEach(el => el.addEventListener('input', updateDoc));
  $('#c-form').addEventListener('submit', e => e.preventDefault());

  // Firma con el dedo o el ratón
  const sigBox = $('#sig'), sigC = $('#sig-canvas'), sctx = sigC.getContext('2d');
  let drawing = false, signed = false, last = null;
  const sigStyle = () => { sctx.lineCap = 'round'; sctx.lineJoin = 'round'; sctx.strokeStyle = '#f5eeeb'; sctx.fillStyle = '#f5eeeb'; sctx.lineWidth = 2.4; };
  function sizeSig() {
    const r = sigC.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width) return;
    const prev = signed ? sigC.toDataURL() : null;
    sigC.width = Math.round(r.width * dpr); sigC.height = Math.round(r.height * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sigStyle();
    if (prev) { const im = new Image(); im.onload = () => sctx.drawImage(im, 0, 0, r.width, r.height); im.src = prev; }
  }
  sizeSig();
  addEventListener('resize', sizeSig);
  const pt = e => { const r = sigC.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  sigC.addEventListener('pointerdown', e => {
    e.preventDefault(); drawing = true; last = pt(e);
    try { sigC.setPointerCapture(e.pointerId); } catch (err) {}
    sctx.beginPath(); sctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); sctx.fill();
  });
  sigC.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pt(e);
    sctx.beginPath(); sctx.moveTo(last.x, last.y); sctx.lineTo(p.x, p.y); sctx.stroke();
    last = p;
  });
  const showSig = () => { $('#doc-sig').innerHTML = signed ? `<img src="${sigC.toDataURL('image/png')}" alt="Signature du soumis">` : ''; };
  const endSig = () => { if (!drawing) return; drawing = false; signed = true; sigBox.classList.add('signed'); showSig(); };
  sigC.addEventListener('pointerup', endSig);
  sigC.addEventListener('pointercancel', endSig);
  $('#sig-clear').addEventListener('click', () => { sctx.clearRect(0, 0, sigC.width, sigC.height); signed = false; sigBox.classList.remove('signed'); showSig(); });

  const err = $('#c-error');
  const validate = () => {
    if (!F.alias.value.trim()) return 'Dites-moi comment vous souhaitez être appelé.';
    if (!F.palabra.value.trim()) return 'Il vous faut un safe word.';
    if (!signed) return 'Votre signature manque.';
    if (!F.adulto.checked) return 'Vous devez déclarer être majeur.';
    return '';
  };
  const check = () => { const m = validate(); err.textContent = m; if (m) { sound.play('bad'); err.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } return !m; };
  $('#c-send').addEventListener('click', () => {
    if (!check()) return;
    sound.play('crack');
    const text = ['CONTRAT DE SOUMISSION · Studio de Mistress Eva', ...clauses().map((c, i) => `${ROMAN[i]}. ${c}`), `Signé à Paris, le ${today}.`, 'Puis-je m\'adresser à vous ?'].join('\n');
    window.open(wa(text), '_blank', 'noopener');
    toast('Téléchargez aussi le contrat signé et envoyez-le-lui en image.');
  });
  const wrap = (g, text, x, y, maxW, lh) => {
    let line = '';
    text.split(' ').forEach(w => {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
    });
    g.fillText(line, x, y);
    return y + lh;
  };
  $('#c-download').addEventListener('click', () => {
    if (!check()) return;
    const W = 1080, H = 1500, c = d.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#170b0e'); bg.addColorStop(1, '#080506');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, 720); rg.addColorStop(0, 'rgba(110,5,19,.5)'); rg.addColorStop(1, 'rgba(110,5,19,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,46,74,.5)'; g.lineWidth = 2; g.strokeRect(30, 30, W - 60, H - 60);
    g.strokeStyle = 'rgba(217,211,213,.16)'; g.lineWidth = 1; g.strokeRect(48, 48, W - 96, H - 96);
    const heel = new Path2D('M2 102 C14 94 30 84 44 82 C66 78 92 44 104 8 C110 9 112 15 110 22 C108 52 106 84 105.5 106 L103.5 106 C103.5 84 102.5 54 99 34 C86 50 62 98 38 104 L8 104.6 Q3 104.6 2 102 Z');
    g.save(); g.translate(W / 2 - 57, 96); g.shadowColor = 'rgba(227,18,45,.8)'; g.shadowBlur = 34; g.fillStyle = '#e3122d'; g.fill(heel); g.restore();
    g.textAlign = 'center'; g.fillStyle = '#f5eeeb'; g.font = '700 52px "Cinzel Decorative", serif';
    g.fillText('Contrat de soumission', W / 2, 286);
    g.fillStyle = '#a3969a'; g.font = '600 19px Manrope, sans-serif';
    g.fillText('STUDIO DE MISTRESS EVA  ·  PARIS', W / 2, 330);
    g.textAlign = 'left';
    let y = 420;
    clauses().forEach((txt, i) => {
      g.fillStyle = '#ff2e4a'; g.font = '700 24px "Cinzel Decorative", serif'; g.fillText(`${ROMAN[i]}.`, 96, y);
      g.fillStyle = '#e4dcdc'; g.font = '30px "Bodoni Moda", serif';
      y = wrap(g, txt, 170, y, W - 270, 42) + 20;
    });
    const sy = Math.max(y + 170, H - 300);
    g.strokeStyle = '#4a2329'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(110, sy); g.lineTo(500, sy); g.moveTo(W - 500, sy); g.lineTo(W - 110, sy); g.stroke();
    if (signed) {
      const ratio = sigC.width / sigC.height, bw = 390, bh = Math.min(150, bw / ratio);
      g.drawImage(sigC, 110 + (390 - bh * ratio) / 2, sy - bh - 6, bh * ratio, bh);
    }
    g.textAlign = 'center'; g.fillStyle = '#ff2e4a'; g.font = '700 56px "Cinzel Decorative", serif';
    g.fillText('Eva', W - 305, sy - 22);
    g.fillStyle = '#a3969a'; g.font = '600 17px Manrope, sans-serif';
    g.fillText('SIGNATURE DU SOUMIS', 305, sy + 36); g.fillText('LA MAÎTRESSE', W - 305, sy + 36);
    g.fillText(`Paris, le ${today}`, W / 2, H - 96);
    c.toBlob(b => {
      if (!b) return;
      const a = d.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'contrat-de-soumission-eva.png';
      d.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      sound.play('win');
      toast('Contrat téléchargé. Envoyez-le à la Maîtresse par WhatsApp.');
    }, 'image/png');
  });
  updateDoc();

  /* ---------- Tributo ---------- */
  const amountsEl = $('#amounts'), other = $('#amount-other'), tbtn = $('#tribute-btn'), tamt = $('#tribute-amount');
  const setAmount = v => { tamt.textContent = v; tbtn.href = wa(`Maîtresse, je souhaite vous offrir un tribut de ${v} €. Comment désirez-vous le recevoir ?`); };
  amountsEl.addEventListener('click', e => {
    const b = e.target.closest('.amount'); if (!b) return;
    $$('.amount', amountsEl).forEach(x => x.setAttribute('aria-pressed', x === b));
    other.value = ''; setAmount(b.dataset.v); sound.play('tick');
  });
  other.addEventListener('input', () => {
    const v = parseInt(other.value.replace(/\D/g, ''), 10);
    other.value = Number.isNaN(v) ? '' : v;
    if (v > 0) { $$('.amount', amountsEl).forEach(x => x.setAttribute('aria-pressed', 'false')); setAmount(v); }
  });
  tbtn.addEventListener('click', () => sound.play('crack'));
  setAmount(50);

  /* ---------- Visor de fotos ---------- */
  const shots = $$('.g-item img');
  const lbImg = $('img', lb), lbCount = $('.count', lb);
  let cur = 0, lastFocus = null;
  const show = i => {
    cur = (i + shots.length) % shots.length;
    lbImg.src = shots[cur].currentSrc || shots[cur].src; lbImg.alt = shots[cur].alt;
    lbCount.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
  };
  const openLb = i => { lastFocus = d.activeElement; show(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); syncLock(); $('.x', lb).focus(); };
  const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); syncLock(); if (lastFocus) lastFocus.focus({ preventScroll: true }); };
  shots.forEach((img, i) => img.parentElement.addEventListener('click', () => openLb(i)));
  $('.x', lb).addEventListener('click', closeLb);
  $('.prev', lb).addEventListener('click', () => show(cur - 1));
  $('.next', lb).addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });

  /* ---------- Textos legales (también con #aviso-legal, #privacidad, #cookies, #condiciones o #mayores-de-edad) ---------- */
  let closeLegal = () => {};
  if (legal) {
    const legalBody = $('.body', legal), ltabs = $$('.ltab', legal), docs = ltabs.map(t => t.dataset.doc);
    let legalFrom = null;
    const showDoc = id => {
      if (!docs.includes(id)) id = docs[0];
      ltabs.forEach(t => { const on = t.dataset.doc === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#doc-' + t.dataset.doc).classList.toggle('active', on); });
      legalBody.scrollTop = 0;
    };
    const openLegal = id => {
      if (!legal.classList.contains('open')) legalFrom = d.activeElement;
      showDoc(id); legal.classList.add('open'); legal.setAttribute('aria-hidden', 'false'); syncLock();
      $('.top button', legal).focus();
    };
    closeLegal = () => {
      legal.classList.remove('open'); legal.setAttribute('aria-hidden', 'true'); syncLock();
      if (docs.includes(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
      if (legalFrom) legalFrom.focus({ preventScroll: true });
    };
    $$('[data-legal]').forEach(b => b.addEventListener('click', () => openLegal(b.dataset.legal)));
    ltabs.forEach((t, i) => {
      t.addEventListener('click', () => showDoc(t.dataset.doc));
      t.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        const n = ltabs[(i + k + ltabs.length) % ltabs.length];
        showDoc(n.dataset.doc); n.focus();
      });
    });
    $('.top button', legal).addEventListener('click', closeLegal);
    legal.addEventListener('click', e => { if (e.target === legal) closeLegal(); });
    if (docs.includes(location.hash.slice(1))) openLegal(location.hash.slice(1));
  }

  d.addEventListener('keydown', e => {
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    } else if (e.key === 'Escape') {
      if (legal && legal.classList.contains('open')) closeLegal();
      else if (nav.classList.contains('open')) setMenu(false);
    }
  });

  $('#year').textContent = new Date().getFullYear();
  onScroll();
})();
