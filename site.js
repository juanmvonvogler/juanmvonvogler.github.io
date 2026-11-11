(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const root = document.documentElement;
  const nav = document.querySelector('nav');
  root.classList.add('js');

  // If anything below throws, drop the js class so no content is left dimmed or hidden.
  try {

  // Reveals first, so content can never be stranded by a later error.
  // Headline reveal
  const rise = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.intersectionRatio >= 0.4 || e.intersectionRect.height >= window.innerHeight * 0.4) { e.target.classList.add('in'); rise.unobserve(e.target); }
    });
  }, { threshold: [0, 0.1, 0.2, 0.3, 0.4] });
  document.querySelectorAll('.rise').forEach(el => rise.observe(el));

  // Side swoosh: plays when a block enters, and re-arms only once it has left the screen through the bottom.
  const swooshEls = document.querySelectorAll('.swoosh-l, .swoosh-r');
  const swoosh = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  const rearm = new IntersectionObserver(entries => {
    entries.forEach(e => { if (!e.isIntersecting && e.boundingClientRect.top > 0) e.target.classList.remove('in'); });
  }, { threshold: 0 });
  swooshEls.forEach(el => { swoosh.observe(el); rearm.observe(el); });

  // Grids arrive card by card: each row sweeps left to right, 80ms apart, at most four steps.
  const stagger = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const k = e.target, d = (Number(k.dataset.i) || 0) * 80;
      k.style.transitionDelay = d + 'ms';
      k.classList.add('in');
      stagger.unobserve(k);
      setTimeout(() => { k.style.transitionDelay = ''; }, d + 700);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const grids = Array.from(document.querySelectorAll('[data-stagger]'));
  const orderGrids = () => grids.forEach(g => {
    const rows = new Map();
    Array.from(g.children).forEach(k => { const t = k.offsetTop; if (!rows.has(t)) rows.set(t, []); rows.get(t).push(k); });
    rows.forEach(r => r.sort((a, b) => a.offsetLeft - b.offsetLeft).forEach((k, i) => { k.dataset.i = Math.min(i, 3); }));
  });
  grids.forEach(g => Array.from(g.children).forEach(k => { k.classList.add('rise-item'); stagger.observe(k); }));
  orderGrids();

  // Theme: light by default; dark only when the visitor turns it on.
  const themeBtn = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let dark = false;
  let redrawSphere = () => {};
  function syncTheme() {
    dark = root.dataset.theme === 'dark';
    themeBtn.querySelector('.icon-moon').toggleAttribute('hidden', dark);
    themeBtn.querySelector('.icon-sun').toggleAttribute('hidden', !dark);
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#000000' : '#ffffff');
  }
  themeBtn.addEventListener('click', () => {
    const apply = () => {
      root.classList.add('theme-switching');
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      syncTheme();
      redrawSphere();
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    };
    if (document.startViewTransition && !reduce) document.startViewTransition(apply); else apply();
  });
  syncTheme();

  // Hero sphere: nodes on a Fibonacci sphere, linked to near neighbours, turning slowly.
  // Packets hop along the links and the route they took stays lit, then fades. Hover "Bring me a problem"
  // and every packet routes to the node nearest the button.
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const N = 110, TH = 0.5, FOV = 3.2, BANDS = 8;
    const nodes = [], edges = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i;
      nodes.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
    }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < TH) edges.push([i, j, d]);
    }
    const links = nodes.map(() => []);
    edges.forEach(([a, b], e) => { links[a].push([b, e]); links[b].push([a, e]); });
    const edgeOf = (a, b) => { const l = links[a].find(([to]) => to === b); return l ? l[1] : -1; };
    const heat = new Float32Array(edges.length), ping = new Float32Array(N);
    const px = new Float32Array(N), py = new Float32Array(N), pd = new Float32Array(N);

    // Breadth-first route between two nodes (110 nodes, well under a millisecond).
    const route = (src, dst) => {
      if (src === dst) return [src];
      const prev = new Int16Array(N).fill(-1); prev[src] = src;
      const q = [src];
      for (let qi = 0; qi < q.length; qi++) {
        const u = q[qi];
        for (const [v] of links[u]) if (prev[v] < 0) { prev[v] = u; if (v === dst) { const path = [v]; let w = v; while (w !== src) { w = prev[w]; path.push(w); } return path.reverse(); } q.push(v); }
      }
      return [src];
    };

    let W = 0, H = 0, R = 0, ang = 0, tx = 0, ty = 0, mx = 0, my = 0;
    let quiet = [], ctaPoint = null, converge = false;

    // The text the visitor reads: packets, pings and lit routes go quiet over it.
    const measureQuiet = () => {
      const cr = canvas.getBoundingClientRect();
      const boxes = [];
      const textBoxes = el => {
        const range = document.createRange(); range.selectNodeContents(el);
        Array.from(range.getClientRects()).forEach(r => boxes.push([r.left - cr.left - 12, r.top - cr.top - 10, r.right - cr.left + 12, r.bottom - cr.top + 10]));
      };
      document.querySelectorAll('.hero-sub, .hero-meta').forEach(textBoxes);
      document.querySelectorAll('.hero-cta > a').forEach(a => { const r = a.getBoundingClientRect(); boxes.push([r.left - cr.left - 12, r.top - cr.top - 10, r.right - cr.left + 12, r.bottom - cr.top + 10]); });
      quiet = boxes;
      const pill = document.querySelector('.hero-cta .pill');
      if (pill) { const r = pill.getBoundingClientRect(); ctaPoint = [r.right - cr.left, (r.top + r.bottom) / 2 - cr.top]; }
    };
    const hush = (x, y) => { for (const q of quiet) if (x > q[0] && x < q[2] && y > q[1] && y < q[3]) return 0.12; return 1; };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.4;
      measureQuiet();
    };
    const project = (ry, rx) => {
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      for (let i = 0; i < N; i++) {
        const p = nodes[i];
        const x1 = p.x * cy - p.z * sy, z1 = p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
        const s = FOV / (FOV - z2);
        px[i] = W / 2 + x1 * R * s; py[i] = H / 2 + y2 * R * s; pd[i] = (z2 + 1) / 2;
      }
    };
    // The front node nearest the button, outside the text, is where routes converge.
    const ctaTarget = () => {
      if (!ctaPoint) return -1;
      let best = -1, bd = Infinity;
      for (let i = 0; i < N; i++) {
        if (pd[i] < 0.55 || hush(px[i], py[i]) < 1) continue;
        const d = Math.hypot(px[i] - ctaPoint[0], py[i] - ctaPoint[1]);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    const wander = (pk, from) => {
      const opts = links[from].filter(([to]) => to !== pk.from);
      const [to, e] = opts[Math.floor(Math.random() * opts.length)] || links[from][0];
      pk.from = from; pk.to = to; pk.e = e; pk.t = 0;
    };
    const next = (pk, at) => {
      if (converge) {
        const target = ctaTarget();
        if (target >= 0 && target !== at) {
          if (!pk.path || pk.path[pk.path.length - 1] !== target) {
            pk.path = route(at, target);
            for (let i = 1; i < pk.path.length; i++) { const e = edgeOf(pk.path[i - 1], pk.path[i]); if (e >= 0) heat[e] = Math.max(heat[e], 0.18); }
          }
          const i = pk.path.indexOf(at);
          if (i >= 0 && i < pk.path.length - 1) { const to = pk.path[i + 1]; pk.from = at; pk.to = to; pk.e = edgeOf(at, to); pk.t = 0; return; }
        }
        pk.path = null;
      }
      wander(pk, at);
    };
    const packets = [0, 40, 80].map(n => { const pk = { from: -1 }; wander(pk, n); return pk; });

    const drawMesh = () => {
      const ink = dark ? 'rgba(111,195,163,' : 'rgba(31,92,73,';
      // Links and nodes in depth bands: one stroke or fill per band instead of one per element.
      const eb = Array.from({ length: BANDS }, () => []);
      for (const [a, b] of edges) eb[Math.min(BANDS - 1, Math.floor(((pd[a] + pd[b]) / 2) * BANDS))].push(a, b);
      for (let k = 0; k < BANDS; k++) {
        if (!eb[k].length) continue;
        const dep = (k + 0.5) / BANDS;
        ctx.strokeStyle = ink + ((0.04 + dep * 0.24) * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 0.5 + dep * 0.6;
        ctx.beginPath();
        for (let i = 0; i < eb[k].length; i += 2) { const a = eb[k][i], b = eb[k][i + 1]; ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]); }
        ctx.stroke();
      }
      const nb = Array.from({ length: BANDS }, () => []);
      for (let i = 0; i < N; i++) nb[Math.min(BANDS - 1, Math.floor(pd[i] * BANDS))].push(i);
      for (let k = 0; k < BANDS; k++) {
        if (!nb[k].length) continue;
        const dep = (k + 0.5) / BANDS, rad = 1 + dep * 2.4;
        ctx.fillStyle = ink + (0.18 + dep * 0.55).toFixed(3) + ')';
        ctx.beginPath();
        for (const i of nb[k]) { ctx.moveTo(px[i] + rad, py[i]); ctx.arc(px[i], py[i], rad, 0, Math.PI * 2); }
        ctx.fill();
      }
      return ink;
    };

    const frame = dt => {
      if (!W) resize();
      ctx.clearRect(0, 0, W, H);
      const k = 1 - Math.pow(0.95, dt);
      tx += (mx - tx) * k; ty += (my - ty) * k;
      project(ang + tx, 0.18 + ty);
      const ink = drawMesh();
      if (reduce) return;
      const heatDecay = Math.pow(0.975, dt), pingDecay = Math.pow(0.95, dt);
      ctx.lineWidth = 1.4;
      for (let e = 0; e < edges.length; e++) {
        if (heat[e] < 0.01) continue;
        const [a, b] = edges[e];
        ctx.strokeStyle = ink + (heat[e] * (0.25 + (pd[a] + pd[b]) * 0.3) * hush((px[a] + px[b]) / 2, (py[a] + py[b]) / 2)).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]); ctx.stroke();
        heat[e] *= heatDecay;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        if (ping[i] < 0.02) continue;
        ctx.beginPath();
        ctx.arc(px[i], py[i], 3 + (1 - ping[i]) * 13, 0, Math.PI * 2);
        ctx.strokeStyle = ink + (ping[i] * 0.5 * hush(px[i], py[i])).toFixed(3) + ')';
        ctx.stroke();
        ping[i] *= pingDecay;
      }
      const speed = converge ? 0.04 : 0.024;
      for (const pk of packets) {
        const a = pk.from, b = pk.to;
        const u = pk.t * pk.t * (3 - 2 * pk.t);
        const x = px[a] + (px[b] - px[a]) * u, y = py[a] + (py[b] - py[a]) * u;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + (pd[a] + pd[b]) * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = ink + ((0.45 + (pd[a] + pd[b]) * 0.275) * hush(x, y)).toFixed(3) + ')';
        ctx.fill();
        if (pk.e >= 0) heat[pk.e] = Math.max(heat[pk.e], u);
        pk.t += speed * dt;
        if (pk.t >= 1) { if (hush(px[b], py[b]) === 1) ping[b] = 1; next(pk, b); }
      }
      ang += 0.0018 * dt;
    };
    redrawSphere = () => { if (reduce || paused) frame(1); };

    // Run on real time, and only while the hero is on screen and the tab is visible.
    let raf = 0, last = 0, onScreen = true, paused = false;
    const loop = now => { const dt = Math.min(3, last ? (now - last) / 16.667 : 1); last = now; frame(dt); raf = requestAnimationFrame(loop); };
    const run = () => { cancelAnimationFrame(raf); raf = 0; last = 0; if (onScreen && !reduce && !paused && !document.hidden) raf = requestAnimationFrame(loop); };
    const mt = document.querySelector('.motion-toggle');
    if (mt) mt.addEventListener('click', () => { paused = !paused; mt.textContent = paused ? 'Play motion' : 'Pause motion'; run(); });
    const home = document.getElementById('home');
    if (window.IntersectionObserver) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(home);
    document.addEventListener('visibilitychange', run);
    if (!reduce) {
      home.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
        my = (e.clientY / window.innerHeight - 0.5) * 0.3;
      }, { passive: true });
      home.addEventListener('pointerleave', () => { mx = 0; my = 0; });
      const pill = document.querySelector('.hero-cta .pill');
      if (pill) {
        const on = () => { converge = true; packets.forEach(pk => { pk.path = null; }); };
        const off = () => { converge = false; packets.forEach(pk => { pk.path = null; }); };
        pill.addEventListener('pointerenter', on); pill.addEventListener('pointerleave', off);
        pill.addEventListener('focus', on); pill.addEventListener('blur', off);
      }
    }
    if (window.ResizeObserver) new ResizeObserver(() => { resize(); if (reduce || paused) frame(1); }).observe(canvas);
    window.addEventListener('resize', measureQuiet, { passive: true });
    resize(); frame(1); run();
    requestAnimationFrame(() => canvas.classList.add('on'));
  }

  // Buttons: a hairline that traces the edge on hover. Its size is set here so every browser draws it.
  const sizeTrace = b => { const r = b.querySelector('.trace rect'); if (r) { r.setAttribute('width', Math.max(0, b.offsetWidth - 7)); r.setAttribute('height', Math.max(0, b.offsetHeight - 7)); } };
  const traceRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => sizeTrace(e.target))) : null;
  document.querySelectorAll('.pill').forEach(b => {
    b.insertAdjacentHTML('beforeend', '<svg class="trace" aria-hidden="true"><rect x="3.5" y="3.5" rx="8.5" pathLength="1" /></svg>');
    sizeTrace(b);
    if (traceRO) traceRO.observe(b);
  });

  // Statement: split into words (keeping links intact), then light them in reading order.
  const mindset = document.querySelector('.mindset-body');
  let words = [], lit = 0;
  if (mindset) {
    const walker = document.createTreeWalker(mindset, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(node => {
      if (!node.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        frag.appendChild(w);
      });
      node.replaceWith(frag);
    });
    words = Array.from(mindset.querySelectorAll('.w'));
    if (reduce) words.forEach(w => w.classList.add('lit'));
  }
  // Fully lit by the time the statement's foot reaches two thirds of the way down the screen.
  function lightWords(vh, r) {
    const prog = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.25));
    const n = Math.round(prog * words.length);
    if (n === lit) return;
    const lo = Math.min(n, lit), hi = Math.max(n, lit);
    for (let i = lo; i < hi; i++) words[i].classList.toggle('lit', i < n);
    lit = n;
  }

  // Credentials: background goes white to black on the way in.
  const certs = document.getElementById('certifications');
  const navH = nav.offsetHeight;
  function night(vh, r) {
    const n = clamp((vh - r.top) / (vh * 0.6));
    certs.style.setProperty('--n', n.toFixed(3));
    const tail = r.bottom > 0 && r.bottom <= navH + 1;
    nav.classList.toggle('dark', n > 0.5 && r.top < navH && r.bottom > navH + 1);
    nav.classList.toggle('solid', tail);
  }

  // Track record roadmap: the track fills toward the reading line, a packet rides the tip of the fill,
  // and each stop lights up (and pings once) as the fill reaches it.
  const road = document.querySelector('.roadmap-wrap');
  const stops = road ? Array.from(road.querySelectorAll('.stop')) : [];
  const tip = road ? road.querySelector('.road-tip') : null;
  let end = 0, stopTops = [];
  const measureRoad = () => {
    if (!road || !stops.length) return;
    end = stops[stops.length - 1].offsetTop + 12;
    stopTops = stops.map(s => s.offsetTop);
    road.style.setProperty('--end', end + 'px');
  };
  function roadmap(vh, r) {
    const line = vh * 0.55;
    const p = reduce ? 1 : clamp((line - r.top - 12) / (end - 12));
    road.style.setProperty('--p', p.toFixed(3));
    if (tip) {
      tip.style.transform = 'translateY(' + (p * (end - 12)).toFixed(1) + 'px)';
      tip.style.opacity = !reduce && p > 0.01 && p < 0.99 ? '1' : '0';
    }
    stops.forEach((s, i) => {
      const on = reduce || r.top + stopTops[i] < line;
      if (on && !s.classList.contains('reached')) s.classList.add('pinged');
      s.classList.toggle('reached', on);
    });
  }

  // One pass per frame: every measurement first, then every write.
  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const mr = mindset && !reduce ? mindset.getBoundingClientRect() : null;
    const cr = certs ? certs.getBoundingClientRect() : null;
    const rr = road && stops.length ? road.getBoundingClientRect() : null;
    if (mr) lightWords(vh, mr);
    if (cr) night(vh, cr);
    if (rr) roadmap(vh, rr);
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measureRoad(); orderGrids(); onScroll(); }, { passive: true });
  if (road && window.ResizeObserver) new ResizeObserver(() => { measureRoad(); onScroll(); }).observe(road);
  measureRoad();
  update();

  // Pop-ups: hover opens them on desktop; a tap on the card, or the button inside it, toggles them anywhere.
  document.querySelectorAll('.has-peek').forEach(host => {
    const btn = host.querySelector('.peek-hint');
    const set = open => { host.classList.toggle('open', open); if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    host.addEventListener('click', e => { if (e.target.closest('a')) return; const open = !host.classList.contains('open'); set(open); host.classList.toggle('peek-off', !open && host.matches(':hover')); });
    host.addEventListener('mouseleave', () => { set(false); host.classList.remove('peek-off', 'peek-armed'); });
  });
  let pmx = -1, pmy = -1;
  document.addEventListener('mousemove', e => { if (e.clientX === pmx && e.clientY === pmy) return; pmx = e.clientX; pmy = e.clientY; const h = e.target.closest && e.target.closest('.has-peek'); if (h) h.classList.add('peek-armed'); }, { passive: true });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.has-peek').forEach(h => {
      if (h.matches(':hover')) h.classList.add('peek-off');
      if (h.classList.contains('open')) { h.classList.remove('open'); const b = h.querySelector('.peek-hint'); if (b) { b.setAttribute('aria-expanded', 'false'); if (h.contains(document.activeElement)) b.focus(); } }
    });
  });

  // Capabilities index: pick a capability, see the proof; on a phone each one opens in place.
  const caps = document.querySelector('[data-caps]');
  if (caps) {
    const items = Array.from(caps.querySelectorAll('.cap'));
    const wide = window.matchMedia('(min-width: 901px)');
    const select = (item, toggle) => {
      const name = item.querySelector('.cap-name'), top = name.getBoundingClientRect().top;
      const open = toggle && !wide.matches ? !item.classList.contains('is-active') : true;
      items.forEach(i => {
        const on = i === item && open;
        i.classList.toggle('is-active', on);
        i.querySelector('.cap-name').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      if (!wide.matches) { const shift = name.getBoundingClientRect().top - top; if (shift) window.scrollBy({ top: shift, behavior: 'instant' }); }
    };
    // A hover pick needs real movement and must not fire while the pointer heads right toward the panel.
    let pointerX = 0, moves = 0;
    caps.addEventListener('mousemove', e => { pointerX = e.clientX; moves++; }, { passive: true });
    items.forEach((item, i) => {
      const btn = item.querySelector('.cap-name');
      let dwell;
      btn.addEventListener('click', () => select(item, true));
      btn.addEventListener('mouseenter', e => { if (!wide.matches) return; clearTimeout(dwell); const x0 = e.clientX, m0 = moves; dwell = setTimeout(() => { if (moves > m0 && pointerX - x0 < 8) select(item); }, 120); });
      btn.addEventListener('mouseleave', () => clearTimeout(dwell));
      btn.addEventListener('keydown', e => {
        const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        const nextItem = items[(to + items.length) % items.length];
        nextItem.querySelector('.cap-name').focus();
        if (wide.matches) select(nextItem);
      });
    });
    const keepOne = () => { if (wide.matches && !caps.querySelector('.cap.is-active')) select(items[0]); };
    if (wide.addEventListener) wide.addEventListener('change', keepOne); else if (wide.addListener) wide.addListener(keepOne);
    // "Bring me a problem like this" starts the message with the chosen topic.
    caps.querySelectorAll('[data-topic]').forEach(a => a.addEventListener('click', e => {
      const msg = document.getElementById('cf-message');
      const card = document.querySelector('.form-card');
      if (card && !wide.matches) { e.preventDefault(); card.scrollIntoView({ block: 'start' }); const t = card.querySelector('.form-title'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }
      if (msg) { const line = 'Topic: ' + a.dataset.topic; if (!msg.value.trim()) msg.value = line + '\n\n'; else if (/^Topic: [^\n]*/.test(msg.value)) msg.value = msg.value.replace(/^Topic: [^\n]*/, () => line); }
    }));
  }

  // Diagram viewer: shows the preview at once, swaps in the full image when it arrives, zooms in steps.
  const viewer = document.getElementById('diagram-viewer');
  if (viewer) {
    const img = viewer.querySelector('.viewer-stage img');
    const stage = viewer.querySelector('.viewer-stage');
    const label = viewer.querySelector('.viewer-zoom');
    const zin = viewer.querySelector('[data-zoom="1"]'), zout = viewer.querySelector('[data-zoom="-1"]');
    const closeBtn = viewer.querySelector('[data-close]');
    const preview = document.querySelector('.topology-open img');
    const steps = [1, 1.5, 2, 3, 4];
    let z = 0, opener = null;
    const setZoom = i => {
      z = Math.max(0, Math.min(steps.length - 1, i));
      img.style.width = (steps[z] * 100) + '%';
      label.textContent = Math.round(steps[z] * 100) + '%';
      if (zout) zout.setAttribute('aria-disabled', z === 0 ? 'true' : 'false');
      if (zin) zin.setAttribute('aria-disabled', z === steps.length - 1 ? 'true' : 'false');
    };
    document.querySelectorAll('[data-open-diagram]').forEach(b => b.addEventListener('click', () => {
      if (typeof viewer.showModal !== 'function') { window.open(img.dataset.src, '_blank', 'noopener'); return; }
      opener = b;
      if (!img.getAttribute('src')) {
        if (preview) img.src = preview.currentSrc || preview.src;
        const full = new Image();
        full.onload = () => { img.src = full.src; };
        full.src = img.dataset.src;
      }
      const narrow = window.innerWidth < 700;
      setZoom(narrow ? 3 : 0);
      viewer.showModal();
      requestAnimationFrame(() => {
        if (narrow) { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * 0.4; stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 3; }
        if (closeBtn) closeBtn.focus();
      });
    }));
    viewer.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => setZoom(z + Number(b.dataset.zoom))));
    closeBtn.addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { if (opener) opener.focus(); });
  }

  // Active nav tab: scroll spy on the home page, fixed on detail pages.
  const links = document.querySelectorAll('.nav-links a');
  const page = document.body.dataset.page;
  const setActive = tab => links.forEach(l => {
    const on = l.dataset.tab === tab;
    l.classList.toggle('active', on);
    if (on) l.setAttribute('aria-current', page ? 'page' : 'location'); else l.removeAttribute('aria-current');
  });
  let spyPaused = false, spyTimer = 0;
  if (page) {
    setActive(page);
  } else {
    const spy = new IntersectionObserver(entries => {
      if (spyPaused) return;
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
  }
  // An in-page jump lands on a settled section: reveal it now, and hold the spy until the scroll ends.
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    const id = a.getAttribute('href').slice(1);
    const t = id && document.getElementById(id);
    if (!t) return;
    t.querySelectorAll('.rise, .swoosh-l, .swoosh-r, .rise-item').forEach(el => el.classList.add('in'));
    if (page) return;
    spyPaused = true;
    setActive(id);
    clearTimeout(spyTimer);
    const resume = () => { spyPaused = false; };
    if ('onscrollend' in window) window.addEventListener('scrollend', resume, { once: true });
    spyTimer = setTimeout(resume, 1500);
  }));

  // Mobile nav: closes on a link, a tap outside, Escape, or a real scroll of the page behind it.
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-links');
  let openedAt = 0;
  const setOpen = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { openedAt = window.scrollY; const first = menu.querySelector('a'); if (first) requestAnimationFrame(() => first.focus({ preventScroll: true })); }
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); toggle.focus(); } });
  document.addEventListener('click', e => { if (menu.classList.contains('open') && !e.target.closest('nav')) setOpen(false); });
  window.addEventListener('scroll', () => { if (menu.classList.contains('open') && Math.abs(window.scrollY - openedAt) > 48) setOpen(false); }, { passive: true });

  // Contact form (Formspree). A failed send says so in place and keeps what was typed.
  const form = document.getElementById('contact-form');
  if (form) {
    const btn = document.getElementById('submit-btn');
    const success = document.getElementById('form-success');
    const error = document.getElementById('form-error');
    const label = btn.querySelector('.btn-label');
    const idle = label ? label.textContent : '';
    let sending = false;
    const busy = on => {
      sending = on;
      btn.classList.toggle('loading', on);
      btn.setAttribute('aria-disabled', on ? 'true' : 'false');
      if (label) label.textContent = on ? 'Sending' : idle;
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      if (error) error.hidden = true;
      busy(true);
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data && data.errors ? data.errors.map(x => x.message).join(' ') : '');
        }
        form.reset();
        form.inert = true;
        busy(false);
        success.classList.add('show');
        const title = success.querySelector('.success-title'), check = success.querySelector('.success-check');
        if (check) check.scrollIntoView({ block: 'nearest' });
        if (title) title.focus({ preventScroll: true });
      } catch (err) {
        busy(false);
        if (error) { error.hidden = false; error.scrollIntoView({ block: 'nearest' }); }
      }
    });
  }

  } catch (err) {
    root.classList.remove('js');
    throw err;
  }
})();
