(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const root = document.documentElement;
  const nav = document.querySelector('nav');
  root.classList.add('js');

  // Theme: light by default; dark only when the visitor turns it on.
  const themeBtn = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let dark = false;
  function syncTheme() {
    dark = root.dataset.theme === 'dark';
    themeBtn.querySelector('.icon-moon').toggleAttribute('hidden', dark);
    themeBtn.querySelector('.icon-sun').toggleAttribute('hidden', !dark);
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#000000' : '#ffffff');
  }
  themeBtn.addEventListener('click', () => {
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  // Hero sphere: nodes on a Fibonacci sphere, linked to near neighbours, turning slowly.
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const N = 110, TH = 0.5;
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
    let W = 0, H = 0, R = 0, ang = 0, tx = 0, ty = 0, mx = 0, my = 0;
    const FOV = 3.2;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.4;
    };
    const project = (p, ry, rx) => {
      const x1 = p.x * Math.cos(ry) - p.z * Math.sin(ry);
      const z1 = p.x * Math.sin(ry) + p.z * Math.cos(ry);
      const y2 = p.y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = p.y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = FOV / (FOV - z2);
      return { x: W / 2 + x1 * R * s, y: H / 2 + y2 * R * s, d: (z2 + 1) / 2 };
    };
    const frame = () => {
      if (!W) resize();
      ctx.clearRect(0, 0, W, H);
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
      const pts = nodes.map(p => project(p, ang + tx, 0.18 + ty));
      for (const [a, b, d] of edges) {
        const dep = (pts[a].d + pts[b].d) / 2;
        ctx.strokeStyle = (dark ? 'rgba(14,165,233,' : 'rgba(3,105,161,') + ((0.04 + dep * 0.24) * (1 - (d / TH) * 0.4)).toFixed(3) + ')';
        ctx.lineWidth = 0.5 + dep * 0.6;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
      }
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + p.d * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = (dark ? 'rgba(56,189,248,' : 'rgba(14,165,233,') + (0.18 + p.d * 0.55).toFixed(3) + ')';
        ctx.fill();
      }
      if (!reduce) { ang += 0.0018; requestAnimationFrame(frame); }
    };
    const home = document.getElementById('home');
    if (!reduce) {
      home.addEventListener('mousemove', e => {
        const r = home.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        my = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
      }, { passive: true });
      home.addEventListener('mouseleave', () => { mx = 0; my = 0; });
    }
    if (window.ResizeObserver) new ResizeObserver(() => { resize(); if (reduce) frame(); }).observe(canvas);
    resize(); frame();
    requestAnimationFrame(() => canvas.classList.add('on'));
  }

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
  function lightWords(vh) {
    const r = mindset.getBoundingClientRect();
    const prog = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.35));
    const n = Math.round(prog * words.length);
    if (n === lit) return;
    const lo = Math.min(n, lit), hi = Math.max(n, lit);
    for (let i = lo; i < hi; i++) words[i].classList.toggle('lit', i < n);
    lit = n;
  }

  // Credentials: background goes white to black on the way in.
  const certs = document.getElementById('certifications');
  function night(vh) {
    const r = certs.getBoundingClientRect();
    const n = clamp((vh - r.top) / (vh * 0.6));
    certs.style.setProperty('--n', n.toFixed(3));
    const navH = nav.offsetHeight;
    nav.classList.toggle('dark', n > 0.5 && r.top < navH && r.bottom > navH);
  }

  // Track record roadmap: the track fills toward the reading line, stops light up as they pass it.
  const road = document.querySelector('.roadmap-wrap');
  const stops = road ? Array.from(road.querySelectorAll('.stop')) : [];
  function roadmap(vh) {
    const line = vh * 0.55;
    const r = road.getBoundingClientRect();
    const end = stops[stops.length - 1].offsetTop + 12;
    road.style.setProperty('--end', end + 'px');
    road.style.setProperty('--p', reduce ? '1' : clamp((line - r.top - 12) / (end - 12)).toFixed(3));
    stops.forEach(s => s.classList.toggle('reached', reduce || s.getBoundingClientRect().top < line));
  }

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    if (mindset && !reduce) lightWords(vh);
    if (certs) night(vh);
    if (road) roadmap(vh);
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  // Headline reveal
  const rise = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rise.unobserve(e.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll('.rise').forEach(el => rise.observe(el));

  // Side swoosh: plays when a block enters, re-arms only after it leaves through the bottom.
  const swoosh = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('in');
      else if (e.boundingClientRect.top > 0) e.target.classList.remove('in');
    });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.swoosh-l, .swoosh-r').forEach(el => swoosh.observe(el));

  // Pop-ups: hover opens them on desktop; a tap, click, Enter or Space toggles them anywhere.
  document.querySelectorAll('.has-peek').forEach(host => {
    const set = open => { host.classList.toggle('open', open); host.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    host.addEventListener('click', e => { if (!e.target.closest('a')) set(!host.classList.contains('open')); });
    host.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(!host.classList.contains('open')); }
      if (e.key === 'Escape') set(false);
    });
    host.addEventListener('mouseleave', () => set(false));
  });

  // Active nav tab: scroll spy on the home page, fixed on detail pages.
  const links = document.querySelectorAll('.nav-links a');
  const page = document.body.dataset.page;
  if (page) {
    links.forEach(l => l.classList.toggle('active', l.dataset.tab === page));
  } else {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle('active', l.dataset.tab === e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
  }

  // Mobile nav
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-links');
  const setOpen = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  // Contact form (Formspree)
  const form = document.getElementById('contact-form');
  if (form) {
    const btn = document.getElementById('submit-btn');
    const success = document.getElementById('form-success');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      btn.disabled = true;
      btn.classList.add('loading');
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Server error');
        success.classList.add('show');
        form.reset();
      } catch (err) {
        btn.disabled = false;
        btn.classList.remove('loading');
        alert('Something went wrong. Please email me directly at juanmvonvogler@gmail.com');
      }
    });
  }
})();
