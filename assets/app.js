/* nicoogg portfolio · dot-matrix map, project blocks, small panel widgets */
(() => {
  "use strict";

  /* ───────── projects shown on the map (model space: 1000 × 700) ───────── */
  const PROJECTS = [
    { id: "corvex", no: "01", name: "corvex", x: 585, y: 165, size: 150, rot: 225, lab: [500, 120], labM: [610, 95],
      status: "In development", color: "#3ddc84",
      text: "Security agents powered by corvexai, our own AI that runs locally. They test dashboards, code and computers, find the gaps and fix them.",
      links: [["Website", "https://corvexdevelops.github.io/"], ["GitHub", "https://github.com/CorvexDevelops"]] },
    { id: "wantdownload", no: "02", name: "wantdownload", x: 255, y: 185, size: 140, rot: 135, lab: [345, 110], labM: [290, 95],
      status: "Live", color: "#2f6bff",
      text: "A web app to save YouTube videos as MP3 or MP4, with an account to find your downloads again.",
      links: [["Open app", "https://wantdownload.vercel.app/app"]] },
    { id: "gsloft", no: "03", name: "GS Loft", x: 230, y: 470, size: 140, rot: 45, lab: [355, 430],
      status: "Work · developer", color: "#f5a524",
      text: "My day job. Internal portals, data tools, bots and integrations that keep the company running.",
      links: [["GS-Loft-Dev", "https://github.com/GS-Loft-Dev"]] },
    { id: "next", no: "04", name: "next", x: 640, y: 560, size: 130, rot: 315, lab: [520, 625],
      status: "Soon", color: "#999",
      text: "Something new is always on the bench. Follow the GitHub profile to see it land.",
      links: [["Follow", "https://github.com/nicoogg"]] },
    { id: "you", no: "05", name: "your idea", x: 860, y: 360, size: 130, rot: 225, ghost: true, lab: [870, 470], labM: [790, 480],
      status: "Open slot", color: "#fff",
      text: "Have a project in mind? Get in touch on GitHub and let's build it.",
      links: [["Say hi", "https://github.com/nicoogg"]] },
  ];
  const AVATAR = { x: 500, y: 350, size: 190 };

  const map = document.getElementById("map");
  const canvas = document.getElementById("dots");
  const ctx = canvas.getContext("2d");
  const svg = document.getElementById("shapes");
  const labels = document.getElementById("labels");
  const pop = document.getElementById("pop");
  const panel = document.querySelector(".panel");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── helpers ───────── */
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  const GLYPHS = "0123456789ABCDEF#:/<>=+";
  function scramble(el, text, dur = 520) {
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    cancelAnimationFrame(el._raf);
    const start = performance.now();
    const step = now => {
      const p = Math.max(0, Math.min(1, (now - start) / dur)), lock = Math.floor(p * text.length);
      let out = text.slice(0, lock);
      for (let i = lock; i < text.length; i++) out += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  // L-shaped block, centred, unit size 100
  const L = [[-50, -50], [-6, -50], [-6, 6], [50, 6], [50, 50], [-50, 50]];
  function blockPoints(p) {
    const r = p.rot * Math.PI / 180, k = p.size / 100, c = Math.cos(r), s = Math.sin(r);
    return L.map(([x, y]) => [p.x + (x * c - y * s) * k, p.y + (x * s + y * c) * k]);
  }

  /* ───────── layout: where model space sits on screen ───────── */
  let W = 0, H = 0, S = 1, OX = 0, OY = 0, dpr = 1, STACKED = false;
  function layout() {
    const r = map.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    const stacked = STACKED = getComputedStyle(map).position === "relative";
    const left = stacked ? 0 : panel.getBoundingClientRect().right;
    const aw = W - left, ah = H;
    if (stacked) { S = Math.min(aw / 780, ah / 700); OX = aw / 2 - 535 * S; }   // phones: crop the empty sides
    else { S = Math.min(aw / 1000, ah / 700) * .98; OX = left + (aw - 1000 * S) / 2; }
    OY = (ah - 700 * S) / 2;
  }
  const toScreen = (x, y) => [OX + x * S, OY + y * S];
  const toModel = (x, y) => [(x - OX) / S, (y - OY) / S];
  const labPos = p => { const [x, y] = toScreen(...(STACKED && p.labM ? p.labM : p.lab)); return [x, y]; };

  /* ───────── dots ───────── */
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  let avatarPx = null; // brightness samples of the avatar

  function loadAvatar() {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        // max-pool a large copy so the thin contour lines survive as dots
        const big = 400, n = 80, k = big / n, c = document.createElement("canvas"); c.width = c.height = big;
        const g = c.getContext("2d"); g.drawImage(img, 0, 0, big, big);
        try {
          const d = g.getImageData(0, 0, big, big).data, out = new Float32Array(n * n);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            let m = 0, sum = 0;
            for (let y = j * k; y < (j + 1) * k; y++) for (let x = i * k; x < (i + 1) * k; x++) { const o = (y * big + x) * 4, v = (d[o] + d[o + 1] + d[o + 2]) / 765; if (v > m) m = v; sum += v; }
            out[j * n + i] = m * .6 + (sum / (k * k)) * 1.6;
          }
          avatarPx = { n, out };
        } catch (e) { avatarPx = null; } // file:// can taint the canvas: the map still draws
        res();
      };
      img.onerror = () => res();
      img.src = "assets/avatar.png";
    });
  }

  function drawBase() {
    base.width = canvas.width = Math.round(W * dpr);
    base.height = canvas.height = Math.round(H * dpr);
    const g = bctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    seed = 7;
    const cell = Math.max(4, Math.round(5 * Math.min(1.25, Math.max(.8, S * 1.15))));
    const ang = -32 * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const ghosts = PROJECTS.filter(p => p.ghost).map(p => { const pth = new Path2D(); blockPoints(p).forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? pth.lineTo(sx, sy) : pth.moveTo(sx, sy); }); pth.closePath(); return pth; });
    const av = AVATAR, [ax0, ay0] = toScreen(av.x - av.size / 2, av.y - av.size / 2), asz = av.size * S;

    for (let y = cell / 2; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell) {
        const [mx, my] = toModel(x, y);
        // keep the avatar square for later
        if (x > ax0 - 2 && x < ax0 + asz + 2 && y > ay0 - 2 && y < ay0 + asz + 2) continue;
        const u = mx * ca - my * sa, v = mx * sa + my * ca;
        const du = Math.abs(((u % 95) + 95) % 95 - 47.5), dv = Math.abs(((v % 95) + 95) % 95 - 47.5);
        const street = du > 45.5 || dv > 45.5;
        const lane = Math.abs(((u % 31.6) + 31.6) % 31.6 - 15.8) > 15 || Math.abs(((v % 31.6) + 31.6) % 31.6 - 15.8) > 15;
        const ring = Math.abs(Math.hypot(mx - 500, my - 350) - 300) < 2.2;
        const holes = noise(mx / 22 + 40, my / 22) > .74;
        const n = noise(mx / 70, my / 70) * .6 + noise(mx / 16 + 9, my / 16) * .4;
        let a = 0, sz = 0;
        if (ghosts.some(p => g.isPointInPath(p, x * dpr, y * dpr))) { a = .55 + rnd() * .45; sz = 1.8; }
        else if (ring && rnd() < .8) { a = .7; sz = 1.3; }
        else if (street && rnd() < .9) { a = .65 + rnd() * .35; sz = 1.4; }
        else if (holes) continue;
        else if (lane && rnd() < .45) { a = .35; sz = 1.1; }
        else if (rnd() < Math.pow(n, 2.6) * 1.5) { a = .25 + n * .7; sz = 1 + n; }
        // glow around the avatar block
        const dx = Math.max(ax0 - x, 0, x - ax0 - asz), dy = Math.max(ay0 - y, 0, y - ay0 - asz), dd = Math.hypot(dx, dy) / S;
        if (dd < 55 && rnd() < (1 - dd / 55) * .9) { a = Math.max(a, .85 - dd / 90); sz = Math.max(sz, 1.6); }
        if (!a) continue;
        g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }

    // avatar, dithered into dots
    const step = Math.max(2.5, asz / 80);
    for (let y = 0; y < asz; y += step) {
      for (let x = 0; x < asz; x += step) {
        let b = .12 + rnd() * .12;
        if (avatarPx) { const i = Math.floor(y / asz * avatarPx.n) * avatarPx.n + Math.floor(x / asz * avatarPx.n); b = Math.max(b * .6, Math.min(1, avatarPx.out[i])); }
        const sz = Math.min(step * .95, .5 + b * step);
        g.fillStyle = `rgba(255,255,255,${Math.min(1, .35 + b).toFixed(2)})`;
        g.fillRect(ax0 + x + (step - sz) / 2, ay0 + y + (step - sz) / 2, sz, sz);
      }
    }
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1; g.strokeRect(ax0 + .5, ay0 + .5, asz - 1, asz - 1);
    twinkles = Array.from({ length: 260 }, () => [Math.floor(rnd() * W / cell) * cell + cell / 2, Math.floor(rnd() * H / cell) * cell + cell / 2, rnd() * 6.28, 1 + rnd() * 1.2]);
  }

  let twinkles = [], boot = 0;
  function frame(t) {
    if (!boot) boot = t;
    const [cx, cy] = toScreen(AVATAR.x, AVATAR.y), maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const intro = reduce ? 1 : Math.min(1, (t - boot) / 1700), r = ease(intro) * maxR;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (intro < 1) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx * dpr, cy * dpr, r * dpr, 0, 7); ctx.clip();
      ctx.drawImage(base, 0, 0); ctx.restore();
    } else ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (intro < 1) { ctx.strokeStyle = `rgba(255,255,255,${(1 - intro) * .8})`; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (reduce) return;
    // radar pulse from the avatar every few seconds
    const pr = ((t - boot) % 4200) / 4200;
    if (intro >= 1) { ctx.strokeStyle = `rgba(255,255,255,${(.5 * (1 - pr)).toFixed(3)})`; ctx.lineWidth = 1; ctx.setLineDash([1, 5]); ctx.beginPath(); ctx.arc(cx, cy, AVATAR.size * S * .7 + pr * 420 * S, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // scan line across the avatar
    const asz = AVATAR.size * S, ax = cx - asz / 2, ay = cy - asz / 2, sp = ((t - boot) % 3000) / 3000;
    if (sp < .75) { const yy = ay + (sp / .75) * asz, gr = ctx.createLinearGradient(0, yy - 26, 0, yy);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,.16)"); ctx.fillStyle = gr; ctx.fillRect(ax, yy - 26, asz, 26);
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(ax, yy, asz, 1); }
    // data packets travelling between the avatar and each project
    if (intro >= 1) PROJECTS.forEach((p, i) => {
      if (p.ghost) return;
      const [bx, by] = toScreen(p.x, p.y), d = Math.hypot(bx - cx, by - cy);
      for (let k = 0; k < 2; k++) {
        let q = (((t - boot) / (1400 + d * 4)) + i * .27 + k * .5) % 1; if (k) q = 1 - q;  // one packet out, one back
        const x = cx + (bx - cx) * q, y = cy + (by - cy) * q;
        ctx.fillStyle = k ? "rgba(255,255,255,.55)" : "#fff"; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    });
    for (const [x, y, ph, sz] of twinkles) {
      const a = Math.max(0, Math.sin(t / 900 + ph)) ** 6;
      if (a < .05) continue;
      ctx.fillStyle = `rgba(255,255,255,${(a * .9).toFixed(2)})`;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }
  let last = 0;
  function loop(t) { if (t - last > 30) { frame(t); last = t; } requestAnimationFrame(loop); }

  /* ───────── blocks + labels ───────── */
  function drawShapes() {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    labels.innerHTML = "";
    const [cx, cy] = toScreen(AVATAR.x, AVATAR.y);
    PROJECTS.forEach(p => { if (!p.ghost) { const [bx, by] = toScreen(p.x, p.y); svg.insertAdjacentHTML("beforeend", `<line class="wire" x1="${cx}" y1="${cy}" x2="${bx}" y2="${by}"/>`); } });
    svg.classList.toggle("intro", firstDraw);
    PROJECTS.forEach((p, i) => {
      const pts = blockPoints(p).map(([x, y]) => toScreen(x, y).map(v => v.toFixed(1)).join(",")).join(" ");
      if (!p.ghost) {
        const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gEl.setAttribute("class", "blk"); gEl.dataset.id = p.id;
        gEl.style.setProperty("--i", i);
        gEl.innerHTML = `<path class="o" pathLength="1" d="M${pts}Z" fill="#0d0d0d" stroke="#fff" stroke-width="1.6" stroke-linejoin="miter"/>`;
        // a soft grain inside the block
        gEl.innerHTML += `<path d="M${pts}Z" fill="url(#grain)" pointer-events="none"/>`;
        svg.appendChild(gEl);
      } else {
        const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gEl.setAttribute("class", "blk ghost"); gEl.dataset.id = p.id;
        gEl.innerHTML = `<path class="o" d="M${pts}Z" fill="transparent" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="2 3"/>`;
        svg.appendChild(gEl);
      }
      const [lx, ly] = labPos(p);
      const el = document.createElement("div");
      el.className = firstDraw ? "lab intro" : "lab"; el.dataset.id = p.id; el.style.setProperty("--i", i);
      el.style.left = lx + "px"; el.style.top = ly + "px";
      el.style.fontSize = Math.max(10, Math.min(15, 14 * S)) + "px";
      el.innerHTML = `<span class="no">№</span><span class="nm">${p.no} ${p.name}</span><small>${p.status}</small>`;
      const nm = el.querySelector(".nm"), txt = nm.textContent;
      if (firstDraw) { nm.textContent = ""; setTimeout(() => scramble(nm, txt, 700), i * 140 + 1000); }
      el.addEventListener("mouseenter", () => scramble(nm, txt, 380));
      labels.appendChild(el);
      // keep every label fully on screen
      const hw = (firstDraw ? measure(el, txt) : el.offsetWidth) / 2 + 8; el.style.left = Math.max(hw, Math.min(W - hw, lx)) + "px";
    });
    firstDraw = false;
    svg.insertAdjacentHTML("afterbegin", `<defs><pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="rgba(255,255,255,.07)"/></pattern></defs>`);
  }

  let firstDraw = !reduce;
  function measure(el, txt) { const nm = el.querySelector(".nm"), keep = nm.textContent; nm.textContent = txt; const w = el.offsetWidth; nm.textContent = keep; return w; }

  /* ───────── popup ───────── */
  let current = null;
  function open(id) {
    const p = PROJECTS.find(q => q.id === id); if (!p) return;
    current = id;
    document.querySelectorAll("[data-id]").forEach(e => e.classList.toggle("on", e.dataset.id === id));
    pop.innerHTML = `<h3><span style="font-size:.6em;vertical-align:.4em">№</span>${p.no} ${p.name}</h3>
      <span class="st" style="--c:${p.color}"><i></i>${p.status}</span>
      <p>${p.text}</p>
      <div class="go"><span>${p.links.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join(" &nbsp; ")}</span><button class="close" aria-label="Close">×</button></div>`;
    pop.hidden = false;
    pop.style.animation = "none"; void pop.offsetWidth; pop.style.animation = "";
    scramble(pop.querySelector("p"), p.text, 600);
    place();
  }
  function place() {
    if (!current || pop.hidden) return;
    const p = PROJECTS.find(q => q.id === current);
    let [x, y] = labPos(p);
    const w = pop.offsetWidth, h = pop.offsetHeight;
    x = x + 40; y = y - h / 2;
    if (x + w > W - 16) x = labPos(p)[0] - w - 40;
    const minX = getComputedStyle(map).position === "relative" ? 12 : panel.getBoundingClientRect().right + 12;
    x = Math.max(minX, Math.min(W - w - 12, x)); y = Math.max(70, Math.min(H - h - 12, y));
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function close() { current = null; pop.hidden = true; document.querySelectorAll("[data-id].on").forEach(e => e.classList.remove("on")); }
  map.addEventListener("click", e => {
    if (e.target.closest(".close")) return close();
    const hit = e.target.closest("[data-id]");
    if (hit) open(hit.dataset.id);
    else if (!e.target.closest(".pop, .top-right")) close();
  });
  addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  /* ───────── panel widgets ───────── */
  const clock = document.getElementById("clock");
  function tick() {
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(now).map(p => [p.type, p.value]));
    const h = +parts.hour, wk = !["Sat", "Sun"].includes(parts.weekday);
    const on = wk && h >= 9 && h < 18;
    clock.innerHTML = `<i class="live${on ? "" : " off"}"></i>${parts.hour}:${parts.minute} CET · ${on ? "on duty" : "off"}`;
  }
  tick(); setInterval(tick, 20000);

  let z = 1; const fg = document.getElementById("flowg"), zv = document.getElementById("zval");
  const setZ = v => { z = Math.max(.6, Math.min(1.8, v)); fg.style.transform = `scale(${z})`; zv.textContent = Math.round(z * 100) + "%"; };
  document.getElementById("zin").onclick = () => setZ(z + .2);
  document.getElementById("zout").onclick = () => setZ(z - .2);

  [...panel.children].forEach((el, i) => el.style.setProperty("--i", i));
  panel.querySelectorAll(".row > .card").forEach((el, i) => el.style.setProperty("--i", 2 + i));
  panel.querySelectorAll(".balance i").forEach((el, i) => el.style.setProperty("--k", i));
  panel.querySelectorAll(".dec").forEach((el, i) => { const t = el.textContent; el.style.minWidth = el.getBoundingClientRect().width + "px"; setTimeout(() => scramble(el, t, 900), 150 + i * 220); });
  panel.querySelectorAll("[data-count]").forEach((el, i) => {
    if (reduce) return;
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
    el.textContent = (0).toFixed(dec) + suf;
    setTimeout(() => { const t0 = performance.now(); const f = now => { const q = Math.min(1, (now - t0) / 1100); el.textContent = (end * ease(q)).toFixed(dec) + suf; if (q < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }, 600 + i * 120);
  });
  // soft light following the mouse over the cards, as in the Corvex dashboard
  panel.addEventListener("mousemove", e => {
    const c = e.target.closest(".card"); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ───────── boot ───────── */
  function render() { layout(); drawBase(); drawShapes(); frame(performance.now()); if (current) { const id = current; open(id); } }
  let rt; addEventListener("resize", () => { if (!boot) return; clearTimeout(rt); rt = setTimeout(render, 120); });
  // the map intro plays when the map comes into view (on phones it sits below the panel)
  loadAvatar().then(() => {
    const go = () => { render(); if (!reduce) requestAnimationFrame(loop); };
    if (reduce || !("IntersectionObserver" in window)) return go();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: .25 });
    io.observe(map);
  });
})();
